import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth, sessionVersionOf, setAuthCookies } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";
import { allocateUsername, usernameErrorResponse } from "@/lib/username";

const profileSelect = {
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

interface UpdateProfileBody {
  fullName?: string;
  username?: string;
  phone?: string;
  level?: string;
  bio?: string;
  profilePicture?: string;
}

const VALID_LEVELS = new Set([
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
]);

/**
 * GET /api/users/me
 * Return the current user's own profile.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/me/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * PATCH /api/users/me
 * Let a signed-in user update their own non-privileged profile fields.
 * Role, email, isActive and other security-sensitive fields are deliberately
 * NOT accepted here — those stay behind the admin-only endpoint.
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    const body = await safeBody<UpdateProfileBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const data: Record<string, unknown> = {};

    if (body.fullName !== undefined) {
      const v = body.fullName.trim();
      if (!v) return jsonError("Full name cannot be empty", 400);
      if (v.length > 120) return jsonError("Full name is too long", 400);
      data.fullName = v;
    }
    if (body.username !== undefined) {
      const preferred = body.username.trim();
      if (!preferred) return jsonError("Username cannot be empty", 400);
      try {
        data.username = await allocateUsername({
          fullName: (body.fullName ?? user.fullName).trim(),
          role: user.role,
          preferred,
          userId: user.id,
        });
      } catch (e) {
        const err = usernameErrorResponse(e);
        if (err) return jsonError(err.message, err.status);
        throw e;
      }
    }
    if (body.phone !== undefined) {
      const phone = normalizeSomaliPhone(body.phone);
      if (!phone) {
        data.phone = null;
      } else if (!isValidSomaliPhone(phone)) {
        return jsonError(
          "Enter a valid Somali phone number starting with 61, 63 or 65",
          400
        );
      } else {
        data.phone = phone;
      }
    }
    if (body.level !== undefined) {
      const v = body.level.trim();
      if (!VALID_LEVELS.has(v)) return jsonError("Invalid level", 400);
      data.level = v;
    }
    if (body.bio !== undefined) {
      data.bio = body.bio.trim().slice(0, 1000) || null;
    }
    if (body.profilePicture !== undefined) {
      data.profilePicture = body.profilePicture.trim().slice(0, 500) || null;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: profileSelect,
    });

    // @updatedAt advances the session epoch. Reissue cookies for the acting
    // device so a profile edit does not immediately log the user out; other
    // devices remain revoked (same semantics as change-password).
    await setAuthCookies({
      userId: updated.id,
      role: updated.role,
      email: updated.email,
      sessionVersion: sessionVersionOf(updated),
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/me/patch]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
