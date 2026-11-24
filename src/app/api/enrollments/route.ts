import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import { hasApprovedTrialForCourse } from "@/lib/trial-access";
import { TRIAL_METHOD } from "@/lib/trial";

interface EnrollBody {
  courseId?: string;
}

/**
 * POST /api/enrollments
 * Enroll the current user in a course. Idempotent — if the user is already
 * enrolled, the existing enrollment is returned (without creating a duplicate).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const body = await safeBody<EnrollBody>(req);
    if (!body) return jsonError("Invalid request body", 400);
    const courseId = body.courseId?.trim();
    if (!courseId) return jsonError("courseId is required", 400);

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isActive) return jsonError("Course not found", 404);

    // Prerequisite check — if this course requires another course to be
    // completed first, verify the student has a completed enrollment for it.
    // Managers (admin / owning teacher) are exempt.
    const isManager =
      user.role === "admin" ||
      user.role === "super_admin" ||
      (user.role === "teacher" && course.teacherId === user.id);
    if (course.prerequisiteCourseId && !isManager) {
      // If already enrolled in THIS course, no need to re-check (idempotency).
      const alreadyEnrolledHere = await db.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: user.id, courseId },
        },
        select: { id: true },
      });
      if (!alreadyEnrolledHere) {
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
    }

    // A paid course requires a completed payment. Without this check this
    // endpoint would be a free-enrollment bypass around the checkout flow.
    if (course.price > 0) {
      const paid = await db.payment.findFirst({
        where: {
          studentId: user.id,
          courseId,
          status: "completed",
          method: { not: TRIAL_METHOD },
        },
        select: { id: true },
      });
      const trialApproved = !paid && (await hasApprovedTrialForCourse(user.id, courseId));
      if (!paid && !trialApproved) {
        return jsonError("A completed payment or approved trial is required", 402);
      }
    }

    // Check for existing enrollment (unique [studentId, courseId])
    const existing = await db.enrollment.findUnique({
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
      },
    });

    if (existing) return NextResponse.json({ enrollment: existing });

    const enrollment = await db.enrollment.create({
      data: { studentId: user.id, courseId },
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
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[enrollments/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
