import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getCurrentUser,
  isAdminRole,
  requireAuth,
} from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  safeBody,
  limitRequest,
} from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

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

interface CreateThreadBody {
  title?: string;
  body?: string;
  lessonId?: string;
}

/**
 * GET /api/courses/:id/threads
 *
 * Lists discussion threads for a course. Visible to:
 *  - admins (all courses)
 *  - the course's assigned teacher
 *  - students with an active/completed enrollment
 *
 * Returns: id, lessonId, lessonTitle, studentId, title, body, isResolved,
 * replyCount, createdAt, updatedAt, author.
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
      if (viewer) return jsonError("Enroll to see discussions", 403);
      return jsonError("Sign in to see discussions", 401);
    }

    const threads = await db.discussionThread.findMany({
      where: { courseId },
      orderBy: [{ isResolved: "asc" }, { updatedAt: "desc" }],
      include: {
        student: { select: authorSelect },
        lesson: { select: { id: true, title: true } },
        replies: {
          select: { id: true },
        },
      },
    });

    const payload = threads.map((t) => ({
      id: t.id,
      courseId: t.courseId,
      lessonId: t.lessonId,
      lessonTitle: t.lesson?.title ?? null,
      studentId: t.studentId,
      title: t.title,
      body: t.body,
      isResolved: t.isResolved,
      replyCount: t.replies.length,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      author: t.student
        ? {
            id: t.student.id,
            fullName: t.student.fullName,
            profilePicture: t.student.profilePicture,
          }
        : null,
    }));

    return jsonOk({ threads: payload });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[threads/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/courses/:id/threads
 * Create a discussion thread. Any authenticated user with course visibility
 * (enrolled student, owning teacher, admin) may post. Body: { title, body, lessonId? }.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: courseId } = await params;

    const limited = limitRequest(`threads:${actor.id}`, 20, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);

    // Visibility gate identical to GET: only enrolled students, the owning
    // teacher, or admins may start a thread.
    let canPost = false;
    if (isAdminRole(actor.role)) {
      canPost = true;
    } else if (actor.role === "teacher" && course.teacherId === actor.id) {
      canPost = true;
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
      canPost =
        !!enrollment &&
        ["active", "completed"].includes(enrollment.status) &&
        !expired;
    }
    if (!canPost) {
      return jsonError("Enroll in this course to ask a question", 403);
    }

    const body = await safeBody<CreateThreadBody>(req);
    const title = body?.title?.trim();
    const text = body?.body?.trim();
    if (!title) return jsonError("Title is required", 400);
    if (!text) return jsonError("Question body is required", 400);

    // Optional lessonId — must belong to the same course.
    let lessonId: string | null = null;
    if (body?.lessonId) {
      const lesson = await db.lesson.findFirst({
        where: {
          id: body.lessonId,
          module: { courseId },
        },
        select: { id: true },
      });
      if (!lesson) return jsonError("Lesson not found in this course", 400);
      lessonId = lesson.id;
    }

    const thread = await db.discussionThread.create({
      data: {
        courseId,
        studentId: actor.id,
        lessonId,
        title: title.slice(0, 300),
        body: text.slice(0, 20_000),
      },
      include: {
        student: { select: authorSelect },
        lesson: { select: { id: true, title: true } },
        replies: {
          include: { author: { select: replyAuthorSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const payload = {
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
    };

    return jsonOk({ thread: payload }, 201);
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[threads/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
