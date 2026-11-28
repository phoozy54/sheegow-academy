import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { comparePassword, sessionVersionOf, setAuthCookies } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import {
  classifyIdentifier,
  ensureUsernameSchema,
  normalizeUsername,
} from "@/lib/username";
import { phoneLookupVariants } from "@/lib/phone";
import { ensurePhoneNormalization } from "@/lib/phone-data";

interface LoginBody {
  /** Username, email or Somali phone number. `email` is kept for compatibility. */
  identifier?: string;
  email?: string;
  username?: string;
  phone?: string;
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
    const ipLimit = rateLimit(`login:ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    const body = await safeBody<LoginBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const rawIdentifier =
      body.identifier?.trim() ||
      body.email?.trim() ||
      body.username?.trim() ||
      body.phone?.trim() ||
      "";
    const password = body.password;
    if (!rawIdentifier || !password) {
      return jsonError("Username, email or phone and password are required", 400);
    }

    const kind = classifyIdentifier(rawIdentifier);
    if (kind === "invalid") {
      return jsonError("Enter a valid username, email or Somali phone number", 400);
    }

    const normalizedIdentifier =
      kind === "email"
        ? rawIdentifier.toLowerCase()
        : kind === "username"
          ? normalizeUsername(rawIdentifier.replace(/^@/, ""))
          : rawIdentifier;

    const attemptLimit = rateLimit(
      `login:${ip}:${normalizedIdentifier.toLowerCase()}`,
      8,
      15 * 60 * 1000
    );
    if (!attemptLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(attemptLimit.retryAfter) } }
      );
    }

    await ensureUsernameSchema();

    // Rewrite legacy display-form phones to 9 digits. Non-fatal: the lookup
    // below also accepts the old variants, so login works either way.
    try {
      await ensurePhoneNormalization();
    } catch (e) {
      logger.warn("[auth/login]", "phone normalization skipped", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let user;
    if (kind === "email") {
      user = await db.user.findUnique({
        where: { email: rawIdentifier.toLowerCase() },
      });
    } else if (kind === "phone") {
      user = await db.user.findFirst({
        where: { phone: { in: phoneLookupVariants(rawIdentifier) } },
      });
    } else {
      user = await db.user.findUnique({
        where: { username: normalizedIdentifier },
      });
    }

    // Always run a bcrypt comparison so timing does not reveal whether the
    // account exists.
    const ok = await comparePassword(password, user?.password || DUMMY_HASH);

    // Deliberately identical message for unknown, inactive and wrong-password
    // cases to avoid account enumeration.
    if (!user || !user.isActive || !ok) {
      return jsonError("Invalid username, email, phone or password", 401);
    }

    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
      sessionVersion: sessionVersionOf(user),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
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
