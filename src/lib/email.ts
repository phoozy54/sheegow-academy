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
      logger.warn(
        "[email]",
        "RESEND_API_KEY not set — emails will be skipped (dev no-op)"
      );
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
    // Dev no-op. Log so devs can see what would have been sent.
    logger.debug("[email]", "skipped (no API key)", { to, subject });
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
        to,
        subject,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    logger.error("[email]", "failed to send email", e, { to, subject });
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── High-level helpers ─────────────────────────────── */

/** Welcome email — sent on registration. */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  const { html, text } = welcomeTemplate(userName);
  await sendEmail(userEmail, "Welcome to SHEEGOW ACADEMY", html, text);
}

/** Live class reminder — 15 minutes before start. */
export async function sendClassReminderEmail(
  userEmail: string,
  userName: string,
  classTitle: string,
  classTime: string,
  classUrl: string
): Promise<void> {
  const { html, text } = classReminderTemplate(
    userName,
    classTitle,
    classTime,
    classUrl
  );
  await sendEmail(
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
): Promise<void> {
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
  await sendEmail(userEmail, subject, html, text);
}

/** Refund decision — approved / rejected. */
export async function sendRefundEmail(
  userEmail: string,
  userName: string,
  status: "approved" | "rejected",
  amount: string,
  courseTitle: string,
  adminNote?: string | null
): Promise<void> {
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
  await sendEmail(userEmail, subject, html, text);
}

/** New announcement in a course — sent to each enrolled student. */
export async function sendAnnouncementEmail(
  userEmail: string,
  userName: string,
  courseTitle: string,
  announcementTitle: string,
  announcementBody: string
): Promise<void> {
  const { html, text } = announcementTemplate(
    userName,
    courseTitle,
    announcementTitle,
    announcementBody
  );
  await sendEmail(
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
): Promise<void> {
  const { html, text } = certificateTemplate(
    userName,
    courseTitle,
    certificateUrl
  );
  await sendEmail(
    userEmail,
    `You completed ${courseTitle} — certificate inside`,
    html,
    text
  );
}
