import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NO output: "standalone" — use Next.js default build mode for max platform compat
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
