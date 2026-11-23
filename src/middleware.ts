import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that generates a per-request nonce and injects it into the
 * Content-Security-Policy header so we can drop 'unsafe-inline' from
 * script-src. Next.js App Router automatically reads the `x-nonce` header
 * and applies the nonce to its inline scripts (hydration, boot, etc).
 *
 * Non-HTML responses (API routes, static assets, _next/static) skip the
 * middleware entirely to keep latency low.
 */
export function middleware(request: NextRequest) {
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

  // Generate a fresh base64 nonce for this request.
  // 16 bytes = 128 bits of entropy (OWASP recommendation).
  const nonce = Buffer.from(crypto.randomUUID().replace(/-/g, ""), "hex").toString("base64");

  // Build the CSP with the nonce replacing 'unsafe-inline' in script-src.
  // style-src keeps 'unsafe-inline' because Next.js injects inline styles
  // that can't be nonced without a larger refactor (style-src 'unsafe-inline'
  // is low-risk — it doesn't allow script execution).
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
      /* ignore */
    }
  }
  const connectSources = [
    "'self'",
    ...chatOrigins,
    "https://api.cloudinary.com",
  ].join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `connect-src ${connectSources}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    // Allow Next.js dev tools in development only.
    ...(process.env.NODE_ENV === "development"
      ? ["'unsafe-eval'"]
      : []),
  ].join("; ");

  // Clone the request response so we can set headers.
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Set the nonce header so Next.js App Router applies it to inline scripts.
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  // Run on all routes except static assets and API.
  matcher: [
    // Match all paths except:
    // - /api/ (API routes)
    // - /_next/static/ (static files)
    // - /_next/image/ (image optimization)
    // - /favicon.ico, /logo.svg, /manifest.json, etc (files with extensions)
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
