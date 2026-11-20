import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface UpdateModuleBody {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const courseModule = await db.module.findUnique({
      where: { id },
      include: { course: { select: { id: true, teacherId: true } } },
    });
    if (!courseModule) return jsonError("Module not found", 404);
    if (!canManageCourse(user, courseModule.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<UpdateModuleBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) return jsonError("Module title is required", 400);
      data.title = title.slice(0, 200);
    }
    if (body.description !== undefined)
      data.description = body.description.trim().slice(0, 1000) || null;
    if (body.order !== undefined && Number.isFinite(body.order))
      data.order = Math.max(0, Math.floor(body.order));
    if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);

    const updated = await db.module.update({
      where: { id },
      data,
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ module: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[modules/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const courseModule = await db.module.findUnique({
      where: { id },
      include: { course: { select: { id: true, teacherId: true } } },
    });
    if (!courseModule) return jsonError("Module not found", 404);
    if (!canManageCourse(user, courseModule.course)) return jsonError("Forbidden", 403);

    await db.module.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[modules/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
