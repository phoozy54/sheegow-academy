import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { hashPassword, setAuthCookies } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";
import {
  allocateUsername,
  ensureUsernameSchema,
  usernameErrorResponse,
} from "@/lib/username";
import { sendWelcomeEmail } from "@/lib/email";

interface RegisterBody {
  fullName?: string;
  email?: string;
  username?: string;
  phone?: string;
  password?: string;
  /** Optional referral code (?ref=CODE) — auto-links on signup. */
  ref?: string;
}

/** Default discount granted to a referred user (one-time coupon). */
const REFERRAL_DISCOUNT = 10;
/** Coupons never expire — they're one-time-use, deactivated on redemption. */
const COUPON_TTL_DAYS = 365;

/**
 * Best-effort referral linking: when a new user supplies a valid referral
 * code (either via the ?ref= query param or the `ref` body field), create a
 * Referral record + a one-time discount coupon for them. Failures are logged
 * but never block the registration flow — the account is already created.
 */
async function linkReferral(params: {
  newUserId: string;
  refCode: string;
}): Promise<void> {
  const { newUserId, refCode } = params;
  const code = refCode.trim().toUpperCase();
  if (!code) return;

  const referralCode = await db.referralCode.findUnique({
    where: { code },
    select: { id: true, userId: true, discount: true },
  });
  if (!referralCode) {
    logger.warn("[auth/register]", "referral code not found", { code });
    return;
  }
  // Self-referral is impossible at signup (the user just got created) but
  // guard anyway so a future bug can't create a loop.
  if (referralCode.userId === newUserId) return;

  // The caller may already have been referred (race during signup). Skip
  // silently — the existing record + coupon already cover them.
  const existing = await db.referral.findUnique({
    where: { referredId: newUserId },
    select: { id: true },
  });
  if (existing) return;

  const couponCode = `REF-${code}-${newUserId
    .replace(/[^a-z0-9]/gi, "")
    .slice(-4)
    .toUpperCase()}`;

  await db.$transaction([
    db.referral.create({
      data: {
        referrerId: referralCode.userId,
        referredId: newUserId,
        code,
      },
    }),
    db.coupon.upsert({
      where: { code: couponCode },
      create: {
        code: couponCode,
        discount: referralCode.discount || REFERRAL_DISCOUNT,
        active: true,
        expiresAt: new Date(Date.now() + COUPON_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      update: {
        active: true,
        discount: referralCode.discount || REFERRAL_DISCOUNT,
        expiresAt: new Date(Date.now() + COUPON_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
}

/**
 * POST /api/auth/register
 * Create a new student account, set auth cookies and return the user.
 * Accepts an optional `ref` query param or body field with a referral code;
 * when valid, a Referral record + one-time discount coupon are auto-created.
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
    const preferredUsername = body.username?.trim() || null;
    const password = body.password;

    // Referral code: prefer the ?ref= query param, fall back to the body field.
    const { searchParams } = new URL(req.url);
    const refCode = (searchParams.get("ref") || body.ref || "").trim();

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

    await ensureUsernameSchema();

    let username: string;
    try {
      username = await allocateUsername({
        fullName,
        role: "student",
        preferred: preferredUsername,
      });
    } catch (e) {
      const err = usernameErrorResponse(e);
      if (err) return jsonError(err.message, err.status);
      throw e;
    }

    const hashed = await hashPassword(password);

    const user = await db.user.create({
      data: {
        fullName,
        email,
        username,
        phone,
        password: hashed,
        role: "student",
      },
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

    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // Send a welcome email. Best-effort: failures are logged but never
    // crash the registration flow (the user is already created + signed in).
    try {
      await sendWelcomeEmail(user.email, user.fullName);
    } catch (e) {
      logger.error("[auth/register]", "welcome email failed", e, {
        userId: user.id,
      });
    }

    // Auto-link a referral if a code was supplied. Best-effort: any failure
    // is logged but never blocks the registration flow.
    if (refCode) {
      try {
        await linkReferral({ newUserId: user.id, refCode });
      } catch (e) {
        logger.error("[auth/register]", "referral link failed", e, {
          userId: user.id,
          code: refCode,
        });
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/register]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
