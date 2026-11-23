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

type RouteContext = { params: Promise<{ id: string }> };

interface IncomingAnswer {
  questionId?: string;
  choiceIds?: string[] | string;
  textAnswer?: string;
}
interface SubmitBody {
  attemptId?: string;
  answers?: IncomingAnswer[];
}

function asIds(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
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

    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    const answerRows: {
      attemptId: string;
      questionId: string;
      choiceIds: string | null;
      textAnswer: string | null;
      isCorrect: boolean | null;
      pointsEarned: number;
    }[] = [];

    let earned = 0;
    let total = 0;
    let correctCount = 0;

    for (const answer of answers) {
      const questionId = answer.questionId?.trim();
      if (!questionId) continue;
      const question = questionMap.get(questionId);
      if (!question || question.type === "short") continue;

      const validIds = new Set(question.choices.map((c) => c.id));
      const given = [...new Set(asIds(answer.choiceIds).filter((cid) => validIds.has(cid)))].sort();
      const expected = question.choices
        .filter((c) => c.isCorrect)
        .map((c) => c.id)
        .sort();
      const isCorrect =
        expected.length > 0 &&
        given.length === expected.length &&
        given.every((cid, i) => cid === expected[i]);
      const pointsEarned = isCorrect ? question.points : 0;

      total += question.points;
      earned += pointsEarned;
      if (isCorrect) correctCount += 1;

      answerRows.push({
        attemptId,
        questionId,
        choiceIds: JSON.stringify(given),
        textAnswer: answer.textAnswer?.trim().slice(0, 4000) || null,
        isCorrect,
        pointsEarned,
      });
    }

    const expired =
      quiz.timeLimitSec !== null &&
      Date.now() - attempt.startedAt.getTime() > quiz.timeLimitSec * 1000;
    const score = total === 0 || expired ? 0 : Math.min(100, Math.round((earned / total) * 100));
    const passed = !expired && total > 0 && score >= quiz.passScore;

    await db.$transaction([
      db.quizAnswer.createMany({ data: answerRows }),
      db.quizAttempt.update({
        where: { id: attemptId },
        data: { submittedAt: new Date(), score, passed },
      }),
    ]);

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
        submittedAt: new Date().toISOString(),
        score,
        passed,
        correctCount,
        questionCount: total === 0 ? quiz.questions.length : answerRows.length,
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
