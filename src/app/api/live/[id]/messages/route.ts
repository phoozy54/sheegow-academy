import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
 * GET /api/live/:id/messages
 * List messages for a live class with sender info.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);

    const messages = await db.message.findMany({
      where: { classId: id },
      include: { sender: { select: senderSelect } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[live/messages/get] error:", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/live/:id/messages
 * Create a chat message in a live class (authenticated users only).
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);

    const body = await safeBody<MessageBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const text = body.text?.trim();
    if (!text) return jsonError("Message text is required", 400);

    const message = await db.message.create({
      data: { classId: id, senderId: user.id, text },
      include: { sender: { select: senderSelect } },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[live/messages/create] error:", e);
    return jsonError("Internal server error", 500);
  }
}
