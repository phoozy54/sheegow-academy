import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

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
    if (!course) return jsonError("Course not found", 404);

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
