import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import { decideCourseContentAccess } from "@/lib/content-access";
import type { CertificateEligibility } from "@/lib/types";

/** GET /api/certificates/eligibility?courseId=... — real completion requirements. */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students earn certificates", 403);

    const courseId = new URL(req.url).searchParams.get("courseId")?.trim();
    if (!courseId) return jsonError("courseId is required", 400);

    const access = await decideCourseContentAccess(user, courseId);
    if (!access.allowed) return jsonError(access.reason || "Forbidden", access.status);

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
        attempts: {
          where: { studentId: user.id, passed: true },
          select: { id: true },
          take: 1,
        },
      },
    });
    const passedQuizzes = quizzes.filter((q) => q.attempts.length > 0).length;

    const assignments = await db.assignment.findMany({
      where: { courseId, isPublished: true },
      select: {
        id: true,
        submissions: {
          where: { studentId: user.id },
          select: { grade: true },
          take: 1,
        },
      },
    });
    const gradedHomework = assignments.filter((a) => a.submissions[0]?.grade != null).length;

    const already = await db.certificate.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
      select: { id: true },
    });

    const reasons: string[] = [];
    if (totalLessons === 0) reasons.push("This course has no published lessons yet.");
    else if (completedLessons < totalLessons) {
      reasons.push(`Finish all lessons (${completedLessons}/${totalLessons} completed).`);
    }
    if (passedQuizzes < quizzes.length) {
      reasons.push(`Pass every test (${passedQuizzes}/${quizzes.length} passed).`);
    }
    if (gradedHomework < assignments.length) {
      reasons.push(`Submit and finish grading of all homework (${gradedHomework}/${assignments.length}).`);
    }

    const eligibility: CertificateEligibility = {
      eligible: reasons.length === 0 && !already,
      reasons: already ? ["You already have a certificate for this course."] : reasons,
      totalLessons,
      completedLessons,
      requiredQuizzes: quizzes.length,
      passedQuizzes,
      pendingHomework: assignments.length - gradedHomework,
    };
    return NextResponse.json({ eligibility, issued: Boolean(already) });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[certificates/eligibility]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
