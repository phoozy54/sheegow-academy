import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  isAdminRole,
  requireAuth,
  getCurrentUser,
} from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  safeBody,
  limitRequest,
} from "@/lib/api-helpers";

type RouteContext = {
  params: Promise<{ id: string; threadId: string }>;
};

const authorSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

const replyAuthorSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
  role: true,
} as const;

interface PatchThreadBody {
  isResolved?: boolean;
}

/**
 * GET /api/courses/:id/threads/:threadId
 * Returns a single thread with its replies and reply author info.
 * Visibility follows the same rule as the collection endpoint.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id: courseId, threadId } = await params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
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
      if (viewer) return jsonError("Enroll to see discussions", 403);
      return jsonError("Sign in to see discussions", 401);
    }

    const thread = await db.discussionThread.findUnique({
      where: { id: threadId },
      include: {
        student: { select: authorSelect },
        lesson: { select: { id: true, title: true } },
        replies: {
          include: { author: { select: replyAuthorSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!thread || thread.courseId !== courseId) {
      return jsonError("Thread not found", 404);
    }

    return jsonOk({
      thread: {
        id: thread.id,
        courseId: thread.courseId,
        lessonId: thread.lessonId,
        lessonTitle: thread.lesson?.title ?? null,
        studentId: thread.studentId,
        title: thread.title,
        body: thread.body,
        isResolved: thread.isResolved,
        replyCount: thread.replies.length,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        author: thread.student
          ? {
              id: thread.student.id,
              fullName: thread.student.fullName,
              profilePicture: thread.student.profilePicture,
            }
          : null,
        replies: thread.replies.map((r) => ({
          id: r.id,
          threadId: r.threadId,
          authorId: r.authorId,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          author: r.author
            ? {
                id: r.author.id,
                fullName: r.author.fullName,
                profilePicture: r.author.profilePicture,
                role: r.author.role,
              }
            : null,
        })),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[threads/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * PATCH /api/courses/:id/threads/:threadId
 * Mark a thread resolved/unresolved. Allowed for the thread author, the
 * course teacher, or any admin. Body: { isResolved: boolean }.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: courseId, threadId } = await params;

    const limited = limitRequest(`threads-patch:${actor.id}`, 30, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const thread = await db.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, courseId: true, studentId: true },
    });
    if (!thread || thread.courseId !== courseId) {
      return jsonError("Thread not found", 404);
    }

    const isAuthor = thread.studentId === actor.id;
    const isCourseTeacher =
      actor.role === "teacher" && course.teacherId === actor.id;
    if (!isAuthor && !isCourseTeacher && !isAdminRole(actor.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await safeBody<PatchThreadBody>(req);
    if (!body || typeof body.isResolved !== "boolean") {
      return jsonError("isResolved (boolean) is required", 400);
    }

    const updated = await db.discussionThread.update({
      where: { id: threadId },
      data: { isResolved: body.isResolved },
      include: {
        student: { select: authorSelect },
        lesson: { select: { id: true, title: true } },
        replies: {
          include: { author: { select: replyAuthorSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return jsonOk({
      thread: {
        id: updated.id,
        courseId: updated.courseId,
        lessonId: updated.lessonId,
        lessonTitle: updated.lesson?.title ?? null,
        studentId: updated.studentId,
        title: updated.title,
        body: updated.body,
        isResolved: updated.isResolved,
        replyCount: updated.replies.length,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        author: updated.student
          ? {
              id: updated.student.id,
              fullName: updated.student.fullName,
              profilePicture: updated.student.profilePicture,
            }
          : null,
        replies: updated.replies.map((r) => ({
          id: r.id,
          threadId: r.threadId,
          authorId: r.authorId,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          author: r.author
            ? {
                id: r.author.id,
                fullName: r.author.fullName,
                profilePicture: r.author.profilePicture,
                role: r.author.role,
              }
            : null,
        })),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[threads/patch]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/courses/:id/threads/:threadId
 * Delete a thread. Allowed for the author, the course teacher, or any admin.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: courseId, threadId } = await params;

    const limited = limitRequest(`threads-delete:${actor.id}`, 30, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const thread = await db.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, courseId: true, studentId: true },
    });
    if (!thread || thread.courseId !== courseId) {
      return jsonError("Thread not found", 404);
    }

    const isAuthor = thread.studentId === actor.id;
    const isCourseTeacher =
      actor.role === "teacher" && course.teacherId === actor.id;
    if (!isAuthor && !isCourseTeacher && !isAdminRole(actor.role)) {
      return jsonError("Forbidden", 403);
    }

    await db.discussionThread.delete({ where: { id: threadId } });
    return jsonOk({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[threads/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
