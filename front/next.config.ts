import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export", // enables static export
    images: {
        unoptimized: true, // disable image optimization for static export
    },
    // Only use basePath and assetPrefix for production builds (GitHub Pages)
    ...(process.env.NODE_ENV === "production" && {
        basePath: "/Tachyons-lab", // GitHub Pages subdirectory
        assetPrefix: "/Tachyons-lab", // Prefix for assets
    }),
    distDir: ".next", // optional, default build dir
    env: {
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },
};

export default nextConfig;
