import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
} from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/courses/:id/gradebook
 *
 * Returns a per-course gradebook for teachers/admins: one row per enrolled
 * student with their quiz attempts and assignment submissions, plus a summary
 * of class averages. Teachers only see their own courses.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id: courseId } = await params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, level: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(actor, course)) {
      return jsonError("Forbidden", 403);
    }

    // All published quizzes and assignments for the course — these become the
    // columns of the gradebook table.
    const [quizzes, assignments, enrollments] = await Promise.all([
      db.quiz.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, title: true, passScore: true },
        orderBy: { createdAt: "asc" },
      }),
      db.assignment.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, title: true, maxPoints: true, dueAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.enrollment.findMany({
        where: { courseId, status: { in: ["active", "completed"] } },
        select: {
          studentId: true,
          progress: true,
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      }),
    ]);

    const quizIds = quizzes.map((q) => q.id);
    const assignmentIds = assignments.map((a) => a.id);
    const studentIds = enrollments.map((e) => e.studentId);

    const [attempts, submissions] = await Promise.all([
      quizIds.length === 0
        ? Promise.resolve([])
        : db.quizAttempt.findMany({
            where: { quizId: { in: quizIds }, studentId: { in: studentIds } },
            select: {
              id: true,
              quizId: true,
              studentId: true,
              score: true,
              passed: true,
              submittedAt: true,
            },
            orderBy: { submittedAt: "desc" },
          }),
      assignmentIds.length === 0
        ? Promise.resolve([])
        : db.submission.findMany({
            where: {
              assignmentId: { in: assignmentIds },
              studentId: { in: studentIds },
            },
            select: {
              id: true,
              assignmentId: true,
              studentId: true,
              status: true,
              grade: true,
              feedback: true,
              submittedAt: true,
              gradedAt: true,
            },
          }),
    ]);

    // Index attempts/submissions by student for fast row construction.
    const attemptsByStudent = new Map<
      string,
      {
        id: string;
        quizId: string;
        score: number | null;
        passed: boolean | null;
        submittedAt: string | null;
      }[]
    >();
    for (const a of attempts) {
      const arr = attemptsByStudent.get(a.studentId) ?? [];
      arr.push({
        id: a.id,
        quizId: a.quizId,
        score: a.score,
        passed: a.passed,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      });
      attemptsByStudent.set(a.studentId, arr);
    }

    const submissionsByStudent = new Map<
      string,
      {
        id: string;
        assignmentId: string;
        status: string;
        grade: number | null;
        feedback: string | null;
        submittedAt: string;
        gradedAt: string | null;
      }[]
    >();
    for (const s of submissions) {
      const arr = submissionsByStudent.get(s.studentId) ?? [];
      arr.push({
        id: s.id,
        assignmentId: s.assignmentId,
        status: s.status,
        grade: s.grade,
        feedback: s.feedback,
        submittedAt: s.submittedAt.toISOString(),
        gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
      });
      submissionsByStudent.set(s.studentId, arr);
    }

    const students = enrollments.map((e) => ({
      studentId: e.student.id,
      fullName: e.student.fullName,
      email: e.student.email,
      profilePicture: e.student.profilePicture,
      enrollmentProgress: e.progress,
      enrollmentStatus: e.status,
      quizAttempts: attemptsByStudent.get(e.student.id) ?? [],
      submissions: submissionsByStudent.get(e.student.id) ?? [],
    }));

    // ── Summary stats ──────────────────────────────────────
    // Average the BEST score per student per quiz (best attempt wins).
    const quizBestPerStudent = new Map<string, number>();
    for (const a of attempts) {
      if (a.score == null) continue;
      const key = `${a.studentId}:${a.quizId}`;
      const prev = quizBestPerStudent.get(key);
      if (prev === undefined || a.score > prev) {
        quizBestPerStudent.set(key, a.score);
      }
    }
    const quizScores = Array.from(quizBestPerStudent.values());
    const totalQuizAttempts = quizScores.length;
    const averageQuizScore =
      totalQuizAttempts === 0
        ? null
        : Math.round(
            (quizScores.reduce((s, n) => s + n, 0) / totalQuizAttempts) * 10
          ) / 10;
    const passedAttempts = attempts.filter((a) => a.passed === true).length;
    const attemptedTotal = attempts.length;
    const passRate =
      attemptedTotal === 0
        ? null
        : Math.round((passedAttempts / attemptedTotal) * 1000) / 10;

    const averageProgress =
      students.length === 0
        ? null
        : Math.round(
            (students.reduce((s, r) => s + r.enrollmentProgress, 0) /
              students.length) *
              10
          ) / 10;

    const gradedSubmissions = submissions.filter((s) => s.status === "graded").length;
    const pendingSubmissions = submissions.filter(
      (s) => s.status !== "graded"
    ).length;

    return jsonOk({
      course: {
        id: course.id,
        title: course.title,
        level: course.level,
      },
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        passScore: q.passScore,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        maxPoints: a.maxPoints,
        dueAt: a.dueAt ? a.dueAt.toISOString() : null,
      })),
      students,
      summary: {
        studentCount: students.length,
        averageQuizScore,
        passRate,
        averageProgress,
        gradedSubmissions,
        pendingSubmissions,
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[gradebook/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
