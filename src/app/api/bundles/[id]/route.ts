import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, limitRequest } from "@/lib/api-helpers";
import type { BundleWithCourses } from "@/lib/types";

/** Public-safe teacher projection — never expose email or the free-text bio. */
const teacherSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

/** Nested course projection inside a bundle — used by cards and checkout. */
const courseSelect = {
  id: true,
  title: true,
  description: true,
  level: true,
  price: true,
  duration: true,
  image: true,
  teacher: { select: teacherSelect },
} as const;

/** Flatten a Prisma bundle row (with nested BundleCourse → Course) into the
 *  public shape returned by the API. Pre-computes the original total and
 *  savings so the UI never has to redo it. */
function toBundleWithCourses(row: {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  courses: { course: {
    id: string;
    title: string;
    description: string;
    level: string;
    price: number;
    duration: number;
    image: string | null;
    teacher: { id: string; fullName: string; profilePicture: string | null } | null;
  } | null }[];
}): BundleWithCourses {
  const courses = (row.courses ?? [])
    .map((bc) => bc.course)
    .filter((c): c is NonNullable<typeof c> => !!c);
  const originalTotal = courses.reduce((sum, c) => sum + (c.price || 0), 0);
  const savings = Math.max(0, Math.round((originalTotal - row.price) * 100) / 100);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    image: row.image,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      level: c.level,
      price: c.price,
      duration: c.duration,
      image: c.image,
      teacher: c.teacher
        ? {
            id: c.teacher.id,
            fullName: c.teacher.fullName,
            profilePicture: c.teacher.profilePicture,
          }
        : null,
    })),
    originalTotal,
    savings,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/bundles/:id
 * Public single bundle with its courses.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const row = await db.bundle.findUnique({
      where: { id },
      include: {
        courses: {
          include: { course: { select: courseSelect } },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!row || !row.isActive) return jsonError("Bundle not found", 404);

    return NextResponse.json({ bundle: toBundleWithCourses(row) });
  } catch (e) {
    logger.error("[bundles/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

interface UpdateBundleBody {
  title?: string;
  description?: string;
  price?: number;
  image?: string | null;
  courseIds?: string[];
  isActive?: boolean;
}

/**
 * PUT /api/bundles/:id
 * Update a bundle (admin only). When `courseIds` is provided the bundle's
 * course list is fully replaced — every existing BundleCourse row is deleted
 * and re-created from the new array.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const limited = limitRequest("bundles:update", 20, 60 * 1000);
    if (limited) return limited;

    const { id } = await params;
    const body = await safeBody<UpdateBundleBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const existing = await db.bundle.findUnique({ where: { id } });
    if (!existing) return jsonError("Bundle not found", 404);

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const t = body.title.trim();
      if (!t) return jsonError("Title cannot be empty", 400);
      data.title = t;
    }
    if (body.description !== undefined) {
      const d = body.description.trim();
      if (!d) return jsonError("Description cannot be empty", 400);
      data.description = d;
    }
    if (body.price !== undefined) {
      if (typeof body.price !== "number" || body.price < 1)
        return jsonError("Price must be at least $1", 400);
      data.price = body.price;
    }
    if (body.image !== undefined) data.image = body.image?.trim() || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    // When `courseIds` is provided, replace the bundle's courses. Validate
    // every id points at a real course first so we never end up with a
    // half-replaced list (transaction rolls back if anything fails).
    let courseIdsToSet: string[] | null = null;
    if (Array.isArray(body.courseIds)) {
      courseIdsToSet = Array.from(
        new Set(body.courseIds.map((cid) => cid.trim()).filter(Boolean))
      );
      if (courseIdsToSet.length === 0)
        return jsonError("A bundle must include at least one course", 400);
      const courses = await db.course.findMany({
        where: { id: { in: courseIdsToSet } },
        select: { id: true },
      });
      if (courses.length !== courseIdsToSet.length) {
        return jsonError(
          "One or more courseIds do not exist. Refresh the course list and try again.",
          400
        );
      }
    }

    const row = await db.$transaction(async (tx) => {
      if (courseIdsToSet) {
        await tx.bundleCourse.deleteMany({ where: { bundleId: id } });
        await tx.bundleCourse.createMany({
          data: courseIdsToSet.map((courseId) => ({ bundleId: id, courseId })),
        });
      }
      return tx.bundle.update({
        where: { id },
        data,
        include: {
          courses: {
            include: { course: { select: courseSelect } },
            orderBy: { id: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ bundle: toBundleWithCourses(row) });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[bundles/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/bundles/:id
 * Permanently delete a bundle (admin only). BundleCourse rows cascade.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.bundle.findUnique({ where: { id } });
    if (!existing) return jsonError("Bundle not found", 404);

    await db.bundle.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[bundles/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
