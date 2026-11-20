import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger"
import { jsonError, safeBody, handleAuthError } from "@/lib/api-helpers";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";

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
    const normalizedPhone = normalizeSomaliPhone(body.phone || "");
    const phone = normalizedPhone || null;
    const subject = body.subject?.trim();
    const message = body.message?.trim();

    if (!name) return jsonError("Name is required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (phone && !isValidSomaliPhone(phone))
      return jsonError(
        "Enter a valid Somali phone number starting with 61, 63 or 65",
        400
      );
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
    logger.error("[contact/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
