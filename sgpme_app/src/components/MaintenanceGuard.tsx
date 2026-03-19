"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuthUnified";
import { usePathname } from "next/navigation";

const MAINTENANCE_EXEMPT = ["yosmar.chavez.aram@gmail.com"];

const MAINTENANCE_MODE = false;

export default function MaintenanceGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { usuario, loading } = useAuth();
  const pathname = usePathname();

  if (!MAINTENANCE_MODE) return <>{children}</>;

  // Siempre permitir la página de login
  if (pathname === "/login") return <>{children}</>;

  // Mientras carga la sesión no bloquear todavía
  if (loading) return <>{children}</>;

  // Si el usuario está exento, mostrar la app normalmente
  if (usuario && MAINTENANCE_EXEMPT.includes(usuario.email ?? "")) {
    return <>{children}</>;
  }

  // Todos los demás ven la pantalla de mantenimiento
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
            HG
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Metrik en mantenimiento
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Estamos realizando mejoras en la plataforma. Estaremos de vuelta en
          breve.
        </p>
        <div className="flex items-center justify-center gap-2 text-purple-600 text-sm font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
          Volvemos pronto
        </div>
      </div>
    </div>
  );
}
