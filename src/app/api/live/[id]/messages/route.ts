import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAdminRole, requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface MessageBody {
  text?: string;
}

type RouteContext = { params: Promise<{ id: string }> };

const senderSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

/**
 * Only the assigned teacher, an administrator, or a student enrolled in the
 * class's course may read or write its chat history.
 */
async function canAccessClass(
  user: { id: string; role: string },
  liveClass: { id: string; courseId: string | null; teacherId: string | null }
): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (liveClass.teacherId === user.id) return true;
  if (!liveClass.courseId) return false;
  const enrollment = await db.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: liveClass.courseId,
      },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}

/**
 * GET /api/live/:id/messages
 * List recent messages for a live class with sender info (participants only).
 * Query params: ?limit= (default 200, max 500).
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (!(await canAccessClass(user, liveClass))) {
      return jsonError("Forbidden", 403);
    }

    const limit = Math.min(
      Math.max(Number(new URL(req.url).searchParams.get("limit")) || 200, 1),
      500
    );

    // Fetch the most recent `limit` messages, then restore chronological order.
    const messages = await db.message.findMany({
      where: { classId: id },
      include: { sender: { select: senderSelect } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/messages/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/live/:id/messages
 * Create a chat message in a live class (participants only).
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (!(await canAccessClass(user, liveClass))) {
      return jsonError("Forbidden", 403);
    }

    const body = await safeBody<MessageBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const text = body.text?.trim();
    if (!text) return jsonError("Message text is required", 400);
    if (text.length > 500) return jsonError("Message is too long", 400);

    const message = await db.message.create({
      data: { classId: id, senderId: user.id, text: text.slice(0, 500) },
      include: { sender: { select: senderSelect } },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/messages/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
