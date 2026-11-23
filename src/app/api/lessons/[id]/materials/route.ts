import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

interface CreateMaterialBody {
  name?: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
}

/** POST /api/lessons/:id/materials — attach an uploaded PDF/slide to a lesson. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`content:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: { select: { id: true, teacherId: true } } } } },
    });
    if (!lesson) return jsonError("Lesson not found", 404);
    if (!canManageCourse(user, lesson.module.course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateMaterialBody>(req);
    const name = body?.name?.trim();
    const url = body?.url?.trim();
    if (!name || !url) return jsonError("name and url are required", 400);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return jsonError("Invalid file URL", 400);
    }
    // Only https URLs from the configured storage host are accepted.
    const cloudHost = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const allowedHost = cloudHost ? `res.cloudinary.com` : null;
    if (parsed.protocol !== "https:" || (allowedHost && parsed.hostname !== allowedHost)) {
      return jsonError("File URL must be a secure Cloudinary URL", 400);
    }

    const material = await db.material.create({
      data: {
        courseId: lesson.module.course.id,
        lessonId: id,
        name: name.slice(0, 300),
        url: url.slice(0, 2000),
        mimeType: (body?.mimeType || "application/octet-stream").slice(0, 120),
        sizeBytes:
          typeof body?.sizeBytes === "number" && Number.isFinite(body.sizeBytes)
            ? Math.max(0, Math.floor(body.sizeBytes))
            : null,
        uploadedBy: user.id,
      },
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[materials/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
