/**
 * SHEEGOW ACADEMY — Email templates.
 *
 * Each exported function returns `{ html, text }` for a specific email type.
 * The HTML uses a shared `emailShell` wrapper so every email has the same
 * indigo gradient header, white content area, and footer.
 *
 * All templates are responsive (work on mobile + desktop) and ship a
 * plain-text fallback alongside the HTML.
 *
 * IMPORTANT: This module is server-side only. Never import from a client
 * component.
 */

/** Brand colors pulled from the platform design system. */
const BRAND = {
  indigo: "#6366f1",
  indigoDark: "#4f46e5",
  amber: "#f59e0b",
  textPrimary: "#1f2937",
  textMuted: "#6b7280",
  background: "#f9fafb",
  white: "#ffffff",
  border: "#e5e7eb",
} as const;

const SUPPORT_EMAIL = "hello@sheegow.academy";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.sheegowacademy.com";

/** Escape user content so it can never break HTML or inject markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Shared wrapper that gives every email the SHEEGOW ACADEMY look:
 * indigo gradient header bar with logo text, white content card, footer.
 *
 * `title` is shown in the header under the logo. `content` is the inner
 * HTML of the email body.
 */
export function emailShell(title: string, content: string): { html: string; text: string } {
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style>
    .header-bar { background: ${BRAND.indigoDark} !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.textPrimary};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.background};min-width:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td class="header-bar" style="background:linear-gradient(135deg,${BRAND.indigo} 0%,${BRAND.indigoDark} 100%);padding:28px 32px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;line-height:1.1;">
                    SHEEGOW <span style="color:${BRAND.amber};">ACADEMY</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#e0e7ff;margin-top:6px;padding-top:6px;font-weight:500;letter-spacing:0.02em;">
                    ${escapeHtml(title)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 28px 8px 28px;font-size:15px;line-height:1.6;color:${BRAND.textPrimary};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.border};padding-top:20px;">
                <tr>
                  <td style="font-size:12px;color:${BRAND.textMuted};line-height:1.5;">
                    <strong style="color:${BRAND.indigoDark};">SHEEGOW ACADEMY</strong><br />
                    English for Somali learners &mdash; live classes, structured courses, and a supportive community.
                    <br /><br />
                    &copy; ${year} SHEEGOW ACADEMY. All rights reserved.
                    <br />
                    Contact: <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.indigoDark};text-decoration:none;">${SUPPORT_EMAIL}</a>
                    &nbsp;|&nbsp;
                    <a href="${APP_URL}" style="color:${BRAND.indigoDark};text-decoration:none;">Visit website</a>
                    <br /><br />
                    You receive this email because you have a SHEEGOW ACADEMY account.
                    If this email reached you in error, you can ignore it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain-text fallback: strip tags + collapse whitespace.
  const text = [
    `SHEEGOW ACADEMY`,
    `${title}`,
    ``,
    stripHtml(content),
    ``,
    `--`,
    `© ${year} SHEEGOW ACADEMY`,
    `Contact: ${SUPPORT_EMAIL}`,
    `Website: ${APP_URL}`,
  ].join("\n");

  return { html, text };
}

/** Naive HTML → text converter for the plain-text fallback. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Small reusable button block used inside the content area. */
function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;">
    <tr>
      <td style="border-radius:10px;background:linear-gradient(135deg,${BRAND.indigo} 0%,${BRAND.indigoDark} 100%);">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/** Small "callout" box for admin notes. */
