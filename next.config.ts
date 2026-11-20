import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Compress responses (Vercel does this anyway, but good for self-hosting)
  compress: true,
  // Keep page data small for fast mobile navigation
  productionBrowserSourceMaps: false,
  // Optimize package transpilation for smaller client bundles
  transpilePackages: [],
};

export default nextConfig;
