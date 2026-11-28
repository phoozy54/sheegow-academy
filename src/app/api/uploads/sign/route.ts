import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

interface SignBody {
  courseId?: string;
  lessonId?: string;
  fileName?: string;
}

/**
 * POST /api/uploads/sign
 * Mint a short-lived Cloudinary upload signature for a course author.
 * The secret is never sent to the browser; the client posts the file directly
 * to Cloudinary with these signed fields, then stores the returned URL via
 * POST /api/lessons/:id/materials.
 */
export async function POST(req: Request) {
  try {
    const user = await requireTeacherOrAdmin();
    const limited = limitRequest(`upload:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const body = await safeBody<SignBody>(req);
    const courseId = body?.courseId?.trim();
    if (!courseId) return jsonError("courseId is required", 400);

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(user, course)) return jsonError("Forbidden", 403);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError(
        "File uploads are not configured. Set CLOUDINARY_* environment variables.",
        503
      );
    }

    // G2/UPL-1: a lessonId is only usable if that lesson really belongs to
    // this course. The old code interpolated any string into the signed public
    // id (path traversal / cross-course confusion). If no lessonId is given,
    // the upload is a generic course asset.
    const requestedLessonId = body?.lessonId?.trim();
    let lessonSegment = "general";
    if (requestedLessonId) {
      const lesson = await db.lesson.findFirst({
        where: { id: requestedLessonId, module: { courseId } },
        select: { id: true },
      });
      if (!lesson) return jsonError("Lesson not found in this course", 403);
      // The value is now a verified cuid, safe to place in the public id.
      lessonSegment = lesson.id;
    }

    const folder = `sheegow/courses/${courseId}`;
    // Keep public ids predictable and collision-free; never trust a raw file name.
    const publicId = `${folder}/${lessonSegment}-${randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHmac("sha1", apiSecret).update(toSign).digest("hex");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      publicId,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      expiresIn: 600,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[uploads/sign]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
