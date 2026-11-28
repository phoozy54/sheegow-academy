import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSocketToken,
  isAdminRole,
  isTeachingRole,
  requireAuth,
  sessionVersionOf,
} from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError } from "@/lib/api-helpers";
import { hasApprovedTrial } from "@/lib/trial-access";
import { TRIAL_METHOD } from "@/lib/trial";

/**
 * GET /api/socket/token?classId=<id>&mode=<host|viewer>
 * Issue a short-lived (5 min) token scoped to ONE live class for the
 * Socket.io chat/WebRTC service. The service derives identity, class and
 * broadcast permission from this token — never from client-supplied fields.
 *
 * Access rules:
 *  - Admins/super admins: any class. Can broadcast by default, but may
 *    pass mode=viewer to attend as a student (observe only, no mic/cam).
 *  - Assigned teacher: their own class, can broadcast.
 *  - Other teachers: may observe as viewers.
 *  - Students: only classes they are enrolled in AND have paid for, or a
 *    class with an admin-approved, time-limited trial.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId")?.trim();
    const mode = url.searchParams.get("mode")?.trim(); // "host" | "viewer"
    if (!classId) return jsonError("classId is required", 400);

    const liveClass = await db.liveClass.findUnique({
      where: { id: classId },
      select: { id: true, courseId: true, teacherId: true },
    });
    if (!liveClass) return jsonError("Live class not found", 404);

    const isAssignedTeacher = liveClass.teacherId === user.id;
    // Admins can choose to join as a viewer (student mode). If mode=viewer
    // is explicitly requested, they lose broadcast rights for this session.
    const wantsViewer = mode === "viewer";
    const canBroadcast =
      (isAdminRole(user.role) || isAssignedTeacher) && !wantsViewer;

    // Students must be enrolled in the course and have completed payment
    // before they are allowed into the live room — unless an admin approved
    // a timed trial specifically for this class.
    const trialApproved =
      user.role === "student" && (await hasApprovedTrial(user.id, classId));
    if (user.role === "student" && !trialApproved) {
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
        select: { id: true, status: true },
      });
      if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
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
            // A trial is scoped to one class via hasApprovedTrial above — it
            // must never count as a course-wide payment for other classes.
            method: { not: TRIAL_METHOD },
          },
          select: { id: true },
        });
        if (!paid) {
          return jsonError(
            "Complete your payment or request an approved trial for this class",
            402
          );
        }
      }
    } else if (
      !trialApproved &&
      !canBroadcast &&
      !isTeachingRole(user.role)
    ) {
      // An admin-approved trial is already authorised above — it must not be
      // rejected here just because a viewer-mode student cannot broadcast.
      // The token below still carries canBroadcast: false for students.
      return jsonError("Forbidden", 403);
    }

    const token = createSocketToken({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      classId,
      canBroadcast,
      // Screen sharing is a host-only capability. The chat service enforces
      // this claim; the client merely shows/hides the button.
      canShareScreen: canBroadcast,
      // G2/SOCK-1: bind this short-lived credential to the login epoch.
      sessionVersion: sessionVersionOf(user),
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
