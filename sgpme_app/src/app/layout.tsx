import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GRUPO HG - Metrik",
  description: "Sistema de Gestión de Presupuestos, Marcas y Eventos",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Metrik",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if ('serviceWorker' in navigator && !sessionStorage.getItem('sw_cleared')) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      if (regs.length) {
        regs.forEach(function(r) { r.unregister(); });
        if ('caches' in window) caches.keys().then(function(n) { n.forEach(function(k) { caches.delete(k); }); });
        sessionStorage.setItem('sw_cleared', '1');
        window.location.reload();
      }
    });
  }
})();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ClientProviders useBackend={true}>{children}</ClientProviders>
      </body>
    </html>
  );
}
