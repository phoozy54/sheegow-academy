import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Escape a single CSV cell. Values containing commas, double quotes or
 * newlines must be wrapped in double quotes; embedded double quotes are
 * escaped by doubling them. Numbers, null and undefined are stringified.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Join an array of values into a CSV row terminated by CRLF (RFC 4180). */
function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * GET /api/courses/:id/export
 *
 * Teachers and admins download a CSV snapshot of student progress for the
 * course. One row per enrolled student with progress, completed lessons,
 * best quiz scores, assignment grades, last activity and certificate state.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id: courseId } = await params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(actor, course)) {
      return jsonError("Forbidden", 403);
    }

    // Quizzes and assignments give us the column ordering for the per-student
    // assessment summaries. We only export published assessments — drafts are
    // invisible to students and would be confusing in a grade export.
    const [quizzes, assignments, enrollments] = await Promise.all([
      db.quiz.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, title: true },
        orderBy: { createdAt: "asc" },
      }),
      db.assignment.findMany({
        where: { courseId, isPublished: true },
        select: { id: true, title: true, maxPoints: true },
        orderBy: { createdAt: "asc" },
      }),
      db.enrollment.findMany({
        where: { courseId, status: { in: ["active", "completed"] } },
        select: {
          id: true,
          studentId: true,
          enrolledAt: true,
          progress: true,
          completedLessons: true,
          status: true,
          completedAt: true,
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      }),
    ]);

    const studentIds = enrollments.map((e) => e.studentId);
    const quizIds = quizzes.map((q) => q.id);
    const assignmentIds = assignments.map((a) => a.id);

    // Best score per (student, quiz) — matches the gradebook's "best attempt
    // wins" rule so the CSV and the on-screen gradebook never disagree.
    const [attempts, submissions, certificates, lastActivityRows] =
      await Promise.all([
        quizIds.length === 0 || studentIds.length === 0
          ? Promise.resolve([])
          : db.quizAttempt.findMany({
              where: {
                quizId: { in: quizIds },
                studentId: { in: studentIds },
                score: { not: null },
              },
              select: { quizId: true, studentId: true, score: true },
            }),
        assignmentIds.length === 0 || studentIds.length === 0
          ? Promise.resolve([])
          : db.submission.findMany({
              where: {
                assignmentId: { in: assignmentIds },
                studentId: { in: studentIds },
              },
              select: {
                assignmentId: true,
                studentId: true,
                status: true,
                grade: true,
              },
            }),
        studentIds.length === 0
          ? Promise.resolve([])
          : db.certificate.findMany({
              where: { courseId, studentId: { in: studentIds } },
              select: { studentId: true, issuedAt: true, serial: true },
            }),
        // Most recent learning event per student is the closest thing we have
        // to "last active" without joining every lesson-progress row. Falls
        // back to the enrollment date when the student has no events yet.
        studentIds.length === 0
          ? Promise.resolve([])
          : db.learningEvent.findMany({
              where: { userId: { in: studentIds }, courseId },
              select: { userId: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            }),
      ]);

    const bestQuizByStudent = new Map<string, Map<string, number>>();
    for (const a of attempts) {
      if (a.score == null) continue;
      let perQuiz = bestQuizByStudent.get(a.studentId);
      if (!perQuiz) {
        perQuiz = new Map();
        bestQuizByStudent.set(a.studentId, perQuiz);
      }
      const prev = perQuiz.get(a.quizId);
      if (prev === undefined || a.score > prev) perQuiz.set(a.quizId, a.score);
    }

    const submissionByStudent = new Map<
      string,
      Map<string, { status: string; grade: number | null }>
    >();
    for (const s of submissions) {
      let perAssignment = submissionByStudent.get(s.studentId);
      if (!perAssignment) {
        perAssignment = new Map();
        submissionByStudent.set(s.studentId, perAssignment);
      }
      perAssignment.set(s.assignmentId, {
        status: s.status,
        grade: s.grade,
      });
    }

    const certificateByStudent = new Map<
      string,
      { issuedAt: Date; serial: string }
    >();
    for (const c of certificates) {
      certificateByStudent.set(c.studentId, {
        issuedAt: c.issuedAt,
        serial: c.serial,
      });
    }

    const lastActivityByStudent = new Map<string, Date>();
    for (const ev of lastActivityRows) {
      // Already sorted desc, so the first row per student is the most recent.
      if (!lastActivityByStudent.has(ev.userId)) {
        lastActivityByStudent.set(ev.userId, ev.createdAt);
      }
    }

    // Build the CSV. The quiz/assignment columns are appended after the fixed
    // columns so a teacher can drop the file straight into Excel without any
    // re-shaping. Quiz scores are percentages (0-100); assignment grades are
    // raw points out of the assignment's maxPoints.
    const headerCells: string[] = [
      "Student Name",
      "Email",
      "Enrollment Date",
      "Progress %",
      "Completed Lessons",
      "Quiz Scores",
      "Assignment Grades",
      "Last Active",
      "Certificate Issued",
    ];
    const rows: string[] = [csvRow(headerCells)];

    for (const enr of enrollments) {
      const perQuiz = bestQuizByStudent.get(enr.studentId);
      const quizScores = quizzes
        .map((q) => {
          const score = perQuiz?.get(q.id);
          return score == null ? null : `${q.title}: ${score}%`;
        })
        .filter((s): s is string => s !== null)
        .join("; ");

      const perAssignment = submissionByStudent.get(enr.studentId);
      const assignmentGrades = assignments
        .map((a) => {
          const sub = perAssignment?.get(a.id);
          if (!sub) return null;
          if (sub.status !== "graded" || sub.grade == null) {
            return `${a.title}: ${sub.status}`;
          }
          return `${a.title}: ${sub.grade}/${a.maxPoints}`;
        })
        .filter((s): s is string => s !== null)
        .join("; ");

      // completedLessons is stored as a comma-separated string of lesson
      // indices in the schema; count them so the column is a number.
      const completedCount = enr.completedLessons
        ? enr.completedLessons
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean).length
        : 0;

      const cert = certificateByStudent.get(enr.studentId);
      const lastActive =
        lastActivityByStudent.get(enr.studentId) ?? enr.enrolledAt;

      rows.push(
        csvRow([
          enr.student.fullName,
          enr.student.email,
          enr.enrolledAt.toISOString(),
          enr.progress,
          completedCount,
          quizScores,
          assignmentGrades,
          lastActive.toISOString(),
          cert ? cert.issuedAt.toISOString() : "",
        ])
      );
    }

    const csv = rows.join("\r\n");

    // Filename includes the course title so downloads are easy to identify in
    // a Downloads folder. Sanitise to ASCII-safe characters.
    const safeTitle =
      (course.title || "course")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 60) || "course";
    const filename = `${safeTitle}-progress.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/export]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
