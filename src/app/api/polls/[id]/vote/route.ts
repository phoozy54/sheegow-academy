import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAdminRole, requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { hasApprovedTrial } from "@/lib/trial-access";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/polls/:id/vote — one vote per student, while the poll is open. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const limited = limitRequest(`poll-vote:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        liveClass: {
          select: { id: true, courseId: true, teacherId: true },
        },
      },
    });
    if (!poll) return jsonError("Poll not found", 404);
    if (poll.endedAt) return jsonError("This poll has ended", 400);

    const liveClass = poll.liveClass;
    const allowed =
      isAdminRole(user.role) ||
      liveClass.teacherId === user.id ||
      (await hasApprovedTrial(user.id, liveClass.id)) ||
      Boolean(
        liveClass.courseId &&
          (await db.enrollment.findUnique({
            where: {
              studentId_courseId: { studentId: user.id, courseId: liveClass.courseId },
            },
            select: { id: true },
          }))
      );
    if (!allowed) return jsonError("Forbidden", 403);

    const body = await safeBody<{ optionIndex?: number }>(req);
    const optionIndex = body?.optionIndex;
    const options = Array.isArray(poll.options) ? (poll.options as unknown as unknown[]) : [];
    if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex) ||
        optionIndex < 0 || optionIndex >= options.length) {
      return jsonError("Invalid option", 400);
    }

    await db.pollVote.upsert({
      where: { pollId_studentId: { pollId: id, studentId: user.id } },
      create: { pollId: id, studentId: user.id, optionIndex },
      update: { optionIndex },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[polls/vote]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
