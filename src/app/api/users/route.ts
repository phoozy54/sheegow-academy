import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, nonEmpty } from "@/lib/api-helpers";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  profilePicture: true,
  bio: true,
  level: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/users
 * Admin only. List all users (excludes password).
 * Query params: ?role= filter, ?search= on name/email.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const role = nonEmpty(searchParams.get("role"));
    const search = nonEmpty(searchParams.get("search"));

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    } as const;

    const users = await db.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
