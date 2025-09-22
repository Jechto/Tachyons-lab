import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // enables static export
  // Only use basePath and assetPrefix for production builds (GitHub Pages)
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/Tachyons-lab', // GitHub Pages subdirectory
    assetPrefix: '/Tachyons-lab', // Prefix for assets
  }),
  distDir: '.next',          // optional, default build dir
  // Enable source maps for debugging
  webpack: (config: any, { dev }: { dev: boolean }) => {
    if (dev) {
      config.devtool = 'eval-source-map';
    }
    return config;
  },
  experimental: {
    turbo: true              // if you want Turbopack enabled
  }
};

export default nextConfig;
