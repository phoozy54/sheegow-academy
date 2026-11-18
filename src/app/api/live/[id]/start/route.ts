import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/live/:id/start
 * Mark a live class as "live" (teacher/admin only).
 */
export async function PUT(_req: Request, { params }: RouteContext) {
  try {
    await requireTeacherOrAdmin();
    const { id } = await params;

    const existing = await db.liveClass.findUnique({ where: { id } });
    if (!existing) return jsonError("Live class not found", 404);

    const liveClass = await db.liveClass.update({
      where: { id },
      data: { status: "live" },
    });

    return NextResponse.json({ liveClass });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[live/start] error:", e);
    return jsonError("Internal server error", 500);
  }
}
