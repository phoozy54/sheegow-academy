import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  comparePassword,
  hashPassword,
  requireAuth,
} from "@/lib/auth";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

/**
 * POST /api/auth/change-password
 * Verify the current password, then set a new one for the signed-in user.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await safeBody<ChangePasswordBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const currentPassword = body.currentPassword || "";
    const newPassword = body.newPassword || "";

    if (!currentPassword) return jsonError("Current password is required", 400);
    if (newPassword.length < 12) {
      return jsonError("New password must be at least 12 characters", 400);
    }
    if (newPassword === currentPassword) {
      return jsonError("New password must be different from the current one", 400);
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    });
    if (!dbUser) return jsonError("Unauthorized", 401);

    const valid = await comparePassword(currentPassword, dbUser.password);
    if (!valid) return jsonError("Current password is incorrect", 400);

    await db.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[auth/change-password]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
