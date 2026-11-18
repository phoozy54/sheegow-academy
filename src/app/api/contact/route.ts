import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";

interface ContactBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

/**
 * POST /api/contact
 * Public. Create a contact message.
 */
export async function POST(req: Request) {
  try {
    const body = await safeBody<ContactBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const subject = body.subject?.trim();
    const message = body.message?.trim();

    if (!name) return jsonError("Name is required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (!subject) return jsonError("Subject is required", 400);
    if (!message) return jsonError("Message is required", 400);

    const contactMessage = await db.contactMessage.create({
      data: { name, email, phone, subject, message },
    });

    return NextResponse.json(
      { success: true, contactMessage },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    console.error("[contact/create] error:", e);
    return jsonError("Internal server error", 500);
  }
}
