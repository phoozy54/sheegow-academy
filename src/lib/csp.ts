/**
 * CSP-1 — Pure Content-Security-Policy builder.
 *
 * No Next.js, no env access, no Buffer: safe to test with `bun:test`.
 * The nonce is injected into `script-src`, and every inline script in the app
 * must carry the same nonce from the request header.
 */

export interface CspConfig {
  /** Per-request, base64-safe random value (128-bit entropy). */
  nonce: string;
  /** Extra connect sources (e.g. chat service origins). */
  connectSources: string[];
  isDevelopment: boolean;
}

/**
 * Build a strict CSP. Notes:
 * - `script-src` uses a nonce + strict-dynamic; there is NO 'unsafe-inline'.
 * - 'unsafe-eval' (dev only) is INSIDE script-src, never a standalone directive.
 * - `frame-src` allows the Google Maps embed used on the contact page.
 */
export function buildContentSecurityPolicy(config: CspConfig): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${config.nonce}'`,
    "'strict-dynamic'",
    ...(config.isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const connectSrc = [...new Set(["'self'", ...config.connectSources])].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://www.google.com/maps",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}
