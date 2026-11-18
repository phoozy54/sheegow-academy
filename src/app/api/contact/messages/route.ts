import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, handleAuthError } from "@/lib/api-helpers";

/**
 * GET /api/contact/messages
 * Admin only. List contact messages sorted by createdAt desc.
 */
export async function GET() {
  try {
    await requireAdmin();

    const messages = await db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[contact/messages/list] error:", e);
    return jsonError("Internal server error", 500);
  }
}
