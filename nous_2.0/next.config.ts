import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // 16.1.4 Performance & Compression
  compress: true,

  // 16.1.2 Build & Asset Optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["log", "info", "warn"] } : false,
  },

  // 16.1.5 Advanced Caching Headers
  async headers() {
    return [
      {
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Image Optimization for Clinical Assets
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  // Webpack configuration to handle googleapis
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'googleapis': 'commonjs googleapis'
      });
    }
    return config;
  },
};

export default nextConfig;
