import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/enrollments/my
 * Return the current user's enrollments, including course + teacher.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const enrollments = await db.enrollment.findMany({
      where: { studentId: user.id },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        },
        payment: { select: { id: true, method: true, status: true, amount: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({ enrollments });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[enrollments/my] error:", e);
    return jsonError("Internal server error", 500);
  }
}
