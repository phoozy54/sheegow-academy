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
  safeBody,
  limitRequest,
} from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

const authorSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

/**
 * GET /api/courses/:id/announcements
 * List announcements for a course.
 *
 * Visibility rules:
 *  - Teachers/admins: see every announcement (they manage the course).
 *  - Students: must have an active/completed enrollment.
 *  - Anonymous visitors: announcements stay gated behind enrollment; the
 *    public catalog only shows the course overview.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id: courseId } = await params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const viewer = await getCurrentUser();

    let canSee = false;
    if (viewer) {
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
    }

    if (!canSee) {
      // Fall back to the standard 401/403 mapping when the viewer is signed in
      // but lacks enrollment, so the UI can show a sign-up prompt instead of
      // an "internal error".
      if (viewer) return jsonError("Enroll to see announcements", 403);
      return jsonError("Sign in to see announcements", 401);
    }

    const announcements = await db.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: authorSelect } },
    });

    return jsonOk({ announcements });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[announcements/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

interface CreateAnnouncementBody {
  title?: string;
  body?: string;
}

/**
 * POST /api/courses/:id/announcements
 * Create an announcement. Teacher (course owner) or admin only.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();
    const { id: courseId } = await params;

    const limited = limitRequest(`announcements:${actor.id}`, 20, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(actor, course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateAnnouncementBody>(req);
    const title = body?.title?.trim();
    const text = body?.body?.trim();
    if (!title) return jsonError("Title is required", 400);
    if (!text) return jsonError("Body is required", 400);

    const announcement = await db.announcement.create({
      data: {
        courseId,
        authorId: actor.id,
        title: title.slice(0, 300),
        body: text.slice(0, 20_000),
      },
      include: { author: { select: authorSelect } },
    });

    return jsonOk({ announcement }, 201);
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[announcements/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
