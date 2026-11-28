import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { CONVERSION_EVENTS } from "@/lib/analytics-events";
import { limitRequest, safeBodyChecked } from "@/lib/api-helpers";
import { CONSENT_COOKIE, readConsentFromCookieHeader } from "@/lib/consent";

/**
 * Privacy-friendly conversion endpoint.
 *
 * Accepts only allow-listed event names and primitive properties. No cookies
 * are set here, no user agents are read, no IPs or personal data are stored.
 * Events go to structured logs only.
 *
 * G1 / CONSENT-1: consent is enforced server-side via the signed HttpOnly
 * cookie issued by /api/consent. A client-controlled header is not accepted.
 */
export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (readConsentFromCookieHeader(cookieHeader) !== "accepted") {
    return new NextResponse(null, { status: 204 });
  }

  // Key on the signed consent token, not a spoofable x-forwarded-for header.
  // A caller cannot rotate the key without forging the HMAC signature.
  const token =
    cookieHeader
      ?.split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
      ?.slice(CONSENT_COOKIE.length + 1) ?? "anonymous";
  const limited = limitRequest(`analytics:${token}`, 30, 60_000);
  if (limited) return limited;

  const parsed = await safeBodyChecked<{ event?: unknown; props?: unknown }>(req);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.status === 413 ? "Request body too large" : "Invalid JSON" },
      { status: parsed.status },
    );
  }

  const body = parsed.value;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (
    typeof body.event !== "string" ||
    !CONVERSION_EVENTS.includes(body.event as (typeof CONVERSION_EVENTS)[number])
  ) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const clean: Record<string, string | number | boolean> = {};
  if (body.props && typeof body.props === "object" && !Array.isArray(body.props)) {
    for (const [key, value] of Object.entries(body.props).slice(0, 8)) {
      if (typeof value === "string") clean[key.slice(0, 40)] = value.slice(0, 120);
      else if (typeof value === "number" && Number.isFinite(value))
        clean[key.slice(0, 40)] = value;
      else if (typeof value === "boolean") clean[key.slice(0, 40)] = value;
    }
  }

  logger.info("analytics", "conversion_event", {
    event: body.event,
    props: clean,
  });
  return new NextResponse(null, { status: 204 });
}
