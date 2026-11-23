import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError } from "@/lib/api-helpers";
import {
  TRIAL_CLASS_PREFIX,
  TRIAL_METHOD,
  approverId,
  classIdFromTrial,
} from "@/lib/trial";

/** GET /api/admin/trial-requests — queue for admins and super admins. */
export async function GET() {
  try {
    await requireAdmin();

    const payments = await db.payment.findMany({
      where: {
        method: TRIAL_METHOD,
        transactionId: { startsWith: TRIAL_CLASS_PREFIX },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profilePicture: true,
          },
        },
      },
    });

    const classIds = payments
      .map((p) => classIdFromTrial(p.transactionId))
      .filter((id): id is string => Boolean(id));
    const classes = classIds.length
      ? await db.liveClass.findMany({
          where: { id: { in: classIds } },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledAt: true,
            courseId: true,
          },
        })
      : [];
    const classMap = new Map(classes.map((c) => [c.id, c]));

    const requests = payments.map((p) => {
      const classId = classIdFromTrial(p.transactionId);
      return {
        id: p.id,
        studentId: p.studentId,
        student: p.student,
        courseId: p.courseId,
        classId,
        liveClass: classId ? classMap.get(classId) ?? null : null,
        status: p.status,
        approvedBy: approverId(p.couponCode),
        createdAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ requests });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[admin/trial-requests]", "list failed", e);
    return jsonError("Internal server error", 500);
  }
}
