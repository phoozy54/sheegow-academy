/**
 * SHEEGOW ACADEMY — Email helper (Resend).
 *
 * Server-side only. Never import this module from a client component.
 *
 * The Resend client is lazily initialized. When `RESEND_API_KEY` is missing
 * (e.g. local dev), the helpers degrade to no-ops that log a warning — they
 * never throw and never crash the caller. Every email call is best-effort.
 */

import { logger } from "@/lib/logger";
import {
  welcomeTemplate,
  classReminderTemplate,
  teacherApplicationTemplate,
  refundTemplate,
  announcementTemplate,
  certificateTemplate,
} from "@/lib/email-templates";

import type { Resend } from "resend";

let _client: Resend | null = null;
let _warnedMissingKey = false;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "hello@sheegow.academy";

/**
 * Lazily build the Resend client. Returns null when no API key is configured
 * so callers can short-circuit without crashing.
 */
function getClient(): Resend | null {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!_warnedMissingKey) {
      _warnedMissingKey = true;
      // G2/OPS-3: in production this is a monitored failure, not a quiet
      // dev no-op. No email is sent — fail closed and make it visible.
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "[email]",
          "RESEND_API_KEY is not set in production — no emails can be sent"
        );
      } else {
        logger.warn(
          "[email]",
          "RESEND_API_KEY not set — emails will be skipped (dev no-op)"
        );
      }
    }
    return null;
  }
  // Lazy require so the module can be imported (and tree-shaken) on systems
  // without the package — though `resend` is now a hard dependency.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  _client = new Resend(apiKey);
  return _client;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Low-level send. Accepts pre-rendered `html` + `text`.
 *
 * Best-effort: never throws. Errors are logged and returned as `{ ok: false }`.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    // G2/OPS-2: never log the recipient address or subject.
    logger.debug("[email]", "skipped (no API key)");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text ?? "",
    });
    if (error) {
      logger.error("[email]", "Resend returned error", undefined, {
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    logger.error("[email]", "failed to send email", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── High-level helpers ─────────────────────────────── */

/** Welcome email — sent on registration. */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<SendEmailResult> {
  const { html, text } = welcomeTemplate(userName);
  return sendEmail(userEmail, "Welcome to SHEEGOW ACADEMY", html, text);
}

/** Live class reminder — 15 minutes before start. */
export async function sendClassReminderEmail(
  userEmail: string,
  userName: string,
  classTitle: string,
  classTime: string,
  classUrl: string
): Promise<SendEmailResult> {
  const { html, text } = classReminderTemplate(
    userName,
    classTitle,
    classTime,
    classUrl
  );
  return sendEmail(
    userEmail,
    `Your live class "${classTitle}" starts in 15 minutes`,
    html,
    text
  );
}

/** Teacher application decision — approved / rejected / under_review. */
export async function sendTeacherApplicationEmail(
  userEmail: string,
  userName: string,
  status: "approved" | "rejected" | "under_review",
  adminNote?: string | null
): Promise<SendEmailResult> {
  const { html, text } = teacherApplicationTemplate(
    userName,
    status,
    adminNote ?? null
  );
  const subject =
    status === "approved"
      ? "Your SHEEGOW teacher application has been approved"
      : status === "rejected"
        ? "An update on your SHEEGOW teacher application"
        : "Your SHEEGOW teacher application is under review";
  return sendEmail(userEmail, subject, html, text);
}

/** Refund decision — approved / rejected. */
export async function sendRefundEmail(
  userEmail: string,
  userName: string,
  status: "approved" | "rejected",
  amount: string,
  courseTitle: string,
  adminNote?: string | null
): Promise<SendEmailResult> {
  const { html, text } = refundTemplate(
    userName,
    status,
    amount,
    courseTitle,
    adminNote ?? null
  );
  const subject =
    status === "approved"
      ? `Your refund for "${courseTitle}" has been approved`
      : `An update on your refund for "${courseTitle}"`;
  return sendEmail(userEmail, subject, html, text);
}

/** New announcement in a course — sent to each enrolled student. */
export async function sendAnnouncementEmail(
  userEmail: string,
  userName: string,
  courseTitle: string,
  announcementTitle: string,
  announcementBody: string
): Promise<SendEmailResult> {
  const { html, text } = announcementTemplate(
    userName,
    courseTitle,
    announcementTitle,
    announcementBody
  );
  return sendEmail(
    userEmail,
    `New announcement in ${courseTitle}: ${announcementTitle}`,
    html,
    text
  );
}

/** Course completion / certificate issued. */
export async function sendCertificateEmail(
  userEmail: string,
  userName: string,
  courseTitle: string,
  certificateUrl: string
): Promise<SendEmailResult> {
  const { html, text } = certificateTemplate(
    userName,
    courseTitle,
    certificateUrl
  );
  return sendEmail(
    userEmail,
    `You completed ${courseTitle} — certificate inside`,
    html,
    text
  );
}
