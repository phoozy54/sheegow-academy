import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import {
  jsonError,
  safeBody,
  handleAuthError,
  limitRequest,
} from "@/lib/api-helpers";
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
  courses: {
    course: {
      id: string;
      title: string;
      description: string;
      level: string;
      price: number;
      duration: number;
      image: string | null;
      teacher:
        | { id: string; fullName: string; profilePicture: string | null }
        | null;
    } | null;
  }[];
}): BundleWithCourses {
  const courses = (row.courses ?? [])
    .map((bc) => bc.course)
    .filter((c): c is NonNullable<typeof c> => !!c);
  const originalTotal = courses.reduce((sum, c) => sum + (c.price || 0), 0);
  const savings = Math.max(
    0,
    Math.round((originalTotal - row.price) * 100) / 100
  );
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

interface CreateBundleBody {
  title?: string;
  description?: string;
  price?: number;
  image?: string;
  courseIds?: string[];
  isActive?: boolean;
}

/**
 * GET /api/bundles
 * Public list of active bundles with their courses (teacher + image).
 */
export async function GET() {
  try {
    const rows = await db.bundle.findMany({
      where: { isActive: true },
      include: {
        courses: {
          include: { course: { select: courseSelect } },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const bundles = rows.map((r) => toBundleWithCourses(r));

    return NextResponse.json({ bundles });
  } catch (e) {
    logger.error("[bundles/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/bundles
 * Create a bundle (admin only). Body:
 *   { title, description, price, image?, courseIds: string[], isActive? }
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const limited = limitRequest("bundles:create", 20, 60 * 1000);
    if (limited) return limited;

    const body = await safeBody<CreateBundleBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const title = body.title?.trim();
    const description = body.description?.trim();
    const price = typeof body.price === "number" ? body.price : undefined;
    const courseIds = Array.isArray(body.courseIds)
      ? Array.from(
          new Set(body.courseIds.map((id) => id.trim()).filter(Boolean))
        )
      : [];

    if (!title) return jsonError("Title is required", 400);
    if (!description) return jsonError("Description is required", 400);
    if (price === undefined || price < 1)
      return jsonError("Price must be at least $1", 400);
    if (courseIds.length === 0)
      return jsonError("A bundle must include at least one course", 400);

    // Validate that every courseId references a real course so we never
    // create orphan BundleCourse rows.
    const courses = await db.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true },
    });
    if (courses.length !== courseIds.length) {
      return jsonError(
        "One or more courseIds do not exist. Refresh the course list and try again.",
        400
      );
    }

    const bundle = await db.bundle.create({
      data: {
        title,
        description,
        price,
        image: body.image?.trim() || null,
        isActive: body.isActive !== false,
        courses: {
          create: courseIds.map((courseId) => ({ courseId })),
        },
      },
      include: {
        courses: {
          include: { course: { select: courseSelect } },
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json(
      { bundle: toBundleWithCourses(bundle) },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[bundles/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
