import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/me/activity
 * Real learning totals — never fabricated from enrollment counts.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "student") {
      return NextResponse.json({
        completedLessons: 0,
        learningHours: 0,
        certificates: 0,
        watchedSeconds: 0,
      });
    }

    const [completedLessons, watched, certificates] = await Promise.all([
      db.lessonProgress.count({
        where: { studentId: user.id, status: "completed" },
      }),
      db.lessonProgress.aggregate({
        where: { studentId: user.id },
        _sum: { secondsWatched: true },
      }),
      db.certificate.count({
        where: { studentId: user.id, revokedAt: null },
      }),
    ]);

    const watchedSeconds = watched._sum.secondsWatched ?? 0;
    return NextResponse.json({
      completedLessons,
      watchedSeconds,
      learningHours: Math.round((watchedSeconds / 3600) * 10) / 10,
      certificates,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[me/activity]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
