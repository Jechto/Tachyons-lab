import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // enables static export
  distDir: '.next',          // optional, default build dir
  experimental: {
    turbo: true              // if you want Turbopack enabled
  }
};

export default nextConfig;
