import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface GradeBody {
  grade?: number;
  feedback?: string;
}

/** PATCH /api/submissions/:id/grade — teacher/admin marks homework. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`grading:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const submission = await db.submission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: { course: { select: { id: true, teacherId: true } } },
        },
      },
    });
    if (!submission) return jsonError("Submission not found", 404);
    if (!canManageCourse(user, submission.assignment.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<GradeBody>(req);
    if (!body || typeof body.grade !== "number" || !Number.isFinite(body.grade)) {
      return jsonError("A numeric grade is required", 400);
    }
    const grade = Math.min(submission.assignment.maxPoints, Math.max(0, Math.floor(body.grade)));

    const updated = await db.submission.update({
      where: { id },
      data: {
        grade,
        feedback: body.feedback?.trim().slice(0, 10_000) || null,
        status: "graded",
        gradedBy: user.id,
        gradedAt: new Date(),
      },
    });
    return NextResponse.json({ submission: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[submissions/grade]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
