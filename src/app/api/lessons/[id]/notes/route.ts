import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  safeBody,
  CONTENT_BODY_BYTES,
  limitRequest,
} from "@/lib/api-helpers";
import { canManageCourse, decideCourseContentAccess } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface SaveNoteBody {
  content?: string;
}

/**
 * GET /api/lessons/:id/notes
 *
 * Returns the calling student's personal note for this lesson (or null).
 * Managers (owning teacher / admin) technically have access too, but the UI
 * only exposes this affordance to students — they can preview a note they
 * once made if they happen to be both teacher and student.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: lessonId } = await params;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        isPreview: true,
        module: { select: { course: { select: { id: true, teacherId: true } } } },
      },
    });
    if (!lesson) return jsonError("Lesson not found", 404);

    const isManager = canManageCourse(actor, lesson.module.course);
    const decision = await decideCourseContentAccess(actor, lesson.module.course.id);
    const fullAccess = isManager || decision.allowed;
    if (!fullAccess && !lesson.isPreview) {
      return jsonError(decision.reason || "You do not have access to this lesson", decision.status);
    }

    const note = await db.lessonNote.findUnique({
      where: {
        studentId_lessonId: { studentId: actor.id, lessonId },
      },
    });

    if (!note) return jsonOk({ note: null });

    return jsonOk({
      note: {
        id: note.id,
        studentId: note.studentId,
        lessonId: note.lessonId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notes/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/lessons/:id/notes
 *
 * Create or update the calling student's note for this lesson (upsert on
 * the unique [studentId, lessonId] key). Body: { content: string }.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: lessonId } = await params;

    const limited = limitRequest(`notes:${actor.id}`, 30, 60_000);
    if (limited) return limited;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        isPreview: true,
        module: { select: { course: { select: { id: true, teacherId: true } } } },
      },
    });
    if (!lesson) return jsonError("Lesson not found", 404);

    const isManager = canManageCourse(actor, lesson.module.course);
    const decision = await decideCourseContentAccess(actor, lesson.module.course.id);
    const fullAccess = isManager || decision.allowed;
    if (!fullAccess && !lesson.isPreview) {
      return jsonError(decision.reason || "You do not have access to this lesson", decision.status);
    }

    const body = await safeBody<SaveNoteBody>(req, CONTENT_BODY_BYTES);
    if (!body || typeof body.content !== "string") {
      return jsonError("content (string) is required", 400);
    }
    const content = body.content.slice(0, 50_000);

    const note = await db.lessonNote.upsert({
      where: {
        studentId_lessonId: { studentId: actor.id, lessonId },
      },
      create: {
        studentId: actor.id,
        lessonId,
        content,
      },
      update: {
        content,
      },
    });

    return jsonOk({
      note: {
        id: note.id,
        studentId: note.studentId,
        lessonId: note.lessonId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notes/save]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
