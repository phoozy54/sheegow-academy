import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * In-app notification creator.
 *
 * Notifications are best-effort: a failure here must NEVER break the parent
 * request (posting an announcement, replying to a thread, sending a DM).
 * We swallow the error and log it so the user-facing action still succeeds.
 *
 * Allowed `type` values match the UI switch in NotificationBell:
 *   "announcement" | "reply" | "message" | "class" | "system"
 */
export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title: title.slice(0, 300),
        body: body.slice(0, 1_000),
        link: link ?? null,
      },
    });
  } catch (e) {
    // logger.warn does not accept an error arg, so we route the failure
    // through logger.error which preserves the stack trace.
    logger.error("[notify]", "failed to create notification", e, {
      userId,
      type,
    });
  }
}

/**
 * Fan-out helper: notify many users in parallel. Each call is wrapped in its
 * own try/catch (via `notify`), so one bad row never aborts the rest.
 */
export async function notifyMany(
  userIds: string[],
  type: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all(
    userIds.map((id) => notify(id, type, title, body, link))
  );
}
