import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAuth } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface ReviewBody {
  rating?: number;
  comment?: string;
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/courses/:id/reviews
 * Create a review for the course. Authenticated users only.
 * - Prevents duplicate reviews per user per course.
 * - Updates the course's average rating and reviewCount.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id: courseId } = await params;

    const body = await safeBody<ReviewBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const rating = Number(body.rating);
    const comment = body.comment?.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return jsonError("Rating must be an integer between 1 and 5", 400);
    if (!comment) return jsonError("Comment is required", 400);

    // Course must exist
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return jsonError("Course not found", 404);

    // Reject duplicates. findFirst is used so this compiles against the
    // current Prisma client; the DB-level @@unique constraint is the final
    // guard against concurrent duplicate submissions.
    const existing = await db.review.findFirst({
      where: { studentId: user.id, courseId },
      select: { id: true },
    });
    if (existing)
      return jsonError("You have already reviewed this course", 409);

    // Create review
    const review = await db.review.create({
      data: { studentId: user.id, courseId, rating, comment },
      include: {
        student: {
          select: { id: true, fullName: true, profilePicture: true },
        },
      },
    });

    // Recompute aggregate rating + count
    const agg = await db.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await db.course.update({
      where: { id: courseId },
      data: {
        rating: agg._avg.rating || 0,
        reviewCount: agg._count.rating,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[reviews/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
