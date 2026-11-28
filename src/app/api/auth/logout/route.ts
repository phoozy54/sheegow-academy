import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  clearAuthCookies,
  isCurrentSession,
  revokeUserSessions,
  verifyRefreshToken,
} from "@/lib/auth";
import { logger } from "@/lib/logger"
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";
import { clientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/logout
 * Clear auth cookies AND advance the user's session epoch, so a refresh token
 * that was copied elsewhere can no longer be replayed after logout.
 *
 * The userId comes from the signed refresh cookie (never client input). A
 * token that is already stale must NOT change revocation state — otherwise a
 * stolen, revoked token could repeatedly log the user out of every device.
 */
export async function POST(req: Request) {
  try {
    const limited = limitRequest(`auth-logout:${clientIp(req)}`, 10, 60_000);
    if (limited) return limited;

    const refreshToken = (await cookies()).get("sheegow_refresh")?.value;
    const payload = refreshToken ? verifyRefreshToken(refreshToken) : null;
    if (payload?.userId) {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { updatedAt: true },
      });
      if (user && isCurrentSession(payload, user)) {
        await revokeUserSessions(payload.userId);
      }
    }
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/logout]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
