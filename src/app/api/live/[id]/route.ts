import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const includeRelations = {
  course: { select: { id: true, title: true, level: true, image: true } },
  teacher: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profilePicture: true,
    },
  },
} as const;

/**
 * GET /api/live/:id
 * Single live class with course + teacher included.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const liveClass = await db.liveClass.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!liveClass) return jsonError("Live class not found", 404);

    return NextResponse.json({ liveClass });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[live/get] error:", e);
    return jsonError("Internal server error", 500);
  }
}
