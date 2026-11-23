import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ courseId: string }> };

/**
 * GET /api/wishlist/[courseId]
 * Quick lookup used by course cards to render a filled heart.
 * Returns { wishlisted: boolean }.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { courseId } = await params;

    const row = await db.wishlist.findUnique({
      where: {
        studentId_courseId: { studentId: user.id, courseId },
      },
      select: { id: true },
    });

    return NextResponse.json({ wishlisted: !!row });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[wishlist/check]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/wishlist/[courseId]
 * Remove a specific course from the current user's wishlist.
 * Idempotent — returns success even if the row was already gone.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { courseId } = await params;

    await db.wishlist.deleteMany({
      where: { studentId: user.id, courseId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[wishlist/remove-one]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
