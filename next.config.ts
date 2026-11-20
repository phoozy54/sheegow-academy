import type { NextConfig } from "next";

/** Origins the browser is allowed to talk to (chat service over HTTPS/WSS). */
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
    // Ignore malformed URLs — they are warned about in the socket client.
  }
}

const connectSources = ["'self'", ...chatOrigins].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `connect-src ${connectSources}`,
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  // Next.js injects inline scripts/styles; nonces would require a larger refactor.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Compress responses (Vercel does this anyway, but good for self-hosting)
  compress: true,
  // Keep page data small for fast mobile navigation
  productionBrowserSourceMaps: false,
  // Optimize package transpilation for smaller client bundles
  transpilePackages: [],
};

export default nextConfig;
