import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { isAdminRole, requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError, nonEmpty } from "@/lib/api-helpers";

interface CreateCourseBody {
  title?: string;
  description?: string;
  level?: string;
  price?: number;
  duration?: number;
  image?: string;
  teacherId?: string;
  whatYouLearn?: string;
}

/** Public projection for nested teacher includes — never expose email,
 * internal role or the free-text bio on publicly readable endpoints. */
const teacherSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

/** Parse a bounded positive integer from a query string. */
function boundedInt(
  value: string | null,
  fallback: number,
  max: number
): number | null {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
}

/**
 * GET /api/courses
 * List courses with optional filters: ?level=&search=&page=&limit=
 * Returns { items, total, page, totalPages, limit }.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = boundedInt(searchParams.get("page"), 1, 1000);
    const limit = boundedInt(searchParams.get("limit"), 10, 50);
    if (page === null || limit === null)
      return jsonError("Invalid pagination parameters", 400);
    const level = nonEmpty(searchParams.get("level"));
    const search = nonEmpty(searchParams.get("search"));

    const where = {
      isActive: true,
      ...(level ? { level } : {}),
      ...(search ? { title: { contains: search } } : {}),
    } as const;

    // Prices are public: the card shows the course price and the full total
    // is confirmed at checkout. Keeping this in the public projection makes
    // the site, the JSON-LD and the rendered UI consistent for every visitor.
    const select = {
      id: true,
      title: true,
      description: true,
      level: true,
      price: true,
      duration: true,
      image: true,
      teacherId: true,
      rating: true,
      reviewCount: true,
      whatYouLearn: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      teacher: { select: teacherSelect },
    };

    const [items, total] = await Promise.all([
      db.course.findMany({
        where,
        select,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.course.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/courses
 * Create a new course (teacher/admin only).
 */
export async function POST(req: Request) {
  try {
    const actor = await requireTeacherOrAdmin();

    const body = await safeBody<CreateCourseBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const title = body.title?.trim();
    const description = body.description?.trim();
    const level = body.level?.trim();
    const price = typeof body.price === "number" ? body.price : undefined;
    const duration = typeof body.duration === "number" ? body.duration : undefined;

    if (!title) return jsonError("Title is required", 400);
    if (!description) return jsonError("Description is required", 400);
    if (!level) return jsonError("Level is required", 400);
    if (price === undefined || price < 1)
      return jsonError("Price must be at least $1", 400);
    if (duration === undefined || duration <= 0)
      return jsonError("Valid duration is required", 400);

    const course = await db.course.create({
      data: {
        title,
        description,
        level,
        price,
        duration,
        image: body.image?.trim() || null,
        // Teachers always own courses they create. Only admins may attribute a
        // course to somebody else.
        teacherId: isAdminRole(actor.role)
          ? body.teacherId?.trim() || actor.id
          : actor.id,
        whatYouLearn: body.whatYouLearn?.trim() || null,
      },
      include: { teacher: { select: teacherSelect } },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
