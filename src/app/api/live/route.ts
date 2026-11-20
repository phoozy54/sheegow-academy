import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { isAdminRole, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface CreateLiveBody {
  courseId?: string;
  teacherId?: string;
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
}

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
 * GET /api/live
 * List all live classes sorted by scheduledAt ascending.
 */
export async function GET() {
  try {
    const items = await db.liveClass.findMany({
      include: includeRelations,
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ classes: items });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/live
 * Create a live class (teacher/admin only).
 */
export async function POST(req: Request) {
  try {
    const actor = await requireTeacherOrAdmin();

    const body = await safeBody<CreateLiveBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const courseId = body.courseId?.trim() || null;
    // Teachers always own the classes they create. Only admins may assign a
    // class to somebody else.
    const teacherId = isAdminRole(actor.role)
      ? body.teacherId?.trim() || actor.id
      : actor.id;
    const scheduledAtStr = body.scheduledAt;
    const duration = typeof body.duration === "number" ? body.duration : 60;

    if (!title) return jsonError("Title is required", 400);
    if (!scheduledAtStr) return jsonError("scheduledAt is required", 400);

    const scheduledAt = new Date(scheduledAtStr);
    if (Number.isNaN(scheduledAt.getTime()))
      return jsonError("Invalid scheduledAt date", 400);

    const liveClass = await db.liveClass.create({
      data: {
        title,
        description,
        courseId,
        teacherId,
        scheduledAt,
        duration,
      },
      include: includeRelations,
    });

    return NextResponse.json({ liveClass }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
