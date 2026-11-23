import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  safeBody,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";

interface CheckoutBody {
  method?: string;
  couponCode?: string;
}

const VALID_METHODS = new Set(["card", "zaad", "edahab"]);

/** Demo mode mirrors the single-course checkout — only enabled when
 *  DEMO_MODE=true (or NODE_ENV !== production). A real deployment must
 *  integrate a payment provider + signed webhook before going live. */
const DEMO_MODE =
  process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

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
 * POST /api/bundles/:id/checkout
 * Authed: purchase a bundle. Body: { method, couponCode? }.
 *  - Validates the bundle is active and contains at least one course.
 *  - Validates the optional coupon against the bundle's price.
 *  - Creates ONE Payment row (no courseId — bundles pay for many courses).
 *  - Auto-enrolls the student in EVERY included course. Existing enrollments
 *    are kept and only re-linked to the new payment when they don't already
 *    have one. Already-enrolled courses are returned so the UI can show which
 *    ones the student already had.
 *  - All of this happens in a single Prisma transaction so a partial failure
 *    never leaves the student with some enrollments but no payment.
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

    // ── Coupon validation (optional) ──
    let discount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await findValidCoupon(couponCode);
      if (!coupon) return jsonError("Coupon is invalid or expired", 400);
      discount = coupon.discount;
      appliedCouponCode = coupon.code;
    }

    const finalAmount = Math.max(
      0,
      Math.round(bundle.price * (1 - discount / 100) * 100) / 100
    );

    // ── Snapshot existing enrollments so we can avoid duplicate inserts and
    //    report which courses the student already had access to.
    const existingEnrollments = await db.enrollment.findMany({
      where: {
        studentId: user.id,
        courseId: { in: includedCourses.map((c) => c.id) },
      },
      include: {
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
      },
    });
    const existingByCourse = new Map(
      existingEnrollments.map((e) => [e.courseId, e])
    );

    // ── Create payment + enrollments atomically ──
    const result = await db.$transaction(async (tx) => {
      // One payment for the entire bundle (courseId left null — bundle pays
      // for multiple courses, so a single courseId wouldn't make sense).
      const payment = await tx.payment.create({
        data: {
          studentId: user.id,
          courseId: null,
          amount: finalAmount,
          method,
          status: "completed",
          transactionId: `demo_bundle_${randomUUID()}`,
          couponCode: appliedCouponCode,
        },
        include: {
          course: { select: { id: true, title: true, level: true, image: true } },
        },
      });

      const enrollments: Array<Record<string, unknown>> = [];
      const alreadyEnrolledCourseIds: string[] = [];

      for (const course of includedCourses) {
        const existing = existingByCourse.get(course.id);
        if (existing) {
          // Already enrolled — only re-link the payment if the existing
          // enrollment has no payment yet (so the receipt still works).
          alreadyEnrolledCourseIds.push(course.id);
          if (!existing.paymentId) {
            const updated = await tx.enrollment.update({
              where: { id: existing.id },
              data: { paymentId: payment.id },
              include: {
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
              },
            });
            enrollments.push(updated);
          } else {
            enrollments.push(existing);
          }
        } else {
          const created = await tx.enrollment.create({
            data: {
              studentId: user.id,
              courseId: course.id,
              paymentId: payment.id,
              progress: 0,
            },
            include: {
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
            },
          });
          enrollments.push(created);
        }
      }

      return { payment, enrollments, alreadyEnrolledCourseIds };
    });

    return NextResponse.json(
      {
        payment: result.payment,
        enrollments: result.enrollments,
        bundle: {
          id: bundle.id,
          title: bundle.title,
          price: bundle.price,
        },
        finalAmount,
        alreadyEnrolledCourseIds: result.alreadyEnrolledCourseIds,
      },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[bundles/checkout]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
