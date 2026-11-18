import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

interface MonthBucket {
  month: string; // "YYYY-MM"
  revenue: number;
}

/** Build an ordered list of the last N month buckets ending with the current month. */
function lastNMonthBuckets(n: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  // Start from N-1 months ago so the current month is the last entry.
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    buckets.push({ month: key, revenue: 0 });
  }
  return buckets;
}

/** Convert a Date to a "YYYY-MM" key. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * GET /api/stats
 * Admin only. Returns dashboard aggregates:
 *  - totalStudents, totalCourses, totalEnrollments, totalRevenue
 *  - liveClassesCount
 *  - recentEnrollments (last 5 with student+course names)
 *  - revenueByMonth (last 6 months: { month, revenue })
 *  - enrollmentsByLevel (group enrollments by course level: { level, count })
 */
export async function GET() {
  try {
    await requireAdmin();

    // Run independent counts in parallel for speed.
    const [
      totalStudents,
      totalCourses,
      totalEnrollments,
      liveClassesCount,
      completedPayments,
      recentEnrollments,
      allEnrollmentsWithCourse,
    ] = await Promise.all([
      db.user.count({ where: { role: "student" } }),
      db.course.count(),
      db.enrollment.count(),
      db.liveClass.count(),
      db.payment.findMany({
        where: { status: "completed" },
        select: { amount: true, createdAt: true },
      }),
      db.enrollment.findMany({
        take: 5,
        orderBy: { enrolledAt: "desc" },
        include: {
          student: { select: { id: true, fullName: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      db.enrollment.findMany({
        include: {
          course: { select: { id: true, level: true } },
        },
      }),
    ]);

    // totalRevenue = sum of completed payment amounts
    const totalRevenue = completedPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // revenueByMonth — bucket completed payments into the last 6 months
    const buckets = lastNMonthBuckets(6);
    const bucketByKey = new Map(buckets.map((b) => [b.month, b]));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 5);
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);

    for (const p of completedPayments) {
      if (p.createdAt < cutoff) continue;
      const key = monthKey(p.createdAt);
      const bucket = bucketByKey.get(key);
      if (bucket) bucket.revenue += p.amount;
    }

    const revenueByMonth = buckets.map((b) => ({
      month: b.month,
      revenue: Math.round(b.revenue * 100) / 100,
    }));

    // enrollmentsByLevel — group enrollments by their course's level
    const levelCounts = new Map<string, number>();
    for (const e of allEnrollmentsWithCourse) {
      const level = e.course?.level ?? "Unknown";
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }
    const enrollmentsByLevel = Array.from(levelCounts.entries()).map(
      ([level, count]) => ({ level, count })
    );

    return NextResponse.json({
      stats: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        liveClassesCount,
        recentEnrollments: recentEnrollments.map((e) => ({
          id: e.id,
          enrolledAt: e.enrolledAt,
          studentName: e.student.fullName,
          courseTitle: e.course.title,
        })),
        revenueByMonth,
        enrollmentsByLevel,
      },
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[stats] error:", e);
    return jsonError("Internal server error", 500);
  }
}
