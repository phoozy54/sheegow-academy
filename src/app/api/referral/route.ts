import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, limitRequest } from "@/lib/api-helpers";

/** Default percentage discount applied to a referred user's first course. */
const DEFAULT_DISCOUNT = 10;
/** Cap for the discount when a code is generated. */
const MAX_DISCOUNT = 50;

/** Build a unique human-readable code from a full name (e.g. "Ahmed Ali" → "AHMED10"). */
async function buildCodeFromName(fullName: string, userId: string): Promise<string> {
  // Strip accents + non-letters, uppercase, take the first word.
  const base = fullName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toUpperCase())
    .slice(0, 1)
    .join("")
    .slice(0, 12);

  const safeBase = base.length >= 3 ? base : "SHEEGOW";

  // Try a small numeric suffix (the discount value) before falling back to a
  // random id so codes stay readable ("AHMED10" instead of "AHMED8F2K3").
  const candidates = [
    `${safeBase}${DEFAULT_DISCOUNT}`,
    `${safeBase}1`,
    `${safeBase}2`,
    `${safeBase}3`,
  ];
  for (const candidate of candidates) {
    const existing = await db.referralCode.findUnique({
      where: { code: candidate },
    });
    if (!existing) return candidate;
  }

  // Last resort — append a short slice of the user id.
  const suffix = userId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  const fallback = `${safeBase}${suffix}`;
  const clash = await db.referralCode.findUnique({ where: { code: fallback } });
  if (!clash) return fallback;

  // Truly pathological case — random hex.
  return `${safeBase}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * GET /api/referral
 * Returns the caller's referral code (if any) + aggregate stats:
 * total referrals, total discount earned (sum of discounts given to referees)
 * and whether the caller has already been referred themselves.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const [code, referredBy, referrals] = await Promise.all([
      db.referralCode.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          code: true,
          discount: true,
          createdAt: true,
        },
      }),
      db.referral.findUnique({
        where: { referredId: user.id },
        select: { id: true },
      }),
      db.referral.findMany({
        where: { referrerId: user.id },
        select: { id: true, createdAt: true },
      }),
    ]);

    // Each successful referral earned the same default discount percentage
    // (the discount granted to the referred friend). Surface the running total
    // as the "discount earned" stat — it represents how much money-off the
    // referrer has indirectly generated for their network.
    const totalDiscountEarned = referrals.length * DEFAULT_DISCOUNT;

    return NextResponse.json({
      code: code
        ? {
            id: code.id,
            code: code.code,
            discount: code.discount,
            createdAt: code.createdAt.toISOString(),
          }
        : null,
      totalReferrals: referrals.length,
      totalDiscountEarned,
      wasReferred: !!referredBy,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[referral/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

interface GenerateBody {
  code?: string;
  discount?: number;
}

/**
 * POST /api/referral
 * Claim (or regenerate) the caller's referral code. If `code` is supplied we
 * validate + use it (when free); otherwise we auto-generate one from the
 * caller's full name. Idempotent: returns the existing code when one exists.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limited = limitRequest(`referral:${user.id}`, 10, 60_000);
    if (limited) return limited;

    // Idempotent — if the user already has a code, return it as-is.
    const existing = await db.referralCode.findUnique({
      where: { userId: user.id },
    });

    const body = await safeBody<GenerateBody>(req);
    const requestedCode = body?.code?.trim().toUpperCase();
    const requestedDiscount =
      typeof body?.discount === "number" &&
      Number.isFinite(body.discount) &&
      body.discount > 0 &&
      body.discount <= MAX_DISCOUNT
        ? body.discount
        : DEFAULT_DISCOUNT;

    if (existing) {
      // Count referrals made with this code by querying the Referral table
      // directly (no FK from Referral → ReferralCode; they share `code`).
      const totalReferrals = await db.referral.count({
        where: { referrerId: user.id },
      });
      return NextResponse.json({
        code: {
          id: existing.id,
          code: existing.code,
          discount: existing.discount,
          createdAt: existing.createdAt.toISOString(),
        },
        totalReferrals,
        totalDiscountEarned: totalReferrals * DEFAULT_DISCOUNT,
        wasReferred: false,
      });
    }

    // Validate a user-supplied code: 3-16 chars, A-Z + 0-9 only.
    if (requestedCode) {
      if (!/^[A-Z0-9]{3,16}$/.test(requestedCode)) {
        return jsonError(
          "Code must be 3-16 characters: A-Z and 0-9 only.",
          400
        );
      }
      const taken = await db.referralCode.findUnique({
        where: { code: requestedCode },
      });
      if (taken) {
        return jsonError("That referral code is already taken.", 409);
      }
    }

    const code = requestedCode || (await buildCodeFromName(user.fullName, user.id));

    // Race-safe: if a concurrent request created the same code, retry once.
    let created;
    try {
      created = await db.referralCode.create({
        data: {
          userId: user.id,
          code,
          discount: requestedDiscount,
        },
      });
    } catch {
      const fallback = await buildCodeFromName(user.fullName, user.id);
      created = await db.referralCode.create({
        data: {
          userId: user.id,
          code: fallback,
          discount: requestedDiscount,
        },
      });
    }

    return NextResponse.json(
      {
        code: {
          id: created.id,
          code: created.code,
          discount: created.discount,
          createdAt: created.createdAt.toISOString(),
        },
        totalReferrals: 0,
        totalDiscountEarned: 0,
        wasReferred: false,
      },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[referral/post]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
