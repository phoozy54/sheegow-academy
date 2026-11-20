import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { comparePassword, setAuthCookies } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * A dummy bcrypt hash so that "user not found" takes a similar amount of time
 * to "wrong password", preventing user enumeration via response timing.
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.2i9Qd1QyLpQvDvNv0Z9oQ0n1VQK0Y2C";

/**
 * POST /api/auth/login
 * Verify credentials, set auth cookies, return the user.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const ipLimit = rateLimit(`login:ip:${ip}`, 50, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    const body = await safeBody<LoginBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    const attemptLimit = rateLimit(
      `login:${ip}:${email}`,
      8,
      15 * 60 * 1000
    );
    if (!attemptLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(attemptLimit.retryAfter) } }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always run a bcrypt comparison so timing does not reveal whether the
    // account exists.
    const ok = await comparePassword(password, user?.password || DUMMY_HASH);

    // Deliberately identical message for unknown, inactive and wrong-password
    // cases to avoid account enumeration.
    if (!user || !user.isActive || !ok) {
      return jsonError("Invalid email or password", 401);
    }

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
    logger.error("[auth/login]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
