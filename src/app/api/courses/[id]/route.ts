import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import {
  getCurrentUser,
  isAdminRole,
  requireAdmin,
  requireTeacherOrAdmin,
} from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface UpdateCourseBody {
  title?: string;
  description?: string;
  level?: string;
  price?: number;
  duration?: number;
  image?: string;
  teacherId?: string;
  whatYouLearn?: string;
  isActive?: boolean;
  // Prerequisite — students must complete this course first.
  // Pass null/empty to clear.
  prerequisiteCourseId?: string | null;
}

/** Public-safe teacher projection. */
const teacherSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

const reviewStudentSelect = {
  id: true,
  fullName: true,
  profilePicture: true,
} as const;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/courses/:id
 * Single course with teacher, reviews (with student info), reviewCount and a
 * per-star rating breakdown (how many 5★, 4★, … 1★ reviews) used by the
 * histogram on the course detail page.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const viewer = await getCurrentUser();

    const [course, ratingGroups] = await Promise.all([
      db.course.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          level: true,
          ...(viewer ? { price: true } : {}),
          duration: true,
          image: true,
          teacherId: true,
          rating: true,
          reviewCount: true,
          whatYouLearn: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Prerequisite course — only public fields so the detail page can
          // show the name and link students to it.
          prerequisiteCourse: {
            select: { id: true, title: true, level: true, image: true },
          },
          teacher: { select: teacherSelect },
          reviews: {
            orderBy: { createdAt: "desc" },
            include: { student: { select: reviewStudentSelect } },
          },
        },
      }),
      // Count reviews grouped by star rating (1-5). Prisma's groupBy returns
      // one row per rating value with the matching count; we normalise into a
      // { "5": N, "4": N, ... } object so the client never has to worry about
      // missing keys.
      db.review.groupBy({
        by: ["rating"],
        where: { courseId: id },
        _count: { _all: true },
      }),
    ]);

    if (!course) return jsonError("Course not found", 404);

    const ratingBreakdown: Record<string, number> = {
      "5": 0,
      "4": 0,
      "3": 0,
      "2": 0,
      "1": 0,
    };
    for (const g of ratingGroups) {
      ratingBreakdown[String(g.rating)] = g._count._all;
    }

    return NextResponse.json({ course, ratingBreakdown });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * PUT /api/courses/:id
 * Update a course (teacher/admin only).
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const actor = await requireTeacherOrAdmin();

    const { id } = await params;
    const body = await safeBody<UpdateCourseBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) return jsonError("Course not found", 404);
    // A teacher may only edit a course explicitly assigned to them; admins
    // can edit any course. An unassigned course is not editable by teachers.
    if (!isAdminRole(actor.role) && existing.teacherId !== actor.id) {
      return jsonError("Forbidden", 403);
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.level !== undefined) data.level = body.level.trim();
    if (body.price !== undefined && body.price < 1)
      return jsonError("Price must be at least $1", 400);
    if (body.price !== undefined) data.price = body.price;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.image !== undefined) data.image = body.image.trim() || null;
    if (body.teacherId !== undefined && isAdminRole(actor.role))
      data.teacherId = body.teacherId.trim() || null;
    if (body.whatYouLearn !== undefined)
      data.whatYouLearn = body.whatYouLearn.trim() || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.prerequisiteCourseId !== undefined) {
      const rawPrereq = body.prerequisiteCourseId?.trim() || null;
      if (rawPrereq) {
        // Reject self-referencing and ensure the referenced course exists.
        if (rawPrereq === id) {
          return jsonError("A course cannot be its own prerequisite", 400);
        }
        const prereq = await db.course.findUnique({
          where: { id: rawPrereq },
          select: { id: true, isActive: true },
        });
        if (!prereq || !prereq.isActive) {
          return jsonError("Prerequisite course not found or inactive", 400);
        }
      }
      data.prerequisiteCourseId = rawPrereq;
    }

    const course = await db.course.update({
      where: { id },
      data,
      include: {
        teacher: { select: teacherSelect },
        prerequisiteCourse: { select: { id: true, title: true, level: true, image: true } },
      },
    });

    return NextResponse.json({ course });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/courses/:id
 * Delete a course (admin only).
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await params;
    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) return jsonError("Course not found", 404);

    await db.course.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
