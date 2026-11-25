import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, safeBody } from "@/lib/api-helpers";
import { sendEmail } from "@/lib/email";

interface SubscribeBody {
  email?: string;
  name?: string;
  source?: string;
}

/**
 * POST /api/newsletter
 * Subscribe an email to the newsletter. Idempotent — if the email already
 * exists and was unsubscribed, it reactivates. Sends a welcome email
 * automatically.
 */
export async function POST(req: Request) {
  try {
    const body = await safeBody<SubscribeBody>(req);
    if (!body || !body.email?.trim()) {
      return jsonError("Email is required", 400);
    }

    const email = body.email.trim().toLowerCase();
    const name = body.name?.trim() || null;
    const source = body.source?.trim() || "footer";

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Please enter a valid email address", 400);
    }

    // Upsert the subscriber
    const subscriber = await db.newsletterSubscriber.upsert({
      where: { email },
      update: { isActive: true, name },
      create: { email, name, source, isActive: true },
    });

    // Send welcome email automatically
    try {
      await sendEmail(
        email,
        "Welcome to SHEEGOW ACADEMY — Live Class Schedule",
        `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">SHEEGOW ACADEMY</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0">Live English Learning Platform</p>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="color:#6366f1">You're on the list!</h2>
            <p>Thank you for subscribing${name ? `, ${name}` : ""}!</p>
            <p>You'll now receive updates about our live English class schedule, new courses, and special offers.</p>
            <div style="background:#f0f0ff;padding:16px;border-radius:8px;margin:16px 0">
              <p style="margin:0;color:#4f46e5;font-size:14px">
                <strong>What's next?</strong><br>
                • Browse our courses at sheegowacademy.com/courses<br>
                • Join a free trial live class<br>
                • Follow us for daily English tips
              </p>
            </div>
            <a href="https://www.sheegowacademy.com/courses" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Browse Courses</a>
          </div>
          <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">
            © SHEEGOW ACADEMY — Hargeisa, Somaliland<br>
            You received this email because you subscribed at sheegowacademy.com
          </div>
        </div>`,
        `<div>SHEEGOW ACADEMY — Live English Learning Platform

You're on the list!

Thank you for subscribing${name ? `, ${name}` : ""}!

You'll now receive updates about our live English class schedule, new courses, and special offers.

What's next:
• Browse our courses at sheegowacademy.com/courses
• Join a free trial live class
• Follow us for daily English tips

Visit: https://www.sheegowacademy.com/courses

© SHEEGOW ACADEMY — Hargeisa, Somaliland</div>`
      );
      logger.info("newsletter", "welcome email sent", { email });
    } catch (emailErr) {
      logger.error("newsletter", "welcome email failed", emailErr);
      // Don't fail the subscription if email fails
    }

    logger.info("newsletter", "new subscriber", { email, source });
    return NextResponse.json({ success: true, subscribed: true });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("newsletter", "subscribe failed", e);
    return jsonError("Failed to subscribe. Please try again.", 500);
  }
}
