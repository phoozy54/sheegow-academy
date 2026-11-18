import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/payments/history
 * Return the current user's payments with course included.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const payments = await db.payment.findMany({
      where: { studentId: user.id },
      include: {
        course: {
          select: { id: true, title: true, level: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[payments/history] error:", e);
    return jsonError("Internal server error", 500);
  }
}
