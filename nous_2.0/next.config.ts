/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,


  // 16.1.4 Performance & Compression
  compress: true,

  // 16.1.2 Build & Asset Optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["log", "info", "warn"] } : false,
  },

  // Ignore TS errors during Tauri build (since API folder is hidden)
  typescript: {
    ignoreBuildErrors: process.env.TAURI_BUILD === "true",
  },



  // Enable static export ONLY for Tauri builds to avoid API route conflicts
  output: process.env.TAURI_BUILD === "true" ? "export" : undefined,

  // Image Optimization for Clinical Assets
  images: {
    unoptimized: true, // Keep unoptimized for now to support static export compatibility
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  // Turbopack configuration for Next.js 16
  turbopack: {
    root: __dirname,
  },

  // External packages that should not be bundled
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
