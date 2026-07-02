/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // IPs permitidos para acesso na rede (comentado porque não é uma opção oficial do Next.js)
  // allowedDevOrigins: [
  //   "localhost",
  //   "127.0.0.1",
  // ],
};

module.exports = nextConfig;
