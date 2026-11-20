import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { hashPassword, setAuthCookies } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";

interface RegisterBody {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

/**
 * POST /api/auth/register
 * Create a new student account, set auth cookies and return the user.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limit = rateLimit(`register:${ip}`, 8, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many accounts created. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await safeBody<RegisterBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = normalizeSomaliPhone(body.phone || "");
    const password = body.password;

    // ── Validate inputs ──
    if (!fullName) return jsonError("Full name is required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (!isValidSomaliPhone(phone))
      return jsonError(
        "Enter a valid Somali phone number starting with 61, 63 or 65",
        400
      );
    if (!password || password.length < 12)
      return jsonError("Password must be at least 12 characters", 400);

    // ── Reject duplicate emails ──
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return jsonError("Email already registered", 409);

    const hashed = await hashPassword(password);

    const user = await db.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashed,
        role: "student",
      },
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

    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/register]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
