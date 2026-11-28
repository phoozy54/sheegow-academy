import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger"
import { db } from "@/lib/db";
import {
  clearAuthCookies,
  isCurrentSession,
  revokeUserSessions,
  sessionVersionOf,
  setAuthCookies,
  verifyRefreshToken,
} from "@/lib/auth";
import {
  ROTATION_COOKIE,
  classifyRotation,
  readRotation,
} from "@/lib/refresh-rotation";
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";
import { clientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/refresh
 *
 * G2/AUTH-3: refresh tokens are single-use. The signed HttpOnly rotation
 * cursor records the current and previous jti. Presenting any other token
 * (replay of an older one) revokes the whole session family.
 *
 * Rate limiting uses an anonymous connection bucket before token verification,
 * then a user+connection bucket. Keying only on userId would let anyone holding
 * a token exhaust that user's quota; keying only on a spoofable IP would let an
 * attacker rotate freely from multiple addresses. Both are per-instance
 * (documented residual pending a shared limiter).
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const ipLimited = limitRequest(`auth-refresh:ip:${ip}`, 60, 60_000);
    if (ipLimited) return ipLimited;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("sheegow_refresh")?.value;
    if (!refreshToken) return jsonError("Refresh token missing", 401);

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return jsonError("Invalid or expired refresh token", 401);

    const limited = limitRequest(`auth-refresh:${payload.userId}:${ip}`, 20, 60_000);
    if (limited) return limited;

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

    const rotation = readRotation(cookieStore.get(ROTATION_COOKIE)?.value);
    const decision = classifyRotation(
      rotation,
      payload.jti,
      payload.userId,
      payload.familyId
    );
    if (decision === "reuse") {
      // A valid signature but a stale jti means this token was already used.
      // Revoke every token in the family and clear the local credentials.
      await revokeUserSessions(user.id);
      await clearAuthCookies();
      logger.warn("[auth/refresh]", "refresh token reuse detected", {
        userId: user.id,
      });
      return jsonError("Session has been revoked", 401);
    }

    // Rotates the access token, refresh jti and the signed cursor together.
    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
      sessionVersion: sessionVersionOf(user),
      familyId: payload.familyId,
    });

    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/refresh]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
