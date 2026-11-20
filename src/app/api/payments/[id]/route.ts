import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireSuperAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

const VALID_STATUSES = new Set(["pending", "completed", "failed", "refunded"]);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/payments/:id
 * Super admin only. Updates a payment's record status.
 * Note: this does not reverse an enrollment — it only updates the ledger.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const status = String(body?.status ?? "").trim();
    if (!VALID_STATUSES.has(status)) {
      return jsonError("Invalid payment status", 400);
    }

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) return jsonError("Payment not found", 404);

    const payment = await db.payment.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ payment });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
