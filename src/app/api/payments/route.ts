import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/payments
 * Admin (or super admin) only. Returns all payments with student/course
 * details and summary totals. Query params: ?status= &method= &limit= &offset=
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || null;
    const method = searchParams.get("method")?.trim() || null;
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 100, 1),
      500
    );
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const where = {
      ...(status ? { status } : {}),
      ...(method ? { method } : {}),
    } as const;

    const all = await db.payment.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
        course: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const summary = {
      total: all.length,
      completed: all.filter((p) => p.status === "completed").length,
      pending: all.filter((p) => p.status === "pending").length,
      failed: all.filter((p) => p.status === "failed").length,
      refunded: all.filter((p) => p.status === "refunded").length,
      revenue: all
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
    };

    return NextResponse.json({
      payments: all.slice(offset, offset + limit),
      summary,
      total: all.length,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
