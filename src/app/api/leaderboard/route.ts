import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/types";

/**
 * GET /api/leaderboard
 * Top 10 students by points. Public — but when the caller is signed in, the
 * response also includes their own rank (1-based) and a copy of their entry
 * so the page can show a "your rank" callout even when not in the top 10.
 *
 * Students with 0 points are excluded from the ranked list (they would all
 * tie at rank 11+). The viewer's own rank is computed only if they have > 0
 * points.
 */
export async function GET() {
  try {
    const viewer = await getCurrentUser();

    // Top 10 students by points (only those who have earned any points).
    const topStudents = await db.studentPoints.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: "desc" },
      take: 10,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            profilePicture: true,
            isActive: true,
          },
        },
      },
    });

    // Pull streaks for the top 10 in one query.
    const topStudentIds = topStudents.map((s) => s.studentId);
    const streakRows = topStudentIds.length
      ? await db.streak.findMany({
          where: { studentId: { in: topStudentIds } },
          select: { studentId: true, currentStreak: true },
        })
      : [];
    const streakByStudent = new Map(
      streakRows.map((s) => [s.studentId, s.currentStreak])
    );

    const entries: LeaderboardEntry[] = topStudents
      .filter((row) => row.student?.isActive !== false)
      .map((row, idx) => ({
        rank: idx + 1,
        studentId: row.studentId,
        fullName: row.student?.fullName ?? "Unknown student",
        username: row.student?.username ?? null,
        points: row.points,
        currentStreak: streakByStudent.get(row.studentId) ?? 0,
        profilePicture: row.student?.profilePicture ?? null,
      }));

    // Current viewer's rank — computed by counting students with strictly
    // more points. Same logic as a SQL rank() over (ORDER BY points DESC).
    let currentUser: LeaderboardEntry | null = null;
    let currentUserRank: number | null = null;
    if (viewer && viewer.role === "student") {
      const [pointsRow, streakRow] = await Promise.all([
        db.studentPoints.findUnique({
          where: { studentId: viewer.id },
          select: { points: true },
        }),
        db.streak.findUnique({
          where: { studentId: viewer.id },
          select: { currentStreak: true },
        }),
      ]);
      const points = pointsRow?.points ?? 0;
      if (points > 0) {
        const higherCount = await db.studentPoints.count({
          where: { points: { gt: points } },
        });
        currentUserRank = higherCount + 1;
        currentUser = {
          rank: currentUserRank,
          studentId: viewer.id,
          fullName: viewer.fullName,
          username: viewer.username ?? null,
          points,
          currentStreak: streakRow?.currentStreak ?? 0,
          profilePicture: viewer.profilePicture ?? null,
        };
      }
    }

    const payload: LeaderboardResponse = {
      entries,
      currentUserRank,
      currentUser,
    };

    return NextResponse.json(payload);
  } catch (e) {
    logger.error("[leaderboard]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
