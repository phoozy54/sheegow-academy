import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger"
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/auth/me
 * Returns the current user, or `{ user: null }` for anonymous visitors.
 * A 401 here is a normal state on public pages, not a session failure —
 * returning 200 avoids console errors and pointless refresh attempts.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ?? null });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/me]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
