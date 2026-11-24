import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, limitRequest } from "@/lib/api-helpers";

interface CheckoutBody {
  courseId?: string;
  method?: string;
  couponCode?: string;
}

const VALID_METHODS = new Set(["card", "zaad", "edahab"]);

/**
 * The mock checkout marks payments as completed without any provider charge.
 * It is ONLY allowed when DEMO_MODE=true is explicitly configured. A real
 * deployment must integrate a payment provider + signed webhook before
 * enabling paid enrollment.
 */
const DEMO_MODE =
  process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

/**
 * Validate a coupon by code. Returns the coupon when valid + active + not
 * expired, otherwise null.
 */
async function findValidCoupon(code: string) {
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return null;
  if (!coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return null;
  return coupon;
}

/**
 * POST /api/payments/checkout
 * Mock checkout flow:
 *  - Validates the optional coupon
 *  - Creates a Payment record with status "completed"
 *  - Auto-enrolls the student (links the payment to the enrollment)
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

    // ── Coupon validation (optional) ──
    let discount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await findValidCoupon(couponCode);
      if (!coupon)
        return jsonError("Coupon is invalid or expired", 400);
      discount = coupon.discount;
      appliedCouponCode = coupon.code;
    }

    const finalAmount = Math.max(
      0,
      Math.round(course.price * (1 - discount / 100) * 100) / 100
    );

    // ── Create payment (mock: always completed) ──
    const payment = await db.payment.create({
      data: {
        studentId: user.id,
        courseId,
        amount: finalAmount,
        method,
        status: "completed",
        transactionId: `demo_${randomUUID()}`,
        couponCode: appliedCouponCode,
      },
      include: {
        course: { select: { id: true, title: true, level: true, image: true } },
      },
    });

    // ── Auto-enroll (idempotent: link payment to existing enrollment) ──
    let enrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: user.id, courseId },
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
        payment: { select: { id: true, method: true, amount: true, status: true } },
      },
    });

    if (enrollment) {
      // Already enrolled — link the new payment record.
      enrollment = await db.enrollment.update({
        where: { id: enrollment.id },
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
          payment: { select: { id: true, method: true, amount: true, status: true } },
        },
      });
    } else {
      enrollment = await db.enrollment.create({
        data: {
          studentId: user.id,
          courseId,
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
          payment: { select: { id: true, method: true, amount: true, status: true } },
        },
      });
    }

    return NextResponse.json(
      { payment, enrollment, finalAmount },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[payments/checkout]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
