import { NextResponse } from "next/server";
import { callingCodeFor, countryFromHeaders } from "@/lib/location";

/**
 * GET /api/location
 * Country hint from the edge headers injected by Vercel/Cloudflare.
 * The client falls back to locale/timezone and finally to a manual choice.
 * No GPS permission, no third-party geolocation service, no personal data stored.
 */
export function GET(req: Request) {
  const country = countryFromHeaders(req.headers);
  return NextResponse.json(
    {
      country,
      callingCode: callingCodeFor(country) || "+252",
      source: country ? "ip" : "default",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
