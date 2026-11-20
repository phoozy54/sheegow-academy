import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import {
  canManageCourse,
  decideCourseContentAccess,
} from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface CreateModuleBody {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
}

/**
 * GET /api/courses/:id/curriculum
 *
 * Managers (admin / owning teacher) see every module and lesson, published or
 * not. Enrolled students see published content. Everyone else sees only
 * lessons explicitly marked `isPreview`, so the marketing page can show a
 * real sample without leaking the course.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const course = await db.course.findUnique({
      where: { id },
      select: { id: true, title: true, teacherId: true, isActive: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const isManager = Boolean(user && canManageCourse(user, course));
    const access = user
      ? await decideCourseContentAccess(user, id)
      : { allowed: false, status: 403 as const, reason: "Login required" };
    const fullAccess = isManager || access.allowed;

    const modules = await db.module.findMany({
      where: {
        courseId: id,
        ...(isManager ? {} : { isPublished: true }),
      },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          where: isManager ? {} : fullAccess ? { isPublished: true } : { isPreview: true },
          orderBy: { order: "asc" },
          include: {
            materials: { orderBy: { createdAt: "asc" } },
            // Always an array: anonymous users get an empty result via an
            // impossible student id, which keeps the response shape stable.
            progress: {
              where: { studentId: user?.id ?? "__anonymous__" },
              take: 1,
            },
            quiz: {
              select: {
                id: true,
                title: true,
                passScore: true,
                maxAttempts: true,
                isLive: true,
                isPublished: true,
              },
            },
            assignment: {
              select: { id: true, title: true, dueAt: true, maxPoints: true, isPublished: true },
            },
          },
        },
      },
    });

    const lessons = modules.flatMap((m) => m.lessons);
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(
      (l) => Array.isArray(l.progress) && l.progress[0]?.status === "completed"
    ).length;
    const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const nextLesson = lessons.find(
      (l) => !Array.isArray(l.progress) || l.progress[0]?.status !== "completed"
    );

    const enrollment = user
      ? await db.enrollment.findUnique({
          where: { studentId_courseId: { studentId: user.id, courseId: id } },
          select: {
            id: true,
            studentId: true,
            courseId: true,
            progress: true,
            completedLessons: true,
            status: true,
            enrolledAt: true,
            expiresAt: true,
            completedAt: true,
          },
        })
      : null;

    return NextResponse.json({
      course,
      canManage: isManager,
      hasAccess: fullAccess,
      accessReason: access.reason ?? null,
      roadmap: {
        courseId: id,
        modules,
        totalLessons,
        completedLessons,
        percent,
        remainingLessons: Math.max(0, totalLessons - completedLessons),
        nextLessonId: nextLesson?.id ?? null,
        enrollment,
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[curriculum/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/courses/:id/curriculum
 * Create a module (teacher/admin only, owning teacher enforced).
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`content:${actor.id}`, 60, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(actor, course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateModuleBody>(req);
    const title = body?.title?.trim();
    if (!title) return jsonError("Module title is required", 400);

    const order =
      typeof body?.order === "number" && Number.isFinite(body.order)
        ? Math.max(0, Math.floor(body.order))
        : (await db.module.count({ where: { courseId: id } })) + 1;

    const createdModule = await db.module.create({
      data: {
        courseId: id,
        title: title.slice(0, 200),
        description: body?.description?.trim().slice(0, 1000) || null,
        order,
        isPublished: body?.isPublished ?? false,
      },
      include: { lessons: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ module: createdModule }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[curriculum/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
