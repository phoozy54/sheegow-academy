import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/:id
 *
 * Mark a single notification as read. Idempotent — PATCHing an already-read
 * notification just returns it unchanged. The caller must own the row.
 */
export async function PATCH(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const limited = limitRequest(`notifications-mark:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const existing = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, readAt: true },
    });
    if (!existing) return jsonError("Notification not found", 404);
    if (existing.userId !== user.id) return jsonError("Forbidden", 403);

    const updated = await db.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    return jsonOk({
      notification: {
        id: updated.id,
        userId: updated.userId,
        type: updated.type,
        title: updated.title,
        body: updated.body,
        link: updated.link,
        readAt: updated.readAt ? updated.readAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notifications/markOne]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/notifications/:id
 *
 * Permanently delete a notification. Owner only.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const limited = limitRequest(`notifications-del:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const existing = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!existing) return jsonError("Notification not found", 404);
    if (existing.userId !== user.id) return jsonError("Forbidden", 403);

    await db.notification.delete({ where: { id } });

    return jsonOk({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notifications/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
