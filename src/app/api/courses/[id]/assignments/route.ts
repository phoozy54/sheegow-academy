import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface CreateAssignmentBody {
  title?: string;
  instructions?: string;
  lessonId?: string;
  dueAt?: string;
  maxPoints?: number;
  isPublished?: boolean;
}

/** POST /api/courses/:id/assignments — create homework for a course. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`content:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(user, course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateAssignmentBody>(req);
    const title = body?.title?.trim();
    const instructions = body?.instructions?.trim();
    if (!title || !instructions) {
      return jsonError("Title and instructions are required", 400);
    }

    let dueAt: Date | null = null;
    if (body?.dueAt) {
      const parsed = new Date(body.dueAt);
      if (Number.isNaN(parsed.getTime())) return jsonError("Invalid due date", 400);
      dueAt = parsed;
    }

    const assignment = await db.assignment.create({
      data: {
        courseId: id,
        lessonId: body?.lessonId?.trim() || null,
        title: title.slice(0, 300),
        instructions: instructions.slice(0, 20_000),
        dueAt,
        maxPoints:
          typeof body?.maxPoints === "number" && Number.isFinite(body.maxPoints)
            ? Math.max(1, Math.floor(body.maxPoints))
            : 100,
        isPublished: Boolean(body?.isPublished),
      },
      include: { submissions: true },
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[assignments/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
