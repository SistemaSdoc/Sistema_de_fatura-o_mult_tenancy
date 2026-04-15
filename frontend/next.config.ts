import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error"] }
        : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  //  IPs permitidos para acesso na rede
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.192",
    "192.168.1.199",
    "192.168.1.*",
    "192.168.0.*",
    "10.*",
  ],
};

export default nextConfig;