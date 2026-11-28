import { NextResponse } from "next/server";
import { safeBodyChecked } from "@/lib/api-helpers";
import {
  clearConsentCookie,
  consentCookie,
  type ConsentValue,
} from "@/lib/consent";

/**
 * G1 / CONSENT-1 — issue or withdraw the signed, HttpOnly consent cookie.
 * The banner calls this from the client; analytics validates the cookie on
 * every event instead of trusting a client-supplied header.
 */
export async function POST(req: Request) {
  const parsed = await safeBodyChecked<{ consent?: unknown }>(req);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.status === 413 ? "Request body too large" : "Invalid request body" },
      { status: parsed.status },
    );
  }
  const value = parsed.value?.consent;
  if (value !== "accepted" && value !== "rejected") {
    return NextResponse.json({ error: "Invalid consent value" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, consent: value as ConsentValue });
  response.headers.set("Set-Cookie", consentCookie(value as ConsentValue));
  return response;
}

/** Withdraw consent — analytics events stop immediately. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true, consent: null });
  response.headers.set("Set-Cookie", clearConsentCookie());
  return response;
}
