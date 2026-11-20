import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isAdminRole, requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { hasApprovedTrial } from "@/lib/trial-access";

type RouteContext = { params: Promise<{ id: string }> };

async function canAccessClass(
  user: { id: string; role: string },
  liveClass: { id: string; courseId: string | null; teacherId: string | null }
): Promise<boolean> {
  if (isAdminRole(user.role)) return true;
  if (liveClass.teacherId === user.id) return true;
  if (await hasApprovedTrial(user.id, liveClass.id)) return true;
  if (!liveClass.courseId) return false;
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId: liveClass.courseId } },
    select: { id: true },
  });
  return Boolean(enrollment);
}

/** GET /api/live/:id/polls — live questions with tally (participants only). */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (!(await canAccessClass(user, liveClass))) return jsonError("Forbidden", 403);

    const polls = await db.poll.findMany({
      where: { liveClassId: id },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        votes: {
          select: { studentId: true, optionIndex: true },
        },
      },
    });

    const shaped = polls.map((poll) => {
      const options = Array.isArray(poll.options)
        ? (poll.options as unknown as string[])
        : [];
      const counts = options.map((_, i) => poll.votes.filter((v) => v.optionIndex === i).length);
      return {
        id: poll.id,
        liveClassId: poll.liveClassId,
        question: poll.question,
        options,
        createdBy: poll.createdBy,
        startedAt: poll.startedAt,
        endedAt: poll.endedAt,
        voted: poll.votes.some((v) => v.studentId === user.id),
        results: counts.map((votes, optionIndex) => ({ optionIndex, votes })),
      };
    });

    return NextResponse.json({ polls: shaped });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[polls/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/** POST /api/live/:id/polls — teacher/admin asks a live question. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const limited = limitRequest(`poll-create:${user.id}`, 30, 60_000);
    if (limited) return limited;

    const liveClass = await db.liveClass.findUnique({ where: { id } });
    if (!liveClass) return jsonError("Live class not found", 404);
    if (!isAdminRole(user.role) && liveClass.teacherId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const body = await safeBody<{ question?: string; options?: string[] }>(req);
    const question = body?.question?.trim();
    const options = (body?.options || []).map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2 || options.length > 8) {
      return jsonError("A question and 2-8 options are required", 400);
    }

    const poll = await db.poll.create({
      data: {
        liveClassId: id,
        question: question.slice(0, 1000),
        options: options.map((o) => o.slice(0, 300)),
        createdBy: user.id,
      },
    });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[polls/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
