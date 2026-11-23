import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { decideCourseContentAccess, recordLearningEvent } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface SubmitBody {
  note?: string;
  fileUrl?: string;
}

/** POST /api/assignments/:id/submit — student hands in homework. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students submit homework", 403);

    const limited = limitRequest(`homework:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const { id } = await params;
    const assignment = await db.assignment.findUnique({ where: { id } });
    if (!assignment) return jsonError("Assignment not found", 404);
    if (!assignment.isPublished) return jsonError("Assignment not available", 404);

    const decision = await decideCourseContentAccess(user, assignment.courseId);
    if (!decision.allowed) return jsonError(decision.reason || "Forbidden", decision.status);

    const body = await safeBody<SubmitBody>(req);
    const note = body?.note?.trim().slice(0, 20_000) || "";
    const fileUrl = body?.fileUrl?.trim().slice(0, 2000) || null;
    if (!note && !fileUrl) return jsonError("Add a note or attach a file", 400);

    if (fileUrl) {
      let parsed: URL;
      try {
        parsed = new URL(fileUrl);
      } catch {
        return jsonError("Invalid attachment URL", 400);
      }
      if (parsed.protocol !== "https:") return jsonError("Attachment must use HTTPS", 400);
    }

    const existing = await db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
      select: { grade: true },
    });

    const submission = await db.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
      create: {
        assignmentId: id,
        studentId: user.id,
        note: note || null,
        fileUrl,
      },
      update: {
        note: note || null,
        fileUrl,
        submittedAt: new Date(),
        // A resubmission forfeits the previous grade — it must be re-graded.
        grade: null,
        feedback: null,
        status: "submitted",
        gradedAt: null,
      },
    });

    await recordLearningEvent({
      userId: user.id,
      verb: "submitted",
      objectType: "assignment",
      objectId: id,
      courseId: assignment.courseId,
      metadata: { hadFile: Boolean(fileUrl), hadGrade: existing?.grade != null },
    });

    return NextResponse.json({ submission });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[assignments/submit]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
