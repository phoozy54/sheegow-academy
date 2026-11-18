import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * POST /api/auth/logout
 * Clear auth cookies and return success.
 */
export async function POST() {
  try {
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[auth/logout] error:", e);
    return jsonError("Internal server error", 500);
  }
}
