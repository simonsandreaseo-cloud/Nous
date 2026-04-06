/** @type {import('next').NextConfig} */
// Deploy trigger: Finalizing Turbopack setup
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Performance & Compression
  compress: true,

  // Build & Asset Optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["log", "info", "warn"] } : false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Standard Next.js server mode
  output: undefined,

  // Image Optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  // External packages
  serverExternalPackages: ['googleapis'],

  turbopack: {},
};

export default nextConfig;
