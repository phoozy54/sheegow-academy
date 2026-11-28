import type { NextConfig } from "next";

/** Only the canonical site origin may read responses cross-origin. */
const appOrigin = "https://www.sheegowacademy.com";

// NOTE: Content-Security-Policy is now set by src/proxy.ts with a
// per-request nonce so we can drop 'unsafe-inline' from script-src.
// The other security headers below are static and stay here.
const securityHeaders = [
  { key: "Access-Control-Allow-Origin", value: appOrigin },
  // Vary: Origin is appended in src/proxy.ts so Next's own RSC Vary values
  // are preserved instead of being overwritten by a static header.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()",
  },
  // HSTS is intentionally NOT here: it must never be sent over local HTTP.
  // src/proxy.ts adds it only for production HTTPS requests.
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Hide X-Powered-By header — don't expose server technology
  poweredByHeader: false,
  /**
   * One canonical origin: https://www.sheegowacademy.com
   * Vercel's platform-level HTTP→HTTPS / apex→www redirects run before this
   * code and use 308 (which Google treats the same as 301 for canonicalization).
   * These rules cover hostnames we control inside the deployment.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "sheegowacademy\\.com" }],
        destination: "https://www.sheegowacademy.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "sheegow-academy\\.vercel\\.app" }],
        destination: "https://www.sheegowacademy.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.sheegow-academy\\.vercel\\.app" }],
        destination: "https://www.sheegowacademy.com/:path*",
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
  // Compress responses (Vercel does this anyway, but good for self-hosting)
  compress: true,
  // Keep page data small for fast mobile navigation
  productionBrowserSourceMaps: false,
  // Optimize package transpilation for smaller client bundles
  transpilePackages: [],
};

export default nextConfig;
