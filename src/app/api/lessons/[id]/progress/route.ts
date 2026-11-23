import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, safeBody } from "@/lib/api-helpers";
import { decideCourseContentAccess, recomputeEnrollmentProgress, recordLearningEvent } from "@/lib/content-access";
import { awardPoints, updateStreak, checkAndAwardBadges, POINTS } from "@/lib/gamification";

type RouteContext = { params: Promise<{ id: string }> };

interface ProgressBody {
  status?: string;
  lastPositionSec?: number;
  secondsWatched?: number;
}

/**
 * POST /api/lessons/:id/progress
 * Save a student's real lesson progress and recompute the enrollment roll-up.
 * Only students have progress; teachers/admins are authors, not learners.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    if (user.role !== "student") return jsonError("Only students track progress", 403);

    const { id } = await params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { module: { select: { courseId: true, course: { select: { id: true, teacherId: true } } } } },
    });
    if (!lesson) return jsonError("Lesson not found", 404);

    const courseId = lesson.module.courseId;
    const decision = await decideCourseContentAccess(user, courseId);
    if (!decision.allowed) {
      return jsonError(decision.reason || "Forbidden", decision.status);
    }

    const body = await safeBody<ProgressBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const status =
      body.status === "completed" || body.status === "in_progress"
        ? body.status
        : "in_progress";
    const lastPositionSec =
      typeof body.lastPositionSec === "number" && Number.isFinite(body.lastPositionSec)
        ? Math.max(0, Math.floor(body.lastPositionSec))
        : 0;
    const secondsWatched =
      typeof body.secondsWatched === "number" && Number.isFinite(body.secondsWatched)
        ? Math.max(0, Math.floor(body.secondsWatched))
        : 0;

    const existing = await db.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: user.id, lessonId: id } },
      select: { secondsWatched: true, status: true },
    });
    const newlyCompleted = status === "completed" && existing?.status !== "completed";

    const progress = await db.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: user.id, lessonId: id } },
      create: {
        studentId: user.id,
        lessonId: id,
        status,
        lastPositionSec,
        secondsWatched,
        completedAt: status === "completed" ? new Date() : null,
      },
      update: {
        status,
        lastPositionSec,
        secondsWatched: Math.max(existing?.secondsWatched ?? 0, secondsWatched),
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    const completion = await recomputeEnrollmentProgress(user.id, courseId);
    await recordLearningEvent({
      userId: user.id,
      verb: status === "completed" ? "completed" : "viewed",
      objectType: "lesson",
      objectId: id,
      courseId,
      metadata: { lastPositionSec, secondsWatched },
    });

    // Gamification: only fire on the first completion, so a re-save does not
    // double-count points. Streak + badges are idempotent in the helpers.
    let newBadges: string[] = [];
    if (newlyCompleted) {
      await awardPoints(user.id, POINTS.lessonComplete, "lesson_complete");
      await updateStreak(user.id);
      newBadges = await checkAndAwardBadges(user.id);
    }

    return NextResponse.json({ progress, completion, newBadges });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[lessons/progress]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
