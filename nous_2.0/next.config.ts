/** @type {import('next').NextConfig} */
import path from "path";

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
    resolveAlias: process.env.TAURI_BUILD === "true" ? {
      "googleapis": "@/lib/mocks/node-mock",
      "next/headers": "@/lib/mocks/node-mock",
      "node-fetch": "@/lib/mocks/node-mock",
      "gaxios": "@/lib/mocks/node-mock",
      "google-auth-library": "@/lib/mocks/node-mock",
      "@google/genai": "@/lib/mocks/node-mock",
      "@google/generative-ai": "@/lib/mocks/node-mock",
      "openai": "@/lib/mocks/node-mock",
      "groq-sdk": "@/lib/mocks/node-mock"
    } : undefined
  },

  // External packages that should not be bundled
  serverExternalPackages: ['googleapis'],

  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer && process.env.TAURI_BUILD === "true") {
      config.resolve.alias = {
        ...config.resolve.alias,
        "googleapis": path.join(__dirname, "src/lib/mocks/node-mock.ts"),
        "node-fetch": path.join(__dirname, "src/lib/mocks/node-mock.ts"),
        "gaxios": path.join(__dirname, "src/lib/mocks/node-mock.ts"),
        "google-auth-library": path.join(__dirname, "src/lib/mocks/node-mock.ts")
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        http: false,
        https: false,
        zlib: false,
        stream: false,
        util: false,
        buffer: false,
        dns: false,
        module: false
      };
    }
    return config;
  }
};

export default nextConfig;
