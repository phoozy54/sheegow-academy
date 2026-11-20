import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAdminRole, requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/polls/:id — close a poll (teacher/admin). */
export async function PATCH(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const limited = limitRequest(`poll-end:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const poll = await db.poll.findUnique({
      where: { id },
      include: { liveClass: { select: { teacherId: true } } },
    });
    if (!poll) return jsonError("Poll not found", 404);
    if (!isAdminRole(user.role) && poll.liveClass.teacherId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const updated = await db.poll.update({
      where: { id },
      data: { endedAt: new Date() },
    });
    return NextResponse.json({ poll: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[polls/end]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
