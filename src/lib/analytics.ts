"use client";

import { CONVERSION_EVENTS, type ConversionEvent } from "@/lib/analytics-events";
import { useStore } from "@/lib/store";

export { CONVERSION_EVENTS, type ConversionEvent };

/**
 * Privacy-friendly conversion tracking.
 *
 * No cookies, no local storage, no fingerprinting and no personal data.
 * Events are posted to our own endpoint and logged server-side with an
 * allow-listed name and primitive properties only.
 */
export function trackConversion(
  event: ConversionEvent,
  props: Record<string, string | number | boolean> = {}
): void {
  if (typeof window === "undefined") return;
  // G1 / CONSENT-1: no analytics event may leave the device unless the user
  // explicitly accepted the cookie banner. The server independently verifies
  // the signed consent cookie, so this client check is not the only barrier.
  if (useStore.getState().cookieConsent !== "accepted") return;
  try {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, props }),
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Analytics must never break the user journey.
  }
}