function noteBox(label: string, note: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f3f4f6;border-left:4px solid ${BRAND.amber};border-radius:6px;">
    <tr>
      <td style="padding:14px 18px;font-size:14px;color:${BRAND.textPrimary};line-height:1.55;">
        <strong style="color:${BRAND.indigoDark};">${escapeHtml(label)}</strong><br />
        ${escapeHtml(note)}
      </td>
    </tr>
  </table>`;
}

function greeting(name: string): string {
  const safe = escapeHtml(name || "there");
  return `<p style="margin:0 0 16px 0;">Hi <strong>${safe}</strong>,</p>`;
}

function signOff(): string {
  return `<p style="margin:24px 0 0 0;">Best regards,<br /><strong style="color:${BRAND.indigoDark};">The SHEEGOW ACADEMY Team</strong></p>`;
}

/* ─── Template: Welcome ───────────────────────────────── */

export function welcomeTemplate(name: string): { html: string; text: string } {
  const content = `
    ${greeting(name)}
    <p style="margin:0 0 16px 0;">Welcome to <strong style="color:${BRAND.indigoDark};">SHEEGOW ACADEMY</strong>! Your account is ready and you're all set to start learning English with us.</p>
    <p style="margin:0 0 16px 0;">Here's what you can do next:</p>
    <ul style="margin:0 0 16px 0;padding-left:22px;line-height:1.7;">
      <li>Browse our English courses and pick one that fits your level.</li>
      <li>Join live classes with our teachers from across Somalia.</li>
      <li>Track your progress and earn certificates as you complete courses.</li>
      <li>Connect with other learners in course discussions.</li>
    </ul>
    ${ctaButton("Start learning", `${APP_URL}/courses`)}
    ${signOff()}`;
  return emailShell("Welcome to SHEEGOW ACADEMY", content);
}

/* ─── Template: Live class reminder (15 minutes) ─────── */

export function classReminderTemplate(
  name: string,
  classTitle: string,
  time: string,
  url: string
): { html: string; text: string } {
  const content = `
    ${greeting(name)}
    <p style="margin:0 0 16px 0;">Your live class <strong style="color:${BRAND.indigoDark};">${escapeHtml(classTitle)}</strong> starts in <strong>15 minutes</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f3f4f6;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.6;">
          <strong style="color:${BRAND.indigoDark};">Class:</strong> ${escapeHtml(classTitle)}<br />
          <strong style="color:${BRAND.indigoDark};">Starts:</strong> ${escapeHtml(time)}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;">Click below to join the classroom. Try to arrive a minute early so you can settle in.</p>
    ${ctaButton("Join live class", url)}
    <p style="margin:8px 0 0 0;font-size:13px;color:${BRAND.textMuted};">If the button doesn't work, paste this link into your browser: <a href="${escapeHtml(url)}" style="color:${BRAND.indigoDark};">${escapeHtml(url)}</a></p>
    ${signOff()}`;
  return emailShell("Your live class starts soon", content);
}

/* ─── Template: Teacher application decision ─────────── */

export function teacherApplicationTemplate(
  name: string,
  status: "approved" | "rejected" | "under_review",
  note?: string | null
): { html: string; text: string } {
  let heading = "";
  let body = "";
  let ctaLabel = "Go to dashboard";
  let ctaUrl = `${APP_URL}/dashboard`;

  if (status === "approved") {
    heading = "Your teacher application has been approved";
    body = `<p style="margin:0 0 16px 0;">Congratulations! Your application to become a teacher on SHEEGOW ACADEMY has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p style="margin:0 0 16px 0;">You can now create live classes, build courses, and start teaching students from your dashboard.</p>`;
    ctaLabel = "Open teacher dashboard";
  } else if (status === "rejected") {
    heading = "An update on your teacher application";
    body = `<p style="margin:0 0 16px 0;">Thank you for your interest in teaching on SHEEGOW ACADEMY. After reviewing your application, we're unable to approve it at this time.</p>
      <p style="margin:0 0 16px 0;">You're welcome to re-apply in the future.</p>`;
    ctaLabel = "Visit SHEEGOW ACADEMY";
    ctaUrl = APP_URL;
  } else {
    heading = "Your application is under review";
    body = `<p style="margin:0 0 16px 0;">Thanks for applying to teach on SHEEGOW ACADEMY! Your application is now <strong style="color:${BRAND.indigoDark};">under review</strong> by our team.</p>
      <p style="margin:0 0 16px 0;">We'll be in touch as soon as we have a decision. This usually takes a few business days.</p>`;
    ctaLabel = "View application";
    ctaUrl = `${APP_URL}/teach`;
  }

  const noteBlock =
    note && note.trim().length > 0 ? noteBox("Note from the SHEEGOW team", note.trim()) : "";

  const content = `
    ${greeting(name)}
    ${body}
    ${noteBlock}
    ${ctaButton(ctaLabel, ctaUrl)}
    ${signOff()}`;
  return emailShell(heading, content);
}

