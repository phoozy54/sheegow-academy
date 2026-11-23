import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { CONVERSION_EVENTS } from "@/lib/analytics-events";

/**
 * Privacy-friendly conversion endpoint.
 *
 * Accepts only allow-listed event names and primitive properties. It does not
 * set cookies, read user agents, store IPs or persist personal data. Events
 * are written to structured application logs so conversion paths can be
 * measured without a third-party tracker.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = payload as { event?: unknown; props?: unknown };
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
