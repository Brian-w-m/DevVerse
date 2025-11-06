import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable polling for file watching in Docker (Windows compatibility)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
