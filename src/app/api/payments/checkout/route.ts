import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, limitRequest } from "@/lib/api-helpers";
import {
  courseGeneration,
  coursePaymentId,
  coursePaymentPrefix,
  replayablePayment,
} from "@/lib/course-checkout";

interface CheckoutBody {
  courseId?: string;
  method?: string;
  couponCode?: string;
}

const VALID_METHODS = new Set(["card", "zaad", "edahab"]);

/**
 * The mock checkout marks payments as completed without any provider charge.
 * G2/PAY-2: production ALWAYS fails closed, even if DEMO_MODE=true is accidentally
 * set in the environment. A real deployment must integrate a payment provider
 * + signed webhook before enabling paid enrollment.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEMO_MODE = !IS_PRODUCTION;

if (IS_PRODUCTION && process.env.DEMO_MODE === "true") {
  logger.error(
    "[payments/checkout]",
    "DEMO_MODE is set in production — mock checkout is disabled (fail closed)"
  );
}

/**
 * Validate a coupon by code. Returns the coupon when valid + active + not
 * expired, otherwise null. This is a fast pre-check; the authoritative check
 * and the one-time deactivation happen inside the checkout transaction.
 */
async function findValidCoupon(code: string) {
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return null;
  if (!coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return null;
  return coupon;
}

/**
 * Only a violation of Payment.id (the deterministic PK we use as the
 * idempotency lock) means "another request already bought this". Enrollment
 * unique violations are a different condition and must not be replayed.
 */
function isPaymentPrimaryKeyConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  const values = Array.isArray(target) ? target : [target];
  return values.some(
    (value) =>
      typeof value === "string" &&
      (value === "id" || /payment\.id/i.test(value) || /pkey$/i.test(value)),
  );
}

const paymentInclude = {
  course: { select: { id: true, title: true, level: true, image: true } },
} as const;

const enrollmentInclude = {
  course: {
    include: {
      teacher: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePicture: true,
        },
      },
    },
  },
  payment: { select: { id: true, method: true, amount: true, status: true } },
} as const;

