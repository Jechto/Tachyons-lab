import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export", // enables static export
    basePath: "/Tachyons-lab/dev", // GitHub Pages subdirectory for dev
    assetPrefix: "/Tachyons-lab/dev", // Prefix for assets in dev
    distDir: ".next", // optional, default build dir
    experimental: {
        turbo: true, // if you want Turbopack enabled
    },
};

export default nextConfig;