/* ─── Template: Refund decision ──────────────────────── */

export function refundTemplate(
  name: string,
  status: "approved" | "rejected",
  amount: string,
  course: string,
  note?: string | null
): { html: string; text: string } {
  let heading = "";
  let body = "";

  if (status === "approved") {
    heading = "Your refund request has been approved";
    body = `<p style="margin:0 0 16px 0;">Good news &mdash; your refund request for <strong style="color:${BRAND.indigoDark};">${escapeHtml(course)}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p style="margin:0 0 16px 0;">A refund of <strong>${escapeHtml(amount)}</strong> has been marked as processed. Depending on your payment method, it may take a few business days to appear on your statement.</p>`;
  } else {
    heading = "An update on your refund request";
    body = `<p style="margin:0 0 16px 0;">We've reviewed your refund request for <strong style="color:${BRAND.indigoDark};">${escapeHtml(course)}</strong> and unfortunately we're unable to approve it at this time.</p>`;
  }

  const noteBlock =
    note && note.trim().length > 0 ? noteBox("Note from the SHEEGOW team", note.trim()) : "";

  const content = `
    ${greeting(name)}
    ${body}
    ${noteBlock}
    ${ctaButton("View my refunds", `${APP_URL}/dashboard`)}
    ${signOff()}`;
  return emailShell(heading, content);
}

/* ─── Template: Course announcement ──────────────────── */

export function announcementTemplate(
  name: string,
  course: string,
  title: string,
  body: string
): { html: string; text: string } {
  const content = `
    ${greeting(name)}
    <p style="margin:0 0 16px 0;">There's a new announcement in <strong style="color:${BRAND.indigoDark};">${escapeHtml(course)}</strong>:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f3f4f6;border-left:4px solid ${BRAND.indigo};border-radius:6px;">
      <tr>
        <td style="padding:16px 18px;">
          <strong style="display:block;font-size:16px;color:${BRAND.indigoDark};margin-bottom:6px;">${escapeHtml(title)}</strong>
          <div style="font-size:14px;line-height:1.6;color:${BRAND.textPrimary};">${escapeHtml(body)}</div>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.textMuted};">You can also reply and join the discussion in the course.</p>
    ${ctaButton("Open course", `${APP_URL}/courses`)}
    ${signOff()}`;
  return emailShell(`New announcement: ${title}`, content);
}

/* ─── Template: Course completion / certificate ──────── */

export function certificateTemplate(
  name: string,
  course: string,
  url: string
): { html: string; text: string } {
  const content = `
    ${greeting(name)}
    <p style="margin:0 0 16px 0;">Congratulations! You've successfully completed <strong style="color:${BRAND.indigoDark};">${escapeHtml(course)}</strong> and earned your certificate of completion.</p>
    <p style="margin:0 0 16px 0;">This is a big step in your English learning journey &mdash; keep up the great work!</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:8px;">
      <tr>
        <td style="padding:18px 20px;">
          <strong style="display:block;font-size:15px;color:${BRAND.amber};letter-spacing:0.05em;text-transform:uppercase;">Certificate ready</strong>
          <span style="display:block;font-size:18px;color:${BRAND.textPrimary};margin-top:4px;font-weight:600;">${escapeHtml(course)}</span>
        </td>
      </tr>
    </table>
    ${ctaButton("View your certificate", url)}
    <p style="margin:8px 0 0 0;font-size:13px;color:${BRAND.textMuted};">You can also download and share your certificate from your dashboard.</p>
    ${signOff()}`;
  return emailShell(`You completed ${course}`, content);
}
