import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth";
import { handleAuthError, jsonError } from "@/lib/api-helpers";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const TURN_TTL_SECONDS = 300;

/**
 * GET /api/rtc/ice
 * Return ICE servers for WebRTC. Public STUN servers are always available.
 * When a TURN server is configured, short-lived coturn REST credentials are
 * minted per authenticated user instead of shipping a permanent secret to the
 * browser.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const turnUrl = process.env.TURN_URL?.trim();
    const turnSecret = process.env.TURN_SECRET?.trim();

    if (!turnUrl || !turnSecret) {
      return NextResponse.json(
        { iceServers: STUN_SERVERS, expiresIn: 3600 },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // coturn REST API: username = "<unix-expiry>:<user-id>",
    // credential = base64(HMAC-SHA1(shared-secret, username)).
    const expiry = Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS;
    const username = `${expiry}:${user.id}`;
    const credential = createHmac("sha1", turnSecret)
      .update(username)
      .digest("base64");

    return NextResponse.json(
      {
        iceServers: [
          ...STUN_SERVERS,
          { urls: turnUrl, username, credential },
        ],
        expiresIn: TURN_TTL_SECONDS,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[rtc/ice]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
