import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
    // Remova turbopack: {} se não estiver usando Turbopack explicitamente
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // ✅ Configuração correta para permitir acesso via IP da rede (importante para o seu caso 192.168.1.193)
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.193",     // seu IP atual
    "192.168.1.199",     // você tinha esse também
    "192.168.1.*",       // curinga para toda a sua rede 192.168.1.x
    "192.168.0.*",
    "10.*",
  ],

};

export default nextConfig;