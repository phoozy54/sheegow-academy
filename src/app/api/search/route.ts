import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser, isTeachingRole } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { coursePath } from "@/lib/slug";
import type {
  SearchCourseResult,
  SearchLiveClassResult,
  SearchResponse,
  SearchUserResult,
} from "@/lib/types";

/** Maximum results returned per category in the dropdown (default). */
const DEFAULT_LIMIT = 5;
/** Hard cap so an attacker cannot ask for the whole catalog. */
const MAX_LIMIT = 50;
/** Ignore very short queries so we don't return the whole catalog by accident. */
const MIN_QUERY_LENGTH = 2;

function parseLimit(value: string | null): number {
  if (value === null || value.trim() === "") return DEFAULT_LIMIT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Public search across courses (title + description) and live classes (title).
 * When the request is from an admin or teacher, the response also includes a
 * `users` section that matches on fullName or email.
 *
 * Each category is capped at `limit` (default 5, max 50). An empty / too-short
 * query returns an empty payload.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("q") ?? "";
    const q = raw.trim();
    const limit = parseLimit(searchParams.get("limit"));

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json<SearchResponse>({
        courses: [],
        liveClasses: [],
        users: [],
      });
    }

    // Auth is best-effort here: we look at the current user only to decide
    // whether to include the `users` section. A missing/invalid session still
    // returns the public catalog matches — it just doesn't expose user data.
    const actor = await getCurrentUser().catch(() => null);
    const canSearchUsers = !!actor && isTeachingRole(actor.role);

    // Public catalog: only active courses are searchable. Slugs depend on the
    // full set of active course titles (for de-duplication), so fetch the
    // id+title pairs once and reuse them for `coursePath`.
    const allCourses = await db.course.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });

    const [courses, liveClasses, users] = await Promise.all([
      db.course.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          level: true,
          image: true,
        },
        take: limit,
        orderBy: { rating: "desc" },
      }),
      db.liveClass.findMany({
        where: {
          title: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          duration: true,
          status: true,
        },
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      canSearchUsers
        ? db.user.findMany({
            where: {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              username: true,
              role: true,
              profilePicture: true,
            },
            take: limit,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const courseResults: SearchCourseResult[] = courses.map((c) => {
      const href = coursePath({ id: c.id, title: c.title }, allCourses);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        level: c.level,
        image: c.image,
        slug: href.split("/").pop() || "",
        href,
      };
    });

    const liveClassResults: SearchLiveClassResult[] = liveClasses.map((lc) => ({
      id: lc.id,
      title: lc.title,
      scheduledAt: lc.scheduledAt.toISOString(),
      duration: lc.duration,
      status: lc.status,
      href: `/class/${lc.id}`,
    }));

    const userResults: SearchUserResult[] = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      username: u.username,
      role: u.role as SearchUserResult["role"],
      profilePicture: u.profilePicture,
    }));

    return NextResponse.json<SearchResponse>({
      courses: courseResults,
      liveClasses: liveClassResults,
      users: canSearchUsers ? userResults : undefined,
    });
  } catch (e) {
    logger.error("[search]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
