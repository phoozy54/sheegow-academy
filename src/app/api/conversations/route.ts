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

const userSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
  role: true,
} as const;

interface StartConversationBody {
  userId?: string;
}

/**
 * Sort the [user1, user2] pair deterministically so two users always end up
 * in the same Conversation row regardless of who initiated.
 */
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * GET /api/conversations
 *
 * List the calling user's conversations, newest activity first. For each
 * conversation we expose the OTHER user (id, fullName, profilePicture, role),
 * the most recent message (preview + timestamp + senderId), and the number of
 * unread messages addressed to the caller.
 */
export async function GET(_req: Request) {
  try {
    const actor = await requireAuth();

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ user1Id: actor.id }, { user2Id: actor.id }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user1: { select: userSelect },
        user2: { select: userSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Count unread messages in a single grouped query.
    const unreadAgg = await db.directMessage.groupBy({
      by: ["conversationId"],
      where: {
        // The current user is the recipient — they are not the sender.
        senderId: { not: actor.id },
        readAt: null,
        conversation: {
          OR: [{ user1Id: actor.id }, { user2Id: actor.id }],
        },
      },
      _count: { _all: true },
    });
    const unreadMap = new Map<string, number>();
    for (const row of unreadAgg) {
      unreadMap.set(row.conversationId, row._count._all);
    }

    const payload = conversations.map((c) => {
      const isUser1 = c.user1Id === actor.id;
      const other = isUser1 ? c.user2 : c.user1;
      const last = c.messages[0];
      return {
        id: c.id,
        otherUser: other
          ? {
              id: other.id,
              fullName: other.fullName,
              profilePicture: other.profilePicture,
              role: other.role,
            }
          : {
              id: "",
              fullName: "Unknown user",
              profilePicture: null,
              role: "student",
            },
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
        unreadCount: unreadMap.get(c.id) ?? 0,
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return jsonOk({ conversations: payload });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[conversations/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/conversations
 *
 * Find or create a 1-to-1 conversation with another user. Body: { userId }.
 * Self-conversations are rejected. The unique [user1Id, user2Id] constraint
 * (stored in deterministic order) makes this idempotent.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireAuth();

    const limited = limitRequest(`conversations:${actor.id}`, 20, 60_000);
    if (limited) return limited;

    const body = await safeBody<StartConversationBody>(req);
    const otherId = body?.userId?.trim();
    if (!otherId) return jsonError("userId is required", 400);
    if (otherId === actor.id) {
      return jsonError("You cannot start a conversation with yourself", 400);
    }

    const other = await db.user.findUnique({
      where: { id: otherId },
      select: { id: true, fullName: true, profilePicture: true, role: true, isActive: true },
    });
    if (!other || !other.isActive) {
      return jsonError("User not found", 404);
    }

    const [user1Id, user2Id] = orderedPair(actor.id, otherId);

    const conversation = await db.conversation.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id },
      update: {},
      include: {
        user1: { select: userSelect },
        user2: { select: userSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const isUser1 = conversation.user1Id === actor.id;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;
    const last = conversation.messages[0];

    return jsonOk({
      conversation: {
        id: conversation.id,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              fullName: otherUser.fullName,
              profilePicture: otherUser.profilePicture,
              role: otherUser.role,
            }
          : {
              id: other.id,
              fullName: other.fullName,
              profilePicture: other.profilePicture,
              role: other.role,
            },
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
        unreadCount: 0,
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[conversations/start]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
