"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  FolderIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";
import ConfiguracionCategorias from "@/components/ConfiguracionCategorias";
import ConfiguracionPermisos from "@/components/ConfiguracionPermisos";
import ConfiguracionFormularios from "@/components/ConfiguracionFormularios";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";

const GestionPerfilCoordinador = dynamic(
  () => import("@/components/GestionPerfilCoordinador"),
);
const CambiarContrasenaCoordinador = dynamic(
  () => import("@/components/CambiarContrasenaCoordinador"),
);

const menuConfiguracion = [
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
  {
    id: "formularios",
    name: "Formularios",
    icon: DocumentTextIcon,
    description: "Campos de Presencia Tradicional",
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
  const [activeConfigView, setActiveConfigView] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("permisos");

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  useEffect(() => {
    // Solo administradores y developers pueden acceder a configuración
    if (
      !authLoading &&
      usuario &&
      usuario.tipo !== "administrador" &&
      usuario.tipo !== "developer"
    ) {
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
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-100 border-b border-gray-200 h-14 flex items-center">
        <div className="pl-3 shrink-0">
          <Image src="/metrik_logo.png" alt="Metrik" width={96} height={30} className="object-contain" priority />
        </div>
        <div className="flex items-center gap-6 px-8">
          <button onClick={() => router.back()} className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors" title="Atrás">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button onClick={() => router.forward()} className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors" title="Adelante">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 w-80">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar en Metrik..." className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-100 border-0 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors" readOnly />
          </div>
        </div>
      </header>

      <Sidebar
        usuario={usuario}
        paginaActiva="configuracion"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
      <main className="px-4 sm:px-6 lg:px-8 pt-8">
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
            {seccionActiva === "permisos" && <ConfiguracionPermisos />}
            {seccionActiva === "categorias" && (
              <ConfiguracionCategorias
                onRefresh={() => window.location.reload()}
              />
            )}
            {seccionActiva === "formularios" && <ConfiguracionFormularios />}
          </div>
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
