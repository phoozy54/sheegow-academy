import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import { decideCourseContentAccess } from "@/lib/content-access";

/**
 * GET /api/library
 * Everything a student is still entitled to revisit: past lessons, PDFs and
 * notes from every active enrollment. Trial/expired enrollments are filtered
 * out by the same central access decision used by the lesson API.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const enrollments = await db.enrollment.findMany({
      where: { studentId: user.id },
      include: { course: { select: { id: true, title: true, image: true, level: true } } },
      orderBy: { enrolledAt: "desc" },
    });

    const courses: {
      courseId: string;
      title: string;
      image: string | null;
      level: string;
      percent: number;
      modules: Awaited<ReturnType<typeof db.module.findMany>>;
    }[] = [];

    for (const enrollment of enrollments) {
      const decision = await decideCourseContentAccess(user, enrollment.courseId);
      if (!decision.allowed) continue;

      const modules = await db.module.findMany({
        where: { courseId: enrollment.courseId, isPublished: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            include: {
              materials: { orderBy: { createdAt: "asc" } },
              progress: { where: { studentId: user.id }, take: 1 },
            },
          },
        },
      });
      const lessons = modules.flatMap((m) => m.lessons);
      const completed = lessons.filter((l) => l.progress[0]?.status === "completed").length;

      courses.push({
        courseId: enrollment.courseId,
        title: enrollment.course.title,
        image: enrollment.course.image,
        level: enrollment.course.level,
        percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        modules,
      });
    }

    return NextResponse.json({ courses });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[library/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
