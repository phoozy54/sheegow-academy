import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getCurrentUser,
  isAdminRole,
  requireTeacherOrAdmin,
} from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string; announcementId: string }> };

const authorSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

/**
 * GET /api/courses/:id/announcements/:announcementId
 * Fetch a single announcement. Visibility follows the same rules as the list
 * endpoint — the viewer must be an enrolled student, the course teacher, or
 * an admin.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id: courseId, announcementId } = await params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const viewer = await getCurrentUser();
    if (!viewer) return jsonError("Sign in to see announcements", 401);

    let canSee = false;
    if (isAdminRole(viewer.role)) {
      canSee = true;
    } else if (viewer.role === "teacher" && course.teacherId === viewer.id) {
      canSee = true;
    } else if (viewer.role === "student") {
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: viewer.id, courseId },
        },
        select: { status: true, expiresAt: true },
      });
      const expired =
        !!enrollment?.expiresAt &&
        enrollment.expiresAt.getTime() <= Date.now();
      canSee =
        !!enrollment &&
        ["active", "completed"].includes(enrollment.status) &&
        !expired;
    }

    if (!canSee) return jsonError("Enroll to see announcements", 403);

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { author: { select: authorSelect } },
    });
    if (!announcement || announcement.courseId !== courseId) {
      return jsonError("Announcement not found", 404);
    }

    return jsonOk({ announcement });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[announcements/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/courses/:id/announcements/:announcementId
 * Author or admin only. The course teacher can also delete announcements
 * posted by other teachers (matching the "manage course" model).
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id: courseId, announcementId } = await params;

    const limited = limitRequest(`announcements:${actor.id}`, 20, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, authorId: true, courseId: true },
    });
    if (!announcement || announcement.courseId !== courseId) {
      return jsonError("Announcement not found", 404);
    }

    // The author, the course's assigned teacher, or any admin may delete.
    const isAuthor = announcement.authorId === actor.id;
    const isCourseTeacher =
      actor.role === "teacher" && course.teacherId === actor.id;
    if (!isAuthor && !isCourseTeacher && !isAdminRole(actor.role)) {
      return jsonError("Forbidden", 403);
    }

    await db.announcement.delete({ where: { id: announcementId } });

    return jsonOk({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[announcements/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

// Note: this route only supports DELETE for now. The create form posts to the
// collection endpoint; editing is intentionally out of scope.
