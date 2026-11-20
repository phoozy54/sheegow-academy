import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSocketToken, isAdminRole, isTeachingRole, requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError } from "@/lib/api-helpers";

/**
 * GET /api/socket/token?classId=<id>
 * Issue a short-lived (5 min) token scoped to ONE live class for the
 * Socket.io chat/WebRTC service. The service derives identity, class and
 * broadcast permission from this token — never from client-supplied fields.
 *
 * Access rules:
 *  - Admins: any class, can broadcast.
 *  - Assigned teacher: their own class, can broadcast.
 *  - Other teachers: may observe as viewers.
 *  - Students: only classes they are enrolled in AND have paid for.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const classId = new URL(req.url).searchParams.get("classId")?.trim();
    if (!classId) return jsonError("classId is required", 400);

    const liveClass = await db.liveClass.findUnique({
      where: { id: classId },
      select: { id: true, courseId: true, teacherId: true },
    });
    if (!liveClass) return jsonError("Live class not found", 404);

    const isAssignedTeacher = liveClass.teacherId === user.id;
    const canBroadcast = isAdminRole(user.role) || isAssignedTeacher;

    // Students must be enrolled in the course and have completed payment
    // before they are allowed into the live room.
    if (user.role === "student") {
      if (!liveClass.courseId) {
        return jsonError("You are not enrolled in this class", 403);
      }
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: user.id,
            courseId: liveClass.courseId,
          },
        },
        select: { id: true },
      });
      if (!enrollment) {
        return jsonError(
          "Enroll in this course and complete payment before joining the class",
          403
        );
      }

      const course = await db.course.findUnique({
        where: { id: liveClass.courseId },
        select: { price: true },
      });
      if (course && course.price > 0) {
        const paid = await db.payment.findFirst({
          where: {
            studentId: user.id,
            courseId: liveClass.courseId,
            status: "completed",
          },
          select: { id: true },
        });
        if (!paid) {
          return jsonError(
            "Complete your payment before joining this class",
            402
          );
        }
      }
    } else if (!canBroadcast && !isTeachingRole(user.role)) {
      return jsonError("Forbidden", 403);
    }

    const token = createSocketToken({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      classId,
      canBroadcast,
    });

    return NextResponse.json(
      { token, expiresIn: 300 },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[socket/token]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
