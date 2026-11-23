import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAdminRole, requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, safeBody } from "@/lib/api-helpers";
import { hasApprovedTrial } from "@/lib/trial-access";
import { rateLimit } from "@/lib/rate-limit";
import { awardPoints, updateStreak, checkAndAwardBadges, POINTS } from "@/lib/gamification";

type RouteContext = { params: Promise<{ id: string }> };

type AttendanceUser = { id: string; role: string };
type AttendanceClass = {
  id: string;
  courseId: string | null;
  teacherId: string | null;
};

/** Same access rule as chat: host, enrolled/paid student, or approved trial. */
async function canAccessClass(
  user: AttendanceUser,
  liveClass: AttendanceClass
): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (liveClass.teacherId === user.id) return true;
  if (await hasApprovedTrial(user.id, liveClass.id)) return true;
  if (!liveClass.courseId) return false;
  const enrollment = await db.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: liveClass.courseId,
      },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}

function elapsedMinutes(joinedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - joinedAt.getTime()) / 60_000));
}

/** Keep the class badge accurate from real attendance rows. */
async function syncAttendeeCount(classId: string) {
  const count = await db.attendance.count({
    where: { liveClassId: classId, leftAt: null },
  });
  await db.liveClass.update({
    where: { id: classId },
    data: { attendeeCount: count },
  });
}

async function findRecord(classId: string, studentId: string) {
  return db.attendance.findUnique({
    where: {
      liveClassId_studentId: { liveClassId: classId, studentId },
    },
    select: { id: true, joinedAt: true, minutes: true, leftAt: true },
  });
}

/**
 * POST /api/live/:id/attendance
 * Body: { action: "join" | "heartbeat" | "leave" }
 * Students only. Heartbeats accumulate real attendance minutes.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const limit = rateLimit(`attendance:${user.id}:${id}`, 180, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attendance updates" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const liveClass = await db.liveClass.findUnique({
      where: { id },
      select: { id: true, courseId: true, teacherId: true, scheduledAt: true },
    });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (!(await canAccessClass(user, liveClass))) return jsonError("Forbidden", 403);

    // Teachers/admins run the class; only student attendance is tracked.
    if (user.role !== "student") {
      return NextResponse.json({ recorded: false });
    }

    const body = await safeBody<{ action?: string }>(req);
    const action = body?.action ?? "join";
    if (!["join", "heartbeat", "leave"].includes(action)) {
      return jsonError("Invalid attendance action", 400);
    }

    const now = new Date();
    const existing = await findRecord(id, user.id);
    const firstJoin = action === "join" && !existing;

    if (action === "join") {
      if (existing) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { joinedAt: now, leftAt: null },
        });
      } else {
        await db.attendance.create({
          data: { liveClassId: id, studentId: user.id, joinedAt: now },
        });
      }
    } else if (action === "heartbeat") {
      const minutes = existing
        ? Math.max(existing.minutes, elapsedMinutes(existing.joinedAt, now))
        : 0;
      if (existing) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { minutes },
        });
      } else {
        await db.attendance.create({
          data: { liveClassId: id, studentId: user.id, joinedAt: now, minutes },
        });
      }
    } else if (existing) {
      await db.attendance.update({
        where: { id: existing.id },
        data: {
          leftAt: now,
          minutes: Math.max(existing.minutes, elapsedMinutes(existing.joinedAt, now)),
        },
      });
    }

    if (action !== "heartbeat") await syncAttendeeCount(id);

    // Gamification: award points + extend the streak the first time the
    // student joins a class. Heartbeats and leave actions never re-award.
    let newBadges: string[] = [];
    if (firstJoin) {
      await awardPoints(user.id, POINTS.liveAttendance, "live_attendance");
      await updateStreak(user.id);
      // early_bird / night_owl depend on the class start time.
      const hour = new Date(liveClass.scheduledAt).getHours();
      if (hour < 9 || hour >= 21) {
        newBadges = await checkAndAwardBadges(user.id);
      }
    }

    return NextResponse.json({ recorded: true, newBadges });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/attendance]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** PATCH /api/live/:id/attendance — mark the current student as left. */
export async function PATCH(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    if (user.role !== "student") return NextResponse.json({ recorded: false });

    const record = await findRecord(id, user.id);
    if (!record) return NextResponse.json({ recorded: false });

    const now = new Date();
    await db.attendance.update({
      where: { id: record.id },
      data: {
        leftAt: now,
        minutes: Math.max(record.minutes, elapsedMinutes(record.joinedAt, now)),
      },
    });
    await syncAttendeeCount(id);
    return NextResponse.json({ recorded: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/attendance/leave]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
