import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";
import { canManageCourse, decideCourseContentAccess } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/assignments/:id — homework details + the current user's submission. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, teacherId: true } },
        submissions: {
          where: user ? { studentId: user.id } : { studentId: "__anonymous__" },
          take: 1,
        },
      },
    });
    if (!assignment) return jsonError("Assignment not found", 404);

    const isManager = Boolean(user && canManageCourse(user, assignment.course));
    const decision = user
      ? await decideCourseContentAccess(user, assignment.courseId)
      : { allowed: false, status: 403 as const, reason: "Login required" };
    if (!isManager && !decision.allowed) {
      return jsonError(decision.reason || "Forbidden", decision.status);
    }
    if (!isManager && !assignment.isPublished) return jsonError("Assignment not available", 404);

    const { course: _course, ...safeAssignment } = assignment;
    return NextResponse.json({ assignment: safeAssignment, canManage: isManager });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[assignments/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
