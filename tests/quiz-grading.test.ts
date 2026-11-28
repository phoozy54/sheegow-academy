import { describe, expect, it } from "bun:test";
import {
  claimGradedSubmission,
  gradeQuizSubmission,
  type IncomingQuizAnswer,
  type QuizAnswerRow,
  type QuizAttemptClaimer,
  type QuizQuestionForGrading,
} from "../src/lib/quiz-grading";

function gradable(id: string, correctChoiceId: string, points = 1): QuizQuestionForGrading {
  return {
    id,
    type: "single",
    points,
    choices: [
      { id: correctChoiceId, isCorrect: true },
      { id: `wrong-${id}`, isCorrect: false },
    ],
  };
}

const tenQuestions = Array.from({ length: 10 }, (_, i) => gradable(`q${i}`, `c${i}`));

const defaultOptions = { timeLimitSec: null, elapsedMs: 0, passScore: 70 };

describe("QG-1 — server-authoritative quiz grading", () => {
  it("quiz_total_all_questions: one correct answer out of ten is 10%, not 100%", () => {
    const grade = gradeQuizSubmission(
      tenQuestions,
      [{ questionId: "q0", choiceIds: ["c0"] }],
      defaultOptions,
    );

    expect(grade.total).toBe(10);
    expect(grade.earned).toBe(1);
    expect(grade.correctCount).toBe(1);
    expect(grade.score).toBe(10);
    expect(grade.passed).toBe(false);
    expect(grade.questionCount).toBe(10);
    expect(grade.gradableCount).toBe(10);
  });

  it("a fully correct submission still scores 100 and passes", () => {
    const answers: IncomingQuizAnswer[] = tenQuestions.map((q) => ({
      questionId: q.id,
      choiceIds: [q.choices[0]!.id],
    }));
    const grade = gradeQuizSubmission(tenQuestions, answers, defaultOptions);

    expect(grade.score).toBe(100);
    expect(grade.passed).toBe(true);
    expect(grade.correctCount).toBe(10);
  });

  it("quiz_duplicate_answers_deduped: first answer for a questionId wins", () => {
    const questions = [gradable("q1", "right"), gradable("q2", "right2")];
    const answers: IncomingQuizAnswer[] = [
      { questionId: "q1", choiceIds: ["wrong-q1"] },
      { questionId: "q1", choiceIds: ["right"] },
      { questionId: "q2", choiceIds: ["right2"] },
    ];
    const grade = gradeQuizSubmission(questions, answers, defaultOptions);

    expect(grade.total).toBe(2);
    expect(grade.earned).toBe(1);
    expect(grade.score).toBe(50);
    expect(grade.answerRows).toHaveLength(2);
    expect(new Set(grade.answerRows.map((r) => r.questionId)).size).toBe(2);
  });

  it("short answers are stored for manual grading but never auto-pass", () => {
    const questions: QuizQuestionForGrading[] = [
      { id: "short1", type: "short", points: 5, choices: [] },
      gradable("q1", "c1"),
    ];
    const grade = gradeQuizSubmission(
      questions,
      [{ questionId: "short1", textAnswer: "  my essay  " }],
      defaultOptions,
    );

    expect(grade.total).toBe(1);
    expect(grade.score).toBe(0);
    expect(grade.passed).toBe(false);
    expect(grade.shortAnswerCount).toBe(1);
    expect(grade.answerRows[0]?.textAnswer).toBe("my essay");
    expect(grade.answerRows[0]?.isCorrect).toBeNull();
    expect(grade.answerRows[0]?.pointsEarned).toBe(0);
  });

  it("malformed textAnswer is ignored instead of throwing a 500", () => {
    const questions: QuizQuestionForGrading[] = [
      { id: "short1", type: "short", points: 5, choices: [] },
      gradable("q1", "c1"),
    ];
    const answers = [
      { questionId: "short1", textAnswer: { unexpected: true } },
      { questionId: "q1", choiceIds: ["c1"], textAnswer: 42 },
    ] as IncomingQuizAnswer[];

    const grade = gradeQuizSubmission(questions, answers, defaultOptions);

    expect(grade.answerRows[0]?.textAnswer).toBeNull();
    expect(grade.answerRows[1]?.textAnswer).toBeNull();
    expect(grade.score).toBe(100);
  });

  it("expired attempts always score zero and never pass", () => {
    const answers = tenQuestions.map((q) => ({ questionId: q.id, choiceIds: [q.choices[0]!.id] }));
    const grade = gradeQuizSubmission(answers.length ? tenQuestions : [], answers, {
      timeLimitSec: 10,
      elapsedMs: 11_000,
      passScore: 70,
    });

    expect(grade.expired).toBe(true);
    expect(grade.score).toBe(0);
    expect(grade.passed).toBe(false);
  });
});

function makeFakeTx(): QuizAttemptClaimer & {
  attempts: Map<string, { submittedAt: Date | null; score: number; passed: boolean }>;
  rows: QuizAnswerRow[];
} {
  const attempts = new Map<string, { submittedAt: Date | null; score: number; passed: boolean }>();
  const rows: QuizAnswerRow[] = [];
  return {
    attempts,
    rows,
    quizAttempt: {
      async updateMany({ where, data }) {
        const current = attempts.get(where.id);
        if (!current || current.submittedAt !== null) return { count: 0 };
        attempts.set(where.id, { ...current, ...data });
        return { count: 1 };
      },
    },
    quizAnswer: {
      async createMany({ data }) {
        for (const row of data) {
          const duplicate = rows.some(
            (existing) => existing.attemptId === row.attemptId && existing.questionId === row.questionId,
          );
          if (!duplicate) rows.push(row);
        }
        return { count: data.length };
      },
    },
  };
}

describe("QG-1b — atomic attempt claim", () => {
  it("quiz_double_submit_second_claim_rejected: only the first caller gets rewards", async () => {
    const tx = makeFakeTx();
    tx.attempts.set("attempt-1", { submittedAt: null, score: 0, passed: false });
    const grade = gradeQuizSubmission(tenQuestions, [], defaultOptions);
    const submittedAt = new Date();

    const first = await claimGradedSubmission(tx, { attemptId: "attempt-1", grade, submittedAt });
    const second = await claimGradedSubmission(tx, { attemptId: "attempt-1", grade, submittedAt });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(tx.attempts.get("attempt-1")?.submittedAt).toEqual(submittedAt);
    expect(tx.rows).toHaveLength(0);
  });

  it("persists answers once with the real attemptId when the claim succeeds", async () => {
    const tx = makeFakeTx();
    tx.attempts.set("attempt-2", { submittedAt: null, score: 0, passed: false });
    const grade = gradeQuizSubmission(
      [gradable("q1", "c1")],
      [{ questionId: "q1", choiceIds: ["c1"] }],
      defaultOptions,
    );

    const claimed = await claimGradedSubmission(tx, {
      attemptId: "attempt-2",
      grade,
      submittedAt: new Date(),
    });

    expect(claimed).toBe(true);
    expect(tx.rows).toHaveLength(1);
    expect(tx.rows[0]?.attemptId).toBe("attempt-2");
    expect(tx.rows[0]?.isCorrect).toBe(true);
  });
});
