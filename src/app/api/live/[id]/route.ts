import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { isAdminRole, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const includeRelations = {
  course: { select: { id: true, title: true, level: true, image: true } },
  teacher: {
    select: {
      id: true,
      fullName: true,
      profilePicture: true,
    },
  },
} as const;

/**
 * GET /api/live/:id
 * Single live class with course + teacher included.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const liveClass = await db.liveClass.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!liveClass) return jsonError("Live class not found", 404);

    return NextResponse.json({ liveClass });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * PUT /api/live/:id
 * Teacher / admin / super admin. Edits class details and schedule time.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) return jsonError("Invalid request body", 400);

    const existing = await db.liveClass.findUnique({ where: { id } });
    if (!existing) return jsonError("Live class not found", 404);
    // Teachers may only edit classes explicitly assigned to them.
    if (!isAdminRole(actor.role) && existing.teacherId !== actor.id) {
      return jsonError("Forbidden", 403);
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError("Title cannot be empty", 400);
      data.title = title;
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null;
    }
    if (body.scheduledAt !== undefined) {
      const date = new Date(String(body.scheduledAt));
      if (Number.isNaN(date.getTime()))
        return jsonError("Invalid scheduled date", 400);
      data.scheduledAt = date;
    }
    if (body.duration !== undefined) {
      const duration = Number(body.duration);
      if (!Number.isFinite(duration) || duration < 15 || duration > 240)
        return jsonError("Duration must be between 15 and 240 minutes", 400);
      data.duration = Math.round(duration);
    }
    if (body.courseId !== undefined) {
      data.courseId = String(body.courseId).trim() || null;
    }
    if (body.teacherId !== undefined && isAdminRole(actor.role)) {
      data.teacherId = String(body.teacherId).trim() || null;
    }
    if (body.meetingLink !== undefined) {
      data.meetingLink = String(body.meetingLink).trim() || null;
    }

    const liveClass = await db.liveClass.update({
      where: { id },
      data,
      include: includeRelations,
    });

    return NextResponse.json({ liveClass });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
