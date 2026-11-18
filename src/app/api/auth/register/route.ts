import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setAuthCookies } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface RegisterBody {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

/**
 * POST /api/auth/register
 * Create a new student account, set auth cookies and return the user.
 */
export async function POST(req: Request) {
  try {
    const body = await safeBody<RegisterBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const password = body.password;

    // ── Validate inputs ──
    if (!fullName) return jsonError("Full name is required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (!password || password.length < 6)
      return jsonError("Password must be at least 6 characters", 400);

    // ── Reject duplicate emails ──
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return jsonError("Email already registered", 409);

    const hashed = await hashPassword(password);

    const user = await db.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashed,
        role: "student",
      },
      select: {
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
      },
    });

    await setAuthCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[auth/register] error:", e);
    return jsonError("Internal server error", 500);
  }
}
