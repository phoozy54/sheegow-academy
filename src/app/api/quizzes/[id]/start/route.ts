import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";
import { decideCourseContentAccess, recordLearningEvent } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/quizzes/:id/start — begin a timed, attempt-limited test. */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students can take quizzes", 403);

    const limited = limitRequest(`quiz-start:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const { id } = await params;
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, teacherId: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { choices: { select: { id: true, text: true, order: true } } },
        },
      },
    });
    if (!quiz) return jsonError("Quiz not found", 404);

    const decision = await decideCourseContentAccess(user, quiz.courseId);
    if (!decision.allowed) return jsonError(decision.reason || "Forbidden", decision.status);
    if (!quiz.isPublished) return jsonError("Quiz not available", 404);

    const attempts = await db.quizAttempt.count({ where: { quizId: id, studentId: user.id } });
    if (attempts >= quiz.maxAttempts) {
      return jsonError("No attempts remaining for this quiz", 429);
    }

    const attempt = await db.quizAttempt.create({
      data: { quizId: id, studentId: user.id },
    });
    await recordLearningEvent({
      userId: user.id,
      verb: "attempted",
      objectType: "quiz",
      objectId: id,
      courseId: quiz.courseId,
    });

    return NextResponse.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimitSec: quiz.timeLimitSec,
        passScore: quiz.passScore,
        questions: quiz.questions,
      },
      attemptsRemaining: quiz.maxAttempts - attempts - 1,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[quizzes/start]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
