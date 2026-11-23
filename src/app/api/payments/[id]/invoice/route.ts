import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  isAdminRole,
  requireAuth,
} from "@/lib/auth";
import { jsonError, jsonOk, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/payments/:id/invoice
 * Returns the data needed to render a printable PDF invoice / receipt.
 *
 * Authorization:
 *  - The payment owner (student) can fetch their own invoice.
 *  - Admins/super-admins can fetch any payment's invoice (the admin payments
 *    view links to the same page).
 *
 * The response is intentionally a flat shape — it is consumed directly by the
 * printable invoice page at /invoice/[paymentId].
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const viewer = await requireAuth();
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        courseId: true,
        amount: true,
        method: true,
        status: true,
        transactionId: true,
        couponCode: true,
        createdAt: true,
        student: {
          select: { id: true, fullName: true, email: true },
        },
        course: {
          select: { id: true, title: true, level: true },
        },
      },
    });

    if (!payment) return jsonError("Payment not found", 404);

    const isOwner = payment.studentId === viewer.id;
    const canView = isOwner || isAdminRole(viewer.role);
    if (!canView) return jsonError("Forbidden", 403);

    // Stable invoice number — derived from the payment id (no PII) so it can
    // be reproduced deterministically across requests. We strip non-alphanum
    // chars and uppercase, then prefix with the year for a professional look.
    const year = new Date(payment.createdAt).getFullYear();
    const safeId = payment.id.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-8);
    const invoiceNumber = `INV-${year}-${safeId}`;

    return jsonOk({
      paymentId: payment.id,
      invoiceNumber,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      couponCode: payment.couponCode,
      createdAt: payment.createdAt.toISOString(),
      student: {
        id: payment.student.id,
        fullName: payment.student.fullName,
        email: payment.student.email,
      },
      course: payment.course
        ? {
            id: payment.course.id,
            title: payment.course.title,
            level: payment.course.level,
          }
        : null,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/invoice]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
