import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface ValidateBody {
  code?: string;
  courseId?: string;
}

/**
 * POST /api/payments/coupon/validate
 * Validate a coupon code. Returns { valid: true, discount } when valid
 * (active + not expired), or { valid: false } otherwise.
 */
export async function POST(req: Request) {
  try {
    const body = await safeBody<ValidateBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const code = body.code?.trim();
    if (!code) return jsonError("Coupon code is required", 400);

    // courseId is accepted but only used to scope future per-course coupons.
    // Currently coupons are global, so we just verify the code.

    const coupon = await db.coupon.findUnique({ where: { code } });
    if (!coupon) return NextResponse.json({ valid: false });

    if (!coupon.active) return NextResponse.json({ valid: false });

    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now())
      return NextResponse.json({ valid: false });

    return NextResponse.json({ valid: true, discount: coupon.discount });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/coupon/validate]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
