import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, safeBody } from "@/lib/api-helpers";
import {
  TRIAL_METHOD,
  TRIAL_STATUSES,
  classIdFromTrial,
  trialApprovalStamp,
  trialExpiresAt,
} from "@/lib/trial";

type RouteContext = { params: Promise<{ id: string }> };

interface DecisionBody {
  action?: string;
}

/**
 * PATCH /api/admin/trial-requests/:id
 * Admin or super admin approves/rejects a student's timed trial request.
 * Approval grants a 7-day enrollment for the related course (when present)
 * and flips the trial payment to "completed" so all existing gates accept it.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await safeBody<DecisionBody>(req);
    const action = body?.action;

    if (action !== "approve" && action !== "reject") {
      return jsonError("action must be 'approve' or 'reject'", 400);
    }

    const payment = await db.payment.findFirst({
      where: { id, method: TRIAL_METHOD },
      select: {
        id: true,
        studentId: true,
        courseId: true,
        status: true,
        transactionId: true,
      },
    });
    if (!payment) return jsonError("Trial request not found", 404);

    const approved = action === "approve";
    const approvedAt = new Date();
    const expiresAt = approved ? trialExpiresAt(approvedAt) : null;

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: approved ? TRIAL_STATUSES.approved : TRIAL_STATUSES.rejected,
          couponCode: approved ? trialApprovalStamp(admin.id, approvedAt) : null,
        },
        select: {
          id: true,
          studentId: true,
          courseId: true,
          status: true,
          transactionId: true,
          createdAt: true,
        },
      });

      if (approved && payment.courseId) {
        await tx.enrollment.upsert({
          where: {
            studentId_courseId: {
              studentId: payment.studentId,
              courseId: payment.courseId,
            },
          },
          create: {
            studentId: payment.studentId,
            courseId: payment.courseId,
            paymentId: payment.id,
            expiresAt,
          },
          update: {
            paymentId: payment.id,
            expiresAt,
          },
        });
      }

      return row;
    });

    logger.info("[admin/trial-requests]", action === "approve" ? "trial approved" : "trial rejected", {
      requestId: payment.id,
      studentId: payment.studentId,
      classId: classIdFromTrial(payment.transactionId),
      adminId: admin.id,
    });

    return NextResponse.json({
      request: {
        id: updated.id,
        studentId: updated.studentId,
        courseId: updated.courseId,
        classId: classIdFromTrial(updated.transactionId),
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        approvedBy: approved ? admin.id : null,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[admin/trial-requests/decide]", "failed", e);
    return jsonError("Internal server error", 500);
  }
}
