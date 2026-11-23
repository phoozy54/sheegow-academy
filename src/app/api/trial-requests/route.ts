import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, limitRequest, safeBody } from "@/lib/api-helpers";
import {
  TRIAL_CLASS_PREFIX,
  TRIAL_DAYS,
  TRIAL_METHOD,
  TRIAL_STATUSES,
  approvedTrialAt,
  classIdFromTrial,
  trialStillValid,
  trialTransactionId,
} from "@/lib/trial";

interface TrialBody {
  classId?: string;
}

type TrialRow = {
  id: string;
  studentId: string;
  courseId: string | null;
  status: string;
  transactionId: string | null;
  couponCode: string | null;
  createdAt: Date;
};

function toRequest(payment: TrialRow) {
  const approvedAt = approvedTrialAt(payment.couponCode);
  return {
    id: payment.id,
    studentId: payment.studentId,
    courseId: payment.courseId,
    classId: classIdFromTrial(payment.transactionId),
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
    expiresAt: approvedAt
      ? new Date(approvedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null,
  };
}

/** GET /api/trial-requests — the current student's own requests. */
export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return NextResponse.json({ requests: [] });

    const payments = await db.payment.findMany({
      where: {
        studentId: user.id,
        method: TRIAL_METHOD,
        transactionId: { startsWith: TRIAL_CLASS_PREFIX },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const classes = payments.length
      ? await db.liveClass.findMany({
          where: {
            id: {
              in: payments
                .map((p) => classIdFromTrial(p.transactionId))
                .filter((id): id is string => Boolean(id)),
            },
          },
          select: { id: true, title: true, status: true, scheduledAt: true },
        })
      : [];

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const requests = payments.map((p) => {
      const classId = classIdFromTrial(p.transactionId);
      return {
        ...toRequest(p),
        liveClass: classId ? classMap.get(classId) ?? null : null,
      };
    });

    return NextResponse.json({ requests });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[trial-requests/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/trial-requests — ask an admin for timed access to ONE paid class.
 * Idempotent while a request is pending or an approved trial is still valid.
 * An expired or rejected request is reused (reset to pending) instead of
 * creating duplicate rows.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") {
      return jsonError("Only students can request trial access", 403);
    }

    const limited = limitRequest(`trial:${user.id}`, 5, 10 * 60 * 1000);
    if (limited) return limited;

    const body = await safeBody<TrialBody>(req);
    const classId = body?.classId?.trim();
    if (!classId) return jsonError("classId is required", 400);

    const liveClass = await db.liveClass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        courseId: true,
        status: true,
        title: true,
        course: { select: { price: true, isActive: true } },
      },
    });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (liveClass.status === "ended") {
      return jsonError("This class has already ended", 400);
    }
    if (!liveClass.course || liveClass.course.price <= 0) {
      return jsonError("This class is free — you can join directly", 400);
    }

    const alreadyPaid = await db.payment.findFirst({
      where: {
        studentId: user.id,
        courseId: liveClass.courseId,
        status: "completed",
        method: { not: TRIAL_METHOD },
      },
      select: { id: true },
    });
    if (alreadyPaid) {
      return jsonError("You already have access to this course", 400);
    }

    const transactionId = trialTransactionId(classId);
    const existing = await db.payment.findFirst({
      where: {
        studentId: user.id,
        method: TRIAL_METHOD,
        transactionId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studentId: true,
        courseId: true,
        status: true,
        transactionId: true,
        couponCode: true,
        createdAt: true,
      },
    });
    if (
      existing &&
      (existing.status === TRIAL_STATUSES.pending ||
        (existing.status === TRIAL_STATUSES.approved &&
          trialStillValid(existing.couponCode)))
    ) {
      return NextResponse.json(
        { request: toRequest(existing), alreadyExists: true },
        { status: 200 }
      );
    }

    // Reuse an expired/rejected row so there is only one request per class.
    const payment: TrialRow = existing
      ? await db.payment.update({
          where: { id: existing.id },
          data: {
            status: TRIAL_STATUSES.pending,
            couponCode: null,
            courseId: liveClass.courseId,
          },
          select: {
            id: true,
            studentId: true,
            courseId: true,
            status: true,
            transactionId: true,
            couponCode: true,
            createdAt: true,
          },
        })
      : await db.payment.create({
          data: {
            studentId: user.id,
            courseId: liveClass.courseId,
            amount: 0,
            method: TRIAL_METHOD,
            status: TRIAL_STATUSES.pending,
            transactionId,
          },
          select: {
            id: true,
            studentId: true,
            courseId: true,
            status: true,
            transactionId: true,
            couponCode: true,
            createdAt: true,
          },
        });

    logger.info("[trial-requests/create]", "trial requested", {
      requestId: payment.id,
      studentId: user.id,
      classId,
    });

    return NextResponse.json({ request: toRequest(payment) }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[trial-requests/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
