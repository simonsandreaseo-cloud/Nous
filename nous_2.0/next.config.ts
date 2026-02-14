/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 16.1.4 Performance & Compression
  compress: true,

  // 16.1.2 Build & Asset Optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["log", "info", "warn"] } : false,
  },



  output: "export",

  // Image Optimization for Clinical Assets
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  // Turbopack configuration for Next.js 16
  turbopack: {},

  // External packages that should not be bundled
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
