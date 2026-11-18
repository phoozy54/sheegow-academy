import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { setAuthCookies, verifyRefreshToken } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * POST /api/auth/refresh
 * Read the refresh token cookie, verify it, then issue a fresh pair of
 * auth cookies and return the current user.
 */
export async function POST() {
  try {
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

    // Issue a fresh pair of cookies (rotates the access token)
    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[auth/refresh] error:", e);
    return jsonError("Internal server error", 500);
  }
}
