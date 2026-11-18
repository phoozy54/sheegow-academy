import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/auth/me
 * Return the currently authenticated user, or 401 if not logged in.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[auth/me] error:", e);
    return jsonError("Internal server error", 500);
  }
}
