import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  isAdminRole,
  requireAuth,
} from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  safeBody,
  CONTENT_BODY_BYTES,
  limitRequest,
} from "@/lib/api-helpers";
import { notify } from "@/lib/notify";

type RouteContext = {
  params: Promise<{ id: string; threadId: string }>;
};

const replyAuthorSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
  role: true,
} as const;

interface CreateReplyBody {
  body?: string;
}

/**
 * POST /api/courses/:id/threads/:threadId/replies
 *
 * Add a reply to a discussion thread. Any authenticated user with course
 * visibility (enrolled student, owning teacher, admin) may reply. Teachers
 * answering is the primary use case, but peer answers are allowed.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: courseId, threadId } = await params;

    const limited = limitRequest(`replies:${actor.id}`, 30, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    const thread = await db.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, courseId: true, studentId: true, title: true },
    });
    if (!thread || thread.courseId !== courseId) {
      return jsonError("Thread not found", 404);
    }

    // Visibility check — same as the list endpoint.
    let canReply = false;
    if (isAdminRole(actor.role)) {
      canReply = true;
    } else if (actor.role === "teacher" && course.teacherId === actor.id) {
      canReply = true;
    } else if (actor.role === "student") {
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: actor.id, courseId },
        },
        select: { status: true, expiresAt: true },
      });
      const expired =
        !!enrollment?.expiresAt &&
        enrollment.expiresAt.getTime() <= Date.now();
      canReply =
        !!enrollment &&
        ["active", "completed"].includes(enrollment.status) &&
        !expired;
    }
    if (!canReply) {
      return jsonError("Enroll in this course to reply", 403);
    }

    const body = await safeBody<CreateReplyBody>(req, CONTENT_BODY_BYTES);
    const text = body?.body?.trim();
    if (!text) return jsonError("Reply body is required", 400);

    const reply = await db.discussionReply.create({
      data: {
        threadId,
        authorId: actor.id,
        body: text.slice(0, 20_000),
      },
      include: { author: { select: replyAuthorSelect } },
    });

    // Touch the thread so it bubbles to the top of the list (updatedAt).
    await db.discussionThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Notify the thread author so they see the new answer. Best-effort:
    // the reply itself already succeeded; never fail it because of the
    // notification side-effect. Skip self-notifications.
    if (thread.studentId && thread.studentId !== actor.id) {
      const preview =
        text.length > 140 ? `${text.slice(0, 140)}…` : text;
      await notify(
        thread.studentId,
        "reply",
        `New reply on: ${thread.title}`,
        preview,
        `/learn/${courseId}`
      );
    }

    return jsonOk(
      {
        reply: {
          id: reply.id,
          threadId: reply.threadId,
          authorId: reply.authorId,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
          author: reply.author
            ? {
                id: reply.author.id,
                fullName: reply.author.fullName,
                profilePicture: reply.author.profilePicture,
                role: reply.author.role,
              }
            : null,
        },
      },
      201
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[replies/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
