import { NextResponse } from "next/server";
import { Prisma, type Payment } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  safeBody,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";
import {
  allocateBundleAmount,
  bundleGeneration,
  bundleGenerationPrefix,
  bundlePaymentId,
  bundlePurchasePrefix,
  clampDiscount,
  isReplayEligiblePurchase,
  moneyToCents,
  sumPaymentCents,
} from "@/lib/bundle-checkout";

interface CheckoutBody {
  method?: string;
  couponCode?: string;
}

const VALID_METHODS = new Set(["card", "zaad", "edahab"]);

/** G2/PAY-2: production ALWAYS fails closed, even if DEMO_MODE=true is set.
 *  A real deployment must integrate a payment provider + signed webhook. */
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEMO_MODE = !IS_PRODUCTION;

if (IS_PRODUCTION && process.env.DEMO_MODE === "true") {
  logger.error(
    "[payments/bundle-checkout]",
    "DEMO_MODE is set in production — mock checkout is disabled (fail closed)"
  );
}

/** Validate a coupon by code. Returns the coupon when valid + active + not
 *  expired, otherwise null. */
async function findValidCoupon(code: string) {
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return null;
  if (!coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return null;
  return coupon;
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Only a violation of `Payment.id` (the PK we use as the idempotency lock)
 * means "another request already bought this". Enrollment unique violations
 * are a different condition and must not be silently treated as a replay.
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
  payment: {
    select: { id: true, method: true, amount: true, status: true },
  },
} as const;

/**
 * POST /api/bundles/:id/checkout
 * Authed: purchase a bundle. Body: { method, couponCode? }.
 *
 * BL-1: a bundle produces ONE completed Payment PER billable course, each with
 * the real `courseId`, so courseId-based entitlement checks work and
 * `Enrollment.paymentId @unique` is respected. The total is split in integer
 * cents pro-rata by course price.
 *
 * Idempotency is enforced by deterministic `Payment.id` values derived from
 * (student, bundle, generation, courseId) — deliberately time-independent, so
 * there is no bucket-boundary race. Concurrent double-clicks collide on the
 * primary key: the loser gets P2002 and returns the original purchase.
 * A refund advances the generation, allowing exactly one legitimate repurchase.
 * No schema change is required.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const limited = limitRequest(`bundle-checkout:${user.id}`, 10, 10 * 60 * 1000);
    if (limited) return limited;

    if (!DEMO_MODE) {
      return jsonError(
        "Online payments are not configured. Contact the academy to enroll.",
        503
      );
    }

    const { id: bundleId } = await params;
    const body = await safeBody<CheckoutBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const method = body.method?.trim();
    const couponCode = body.couponCode?.trim();

    if (!method || !VALID_METHODS.has(method))
      return jsonError("method must be one of card, zaad, edahab", 400);

    // ── Load the bundle with its courses ──
    const bundle = await db.bundle.findUnique({
      where: { id: bundleId },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true,
                isActive: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!bundle || !bundle.isActive)
      return jsonError("Bundle not found", 404);

    const includedCourses = bundle.courses
      .map((bc) => bc.course)
      .filter((c): c is NonNullable<typeof c> => !!c && c.isActive);

    if (includedCourses.length === 0)
      return jsonError(
        "This bundle has no available courses. Please contact support.",
        400
      );

    // ── Deterministic identity for this purchase attempt ──
    // Generation is derived from existing rows: concurrent requests pick the
    // same number and collide on Payment.id; a refund advances it so a real
    // repurchase is possible. No clock-based bucket, no schema change.
    const basePrefix = bundlePurchasePrefix(bundleId, user.id);
    const history = await db.payment.findMany({
      where: { studentId: user.id, transactionId: { startsWith: basePrefix } },
      orderBy: { createdAt: "asc" },
    });
    const nextGeneration = bundleGeneration(history, basePrefix);
    const activeGeneration = nextGeneration - 1;
    const activePrefix =
      activeGeneration >= 0 ? bundleGenerationPrefix(basePrefix, activeGeneration) : null;
    const purchasePrefix = bundleGenerationPrefix(basePrefix, nextGeneration);
    const purchasePaymentIds = [
      ...includedCourses.map((course) => bundlePaymentId(purchasePrefix, course.id)),
      bundlePaymentId(purchasePrefix, "receipt"),
    ];
    const courseIds = includedCourses.map((course) => course.id);

    const buildResponse = async (
      payments: Payment[],
      alreadyPurchased: boolean,
      priorEnrolledCourseIds?: string[],
      status = 200,
    ) => {
      const enrollments = await db.enrollment.findMany({
        where: { studentId: user.id, courseId: { in: courseIds } },
        include: enrollmentInclude,
      });
      return NextResponse.json(
        {
          payment: payments[0] ?? null,
          payments,
          enrollments,
          bundle: { id: bundle.id, title: bundle.title, price: bundle.price },
          // Integer cents, never a Float reduce.
          finalAmount: sumPaymentCents(payments) / 100,
          alreadyEnrolledCourseIds:
            priorEnrolledCourseIds ?? enrollments.map((enrollment) => enrollment.courseId),
          alreadyPurchased,
        },
        { status },
      );
    };

    // ── Replay only a CLEAN, COMPLETE purchase. A partially refunded
    //    generation (one course refunded) must NOT be replayed: it would leave
    //    that course locked forever. Such a generation advances the counter
    //    and the student gets a fresh full purchase.
    const activeRows = history.filter(
      (payment) => !!activePrefix && payment.transactionId?.startsWith(activePrefix),
    );
    const billableCourseIds = includedCourses
      .filter((course) => moneyToCents(course.price) > 0)
      .map((course) => course.id);
    if (isReplayEligiblePurchase(activeRows, billableCourseIds)) {
      return await buildResponse(activeRows, true);
    }

    // ── Coupon validation (optional) ──
    let discount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await findValidCoupon(couponCode);
      if (!coupon) return jsonError("Coupon is invalid or expired", 400);
      discount = clampDiscount(coupon.discount);
      appliedCouponCode = coupon.code;
    }

    // Money in integer cents, then allocated deterministically per course.
    const bundlePriceCents = moneyToCents(bundle.price);
    const finalAmountCents = Math.max(
      0,
      Math.round(bundlePriceCents * (1 - discount / 100)),
    );
    const finalAmount = finalAmountCents / 100;
    const allocations = allocateBundleAmount(includedCourses, finalAmount);

    // ── Snapshot existing enrollments so we can report which courses the
    //    student already had and avoid overwriting an existing receipt link.
    const existingEnrollments = await db.enrollment.findMany({
      where: { studentId: user.id, courseId: { in: courseIds } },
      include: enrollmentInclude,
    });
    const existingByCourse = new Map(
      existingEnrollments.map((enrollment) => [enrollment.courseId, enrollment]),
    );

    // ── Create payments + enrollments atomically ──
    try {
      const result = await db.$transaction(async (tx) => {
        // PAY-1: re-check and deactivate the coupon inside the same
        // transaction as the payments. Coupons are one-time-use by contract;
        // a rollback (e.g. PK replay below) also rolls back the deactivation.
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
          // Atomic one-time claim — a concurrent transaction re-checks
          // active:true after the row lock and affects 0 rows.
          const claimed = await tx.coupon.updateMany({
            where: { id: fresh.id, active: true },
            data: { active: false },
          });
          if (claimed.count !== 1) {
            return { kind: "coupon_invalid" as const };
          }
        }

        const payments: Payment[] = [];
        const alreadyEnrolledCourseIds: string[] = [];

        // Every allocation (including a 0-cent one) gets a payment row, so
        // paid courses are never locked out by content-access.
        for (const allocation of allocations) {
          payments.push(
            await tx.payment.create({
              data: {
                id: bundlePaymentId(purchasePrefix, allocation.courseId),
                studentId: user.id,
                courseId: allocation.courseId,
                amount: allocation.amount,
                method,
                status: "completed",
                transactionId: `${purchasePrefix}${allocation.courseId}`,
                couponCode: appliedCouponCode,
              },
            }),
          );
        }

        // A bundle of only free courses still needs a receipt-shaped record so
        // the existing response/UI contract stays intact.
        if (payments.length === 0) {
          payments.push(
            await tx.payment.create({
              data: {
                id: bundlePaymentId(purchasePrefix, "receipt"),
                studentId: user.id,
                courseId: null,
                amount: 0,
                method,
                status: "completed",
                transactionId: `${purchasePrefix}receipt`,
                couponCode: appliedCouponCode,
              },
            }),
          );
        }

        const paymentByCourse = new Map(
          payments
            .filter((payment): payment is Payment & { courseId: string } => !!payment.courseId)
            .map((payment) => [payment.courseId, payment]),
        );

        for (const course of includedCourses) {
          const existing = existingByCourse.get(course.id);
          const paymentForCourse = paymentByCourse.get(course.id) ?? null;

          if (existing) alreadyEnrolledCourseIds.push(course.id);

          // upsert avoids a P2002 race if an enrollment appeared after the
          // snapshot above. Only link a payment when none was linked before.
          await tx.enrollment.upsert({
            where: {
              studentId_courseId: { studentId: user.id, courseId: course.id },
            },
            create: {
              studentId: user.id,
              courseId: course.id,
              paymentId: paymentForCourse?.id ?? null,
              progress: 0,
            },
            update:
              paymentForCourse && !existing?.paymentId
                ? { paymentId: paymentForCourse.id }
                : {},
            include: enrollmentInclude,
          });
        }

        return {
          kind: "created" as const,
          payments,
          alreadyEnrolledCourseIds,
        };
      });
      if (result.kind === "coupon_invalid") {
        return jsonError("Coupon is invalid or expired", 400);
      }
      return await buildResponse(
        result.payments,
        false,
        result.alreadyEnrolledCourseIds,
        201
      );
    } catch (e) {
      // A concurrent request won the primary-key race. Return its purchase;
      // our own transaction rolled back, so no duplicate charge exists.
      if (isPaymentPrimaryKeyConflict(e)) {
        // Re-query: the winner may have committed after our history snapshot.
        const winnerPayments = await db.payment.findMany({
          where: {
            id: { in: purchasePaymentIds },
            studentId: user.id,
            status: "completed",
          },
          orderBy: { createdAt: "asc" },
        });
        if (winnerPayments.length > 0) {
          return await buildResponse(winnerPayments, true);
        }
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonError("Enrollment details changed during checkout. Please retry.", 409);
      }
      throw e;
    }
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[bundles/checkout]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
