import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import VersionChecker from "@/components/VersionChecker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GRUPO HG - SGPME",
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
    title: "SGPME",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const useBackend = true;
  console.log("Layout: useBackend =", useBackend);
  console.log(
    "Layout: NEXT_PUBLIC_USE_BACKEND =",
    process.env.NEXT_PUBLIC_USE_BACKEND,
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VersionChecker />
        <ClientProviders useBackend={useBackend}>{children}</ClientProviders>
      </body>
    </html>
  );
}
