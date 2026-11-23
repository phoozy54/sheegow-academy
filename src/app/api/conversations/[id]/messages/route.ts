import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  safeBody,
  limitRequest,
} from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const senderSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

interface SendMessageBody {
  body?: string;
}

/**
 * GET /api/conversations/:id/messages
 *
 * Returns all messages in the conversation, oldest first. Both participants
 * can read. As a side effect, marks the messages addressed to the caller as
 * read (sets DirectMessage.readAt). Polling clients call this every few
 * seconds while the conversation is open.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: conversationId } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, user1Id: true, user2Id: true },
    });
    if (!conversation) return jsonError("Conversation not found", 404);

    const isParticipant =
      conversation.user1Id === actor.id || conversation.user2Id === actor.id;
    if (!isParticipant) {
      return jsonError("Forbidden", 403);
    }

    const messages = await db.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: senderSelect } },
    });

    // Mark unread messages addressed to the caller as read. Use a tight
    // where clause so we only touch rows where readAt is still null AND the
    // sender is NOT the caller.
    await db.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: actor.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const payload = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender
        ? {
            id: m.sender.id,
            fullName: m.sender.fullName,
            profilePicture: m.sender.profilePicture,
          }
        : null,
    }));

    return jsonOk({ messages: payload });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[messages/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/conversations/:id/messages
 *
 * Send a message in a conversation. The caller must be a participant. Body:
 * { body: string }.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: conversationId } = await params;

    const limited = limitRequest(`dm-send:${actor.id}`, 60, 60_000);
    if (limited) return limited;

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, user1Id: true, user2Id: true },
    });
    if (!conversation) return jsonError("Conversation not found", 404);

    const isParticipant =
      conversation.user1Id === actor.id || conversation.user2Id === actor.id;
    if (!isParticipant) {
      return jsonError("Forbidden", 403);
    }

    const body = await safeBody<SendMessageBody>(req);
    const text = body?.body?.trim();
    if (!text) return jsonError("Message body is required", 400);

    const message = await db.directMessage.create({
      data: {
        conversationId,
        senderId: actor.id,
        body: text.slice(0, 5_000),
      },
      include: { sender: { select: senderSelect } },
    });

    // Touch the conversation so it bubbles to the top of the list.
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonOk(
      {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          body: message.body,
          readAt: message.readAt ? message.readAt.toISOString() : null,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender
            ? {
                id: message.sender.id,
                fullName: message.sender.fullName,
                profilePicture: message.sender.profilePicture,
              }
            : null,
        },
      },
      201
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[messages/send]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
