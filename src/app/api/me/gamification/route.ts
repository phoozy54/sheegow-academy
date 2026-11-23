import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import type { GamificationData } from "@/lib/types";

/**
 * GET /api/me/gamification
 * Returns the caller's points, current/longest streak and earned badges.
 *
 * Teachers/admins have no gamification state — they get zeros + an empty badge
 * list so the dashboard widget renders cleanly without a separate branch.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role !== "student") {
      const empty: GamificationData = {
        points: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        badges: [],
      };
      return NextResponse.json(empty);
    }

    const [pointsRow, streakRow, badgeRows] = await Promise.all([
      db.studentPoints.findUnique({
        where: { studentId: user.id },
        select: { points: true },
      }),
      db.streak.findUnique({
        where: { studentId: user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActiveDate: true,
        },
      }),
      db.badge.findMany({
        where: { studentId: user.id },
        select: { badgeType: true, awardedAt: true },
        orderBy: { awardedAt: "desc" },
      }),
    ]);

    const payload: GamificationData = {
      points: pointsRow?.points ?? 0,
      currentStreak: streakRow?.currentStreak ?? 0,
      longestStreak: streakRow?.longestStreak ?? 0,
      lastActiveDate: streakRow?.lastActiveDate?.toISOString() ?? null,
      badges: badgeRows.map((b) => ({
        type: b.badgeType,
        awardedAt: b.awardedAt.toISOString(),
      })),
    };

    return NextResponse.json(payload);
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[me/gamification]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
