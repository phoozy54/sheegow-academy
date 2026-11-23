import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, safeBody } from "@/lib/api-helpers";
import { canManageCourse, decideCourseContentAccess } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

const LESSON_TYPES = new Set(["video", "pdf", "text", "quiz", "live", "assignment"]);

interface UpdateLessonBody {
  title?: string;
  type?: string;
  order?: number;
  body?: string;
  videoUrl?: string;
  durationSec?: number;
  isPreview?: boolean;
  isPublished?: boolean;
}

/** GET /api/lessons/:id — lesson detail with materials and the student's progress. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: { select: { id: true, title: true, teacherId: true } },
          },
        },
        materials: { orderBy: { createdAt: "asc" } },
        progress: { where: { studentId: user?.id ?? "__anonymous__" }, take: 1 },
      },
    });
    if (!lesson) return jsonError("Lesson not found", 404);

    const isManager = Boolean(user && canManageCourse(user, lesson.module.course));
    const decision = user
      ? await decideCourseContentAccess(user, lesson.module.course.id)
      : { allowed: false, status: 403 as const, reason: "Login required" };
    const fullAccess = isManager || decision.allowed;

    if (!fullAccess && !lesson.isPreview) {
      return jsonError(decision.reason || "You do not have access to this lesson", decision.status);
    }
    if (!fullAccess && !lesson.isPublished && !lesson.isPreview) {
      return jsonError("Lesson not available", 404);
    }

    return NextResponse.json({ lesson, canManage: isManager, hasAccess: fullAccess });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[lessons/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** PATCH /api/lessons/:id — edit a lesson (owning teacher / admin only). */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: { select: { id: true, teacherId: true } } } } },
    });
    if (!lesson) return jsonError("Lesson not found", 404);
    if (!canManageCourse(user, lesson.module.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<UpdateLessonBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) return jsonError("Lesson title is required", 400);
      data.title = title.slice(0, 300);
    }
    if (body.type !== undefined) {
      if (!LESSON_TYPES.has(body.type)) return jsonError("Invalid lesson type", 400);
      data.type = body.type;
    }
    if (body.order !== undefined && Number.isFinite(body.order))
      data.order = Math.max(0, Math.floor(body.order));
    if (body.body !== undefined) data.body = body.body.trim().slice(0, 50_000) || null;
    if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl.trim().slice(0, 2000) || null;
    if (body.durationSec !== undefined && Number.isFinite(body.durationSec))
      data.durationSec = Math.max(0, Math.floor(body.durationSec));
    if (body.isPreview !== undefined) data.isPreview = Boolean(body.isPreview);
    if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);

    const updated = await db.lesson.update({
      where: { id },
      data,
      include: { materials: true },
    });
    return NextResponse.json({ lesson: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[lessons/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** DELETE /api/lessons/:id — remove a lesson (owning teacher / admin only). */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: { select: { id: true, teacherId: true } } } } },
    });
    if (!lesson) return jsonError("Lesson not found", 404);
    if (!canManageCourse(user, lesson.module.course)) return jsonError("Forbidden", 403);

    await db.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[lessons/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
