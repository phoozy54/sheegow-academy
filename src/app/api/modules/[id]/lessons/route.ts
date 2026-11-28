import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import {
  jsonError,
  handleAuthError,
  limitRequest,
  safeBody,
  CONTENT_BODY_BYTES,
} from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

const LESSON_TYPES = new Set(["video", "pdf", "text", "quiz", "live", "assignment"]);

interface CreateLessonBody {
  title?: string;
  type?: string;
  order?: number;
  body?: string;
  videoUrl?: string;
  durationSec?: number;
  isPreview?: boolean;
  isPublished?: boolean;
  // Drip content — when set, lesson is locked until this date.
  unlockAt?: string | null;
}

/** POST /api/modules/:id/lessons — create a lesson in an owned module. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`content:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const courseModule = await db.module.findUnique({
      where: { id },
      include: { course: { select: { id: true, teacherId: true } } },
    });
    if (!courseModule) return jsonError("Module not found", 404);
    if (!canManageCourse(user, courseModule.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateLessonBody>(req, CONTENT_BODY_BYTES);
    const title = body?.title?.trim();
    if (!title) return jsonError("Lesson title is required", 400);
    const type = body?.type?.trim() || "text";
    if (!LESSON_TYPES.has(type)) return jsonError("Invalid lesson type", 400);

    const order =
      typeof body?.order === "number" && Number.isFinite(body.order)
        ? Math.max(0, Math.floor(body.order))
        : (await db.lesson.count({ where: { moduleId: id } })) + 1;

    // Drip content — optional schedule. null = immediately available.
    let unlockAt: Date | null = null;
    const rawUnlock = body?.unlockAt;
    if (rawUnlock !== null && rawUnlock !== undefined && String(rawUnlock).trim()) {
      const parsed = new Date(String(rawUnlock));
      if (Number.isNaN(parsed.getTime())) {
        return jsonError("Invalid unlockAt date", 400);
      }
      unlockAt = parsed;
    }

    const lesson = await db.lesson.create({
      data: {
        moduleId: id,
        title: title.slice(0, 300),
        type,
        order,
        body: body?.body?.trim().slice(0, 50_000) || null,
        videoUrl: body?.videoUrl?.trim().slice(0, 2000) || null,
        durationSec:
          typeof body?.durationSec === "number" && Number.isFinite(body.durationSec)
            ? Math.max(0, Math.floor(body.durationSec))
            : null,
        isPreview: Boolean(body?.isPreview),
        isPublished: Boolean(body?.isPublished),
        unlockAt,
      },
      include: { materials: true },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[lessons/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
