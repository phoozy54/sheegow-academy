import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, limitRequest } from "@/lib/api-helpers";

/** Default percentage discount granted to a referred user (one-time coupon). */
const DEFAULT_DISCOUNT = 10;
/** Coupons never expire — they're one-time-use, deactivated on redemption. */
const COUPON_TTL_DAYS = 365;

interface ApplyBody {
  code?: string;
}

/**
 * POST /api/referral/apply
 * Apply a referral code on behalf of the caller. Validates the code, creates a
 * Referral record (referrer → caller), generates a one-time discount coupon
 * and returns its details. The caller cannot use their own code, and can only
 * be referred once.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limited = limitRequest(`referral:apply:${user.id}`, 10, 60_000);
    if (limited) return limited;

    const body = await safeBody<ApplyBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const rawCode = body.code?.trim().toUpperCase();
    if (!rawCode) return jsonError("Referral code is required", 400);

    // The caller cannot have been referred before.
    const alreadyReferred = await db.referral.findUnique({
      where: { referredId: user.id },
    });
    if (alreadyReferred) {
      return jsonError("You have already used a referral code.", 409);
    }

    const code = await db.referralCode.findUnique({
      where: { code: rawCode },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!code) return jsonError("Invalid referral code.", 404);

    // Self-referral guard.
    if (code.userId === user.id) {
      return jsonError("You cannot use your own referral code.", 400);
    }

    // Generate a unique coupon code tied to this referral (one-time use).
    const couponCode = `REF-${rawCode}-${user.id
      .replace(/[^a-z0-9]/gi, "")
      .slice(-4)
      .toUpperCase()}`;

    // One transaction so the referral + coupon land together (or not at all).
    await db.$transaction([
      db.referral.create({
        data: {
          referrerId: code.userId,
          referredId: user.id,
          code: rawCode,
        },
      }),
      db.coupon.upsert({
        where: { code: couponCode },
        create: {
          code: couponCode,
          discount: code.discount || DEFAULT_DISCOUNT,
          active: true,
          expiresAt: new Date(Date.now() + COUPON_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
        update: {
          // Re-activate if a stale duplicate existed (very unlikely).
          active: true,
          discount: code.discount || DEFAULT_DISCOUNT,
          expiresAt: new Date(Date.now() + COUPON_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      couponCode,
      discount: code.discount || DEFAULT_DISCOUNT,
      referrerName: code.user.fullName,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[referral/apply]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
