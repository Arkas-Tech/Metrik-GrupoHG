"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuthUnified";
import ListaPresupuestosMensuales from "@/components/ListaPresupuestosMensuales";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";

const AÑOS_DISPONIBLES = Array.from(
  { length: 10 },
  (_, i) => new Date().getFullYear() - 2 + i,
);

export default function PresupuestoPage() {
  const router = useRouter();
  const { usuario, cerrarSesion: cerrarSesionAuth, loading } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [activeConfigView, setActiveConfigView] = useState("");

  // Estados para filtros
  const [filtroAño, setFiltroAño] = useState<number>(new Date().getFullYear());

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      window.location.href = "/configuracion";
      return;
    }
    setActiveConfigView(item);
  };

  const handleCerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      cerrarSesionAuth();
      router.push("/login");
    }
  };

  const cargarDatos = useCallback(async () => {
    if (!usuario) return;

    try {
      setLoadingData(true);
      // Datos cargados desde el backend cuando se necesiten
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoadingData(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      cargarDatos();
    }
  }, [usuario, cargarDatos]);

  const limpiarFiltros = () => {
    setFiltroAño(new Date().getFullYear());
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando presupuestos...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    router.push("/login");
    return null;
  }

  const esAdministrador =
    usuario.tipo === "administrador" || usuario.tipo === "developer";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-100 border-b border-gray-200 h-14 flex items-center">
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
      </header>

      <Sidebar
        usuario={usuario}
        paginaActiva="presupuesto"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          {/* Botón volver */}
          <button
            onClick={() => router.push("/estrategia")}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Volver a Proyecciones
          </button>

          {/* Encabezado */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Presupuestos Mensuales
                </h1>
                <p className="mt-2 text-gray-600">
                  Gestión de presupuestos mensuales por categoría y agencia
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-end">
                <h3 className="text-lg font-medium text-gray-900 pb-2">
                  Filtros:
                </h3>
              </div>

              {/* Filtro Año */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <select
                  value={filtroAño}
                  onChange={(e) => setFiltroAño(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {AÑOS_DISPONIBLES.map((año) => (
                    <option key={año} value={año}>
                      {año}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón limpiar filtros */}
              <div>
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Lista de presupuestos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <ListaPresupuestosMensuales
              filtros={{
                mes: null,
                anio: filtroAño,
                categoria: "",
                marca_id: null,
              }}
              refreshTrigger={refreshTrigger}
              esAdministrador={esAdministrador}
              onPresupuestoEliminado={() =>
                setRefreshTrigger((prev) => prev + 1)
              }
            />
          </div>
        </main>
      </div>

      {activeConfigView === "mi-perfil" && (
        <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
      )}
      {activeConfigView === "cambiar-contrasena" && (
        <CambiarContrasenaCoordinador onClose={() => setActiveConfigView("")} />
      )}
    </div>
  );
}
