import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import type {
  AdminCourseOverview,
  AdminCourseRow,
  AdminLiveClass,
  CourseStudentRow,
  CourseWorkItem,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/course-overview
 *
 * Admin/super-admin only. One payload with everything a manager needs to see
 * when they open Courses:
 *  - every course with its real work counts (modules, lessons, quizzes, ...)
 *  - every enrolled student with progress, assessment state and last activity
 *  - every live class, including ended ones, never just the public "upcoming" list
 */
export async function GET() {
  try {
    await requireAdmin();

    const [courses, enrollments, liveClasses] = await Promise.all([
      db.course.findMany({
        include: {
          teacher: { select: { id: true, fullName: true } },
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              isPublished: true,
              lessons: {
                select: { id: true, title: true, type: true, isPublished: true },
              },
            },
          },
          _count: {
            select: {
              quizzes: true,
              assignments: true,
              materials: true,
              liveClasses: true,
              certificates: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.enrollment.findMany({
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      db.liveClass.findMany({
        include: {
          course: { select: { id: true, title: true, level: true, image: true } },
          teacher: {
            select: { id: true, fullName: true, profilePicture: true },
          },
          _count: { select: { attendances: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const courseIds = courses.map((c) => c.id);

    // An empty `in` list is valid Prisma and simply returns no rows, so these
    // queries can stay unconditional and keep their inferred types.
    const [progressRows, attempts, submissions, certificates, quizzes, assignments] =
      await Promise.all([
      db.lessonProgress.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          status: true,
          updatedAt: true,
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      }),
      db.quizAttempt.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          submittedAt: true,
          startedAt: true,
          passed: true,
          quiz: { select: { courseId: true } },
        },
      }),
      db.submission.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          status: true,
          submittedAt: true,
          assignment: { select: { courseId: true } },
        },
      }),
      db.certificate.findMany({
        where: { revokedAt: null },
        select: { studentId: true, courseId: true, issuedAt: true },
      }),
      db.quiz.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          id: true,
          courseId: true,
          title: true,
          isPublished: true,
        },
      }),
      db.assignment.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          id: true,
          courseId: true,
          title: true,
          isPublished: true,
          dueAt: true,
        },
      }),
    ]);

    type Activity = { count: number; done: number; last: number };
    const key = (studentId: string, courseId: string) =>
      `${studentId}::${courseId}`;
    const touch = (map: Map<string, Activity>, k: string, at: number) => {
      const row = map.get(k) ?? { count: 0, done: 0, last: 0 };
      row.count += 1;
      if (at > row.last) row.last = at;
      map.set(k, row);
      return row;
    };

    const lessonMap = new Map<string, Activity>();
    for (const p of progressRows) {
      const row = touch(
        lessonMap,
        key(p.studentId, p.lesson.module.courseId),
        p.updatedAt.getTime()
      );
      if (p.status === "completed") row.done += 1;
    }

    const quizMap = new Map<string, Activity>();
    for (const a of attempts) {
      const at = (a.submittedAt ?? a.startedAt).getTime();
      const row = touch(quizMap, key(a.studentId, a.quiz.courseId), at);
      if (a.passed) row.done += 1;
    }

    const homeworkMap = new Map<string, Activity>();
    for (const s of submissions) {
      const row = touch(
        homeworkMap,
        key(s.studentId, s.assignment.courseId),
        s.submittedAt.getTime()
      );
      if (s.status !== "submitted") row.done += 1; // graded / returned
    }

    const certificateMap = new Map<string, string>();
    for (const c of certificates) {
      certificateMap.set(key(c.studentId, c.courseId), c.issuedAt.toISOString());
    }

    const enrollmentsByCourse = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const list = enrollmentsByCourse.get(e.courseId) ?? [];
      list.push(e);
      enrollmentsByCourse.set(e.courseId, list);
    }

    const coursesPayload: AdminCourseRow[] = courses.map((c) => {
      const lessons = c.modules.flatMap((m) => m.lessons);
      const workItems: CourseWorkItem[] = [
        ...c.modules.flatMap((m) =>
          m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            kind: "lesson" as const,
            moduleTitle: m.title,
            isPublished: l.isPublished,
            dueAt: null,
          }))
        ),
        ...quizzes
          .filter((q) => q.courseId === c.id)
          .map((q) => ({
            id: q.id,
            title: q.title,
            kind: "quiz" as const,
            moduleTitle: null,
            isPublished: q.isPublished,
            dueAt: null,
          })),
        ...assignments
          .filter((a) => a.courseId === c.id)
          .map((a) => ({
            id: a.id,
            title: a.title,
            kind: "assignment" as const,
            moduleTitle: null,
            isPublished: a.isPublished,
            dueAt: a.dueAt?.toISOString() ?? null,
          })),
      ];
      const students: CourseStudentRow[] = (
        enrollmentsByCourse.get(c.id) ?? []
      ).map((e) => {
        const k = key(e.studentId, c.id);
        const lp = lessonMap.get(k);
        const qa = quizMap.get(k);
        const hw = homeworkMap.get(k);
        const lastActivity = Math.max(
          lp?.last ?? 0,
          qa?.last ?? 0,
          hw?.last ?? 0
        );
        return {
          enrollmentId: e.id,
          studentId: e.studentId,
          fullName: e.student.fullName,
          username: e.student.username,
          email: e.student.email,
          profilePicture: e.student.profilePicture,
          status: e.status,
          progress: e.progress,
          enrolledAt: e.enrolledAt.toISOString(),
          completedAt: e.completedAt?.toISOString() ?? null,
          lessonsCompleted: lp?.done ?? 0,
          lessonsTotal: lessons.length,
          quizzesAttempted: qa?.count ?? 0,
          quizzesPassed: qa?.done ?? 0,
          submissions: hw?.count ?? 0,
          gradedSubmissions: hw?.done ?? 0,
          certificateIssuedAt: certificateMap.get(k) ?? null,
          lastActivityAt: lastActivity
            ? new Date(lastActivity).toISOString()
            : null,
        };
      });

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        level: c.level,
        price: c.price,
        duration: c.duration,
        image: c.image,
        isActive: c.isActive,
        teacherName: c.teacher?.fullName ?? null,
        work: {
          modules: c.modules.length,
          publishedModules: c.modules.filter((m) => m.isPublished).length,
          lessons: lessons.length,
          publishedLessons: lessons.filter((l) => l.isPublished).length,
          quizzes: c._count.quizzes,
          assignments: c._count.assignments,
          materials: c._count.materials,
          liveClasses: c._count.liveClasses,
          certificates: c._count.certificates,
        },
        workItems,
        enrolledCount: students.length,
        activeCount: students.filter((s) => s.status === "active").length,
        completedCount: students.filter((s) => s.status === "completed").length,
        students,
      };
    });

    const livePayload: AdminLiveClass[] = liveClasses.map((l) => ({
      id: l.id,
      courseId: l.courseId,
      teacherId: l.teacherId,
      title: l.title,
      description: l.description,
      scheduledAt: l.scheduledAt.toISOString(),
      duration: l.duration,
      status: l.status as AdminLiveClass["status"],
      attendeeCount: l.attendeeCount,
      createdAt: l.createdAt.toISOString(),
      course: l.course,
      teacher: l.teacher,
      attendanceCount: l._count.attendances,
    }));

    const payload: AdminCourseOverview = {
      summary: {
        totalCourses: coursesPayload.length,
        activeCourses: coursesPayload.filter((c) => c.isActive).length,
        totalStudents: studentIds.length,
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter((e) => e.status === "active").length,
        completedEnrollments: enrollments.filter((e) => e.status === "completed")
          .length,
        certificatesIssued: certificates.length,
        liveClasses: livePayload.length,
        liveNow: livePayload.filter((l) => l.status === "live").length,
        scheduled: livePayload.filter((l) => l.status === "scheduled").length,
        ended: livePayload.filter((l) => l.status === "ended").length,
      },
      courses: coursesPayload,
      liveClasses: livePayload,
    };

    return NextResponse.json(payload);
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[admin/course-overview]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