/**
 * POST /api/payments/checkout
 * Mock checkout flow:
 *  - Validates the optional coupon
 *  - Creates a completed Payment with a DETERMINISTIC id (PAY-1 idempotency)
 *  - Deactivates the coupon inside the same transaction (PAY-1 one-time use)
 *  - Auto-enrolls the student (enrollment.upsert, never a duplicate)
 *  - Returns { payment, enrollment, finalAmount }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const limited = limitRequest(`checkout:${user.id}`, 10, 10 * 60 * 1000);
    if (limited) return limited;

    if (!DEMO_MODE) {
      return jsonError(
        "Online payments are not configured. Contact the academy to enroll.",
        503
      );
    }

    const body = await safeBody<CheckoutBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const courseId = body.courseId?.trim();
    const method = body.method?.trim();
    const couponCode = body.couponCode?.trim();

    if (!courseId) return jsonError("courseId is required", 400);
    if (!method || !VALID_METHODS.has(method))
      return jsonError("method must be one of card, zaad, edahab", 400);

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return jsonError("Course not found", 404);
    if (!course.isActive)
      return jsonError("Course is not currently available", 400);

    // Prerequisite check — block checkout (and thus enrollment) when the
    // student hasn't completed the required prerequisite course. Managers
    // (admin / owning teacher) are exempt.
    const isManager =
      user.role === "admin" ||
      user.role === "super_admin" ||
      (user.role === "teacher" && course.teacherId === user.id);
    if (course.prerequisiteCourseId && !isManager) {
      const prereqEnrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: user.id,
            courseId: course.prerequisiteCourseId,
          },
        },
        select: { status: true },
      });
      if (!prereqEnrollment || prereqEnrollment.status !== "completed") {
        const prereqCourse = await db.course.findUnique({
          where: { id: course.prerequisiteCourseId },
          select: { title: true },
        });
        const prereqTitle = prereqCourse?.title ?? "the prerequisite course";
        return jsonError(
          `You must complete ${prereqTitle} first.`,
          403
        );
      }
    }

    // ── Coupon pre-validation (optional) ──
    let discount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await findValidCoupon(couponCode);
      if (!coupon)
        return jsonError("Coupon is invalid or expired", 400);
      discount = coupon.discount;
      appliedCouponCode = coupon.code;
    }

    // Server-side price only — client-supplied price/amount are ignored.
    const finalAmount = Math.max(
      0,
      Math.round(course.price * (1 - discount / 100) * 100) / 100
    );

    // ── PAY-1: deterministic identity for this purchase attempt ──
    const prefix = coursePaymentPrefix(user.id, courseId);
    const history = await db.payment.findMany({
      where: {
        studentId: user.id,
        courseId,
        transactionId: { startsWith: prefix },
      },
      include: paymentInclude,
      orderBy: { createdAt: "asc" },
    });
    const generation = courseGeneration(history, prefix);

    // Sequential retries (double-click seconds apart, client retry after a
    // timeout) replay the completed purchase instead of charging again.
    // A refunded/failed row is not replayable, so a real repurchase still
    // advances the generation and creates a fresh payment.
    const replay = replayablePayment(history, prefix, generation);
    if (replay) {
      const existingEnrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: user.id, courseId },
        },
        include: enrollmentInclude,
      });
      return NextResponse.json(
        {
          payment: replay,
          enrollment: existingEnrollment,
          finalAmount: replay.amount,
          alreadyPurchased: true,
        },
        { status: 200 }
      );
    }

    const paymentId = coursePaymentId(prefix, generation);
    const transactionId = `${prefix}${generation}`;
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: user.id, courseId },
      },
      select: { paymentId: true },
    });

    // ── Payment + coupon + enrollment in ONE transaction ──
    // A concurrent duplicate collides on Payment.id; the whole transaction
    // (including the coupon deactivation) rolls back, then we replay the
    // winner's payment below.
    let outcome:
      | { kind: "coupon_invalid" }
      | {
          kind: "created";
          payment: Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;
          enrollment: Prisma.EnrollmentGetPayload<{ include: typeof enrollmentInclude }>;
        };

    try {
      outcome = await db.$transaction(async (tx) => {
        if (appliedCouponCode) {
          const fresh = await tx.coupon.findUnique({
            where: { code: appliedCouponCode },
          });
          if (
            !fresh ||
            !fresh.active ||
            (fresh.expiresAt && fresh.expiresAt.getTime() < Date.now())
          ) {
            return { kind: "coupon_invalid" as const };
          }
          // Coupons are one-time-use by contract (register/seed). The
          // conditional UPDATE is the atomic claim: under Postgres READ
          // COMMITTED a second transaction blocks on this row, re-checks
          // active:true, and affects 0 rows → its purchase is rejected.
          const claimed = await tx.coupon.updateMany({
            where: { id: fresh.id, active: true },
            data: { active: false },
          });
          if (claimed.count !== 1) {
            return { kind: "coupon_invalid" as const };
          }
        }

        const payment = await tx.payment.create({
          data: {
            id: paymentId,
            studentId: user.id,
            courseId,
            amount: finalAmount,
            method,
            status: "completed",
            transactionId,
            couponCode: appliedCouponCode,
          },
          include: paymentInclude,
        });

        const enrollment = await tx.enrollment.upsert({
          where: {
            studentId_courseId: { studentId: user.id, courseId },
          },
          create: {
            studentId: user.id,
            courseId,
            paymentId: payment.id,
            progress: 0,
          },
          // Never detach an existing receipt (bundle or earlier payment).
          update: existingEnrollment?.paymentId ? {} : { paymentId: payment.id },
          include: enrollmentInclude,
        });

        return { kind: "created" as const, payment, enrollment };
      });
    } catch (e) {
      if (isPaymentPrimaryKeyConflict(e)) {
        // A concurrent request won the PK race. Return its purchase; our own
        // transaction rolled back, so no duplicate charge and no coupon loss.
        const winner = await db.payment.findUnique({
          where: { id: paymentId },
          include: paymentInclude,
        });
        if (winner && winner.studentId === user.id) {
          const enrollment = await db.enrollment.findUnique({
            where: {
              studentId_courseId: { studentId: user.id, courseId },
            },
            include: enrollmentInclude,
          });
          return NextResponse.json(
            {
              payment: winner,
              enrollment,
              finalAmount: winner.amount,
              alreadyPurchased: true,
            },
            { status: 200 }
          );
        }
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonError("Enrollment details changed during checkout. Please retry.", 409);
      }
      throw e;
    }

    if (outcome.kind === "coupon_invalid") {
      return jsonError("Coupon is invalid or expired", 400);
    }

    return NextResponse.json(
      { payment: outcome.payment, enrollment: outcome.enrollment, finalAmount },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/checkout]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
