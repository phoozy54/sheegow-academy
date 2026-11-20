import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireSuperAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import { backfillUsernames } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/username-migration
 * Super-admin only, one-shot maintenance endpoint.
 *
 * Adds the `username` column (and its unique index) if missing, then assigns a
 * unique handle to every account that does not have one. Once every account is
 * covered it returns 410 Gone, so repeated calls cannot change anything.
 */
export async function POST() {
  try {
    await requireSuperAdmin();

    const assigned = await backfillUsernames();
    if (assigned.length === 0) {
      return NextResponse.json(
        { success: true, alreadyDone: true, assigned: 0 },
        { status: 410 }
      );
    }

    logger.info(
      "[admin/username-migration]",
      `assigned ${assigned.length} username(s)`
    );
    return NextResponse.json({
      success: true,
      alreadyDone: false,
      assigned: assigned.length,
      usernames: assigned,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[admin/username-migration]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
