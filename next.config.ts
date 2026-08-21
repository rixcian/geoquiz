import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Scraped images land in public/images and are served as static files.
    // Remote patterns stay empty on purpose: nothing is hot-linked at runtime.
    remotePatterns: [],
  },
};

export default nextConfig;
