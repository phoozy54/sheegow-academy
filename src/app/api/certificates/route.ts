import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { decideCourseContentAccess, recordLearningEvent } from "@/lib/content-access";
import { sendCertificateEmail } from "@/lib/email";
import type { CertificateEligibility } from "@/lib/types";

/** GET /api/certificates — the current user's issued certificates. */
export async function GET() {
  try {
    const user = await requireAuth();
    const certificates = await db.certificate.findMany({
      where: { studentId: user.id, revokedAt: null },
      include: {
        course: { select: { id: true, title: true } },
        student: { select: { fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json({ certificates });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[certificates/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** POST /api/certificates — issue only when every real requirement is met. */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students earn certificates", 403);

    const limited = limitRequest(`certificate:${user.id}`, 10, 60_000);
    if (limited) return limited;

    const body = await safeBody<{ courseId?: string }>(req);
    const courseId = body?.courseId?.trim();
    if (!courseId) return jsonError("courseId is required", 400);

    const access = await decideCourseContentAccess(user, courseId);
    if (!access.allowed) return jsonError(access.reason || "Forbidden", access.status);

    // Re-check server-side — never trust a client "eligible: true".
    const [totalLessons, completedLessons] = await Promise.all([
      db.lesson.count({
        where: { module: { courseId, isPublished: true }, isPublished: true },
      }),
      db.lessonProgress.count({
        where: {
          studentId: user.id,
          status: "completed",
          lesson: { module: { courseId, isPublished: true }, isPublished: true },
        },
      }),
    ]);
    const quizzes = await db.quiz.findMany({
      where: { courseId, isPublished: true },
      select: {
        id: true,
        attempts: { where: { studentId: user.id, passed: true }, select: { id: true }, take: 1 },
      },
    });
    const assignments = await db.assignment.findMany({
      where: { courseId, isPublished: true },
      select: {
        id: true,
        submissions: { where: { studentId: user.id }, select: { grade: true }, take: 1 },
      },
    });

    const reasons: string[] = [];
    if (totalLessons === 0 || completedLessons < totalLessons) reasons.push("All lessons must be completed.");
    if (quizzes.some((q) => q.attempts.length === 0)) reasons.push("All tests must be passed.");
    if (assignments.some((a) => a.submissions[0]?.grade == null)) reasons.push("All homework must be graded.");
    if (reasons.length > 0) {
      const eligibility: CertificateEligibility = {
        eligible: false,
        reasons,
        totalLessons,
        completedLessons,
        requiredQuizzes: quizzes.length,
        passedQuizzes: quizzes.filter((q) => q.attempts.length > 0).length,
        pendingHomework: assignments.filter((a) => a.submissions[0]?.grade == null).length,
      };
      return NextResponse.json({ error: "Requirements not met", eligibility }, { status: 400 });
    }

    const existing = await db.certificate.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (existing && !existing.revokedAt) {
      return NextResponse.json({ certificate: existing, alreadyIssued: true });
    }

    const year = new Date().getFullYear();
    const serial = `SHEEGOW-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const verificationCode = randomBytes(12).toString("base64url");

    const certificate = existing
      ? await db.certificate.update({
          where: { id: existing.id },
          data: { serial, verificationCode, issuedAt: new Date(), revokedAt: null },
        })
      : await db.certificate.create({
          data: { studentId: user.id, courseId, serial, verificationCode },
        });

    await recordLearningEvent({
      userId: user.id,
      verb: "passed",
      objectType: "certificate",
      objectId: certificate.id,
      courseId,
      metadata: { serial },
    });

    // Mark the enrollment complete for dashboard consistency.
    await db.enrollment.updateMany({
      where: { studentId: user.id, courseId },
      data: { status: "completed", completedAt: new Date(), progress: 100 },
    });

    // Best-effort: email the student a congratulations + link to the cert.
    // We need the course title for the email body, so fetch it (one extra
    // query, only when actually issuing). Skipped on re-issue of an already
    // valid certificate to avoid spamming.
    if (!existing || existing.revokedAt) {
      try {
        const course = await db.course.findUnique({
          where: { id: courseId },
          select: { title: true },
        });
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
          "https://www.sheegowacademy.com";
        const certUrl = `${appUrl}/certificate/${certificate.id}`;
        const delivered = await sendCertificateEmail(
          user.email,
          user.fullName,
          course?.title ?? "your course",
          certUrl
        );
        if (!delivered.ok)
          logger.warn("[certificates/issue]", "certificate email not delivered", {
            certificateId: certificate.id,
          });
      } catch (emailErr) {
        logger.error(
          "[certificates/issue]",
          "certificate email failed",
          emailErr,
          { certificateId: certificate.id, courseId }
        );
      }
    }

    return NextResponse.json({ certificate }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[certificates/issue]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
