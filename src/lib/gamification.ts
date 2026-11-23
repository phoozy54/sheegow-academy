// SHEEGOW ACADEMY — gamification helpers
//
// Server-side helpers used by lesson progress, quiz submit, attendance,
// assignment submit and discussion thread routes to:
//   • award points for a learning activity
//   • extend (or reset) a student's daily streak
//   • check milestone criteria and award one-time badges
//
// Every helper is safe to call repeatedly: points accumulate but a badge is
// only ever awarded once per (student, type). All DB failures are caught and
// logged so a gamification blip never breaks the underlying learning flow.

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { BadgeType } from "@/lib/badge-metadata";

/** Points awarded per activity. Kept here as the single source of truth. */
export const POINTS = {
  lessonComplete: 10,
  quizPass: 20,
  liveAttendance: 15,
  assignmentSubmit: 15,
  threadCreate: 5,
} as const;

/**
 * Award points to a student. Idempotent: the same call just adds more points.
 * `reason` is logged for auditability (we don't keep a ledger row yet to keep
 * the schema small — change to a points ledger if analytics are needed).
 */
export async function awardPoints(
  studentId: string,
  points: number,
  reason: string
): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;
  try {
    await db.studentPoints.upsert({
      where: { studentId },
      create: { studentId, points },
      update: { points: { increment: Math.floor(points) } },
    });
    logger.debug("[gamification]", "awarded points", {
      studentId,
      points: Math.floor(points),
      reason,
    });
  } catch (e) {
    logger.error("[gamification]", "awardPoints failed", e, {
      studentId,
      reason,
    });
  }
}

/**
 * Update a student's daily streak. Called from any "active today" event:
 * lesson complete, quiz pass, attendance, etc.
 *
 * Rules:
 *   • same calendar day  → no change (already active today)
 *   • next calendar day  → currentStreak + 1 (capped if lastActiveDate skipped)
 *   • gap > 1 day        → currentStreak resets to 1
 * longestStreak is updated whenever currentStreak exceeds it.
 */
export async function updateStreak(studentId: string): Promise<void> {
  try {
    const existing = await db.streak.findUnique({
      where: { studentId },
    });

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let currentStreak = 1;
    let longestStreak = 1;

    if (existing?.lastActiveDate) {
      const last = startOfDay(existing.lastActiveDate);
      const diffDays = Math.round(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 0) {
        // Already active today — no change.
        currentStreak = existing.currentStreak || 1;
        longestStreak = existing.longestStreak || currentStreak;
      } else if (diffDays === 1) {
        currentStreak = (existing.currentStreak || 0) + 1;
        longestStreak = Math.max(existing.longestStreak || 0, currentStreak);
      } else {
        // Streak broken — start fresh.
        currentStreak = 1;
        longestStreak = Math.max(existing.longestStreak || 0, currentStreak);
      }
    }

    await db.streak.upsert({
      where: { studentId },
      create: {
        studentId,
        currentStreak,
        longestStreak,
        lastActiveDate: today,
      },
      update: {
        currentStreak,
        longestStreak,
        lastActiveDate: today,
      },
    });
  } catch (e) {
    logger.error("[gamification]", "updateStreak failed", e, { studentId });
  }
}

/**
 * Check every badge criterion for a student and award any that are newly
 * earned. Returns the list of newly-awarded badge types so the calling route
 * can surface them in the response (e.g. for a toast).
 *
 * Each criterion is independent and lazily evaluated only for badges the
 * student does not yet have. Failures inside a single criterion are caught so
 * one bad query can't block the rest.
 */
export async function checkAndAwardBadges(
  studentId: string
): Promise<string[]> {
  const awarded: string[] = [];
  try {
    const existingBadges = await db.badge.findMany({
      where: { studentId },
      select: { badgeType: true },
    });
    const owned = new Set(existingBadges.map((b) => b.badgeType));

    const tryAward = async (type: BadgeType, criterion: () => Promise<boolean>) => {
      if (owned.has(type)) return;
      try {
        if (await criterion()) {
          await db.badge.create({
            data: { studentId, badgeType: type },
          });
          awarded.push(type);
        }
      } catch (e) {
        logger.error("[gamification]", `badge ${type} check failed`, e, {
          studentId,
        });
      }
    };

    // first_lesson — at least one completed LessonProgress row.
    await tryAward("first_lesson", async () => {
      const count = await db.lessonProgress.count({
        where: { studentId, status: "completed" },
      });
      return count >= 1;
    });

    // first_course — at least one completed enrollment.
    await tryAward("first_course", async () => {
      const count = await db.enrollment.count({
        where: { studentId, status: "completed" },
      });
      return count >= 1;
    });

    // streak_7 / streak_30 — based on the Streak row.
    await tryAward("streak_7", async () => {
      const streak = await db.streak.findUnique({ where: { studentId } });
      return (streak?.longestStreak ?? 0) >= 7;
    });
    await tryAward("streak_30", async () => {
      const streak = await db.streak.findUnique({ where: { studentId } });
      return (streak?.longestStreak ?? 0) >= 30;
    });

    // quiz_master — passed 5 distinct quizzes.
    await tryAward("quiz_master", async () => {
      const count = await db.quizAttempt.count({
        where: { studentId, passed: true },
      });
      return count >= 5;
    });

    // social_butterfly — posted 10 discussion threads.
    await tryAward("social_butterfly", async () => {
      const count = await db.discussionThread.count({
        where: { studentId },
      });
      return count >= 10;
    });

    // early_bird / night_owl — joined a live class before 9 AM / after 9 PM.
    await tryAward("early_bird", async () => {
      const attendance = await db.attendance.findFirst({
        where: { studentId },
        include: { liveClass: { select: { scheduledAt: true } } },
      });
      if (!attendance?.liveClass) return false;
      const hour = new Date(attendance.liveClass.scheduledAt).getHours();
      return hour < 9;
    });
    await tryAward("night_owl", async () => {
      const attendance = await db.attendance.findFirst({
        where: { studentId },
        include: { liveClass: { select: { scheduledAt: true } } },
      });
      if (!attendance?.liveClass) return false;
      const hour = new Date(attendance.liveClass.scheduledAt).getHours();
      return hour >= 21;
    });

    // polyglot — completed courses across 3+ different levels.
    await tryAward("polyglot", async () => {
      const completed = await db.enrollment.findMany({
        where: { studentId, status: "completed" },
        select: { course: { select: { level: true } } },
      });
      const levels = new Set(completed.map((e) => e.course?.level));
      return levels.size >= 3;
    });

    // perfect_attendance — attended every live class for at least one course.
    await tryAward("perfect_attendance", async () => {
      const courses = await db.course.findMany({
        where: { liveClasses: { some: {} } },
        select: {
          id: true,
          liveClasses: { select: { id: true } },
        },
      });
      for (const course of courses) {
        const classIds = course.liveClasses.map((lc) => lc.id);
        if (classIds.length === 0) continue;
        const attended = await db.attendance.count({
          where: {
            studentId,
            liveClassId: { in: classIds },
          },
        });
        if (attended >= classIds.length) return true;
      }
      return false;
    });
  } catch (e) {
    logger.error("[gamification]", "checkAndAwardBadges failed", e, {
      studentId,
    });
  }

  if (awarded.length > 0) {
    logger.info("[gamification]", "badges awarded", {
      studentId,
      badges: awarded,
    });
  }
  return awarded;
}

/** Return midnight (00:00 local time) of the given date. */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
