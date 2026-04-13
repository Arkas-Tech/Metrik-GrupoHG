"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import DashboardGeneral from "@/components/DashboardGeneral";
import Sidebar from "@/components/Sidebar";
import FiltroPeriodoGlobal from "@/components/FiltroPeriodoGlobal";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Lazy-load components that are only shown on specific user actions
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
  const [activeConfigView, setActiveConfigView] = useState("");

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";

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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width fixed header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-100 border-b border-gray-200 h-14 flex items-center">
        {/* Logo — flush to the left edge */}
        <div className="pl-3 shrink-0">
          <Image
            src="/metrik_logo.png"
            alt="Metrik"
            width={96}
            height={30}
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation arrows — red, spread out between logo and search */}
        <div className="flex items-center gap-6 px-8">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Atrás"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.forward()}
            className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Adelante"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar — absolutely centered in the full header */}
        <div className="absolute left-1/2 -translate-x-1/2 w-80">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en Metrik..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-100 border-0 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors"
              readOnly
            />
          </div>
        </div>
        <div className="ml-auto pr-4 shrink-0">
          <FiltroPeriodoGlobal />
        </div>
      </header>

      {/* Left collapsible sidebar — starts below header */}
      <Sidebar
        usuario={usuario}
        paginaActiva="dashboard"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      {/* Main content — offset for header height + sidebar width */}
      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
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
                    Tienes acceso completo de lectura para auditoría y
                    supervisión del sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals triggered from sidebar user menu */}
      {(isAdmin || isCoordinador) && (
        <>
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
