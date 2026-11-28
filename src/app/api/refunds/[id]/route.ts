import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireAuth, isAdminRole } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { sendRefundEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, safeBody } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

interface DecideBody {
  status?: string;
  adminNote?: string;
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
 * GET /api/refunds/:id
 * Students may only fetch their own refund requests; admins may fetch any.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const refund = await db.refundRequest.findUnique({
      where: { id },
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
        ...(isAdminRole(user.role)
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
    });
    if (!refund) return jsonError("Refund request not found", 404);

    if (!isAdminRole(user.role) && refund.studentId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    return NextResponse.json({ refund: serialize(refund) });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[refunds/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * PATCH /api/refunds/:id
 * Admin or super admin approves / rejects a refund request. Approval flips the
 * linked payment status to "refunded" and notifies the student. Rejecting
 * leaves the payment as "completed" and also notifies the student.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await safeBody<DecideBody>(req);
    const status = body?.status;
    const adminNote = body?.adminNote?.trim() || null;

    if (status !== "approved" && status !== "rejected") {
      return jsonError("status must be 'approved' or 'rejected'", 400);
    }
    if (adminNote && adminNote.length > 2000) {
      return jsonError("Admin note is too long (max 2000 characters)", 400);
    }

    const refund = await db.refundRequest.findUnique({
      where: { id },
      select: {
        id: true,
        paymentId: true,
        studentId: true,
        reason: true,
        status: true,
        // Needed to revoke the exact enrollment + certificate on approval.
        payment: { select: { courseId: true } },
      },
    });
    if (!refund) return jsonError("Refund request not found", 404);
    if (refund.status !== "pending") {
      return jsonError(
        `This refund request has already been ${refund.status}`,
        409
      );
    }

    const approved = status === "approved";
    // A free-only bundle has a zero-amount receipt payment with no courseId.
    // There is no paid enrollment to revoke, so do not approve a refund
    // against it (rejection remains allowed).
    if (approved && !refund.payment?.courseId) {
      return jsonError("This payment has no refundable enrollment", 400);
    }
    const reviewedAt = new Date();

    const updated = await db.$transaction(async (tx) => {
      // G2/PAY-3: atomic claim. The pre-read status check above is outside the
      // transaction, so two concurrent approvals must be stopped here.
      const claimed = await tx.refundRequest.updateMany({
        where: { id: refund.id, status: "pending" },
        data: {
          status: approved ? "approved" : "rejected",
          adminNote,
          reviewedBy: admin.id,
          reviewedAt,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("REFUND_ALREADY_REVIEWED");
      }

      if (approved) {
        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: "refunded" },
        });

        // Revocation is part of the SAME transaction. Enrollment status
        // "revoked" is not in content-access's allow-list, so course content
        // is immediately unavailable; public certificate verification reads
        // revokedAt and now reports the certificate as invalid.
        const courseId = refund.payment?.courseId;
        if (courseId) {
          await tx.enrollment.updateMany({
            where: { studentId: refund.studentId, courseId },
            data: { status: "revoked" },
          });
          await tx.certificate.updateMany({
            where: { studentId: refund.studentId, courseId },
            data: { revokedAt: reviewedAt },
          });
        }
      }

      return tx.refundRequest.findUniqueOrThrow({
        where: { id: refund.id },
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
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profilePicture: true,
            },
          },
        },
      });
    });

    // Notify the student. Best-effort: notify() swallows its own errors so a
    // notification failure never aborts the refund decision.
    const courseTitle = updated.payment?.course?.title ?? "your course";
    const amount = updated.payment?.amount.toFixed(2) ?? "0.00";
    const studentEmail = updated.student?.email;
    const studentName = updated.student?.fullName ?? "Student";

    if (approved) {
      await notify(
        refund.studentId,
        "system",
        "Refund approved",
        `Your refund request for "${courseTitle}" has been approved. The payment of $${amount} has been marked as refunded.${
          adminNote ? ` Note: ${adminNote}` : ""
        }`,
        "/dashboard?section=my-refunds"
      );
    } else {
      await notify(
        refund.studentId,
        "system",
        "Refund request rejected",
        `Your refund request for "${courseTitle}" was rejected.${
          adminNote ? ` Reason: ${adminNote}` : ""
        }`,
        "/dashboard?section=my-refunds"
      );
    }

    // Best-effort: email the student the decision as well.
    // `sendRefundEmail` is a no-op when RESEND_API_KEY is missing and never
    // throws — but we wrap in try/catch as an extra safety net.
    if (studentEmail) {
      try {
        const delivered = await sendRefundEmail(
          studentEmail,
          studentName,
          approved ? "approved" : "rejected",
          `$${amount}`,
          courseTitle,
          adminNote
        );
        if (!delivered.ok)
          logger.warn("[refunds/decide]", "refund email not delivered", {
            refundId: refund.id,
          });
      } catch (emailErr) {
        logger.error("[refunds/decide]", "refund email failed", emailErr, {
          refundId: refund.id,
        });
      }
    }

    logger.info("[refunds/decide]", approved ? "refund approved" : "refund rejected", {
      refundId: refund.id,
      studentId: refund.studentId,
      adminId: admin.id,
    });

    return NextResponse.json({ refund: serialize(updated) });
  } catch (e) {
    if (e instanceof Error && e.message === "REFUND_ALREADY_REVIEWED") {
      return jsonError("This refund request has already been reviewed", 409);
    }
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[refunds/decide]", "failed", e);
    return jsonError("Internal server error", 500);
  }
}
