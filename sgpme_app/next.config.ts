import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Compress responses from Next.js server
  compress: true,
  // Skip TS check in build (checked in IDE, saves ~7min on 1-CPU server)
  typescript: { ignoreBuildErrors: true },
  // Skip eslint in build
  eslint: { ignoreDuringBuilds: true },
  // Generar BUILD_ID con timestamp para trazabilidad
  generateBuildId: async () => {
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // 20260217123456
    const rand = Math.random().toString(36).slice(2, 8); // 6 chars random
    return `${ts}-${rand}`;
  },
  // Silenciar error de Turbopack en Next.js 16 (usamos webpack en prod por withPWA)
  turbopack: {},
};

// Solo aplicar PWA en producción (Turbopack no es compatible con plugins webpack)
const config =
  process.env.NODE_ENV === "production"
    ? withPWA({
        dest: "public",
        cacheOnFrontEndNav: true,
        aggressiveFrontEndNavCaching: true,
        reloadOnOnline: true,
        workboxOptions: {
          disableDevLogs: true,
        },
      })(nextConfig)
    : nextConfig;

export default config;
