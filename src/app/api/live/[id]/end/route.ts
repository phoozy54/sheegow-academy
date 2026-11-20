import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { canManageLiveClass, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/live/:id/end
 * Mark a live class as "ended". Only its teacher or an admin may do this.
 */
export async function PUT(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id } = await params;

    const existing = await db.liveClass.findUnique({ where: { id } });
    if (!existing) return jsonError("Live class not found", 404);
    if (!canManageLiveClass(actor, existing.teacherId)) {
      return jsonError("Forbidden", 403);
    }

    const liveClass = await db.liveClass.update({
      where: { id },
      data: { status: "ended" },
    });

    return NextResponse.json({ liveClass });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/end]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
