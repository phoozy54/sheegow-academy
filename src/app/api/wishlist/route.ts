import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface WishlistBody {
  courseId?: string;
}

/** Shared shape so the frontend can render a CourseCard straight from the API. */
const COURSE_INCLUDE = {
  course: {
    include: {
      teacher: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePicture: true,
          bio: true,
          role: true,
        },
      },
    },
  },
};

/**
 * GET /api/wishlist
 * Returns the current user's wishlisted courses (newest first), with course +
 * teacher included so the wishlist page can render CourseCard directly.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const items = await db.wishlist.findMany({
      where: { studentId: user.id },
      include: COURSE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[wishlist/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/wishlist
 * Add a course to the current user's wishlist. Idempotent — if it already
 * exists, the existing entry is returned with `alreadyExists: true`.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const body = await safeBody<WishlistBody>(req);
    if (!body) return jsonError("Invalid request body", 400);
    const courseId = body.courseId?.trim();
    if (!courseId) return jsonError("courseId is required", 400);

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isActive) {
      return jsonError("Course not found", 404);
    }

    const existing = await db.wishlist.findUnique({
      where: {
        studentId_courseId: { studentId: user.id, courseId },
      },
      include: COURSE_INCLUDE,
    });

    if (existing) {
      return NextResponse.json({ item: existing, alreadyExists: true });
    }

    const item = await db.wishlist.create({
      data: { studentId: user.id, courseId },
      include: COURSE_INCLUDE,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[wishlist/add]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/wishlist
 * Remove a course from the wishlist by `courseId` in the body or query string.
 * Idempotent — returns success even if the row was already gone.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();

    const url = new URL(req.url);
    let courseId: string | undefined;

    // Prefer the body, fall back to ?courseId= so the route also works as a
    // simple link (e.g. <a href="/api/wishlist?courseId=...">).
    const body = await safeBody<WishlistBody>(req);
    if (body) {
      courseId = body.courseId?.trim();
    }
    if (!courseId) {
      courseId = url.searchParams.get("courseId")?.trim() || undefined;
    }
    if (!courseId) return jsonError("courseId is required", 400);

    await db.wishlist.deleteMany({
      where: { studentId: user.id, courseId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[wishlist/remove]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
