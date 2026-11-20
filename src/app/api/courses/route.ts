import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherOrAdmin } from "@/lib/auth";
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

/** Public user projection for nested teacher includes */
const teacherSelect = {
  id: true,
  fullName: true,
  email: true,
  profilePicture: true,
  bio: true,
  role: true,
} as const;

/**
 * GET /api/courses
 * List courses with optional filters: ?level=&search=&page=&limit=
 * Returns { items, total, page, totalPages, limit }.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const level = nonEmpty(searchParams.get("level"));
    const search = nonEmpty(searchParams.get("search"));

    const where = {
      isActive: true,
      ...(level ? { level } : {}),
      ...(search ? { title: { contains: search } } : {}),
    } as const;

    const [items, total] = await Promise.all([
      db.course.findMany({
        where,
        include: { teacher: { select: teacherSelect } },
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
    console.error("[courses/list] error:", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/courses
 * Create a new course (teacher/admin only).
 */
export async function POST(req: Request) {
  try {
    await requireTeacherOrAdmin();

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
        teacherId: body.teacherId?.trim() || null,
        whatYouLearn: body.whatYouLearn?.trim() || null,
      },
      include: { teacher: { select: teacherSelect } },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[courses/create] error:", e);
    return jsonError("Internal server error", 500);
  }
}
