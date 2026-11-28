import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger"
import { db } from "@/lib/db";
import {
  isCurrentSession,
  sessionVersionOf,
  setAuthCookies,
  verifyRefreshToken,
} from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";
import { clientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/refresh
 * Read the refresh token cookie, verify it, then issue a fresh pair of
 * auth cookies and return the current user.
 */
export async function POST(req: Request) {
  try {
    const limited = limitRequest(`auth-refresh:${clientIp(req)}`, 20, 60_000);
    if (limited) return limited;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("sheegow_refresh")?.value;
    if (!refreshToken) return jsonError("Refresh token missing", 401);

    const payload = verifyRefreshToken(refreshToken);
    if (!payload)
      return jsonError("Invalid or expired refresh token", 401);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        profilePicture: true,
        bio: true,
        level: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return jsonError("User not found", 404);
    if (!user.isActive) return jsonError("Account is deactivated", 403);
    // Reject refresh tokens issued before a logout or password change.
    if (!isCurrentSession(payload, user))
      return jsonError("Session has been revoked", 401);

    // Issue a fresh pair of cookies (rotates the access token) with the
    // current session epoch — the revoked older token stays invalid.
    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
      sessionVersion: sessionVersionOf(user),
    });

    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/refresh]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
