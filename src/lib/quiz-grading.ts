/**
 * QG-1 — Server-authoritative quiz grading.
 *
 * Pure helpers: no Next.js, no Prisma client, no env access. This keeps the
 * grading rules testable with `bun test` without touching a database.
 *
 * Security invariant: the maximum possible score is computed from the
 * questions stored on the server, NEVER from the answers supplied by the
 * browser. Submitting fewer answers can only lower the score.
 */

export interface QuizChoiceForGrading {
  id: string;
  isCorrect: boolean;
}

export interface QuizQuestionForGrading {
  id: string;
  type: string;
  points: number;
  choices: QuizChoiceForGrading[];
}

export interface IncomingQuizAnswer {
  questionId?: string;
  choiceIds?: string[] | string;
  /** Runtime value is untrusted; guarded by `safeText()` below. */
  textAnswer?: unknown;
}

export interface QuizAnswerRow {
  attemptId: string;
  questionId: string;
  choiceIds: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
}

export interface QuizGradeOptions {
  timeLimitSec: number | null;
  elapsedMs: number;
  passScore: number;
}

export interface QuizGradeResult {
  answerRows: QuizAnswerRow[];
  earned: number;
  total: number;
  correctCount: number;
  score: number;
  passed: boolean;
  expired: boolean;
  /** All questions on the quiz, used for honest reporting. */
  questionCount: number;
  /** Non-short questions that count toward the score. */
  gradableCount: number;
  /** Short-answer questions (stored for manual grading, never auto-passed). */
  shortAnswerCount: number;
  answeredCount: number;
}

function asIds(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function safePoints(points: number): number {
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}

/** Never call `.trim()` on client-supplied data without checking its type. */
function safeText(value: unknown): string | null {
  return typeof value === "string" ? value.trim().slice(0, 4000) || null : null;
}

/**
 * Grade a submission. `questions` must come from the server-side quiz record.
 * Duplicate answer entries for the same question are ignored (first wins) so a
 * client cannot send conflicting values for one questionId.
 */
export function gradeQuizSubmission(
  questions: QuizQuestionForGrading[],
  answers: IncomingQuizAnswer[],
  options: QuizGradeOptions,
): QuizGradeResult {
  const gradableQuestions = questions.filter((q) => q.type !== "short");
  const shortQuestions = questions.filter((q) => q.type === "short");
  const total = gradableQuestions.reduce((sum, q) => sum + safePoints(q.points), 0);

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const uniqueAnswers = new Map<string, IncomingQuizAnswer>();
  for (const answer of Array.isArray(answers) ? answers : []) {
    const questionId = answer?.questionId?.trim();
    if (!questionId || uniqueAnswers.has(questionId)) continue;
    uniqueAnswers.set(questionId, answer);
  }

  const answerRows: QuizAnswerRow[] = [];
  let earned = 0;
  let correctCount = 0;

  for (const [questionId, answer] of uniqueAnswers) {
    const question = questionMap.get(questionId);
    if (!question) continue;

    // Short answers are persisted for manual grading but never auto-passed.
    if (question.type === "short") {
      const textAnswer = safeText(answer.textAnswer);
      answerRows.push({
        attemptId: "",
        questionId,
        choiceIds: null,
        textAnswer,
        isCorrect: null,
        pointsEarned: 0,
      });
      continue;
    }

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
    const pointsEarned = isCorrect ? safePoints(question.points) : 0;

    earned += pointsEarned;
    if (isCorrect) correctCount += 1;

    answerRows.push({
      attemptId: "",
      questionId,
      choiceIds: JSON.stringify(given),
      textAnswer: safeText(answer.textAnswer),
      isCorrect,
      pointsEarned,
    });
  }

  const expired =
    options.timeLimitSec !== null &&
    Number.isFinite(options.elapsedMs) &&
    options.elapsedMs > options.timeLimitSec * 1000;
  const score = total === 0 || expired ? 0 : Math.min(100, Math.round((earned / total) * 100));
  const passed = !expired && total > 0 && score >= options.passScore;

  return {
    answerRows,
    earned,
    total,
    correctCount,
    score,
    passed,
    expired,
    questionCount: questions.length,
    gradableCount: gradableQuestions.length,
    shortAnswerCount: shortQuestions.length,
    answeredCount: answerRows.length,
  };
}

/** Minimal Prisma-transaction surface needed to claim one attempt atomically. */
export interface QuizAttemptClaimer {
  quizAttempt: {
    updateMany(args: {
      where: { id: string; submittedAt: null };
      data: { submittedAt: Date; score: number; passed: boolean };
    }): Promise<{ count: number }>;
  };
  quizAnswer: {
    createMany(args: {
      data: QuizAnswerRow[];
      skipDuplicates?: boolean;
    }): Promise<{ count: number }>;
  };
}

export interface ClaimSubmissionParams {
  attemptId: string;
  grade: QuizGradeResult;
  submittedAt: Date;
}

/**
 * Claim the attempt before writing answers. Only the caller whose
 * `updateMany` affects exactly one row may persist answers and trigger
 * progress/points. A second concurrent submit therefore returns false and
 * receives no rewards.
 */
export async function claimGradedSubmission<T extends QuizAttemptClaimer>(
  tx: T,
  { attemptId, grade, submittedAt }: ClaimSubmissionParams,
): Promise<boolean> {
  const claim = await tx.quizAttempt.updateMany({
    where: { id: attemptId, submittedAt: null },
    data: { submittedAt, score: grade.score, passed: grade.passed },
  });
  if (claim.count !== 1) return false;

  if (grade.answerRows.length > 0) {
    // Answers are already deduped by questionId and `QuizAnswer` has
    // @@unique([attemptId, questionId]). Omitting `skipDuplicates` keeps this
    // portable if a SQLite-generated client is used for local development.
    await tx.quizAnswer.createMany({
      data: grade.answerRows.map((row) => ({ ...row, attemptId })),
    });
  }
  return true;
}
