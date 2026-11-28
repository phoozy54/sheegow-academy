import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import {
  decideCourseContentAccess,
  recordLearningEvent,
  recomputeEnrollmentProgress,
} from "@/lib/content-access";
import { awardPoints, updateStreak, checkAndAwardBadges, POINTS } from "@/lib/gamification";
import {
  claimGradedSubmission,
  gradeQuizSubmission,
  type IncomingQuizAnswer,
} from "@/lib/quiz-grading";

type RouteContext = { params: Promise<{ id: string }> };

interface SubmitBody {
  attemptId?: string;
  answers?: IncomingQuizAnswer[];
}

/**
 * POST /api/quizzes/:id/submit
 * Grading happens ONLY here. The browser never received isCorrect flags.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students can submit quizzes", 403);

    const limited = limitRequest(`quiz-submit:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const { id } = await params;

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, teacherId: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { choices: { select: { id: true, text: true, isCorrect: true } } },
        },
      },
    });
    if (!quiz) return jsonError("Quiz not found", 404);
    // Draft/unpublished quizzes must never be gradeable, even for students who
    // already have access to the course.
    if (!quiz.isPublished) return jsonError("Quiz not available", 404);

    const access = await decideCourseContentAccess(user, quiz.courseId);
    if (!access.allowed) return jsonError(access.reason || "Forbidden", access.status);

    const body = await safeBody<SubmitBody>(req);
    const attemptId = body?.attemptId?.trim();
    if (!attemptId) return jsonError("attemptId is required", 400);

    const attempt = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, quizId: true, studentId: true, startedAt: true, submittedAt: true },
    });
    if (!attempt || attempt.quizId !== quiz.id || attempt.studentId !== user.id) {
      return jsonError("Attempt not found", 404);
    }
    if (attempt.submittedAt) return jsonError("This attempt was already submitted", 400);

    // QG-1: grading is server-authoritative. `total` is derived from every
    // gradable question on the server, never from the submitted answer list.
    const submittedAt = new Date();
    const grade = gradeQuizSubmission(quiz.questions, body?.answers ?? [], {
      timeLimitSec: quiz.timeLimitSec,
      elapsedMs: submittedAt.getTime() - attempt.startedAt.getTime(),
      passScore: quiz.passScore,
    });

    // Atomic claim: a second concurrent submit affects 0 rows and gets no
    // progress, points, streak or badge. Answers are written in the same tx.
    const claimed = await db.$transaction((tx) =>
      claimGradedSubmission(tx, { attemptId, grade, submittedAt }),
    );
    if (!claimed) return jsonError("This attempt was already submitted", 409);

    const { score, passed, expired, correctCount } = grade;

    if (passed && quiz.lessonId) {
      await db.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId: user.id, lessonId: quiz.lessonId } },
        create: {
          studentId: user.id,
          lessonId: quiz.lessonId,
          status: "completed",
          completedAt: new Date(),
        },
        update: { status: "completed", completedAt: new Date() },
      });
      await recomputeEnrollmentProgress(user.id, quiz.courseId);
    }

    await recordLearningEvent({
      userId: user.id,
      verb: passed ? "passed" : "attempted",
      objectType: "quiz",
      objectId: quiz.id,
      courseId: quiz.courseId,
      metadata: { score, passed, attemptId, expired },
    });

    // Gamification: points + streak + badge checks on a passing quiz.
    let newBadges: string[] = [];
    if (passed) {
      await awardPoints(user.id, POINTS.quizPass, "quiz_pass");
      await updateStreak(user.id);
      newBadges = await checkAndAwardBadges(user.id);
    }

    return NextResponse.json({
      result: {
        id: attempt.id,
        quizId: quiz.id,
        studentId: user.id,
        startedAt: attempt.startedAt,
        submittedAt: submittedAt.toISOString(),
        score,
        passed,
        correctCount,
        questionCount: grade.questionCount,
        gradableCount: grade.gradableCount,
        shortAnswerCount: grade.shortAnswerCount,
      },
      expired,
      newBadges,
      // Revealed only after submission.
      correctAnswers: quiz.questions.map((q) => ({
        questionId: q.id,
        correctChoiceIds: q.choices.filter((c) => c.isCorrect).map((c) => c.id),
      })),
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[quizzes/submit]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
