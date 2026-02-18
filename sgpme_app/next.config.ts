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
        // Forzar actualización automática del service worker
        swcMinify: true,
        register: true,
        skipWaiting: true, // Activar nueva versión inmediatamente
        workboxOptions: {
          disableDevLogs: true,
          // Limpiar caches viejos automáticamente
          cleanupOutdatedCaches: true,
          // Runtime caching con estrategias específicas
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
                },
              },
            },
            {
              urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-font-assets",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
                },
              },
            },
            {
              urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-image-assets",
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 24 * 60 * 60, // 24 horas
                },
              },
            },
            {
              urlPattern: /\/_next\/static.+\.js$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "next-static-js-assets",
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 24 * 60 * 60, // 24 horas
                },
              },
            },
            {
              urlPattern: /\/_next\/static.+\.css$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "next-static-css-assets",
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 24 * 60 * 60, // 24 horas
                },
              },
            },
            {
              urlPattern: /\/_next\/data.+\.json$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "next-data",
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 24 * 60 * 60, // 24 horas
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 5 * 60, // 5 minutos
                },
              },
            },
          ],
        },
      })(nextConfig)
    : nextConfig;

export default config;
