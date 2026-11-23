import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isAdminRole } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, limitRequest, safeBody } from "@/lib/api-helpers";

interface CreateRefundBody {
  paymentId?: string;
  reason?: string;
}

function serialize(refund: {
  id: string;
  paymentId: string;
  studentId: string;
  reason: string;
  status: string;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  payment?: {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: Date;
    course?: { id: string; title: string; level: string | null; image: string | null } | null;
  } | null;
  student?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    profilePicture: string | null;
  } | null;
}) {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    studentId: refund.studentId,
    reason: refund.reason,
    status: refund.status,
    adminNote: refund.adminNote,
    reviewedBy: refund.reviewedBy,
    reviewedAt: refund.reviewedAt?.toISOString() ?? null,
    createdAt: refund.createdAt.toISOString(),
    payment: refund.payment
      ? {
          id: refund.payment.id,
          amount: refund.payment.amount,
          method: refund.payment.method,
          status: refund.payment.status,
          createdAt: refund.payment.createdAt.toISOString(),
          course: refund.payment.course ?? null,
        }
      : null,
    student: refund.student ?? null,
  };
}

/**
 * GET /api/refunds
 * - Students see only their own refund requests.
 * - Admins / super admins see every refund request (with student + payment +
 *   course info) so the admin console can render the full review queue.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const isAdmin = isAdminRole(user.role);
    const refunds = await db.refundRequest.findMany({
      where: isAdmin ? {} : { studentId: user.id },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true,
            course: {
              select: { id: true, title: true, level: true, image: true },
            },
          },
        },
        ...(isAdmin
          ? {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  profilePicture: true,
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ refunds: refunds.map(serialize) });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[refunds/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/refunds
 * Create a refund request for one of the student's own completed payments.
 * Blocked when:
 *  - the payment does not belong to the student
 *  - the payment status is not "completed"
 *  - a pending or approved refund already exists for the payment
 *    (the 1:1 relation guarantees at most one row per payment)
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limited = limitRequest(`refund:${user.id}`, 5, 10 * 60 * 1000);
    if (limited) return limited;

    const body = await safeBody<CreateRefundBody>(req);
    const paymentId = body?.paymentId?.trim();
    const reason = body?.reason?.trim();

    if (!paymentId) return jsonError("paymentId is required", 400);
    if (!reason) return jsonError("Please provide a reason for your refund request", 400);
    if (reason.length > 2000) {
      return jsonError("Reason is too long (max 2000 characters)", 400);
    }

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        studentId: true,
        status: true,
        amount: true,
        method: true,
      },
    });
    if (!payment) return jsonError("Payment not found", 404);
    if (payment.studentId !== user.id) {
      return jsonError("You can only request refunds for your own payments", 403);
    }
    if (payment.status !== "completed") {
      return jsonError(
        `Refunds are only available for completed payments (this payment is ${payment.status})`,
        400
      );
    }

    // The 1:1 relation (paymentId @unique) blocks a duplicate pending refund
    // at the database layer. We surface a friendly message when it happens.
    const existing = await db.refundRequest.findUnique({
      where: { paymentId: payment.id },
      select: { id: true, status: true },
    });
    if (existing && (existing.status === "pending" || existing.status === "approved")) {
      return jsonError(
        existing.status === "pending"
          ? "A refund request for this payment is already under review"
          : "This payment has already been refunded",
        409
      );
    }

    // Reuse a previously-rejected row (so there is only one record per payment)
    // instead of creating a duplicate.
    const refund = existing
      ? await db.refundRequest.update({
          where: { id: existing.id },
          data: {
            reason,
            status: "pending",
            adminNote: null,
            reviewedBy: null,
            reviewedAt: null,
          },
          include: {
            payment: {
              select: {
                id: true,
                amount: true,
                method: true,
                status: true,
                createdAt: true,
                course: {
                  select: { id: true, title: true, level: true, image: true },
                },
              },
            },
          },
        })
      : await db.refundRequest.create({
          data: {
            paymentId: payment.id,
            studentId: user.id,
            reason,
          },
          include: {
            payment: {
              select: {
                id: true,
                amount: true,
                method: true,
                status: true,
                createdAt: true,
                course: {
                  select: { id: true, title: true, level: true, image: true },
                },
              },
            },
          },
        });

    logger.info("[refunds/create]", "refund requested", {
      refundId: refund.id,
      studentId: user.id,
      paymentId: payment.id,
    });

    return NextResponse.json({ refund: serialize(refund) }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[refunds/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
