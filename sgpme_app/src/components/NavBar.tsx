"use client";

import { useRouter } from "next/navigation";
import { Usuario } from "@/types";

interface NavBarProps {
  usuario: Usuario | null;
  paginaActiva:
    | "dashboard"
    | "estrategia"
    | "facturas"
    | "eventos"
    | "digital"
    | "configuracion";
}

export default function NavBar({ usuario, paginaActiva }: NavBarProps) {
  const router = useRouter();

  // Si no hay usuario, no mostrar navegación
  if (!usuario) return null;

  // Permisos por defecto (todos true) si no están definidos
  const permisos = usuario.permisos || {
    dashboard: true,
    estrategia: true,
    facturas: true,
    eventos: true,
    digital: true,
  };

  const navItems = [
    {
      key: "dashboard" as const,
      label: "📊 Dashboard",
      path: "/dashboard",
      visible: permisos.dashboard,
    },
    {
      key: "estrategia" as const,
      label: "🎯 Estrategia",
      path: "/estrategia",
      visible: permisos.estrategia,
    },
    {
      key: "facturas" as const,
      label: "📋 Facturas",
      path: "/facturas",
      visible: permisos.facturas,
    },
    {
      key: "eventos" as const,
      label: "🎉 Eventos",
      path: "/eventos",
      visible: permisos.eventos,
    },
    {
      key: "digital" as const,
      label: "📈 Digital",
      path: "/digital",
      visible: permisos.digital,
    },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 h-14">
          {navItems.map(
            (item) =>
              item.visible && (
                <button
                  key={item.key}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center px-1 text-sm font-medium transition-colors ${
                    paginaActiva === item.key
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {item.label}
                </button>
              ),
          )}
        </div>
      </div>
    </nav>
  );
}
