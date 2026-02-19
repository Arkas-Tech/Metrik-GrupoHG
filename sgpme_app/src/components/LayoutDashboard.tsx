"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuthUnified";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bars3Icon } from "@heroicons/react/24/outline";
import ConfigSidebar from "./ConfigSidebar";
import ConfigSidebarCoordinador from "./ConfigSidebarCoordinador";
import GestionAccesos from "./GestionAccesos";
import GestionPerfilCoordinador from "./GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "./CambiarContrasenaCoordinador";

interface LayoutDashboardProps {
  children: React.ReactNode;
  usuario?: {
    nombre: string;
    grupo: string;
  };
}

export default function LayoutDashboard({
  children,
  usuario: usuarioLegacy = {
    nombre: "Yosmar Chavez (admin)",
    grupo: "Grupo HG - Chihuahua",
  },
}: LayoutDashboardProps) {
  const { usuario } = useAuth();
  const pathname = usePathname();
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");

  console.log("=== LayoutDashboard DEBUG ===");
  console.log("usuario del hook:", JSON.stringify(usuario, null, 2));
  console.log("usuario?.tipo:", usuario?.tipo);

  // Mostrar menú solo para administradores y coordinadores
  const tipoUsuario = usuario?.tipo?.toLowerCase() || "";
  const mostrarMenu =
    tipoUsuario === "administrador" ||
    tipoUsuario === "coordinador" ||
    tipoUsuario.includes("admin") ||
    tipoUsuario.includes("coord");
  const esCoordinador =
    tipoUsuario === "coordinador" || tipoUsuario.includes("coord");

  console.log("tipoUsuario normalizado:", tipoUsuario);
  console.log("mostrarMenu:", mostrarMenu);
  console.log("esCoordinador:", esCoordinador);
  console.log("=== FIN DEBUG ===");

  const handleMenuClick = (item: string) => {
    setActiveConfigView(item);
    setConfigSidebarOpen(true);
  };

  const cerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {mostrarMenu && (
                <button
                  onClick={() => setConfigSidebarOpen(true)}
                  className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Configuración del Sistema"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              )}

              <div className="shrink-0">
                <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
                  HG
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Metrik</h1>
                <p className="text-sm text-gray-500">
                  {usuario?.grupo || usuarioLegacy.grupo}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <span className="mr-2 font-medium">
                  {usuario?.nombre || usuarioLegacy.nombre}
                </span>
                <button
                  onClick={cerrarSesion}
                  className="text-gray-500 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-14">
            <NavLink
              href="/dashboard"
              icon="📊"
              label="Dashboard"
              active={pathname === "/dashboard"}
            />
            <NavLink
              href="/estrategia"
              icon="🎯"
              label="Estrategia"
              active={pathname === "/estrategia"}
            />
            <NavLink
              href="/facturas"
              icon="📋"
              label="Facturas"
              active={pathname === "/facturas"}
            />
            <NavLink
              href="/digital"
              icon="📊"
              label="Digital"
              active={pathname === "/digital"}
            />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Sidebar para Administradores */}
      {!esCoordinador && (
        <>
          <ConfigSidebar
            isOpen={configSidebarOpen}
            onClose={() => setConfigSidebarOpen(false)}
            onNavigate={handleMenuClick}
          />
          {activeConfigView === "accesos" && (
            <GestionAccesos onClose={() => setActiveConfigView("")} />
          )}
        </>
      )}

      {/* Sidebar para Coordinadores */}
      {esCoordinador && (
        <>
          <ConfigSidebarCoordinador
            isOpen={configSidebarOpen}
            onClose={() => setConfigSidebarOpen(false)}
            onNavigate={handleMenuClick}
          />
          {activeConfigView === "mi-perfil" && (
            <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
          )}
          {activeConfigView === "cambiar-contrasena" && (
            <CambiarContrasenaCoordinador
              onClose={() => setActiveConfigView("")}
            />
          )}
        </>
      )}
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}

function NavLink({ href, icon, label, active = false }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center px-1 text-sm font-medium transition-colors ${
        active
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Link>
  );
}
