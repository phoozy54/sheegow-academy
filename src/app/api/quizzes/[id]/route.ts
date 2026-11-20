import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, safeBody } from "@/lib/api-helpers";
import { canManageCourse, decideCourseContentAccess } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/quizzes/:id
 * Returns the question bank WITHOUT `isCorrect` — answers are revealed only
 * after a submitted attempt.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, teacherId: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { choices: { select: { id: true, text: true, order: true } } },
        },
        attempts: {
          where: { studentId: user?.id ?? "__anonymous__" },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            quizId: true,
            studentId: true,
            startedAt: true,
            submittedAt: true,
            score: true,
            passed: true,
          },
        },
      },
    });
    if (!quiz) return jsonError("Quiz not found", 404);

    const isManager = Boolean(user && canManageCourse(user, quiz.course));
    const decision = user
      ? await decideCourseContentAccess(user, quiz.courseId)
      : { allowed: false, status: 403 as const, reason: "Login required" };
    if (!isManager && !decision.allowed) {
      return jsonError(decision.reason || "Forbidden", decision.status);
    }
    if (!isManager && !quiz.isPublished) return jsonError("Quiz not available", 404);

    const { course: _course, ...safeQuiz } = quiz;
    return NextResponse.json({ quiz: safeQuiz, canManage: isManager, hasAccess: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[quizzes/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** PATCH /api/quizzes/:id — publish / unpublish (owning teacher / admin). */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: { course: { select: { id: true, teacherId: true } } },
    });
    if (!quiz) return jsonError("Quiz not found", 404);
    if (!canManageCourse(user, quiz.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<{ isPublished?: boolean; isLive?: boolean }>(req);
    if (!body) return jsonError("Invalid request body", 400);
    const data: Record<string, boolean> = {};
    if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
    if (body.isLive !== undefined) data.isLive = Boolean(body.isLive);

    const updated = await db.quiz.update({ where: { id }, data });
    return NextResponse.json({ quiz: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[quizzes/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
