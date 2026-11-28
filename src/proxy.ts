import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";

/**
 * CSP-1: generate a per-request nonce and put it on the FORWARDED REQUEST
 * headers. Next.js App Router reads `x-nonce` from the request and applies it
 * to its own inline scripts (hydration/boot); our own inline scripts read the
 * same header in layout.tsx and SeoShell. Setting the nonce only on the
 * response (the previous behaviour) left every inline script unnonced.
 *
 * Non-HTML responses (API routes, static assets) skip the proxy entirely.
 * Next.js 16 renamed `middleware` to `proxy` — this file uses the new name.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page requests — assets, API, Next internals.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|txt|xml|json)$/)
  ) {
    return NextResponse.next();
  }

  // 16 random bytes → 32 hex chars = 128 bits, and valid CSP base64
  // (a-f/0-9, length % 4 === 0). Web Crypto only: works in the Edge runtime.
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  const chatOrigins = new Set<string>();
  for (const value of [
    process.env.NEXT_PUBLIC_CHAT_URL,
    "https://sheegow-chat.onrender.com",
  ]) {
    if (!value) continue;
    try {
      const parsed = new URL(value);
      chatOrigins.add(`${parsed.protocol}//${parsed.host}`);
      chatOrigins.add(`wss://${parsed.host}`);
    } catch {
      /* not a URL — ignore */
    }
  }

  const csp = buildContentSecurityPolicy({
    nonce,
    connectSources: [...chatOrigins, "https://api.cloudinary.com"],
    isDevelopment: process.env.NODE_ENV === "development",
  });

  // Critical: mutate a COPY of the request headers and pass them downstream.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
