import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { jsonError, handleAuthError, nonEmpty } from "@/lib/api-helpers";

/** Default weekly live-class hours surfaced in the comparison table. */
const DEFAULT_LIVE_HOURS_PER_WEEK = 2;
/** Maximum number of courses the comparison endpoint will return. */
const MAX_COMPARE = 3;

/** Parse the `?ids=` query — a comma-separated list of course ids. */
function parseIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);
}

/** Split the newline-separated whatYouLearn blob into bullet strings. */
function parseBullets(value: string | null | undefined): { text: string }[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => ({ text }));
}

/**
 * GET /api/courses/compare?ids=id1,id2,id3
 * Public endpoint: returns comparison data for up to 3 courses. The response
 * is intentionally flat and small — just the fields the comparison table
 * renders (image, price, duration, level, rating, teacher, what you'll learn).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = parseIds(nonEmpty(searchParams.get("ids")) || null);

    if (ids.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    // De-duplicate ids so a repeated value never shows the same course twice.
    const uniqueIds = Array.from(new Set(ids));

    const courses = await db.course.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        price: true,
        duration: true,
        image: true,
        rating: true,
        reviewCount: true,
        whatYouLearn: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
          },
        },
      },
    });

    // Preserve the order the caller requested (ids → courses).
    const byId = new Map(courses.map((c) => [c.id, c]));
    const ordered = uniqueIds
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const payload = ordered.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      level: c.level,
      price: c.price,
      duration: c.duration,
      image: c.image,
      rating: c.rating,
      reviewCount: c.reviewCount,
      whatYouLearn: parseBullets(c.whatYouLearn),
      // Every completed course awards a certificate.
      certificate: true,
      // Live class hours scale with course duration so the comparison column
      // is meaningful even before a teacher schedules sessions.
      liveClassHours: DEFAULT_LIVE_HOURS_PER_WEEK,
      teacher: c.teacher
        ? {
            id: c.teacher.id,
            fullName: c.teacher.fullName,
            profilePicture: c.teacher.profilePicture,
          }
        : null,
    }));

    return NextResponse.json({ courses: payload });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[courses/compare]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
