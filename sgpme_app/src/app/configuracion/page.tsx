"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import NavBar from "@/components/NavBar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import {
  FolderIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import ConfiguracionCategorias from "@/components/ConfiguracionCategorias";
import ConfiguracionPermisos from "@/components/ConfiguracionPermisos";
import GestionAccesos from "@/components/GestionAccesos";
import dynamic from "next/dynamic";

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

const menuConfiguracion = [
  {
    id: "accesos",
    name: "Accesos",
    icon: UsersIcon,
    description: "Gestionar usuarios y roles",
  },
  {
    id: "permisos",
    name: "Permisos",
    icon: UserGroupIcon,
    description: "Gestionar permisos de navegación",
  },
  {
    id: "categorias",
    name: "Categorías",
    icon: FolderIcon,
    description: "Gestionar categorías y subcategorías",
  },
  // Aquí se pueden agregar más opciones de configuración en el futuro
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();

  useMarcaGlobal();
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("accesos");

  const isAdmin = usuario?.tipo === "administrador";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  useEffect(() => {
    // Solo administradores pueden acceder a configuración
    if (!authLoading && usuario && usuario.tipo !== "administrador") {
      router.push("/dashboard");
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
      // Ya estamos en configuración, no hacer nada
      return;
    }
    setActiveConfigView(item);
    setConfigSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

      {/* Navegación */}
      <NavBar usuario={usuario} paginaActiva="configuracion" />

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Menú Lateral de Configuración */}
          <aside className="w-80 shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-purple-600 px-4 py-3">
                <h2 className="text-lg font-semibold text-white">
                  Configuración
                </h2>
                <p className="text-sm text-purple-200">Opciones del sistema</p>
              </div>
              <div className="p-2">
                {menuConfiguracion.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSeccionActiva(item.id)}
                    className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                      seccionActiva === item.id
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 mt-0.5 shrink-0 ${
                        seccionActiva === item.id
                          ? "text-purple-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="text-left">
                      <div className="font-medium">{item.name}</div>
                      <div
                        className={`text-xs mt-0.5 ${
                          seccionActiva === item.id
                            ? "text-purple-600"
                            : "text-gray-500"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Contenido de la Sección */}
          <div className="flex-1">
            {seccionActiva === "accesos" && <GestionAccesos />}
            {seccionActiva === "permisos" && <ConfiguracionPermisos />}
            {seccionActiva === "categorias" && (
              <ConfiguracionCategorias
                onRefresh={() => window.location.reload()}
              />
            )}
          </div>
        </div>
      </main>

      {/* Sidebar para Administradores */}
      {isAdmin && (
        <>
          <ConfigSidebar
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
    </div>
  );
}
