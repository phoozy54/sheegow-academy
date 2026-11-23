import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/me/teacher-stats
 * Real teaching totals. Never derived from reviewCount or other unrelated
 * course fields.
 */
export async function GET() {
  try {
    const user = await requireTeacherOrAdmin();
    const isAdmin = user.role === "admin" || user.role === "super_admin";
    const scope = isAdmin ? {} : { teacherId: user.id };

    const [courses, enrollments, reviews, upcoming] = await Promise.all([
      db.course.count({ where: scope }),
      db.enrollment.count({ where: { course: scope } }),
      db.review.aggregate({
        where: { course: scope },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      db.liveClass.count({
        where: { ...scope, status: { in: ["scheduled", "live"] } },
      }),
    ]);

    const averageRating = reviews._avg.rating;
    return NextResponse.json({
      courses,
      enrollments,
      upcoming,
      reviewCount: reviews._count._all,
      averageRating:
        typeof averageRating === "number"
          ? Math.round(averageRating * 10) / 10
          : null,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[me/teacher-stats]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
