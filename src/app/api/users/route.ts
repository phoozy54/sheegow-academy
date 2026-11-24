import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAdmin, hashPassword } from "@/lib/auth";
import { jsonError, handleAuthError, nonEmpty } from "@/lib/api-helpers";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";
import { allocateUsername, usernameErrorResponse } from "@/lib/username";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  username: true,
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

const CREATABLE_ROLES = new Set(["student", "teacher", "admin", "super_admin"]);
const VALID_LEVELS = new Set([
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
]);

/**
 * POST /api/users
 * A super admin creates all staff accounts (teachers and admins).
 * Regular admins may only create student accounts.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object") {
      return jsonError("Invalid request body", 400);
    }

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const preferredUsername = String(body.username ?? "").trim() || null;
    const normalizedPhone = normalizeSomaliPhone(String(body.phone ?? ""));
    const phone = normalizedPhone || null;
    const password = String(body.password ?? "");
    const role = String(body.role ?? "student").trim();
    const level = String(body.level ?? "Beginner").trim();
    const bio = String(body.bio ?? "").trim() || null;

    if (!fullName) return jsonError("Full name is required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (phone && !isValidSomaliPhone(phone))
      return jsonError(
        "Enter a valid Somali phone number starting with 61, 63 or 65",
        400
      );
    if (password.length < 12)
      return jsonError("Password must be at least 12 characters", 400);
    if (!CREATABLE_ROLES.has(role)) return jsonError("Invalid role", 400);
    if (!VALID_LEVELS.has(level)) return jsonError("Invalid level", 400);
    // This app has a single admin; admins can create privileged accounts.
    if (role !== "student" && !["admin", "super_admin"].includes(actor.role)) {
      return jsonError(
        "Only an admin can create teacher and admin accounts",
        403
      );
    }

    const duplicate = await db.user.findUnique({ where: { email } });
    if (duplicate) return jsonError("Email already in use", 409);

    // Every account gets a login handle. Role handles are assigned only by
    // this allocator; a caller-chosen handle is validated and uniqueness-checked.
    let username: string;
    try {
      username = await allocateUsername({
        fullName,
        role,
        preferred: preferredUsername,
      });
    } catch (e) {
      const err = usernameErrorResponse(e);
      if (err) return jsonError(err.message, err.status);
      throw e;
    }

    const user = await db.user.create({
      data: {
        fullName,
        email,
        username,
        phone,
        password: await hashPassword(password),
        role,
        level,
        bio,
      },
      select: userSelect,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
