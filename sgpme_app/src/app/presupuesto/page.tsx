"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import ListaPresupuestosMensuales from "@/components/ListaPresupuestosMensuales";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import NavBar from "@/components/NavBar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import ConfigSidebar from "@/components/ConfigSidebar";
import ConfigSidebarCoordinador from "@/components/ConfigSidebarCoordinador";
import GestionAccesos from "@/components/GestionAccesos";
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
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");

  // Estados para filtros
  const [filtroAño, setFiltroAño] = useState<number>(new Date().getFullYear());

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isAdmin = usuario?.tipo === "administrador";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      router.push("/configuracion");
      setConfigSidebarOpen(false);
      return;
    }
    setActiveConfigView(item);
    setConfigSidebarOpen(false);
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

  const esAdministrador = usuario.tipo === "administrador";

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

      <NavBar usuario={usuario} paginaActiva="estrategia" />

      {isAdmin && (
        <>
          <ConfigSidebar
            isOpen={configSidebarOpen}
            onClose={() => setConfigSidebarOpen(false)}
            onNavigate={handleMenuClick}
          />
          {activeConfigView === "gestion-accesos" && (
            <GestionAccesos onClose={() => setActiveConfigView("")} />
          )}
        </>
      )}

      {isCoordinador && (
        <>
          <ConfigSidebarCoordinador
            isOpen={configSidebarOpen}
            onClose={() => setConfigSidebarOpen(false)}
            onNavigate={handleMenuClick}
          />
          {activeConfigView === "perfil" && (
            <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
          )}
          {activeConfigView === "cambiar-contrasena" && (
            <CambiarContrasenaCoordinador
              onClose={() => setActiveConfigView("")}
            />
          )}
        </>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            onPresupuestoEliminado={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </div>
      </main>
    </div>
  );
}
