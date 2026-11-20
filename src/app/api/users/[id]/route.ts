import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { requireAdmin, isAdminRole } from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface UpdateUserBody {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  level?: string;
  isActive?: boolean;
}

type RouteContext = { params: Promise<{ id: string }> };

const VALID_ROLES = new Set(["student", "teacher", "admin", "super_admin"]);
const VALID_LEVELS = new Set([
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
]);

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
 * PUT /api/users/:id
 * Admin only. Update a user's profile fields.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await safeBody<UpdateUserBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return jsonError("User not found", 404);

    const data: Record<string, unknown> = {};

    if (body.fullName !== undefined) {
      const v = body.fullName.trim();
      if (!v) return jsonError("fullName cannot be empty", 400);
      data.fullName = v;
    }
    if (body.email !== undefined) {
      const v = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return jsonError("A valid email is required", 400);
      // Ensure email uniqueness (excluding the current user)
      const dup = await db.user.findUnique({ where: { email: v } });
      if (dup && dup.id !== id)
        return jsonError("Email already in use", 409);
      data.email = v;
    }
    if (body.phone !== undefined) data.phone = body.phone.trim() || null;
    if (body.role !== undefined) {
      const v = body.role.trim();
      if (!VALID_ROLES.has(v))
        return jsonError("Invalid role", 400);
      // Only the super admin may change roles — including assigning or
      // revoking the teacher role. This keeps staff management centralised.
      if (v !== existing.role && admin.role !== "super_admin") {
        return jsonError("Only a super admin can change user roles", 403);
      }
      // Only a super admin may grant or revoke super-admin access.
      if (
        (v === "super_admin" || existing.role === "super_admin") &&
        admin.role !== "super_admin"
      )
        return jsonError("Only a super admin can manage super-admin accounts", 403);
      // Prevent an admin from stripping their own management role.
      if (isAdminRole(existing.role) && !isAdminRole(v) && admin.id === id)
        return jsonError("You cannot demote your own admin account", 400);
      data.role = v;
    }
    if (body.level !== undefined) {
      const v = body.level.trim();
      if (!VALID_LEVELS.has(v)) return jsonError("Invalid level", 400);
      data.level = v;
    }
    if (body.isActive !== undefined) {
      if (existing.id === admin.id && body.isActive === false)
        return jsonError("You cannot deactivate your own account", 400);
      data.isActive = body.isActive;
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return NextResponse.json({ user });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/update]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/**
 * DELETE /api/users/:id
 * Admin only. Delete a user. Cannot delete self.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id)
      return jsonError("You cannot delete your own account", 400);

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return jsonError("User not found", 404);
    if (existing.role === "super_admin" && admin.role !== "super_admin")
      return jsonError("Only a super admin can delete a super admin", 403);

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[users/delete]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
