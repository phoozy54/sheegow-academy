import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";
import { canManageCourse, decideCourseContentAccess } from "@/lib/content-access";

type RouteContext = {
  params: Promise<{ id: string; noteId: string }>;
};

/**
 * DELETE /api/lessons/:id/notes/:noteId
 *
 * Delete the calling student's note for this lesson. Only the note owner can
 * delete it — noteId is double-checked against both the lesson and the user.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const actor = await requireAuth();
    const { id: lessonId, noteId } = await params;

    const limited = limitRequest(`notes-delete:${actor.id}`, 30, 60_000);
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

    const note = await db.lessonNote.findUnique({
      where: { id: noteId },
      select: { id: true, studentId: true, lessonId: true },
    });
    if (!note || note.lessonId !== lessonId) {
      return jsonError("Note not found", 404);
    }
    if (note.studentId !== actor.id) {
      return jsonError("Forbidden", 403);
    }

    await db.lessonNote.delete({ where: { id: noteId } });
    return jsonOk({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[notes/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
