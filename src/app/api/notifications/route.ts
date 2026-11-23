import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";

/**
 * GET /api/notifications
 *
 * Returns the most recent 20 notifications for the signed-in user, newest
 * first, plus the unread count for the bell badge. Polling clients hit this
 * every 30s.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const limited = limitRequest(`notifications:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    const payload = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    }));

    return jsonOk({ notifications: payload, unreadCount });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notifications/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/notifications
 *
 * Mark every unread notification for the caller as read. Body is intentionally
 * empty — callers pass no payload.
 */
export async function POST() {
  try {
    const user = await requireAuth();

    const limited = limitRequest(`notifications-mark:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const result = await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return jsonOk({ success: true, updated: result.count });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notifications/markAll]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
