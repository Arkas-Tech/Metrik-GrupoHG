"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import DashboardGeneral from "@/components/DashboardGeneral";
import NavBar from "@/components/NavBar";
import { Bars3Icon } from "@heroicons/react/24/outline";

// Lazy-load components that are only shown on specific user actions
const ConfigSidebar = dynamic(() => import("@/components/ConfigSidebar"));
const ConfigSidebarCoordinador = dynamic(
  () => import("@/components/ConfigSidebarCoordinador"),
);
const GestionPerfilCoordinador = dynamic(
  () => import("@/components/GestionPerfilCoordinador"),
);
const CambiarContrasenaCoordinador = dynamic(
  () => import("@/components/CambiarContrasenaCoordinador"),
);
const ProveedoresPage = dynamic(() => import("./proveedores/page"));

export default function Dashboard() {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();

  const { marcaSeleccionada } = useMarcaGlobal();
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  if (authLoading || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  const handleCerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      cerrarSesionAuth();
      router.push("/login");
    }
  };

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      window.location.href = "/configuracion";
      return;
    }
    setActiveConfigView(item);
    setConfigSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
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
                <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                  HG
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Metrik</h1>
                <p className="text-sm text-gray-600 font-medium">
                  {usuario.grupo}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <FiltroMarcaGlobal />
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {usuario.nombre}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${obtenerColorRol(
                        usuario.tipo,
                      )}`}
                    >
                      {obtenerNombreRol(usuario.tipo)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCerrarSesion}
                  className="text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <NavBar usuario={usuario} paginaActiva="dashboard" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardGeneral agenciaSeleccionada={marcaSeleccionada} />
        {usuario?.tipo === "auditor" && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <span className="text-green-600 text-2xl">👁️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Modo Auditor Activo
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Tienes acceso completo de lectura para auditoría y supervisión
                  del sistema.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar para Administradores */}
      {isAdmin && (
        <>
          <ConfigSidebar
            isOpen={configSidebarOpen}
            onClose={() => setConfigSidebarOpen(false)}
            onNavigate={handleMenuClick}
            isDeveloper={usuario?.tipo === "developer"}
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

      {/* Sidebar para Coordinadores */}
      {isCoordinador && (
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

      {activeConfigView === "proveedores" && (
        <div className="fixed inset-0 bg-gray-50 z-30 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestión de Proveedores
              </h1>
              <button
                onClick={() => setActiveConfigView("")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Volver
              </button>
            </div>
            <ProveedoresPage />
          </div>
        </div>
      )}
    </div>
  );
}
