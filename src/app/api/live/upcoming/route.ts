import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { jsonError, handleAuthError } from "@/lib/api-helpers";

const includeRelations = {
  course: { select: { id: true, title: true, level: true, image: true } },
  teacher: {
    select: {
      id: true,
      fullName: true,
      profilePicture: true,
    },
  },
} as const;

/**
 * GET /api/live/upcoming
 * List live classes whose scheduledAt >= now OR status = "live",
 * sorted ascending by scheduledAt.
 */
export async function GET() {
  try {
    const now = new Date();
    const items = await db.liveClass.findMany({
      where: {
        OR: [{ scheduledAt: { gte: now } }, { status: "live" }],
      },
      include: includeRelations,
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ classes: items });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[live/upcoming]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
