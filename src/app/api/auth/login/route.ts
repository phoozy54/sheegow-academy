import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, setAuthCookies } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * POST /api/auth/login
 * Verify credentials, set auth cookies, return the user.
 */
export async function POST(req: Request) {
  try {
    const body = await safeBody<LoginBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password)
      return jsonError("Email and password are required", 400);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return jsonError("Invalid email or password", 401);
    if (!user.isActive) return jsonError("Account is deactivated", 403);

    const ok = await comparePassword(password, user.password);
    if (!ok) return jsonError("Invalid email or password", 401);

    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        level: user.level,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[auth/login] error:", e);
    return jsonError("Internal server error", 500);
  }
}
