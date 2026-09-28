/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  //  Adicione esta linha para permitir acesso de outros dispositivos na rede
  allowedDevOrigins: ['192.168.1.199'],   // pode adicionar mais IPs se necessário

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;