"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuthUnified";
import { MARCAS } from "@/types";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PermisosNavegacion {
  dashboard?: boolean;
  estrategia?: boolean;
  facturas?: boolean;
  eventos?: boolean;
  digital?: boolean;
}

interface PermisosAgencias {
  [agencia: string]: boolean;
}

interface Usuario {
  id: number;
  username: string;
  full_name: string;
  role: string;
  email: string;
  permisos?: PermisosNavegacion;
  permisos_agencias?: PermisosAgencias;
}

const PERMISOS_NAVEGACION = [
  { id: "dashboard", label: "Dashboard", emoji: "📊" },
  { id: "estrategia", label: "Estrategia", emoji: "🎯" },
  { id: "facturas", label: "Facturas", emoji: "📋" },
  { id: "eventos", label: "Eventos", emoji: "🎉" },
  { id: "digital", label: "Digital", emoji: "📈" },
];

type SeccionPermisos = "navegacion" | "agencias";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Función para ordenar usuarios: administrador > coordinador > auditor, alfabéticamente
const ordenarUsuarios = (usuarios: Usuario[]): Usuario[] => {
  const orden: Record<string, number> = {
    administrador: 1,
    coordinador: 2,
    auditor: 3,
  };

  return [...usuarios].sort((a, b) => {
    const ordenA = orden[a.role] || 999;
    const ordenB = orden[b.role] || 999;
    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }
    return a.full_name.localeCompare(b.full_name);
  });
};

// Generar permisos de agencias por defecto (todas deshabilitadas)
const getDefaultAgencias = (): PermisosAgencias => {
  const agencias: PermisosAgencias = {};
  MARCAS.forEach((marca) => {
    agencias[marca] = false;
  });
  return agencias;
};

export default function ConfiguracionPermisos() {
  const { showToast, ToastContainer } = useToast();
  const authContext = useAuth();
  const currentUserId = authContext.usuario?.id;
  const refreshUser = (authContext as Record<string, unknown>).refreshUser as
    | (() => Promise<void>)
    | undefined;
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<Usuario | null>(null);
  const [permisosNavegacion, setPermisosNavegacion] =
    useState<PermisosNavegacion>({
      dashboard: true,
      estrategia: true,
      facturas: true,
      eventos: true,
      digital: true,
    });
  const [permisosAgencias, setPermisosAgencias] =
    useState<PermisosAgencias>(getDefaultAgencias());
  const [seccionActiva, setSeccionActiva] = useState<SeccionPermisos | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/user`, {
        headers: getAuthHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(ordenarUsuarios(data));
      } else {
        showToast("Error al cargar usuarios", "error");
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      showToast("Error al cargar usuarios", "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  useEffect(() => {
    if (usuarioSeleccionado) {
      setPermisosNavegacion(
        usuarioSeleccionado.permisos || {
          dashboard: true,
          estrategia: true,
          facturas: true,
          eventos: true,
          digital: true,
        },
      );
      setPermisosAgencias(
        usuarioSeleccionado.permisos_agencias || getDefaultAgencias(),
      );
    }
  }, [usuarioSeleccionado]);

  const handleToggleNavegacion = (permisoId: string) => {
    setPermisosNavegacion((prev) => ({
      ...prev,
      [permisoId]: !prev[permisoId as keyof PermisosNavegacion],
    }));
  };

  const handleToggleAgencia = (agencia: string) => {
    setPermisosAgencias((prev) => ({
      ...prev,
      [agencia]: !prev[agencia],
    }));
  };

  const handleGuardarPermisos = async () => {
    if (!usuarioSeleccionado) return;

    setGuardando(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/user/${usuarioSeleccionado.id}/permisos`,
        {
          method: "PUT",
          headers: getAuthHeader(),
          body: JSON.stringify({
            permisos: permisosNavegacion,
            permisos_agencias: permisosAgencias,
          }),
        },
      );

      if (response.ok) {
        showToast("Permisos actualizados correctamente", "success");
        const updatedUser = {
          ...usuarioSeleccionado,
          permisos: permisosNavegacion,
          permisos_agencias: permisosAgencias,
        };
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioSeleccionado.id ? updatedUser : u)),
        );
        setUsuarioSeleccionado(updatedUser);
        // Si el usuario modificado es el usuario actual, refrescar el contexto de autenticación
        // para que la NavBar refleje los cambios de inmediato
        if (currentUserId && currentUserId === String(usuarioSeleccionado.id)) {
          refreshUser?.();
        }
      } else {
        showToast("Error al guardar permisos", "error");
      }
    } catch (error) {
      console.error("Error guardando permisos:", error);
      showToast("Error al guardar permisos", "error");
    } finally {
      setGuardando(false);
    }
  };

  const obtenerNombreRol = (role: string) => {
    const roles: Record<string, string> = {
      administrador: "Administrador",
      coordinador: "Coordinador",
      usuario: "Usuario",
    };
    return roles[role] || role;
  };

  const obtenerColorRol = (role: string) => {
    const colores: Record<string, string> = {
      administrador: "bg-purple-100 text-purple-800",
      coordinador: "bg-blue-100 text-blue-800",
      usuario: "bg-gray-100 text-gray-800",
    };
    return colores[role] || "bg-gray-100 text-gray-800";
  };

  // Contar permisos activos por sección
  const contarNavegacionActivos = () => {
    return Object.values(permisosNavegacion).filter(Boolean).length;
  };

  const contarAgenciasActivas = () => {
    return Object.values(permisosAgencias).filter(Boolean).length;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <ToastContainer />

      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Gestión de Permisos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Configura los accesos de cada usuario a las diferentes secciones de la
          plataforma
        </p>
      </div>

      {/* Contenido */}
      <div className="flex h-[600px]">
        {/* Lista de Usuarios */}
        <div className="w-52 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Usuarios
            </h4>
            {cargando ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {usuarios.map((usuario) => (
                  <button
                    key={usuario.id}
                    onClick={() => setUsuarioSeleccionado(usuario)}
                    className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                      usuarioSeleccionado?.id === usuario.id
                        ? "bg-purple-50 border-purple-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {usuario.full_name}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      @{usuario.username}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${obtenerColorRol(
                          usuario.role,
                        )}`}
                      >
                        {obtenerNombreRol(usuario.role)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel de Permisos */}
        <div className="flex-1 overflow-y-auto">
          {usuarioSeleccionado ? (
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900">
                  {usuarioSeleccionado.full_name}
                </h4>
                <p className="text-sm text-gray-600">
                  Configura los permisos de acceso del usuario
                </p>
              </div>

              {/* Selector de secciones de permisos */}
              <div className="space-y-3 mb-6">
                {/* Sección Navegación */}
                <button
                  onClick={() =>
                    setSeccionActiva(
                      seccionActiva === "navegacion" ? null : "navegacion",
                    )
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    seccionActiva === "navegacion"
                      ? "bg-purple-50 border-purple-300 text-purple-800"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {seccionActiva === "navegacion" ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-sm">🧭 Navegación</div>
                      <div className="text-xs opacity-70">
                        Páginas a las que puede acceder
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      seccionActiva === "navegacion"
                        ? "bg-purple-200 text-purple-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {contarNavegacionActivos()}/{PERMISOS_NAVEGACION.length}
                  </span>
                </button>

                {/* Contenido Navegación */}
                {seccionActiva === "navegacion" && (
                  <div className="ml-2 space-y-3">
                    {PERMISOS_NAVEGACION.map((permiso) => (
                      <div
                        key={permiso.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{permiso.emoji}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {permiso.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              Acceso a la página de {permiso.label}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleNavegacion(permiso.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            permisosNavegacion[
                              permiso.id as keyof PermisosNavegacion
                            ]
                              ? "bg-purple-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              permisosNavegacion[
                                permiso.id as keyof PermisosNavegacion
                              ]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sección Agencias */}
                <button
                  onClick={() =>
                    setSeccionActiva(
                      seccionActiva === "agencias" ? null : "agencias",
                    )
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    seccionActiva === "agencias"
                      ? "bg-purple-50 border-purple-300 text-purple-800"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {seccionActiva === "agencias" ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-sm">🏢 Agencias</div>
                      <div className="text-xs opacity-70">
                        Agencias que puede ver y filtrar
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      seccionActiva === "agencias"
                        ? "bg-purple-200 text-purple-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {contarAgenciasActivas()}/{MARCAS.length}
                  </span>
                </button>

                {/* Contenido Agencias */}
                {seccionActiva === "agencias" && (
                  <div className="ml-2 space-y-3">
                    {MARCAS.map((marca) => (
                      <div
                        key={marca}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🏢</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {marca}
                            </div>
                            <div className="text-xs text-gray-600">
                              Acceso a datos de {marca}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleAgencia(marca)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            permisosAgencias[marca]
                              ? "bg-purple-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              permisosAgencias[marca]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleGuardarPermisos}
                  disabled={guardando}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {guardando ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </span>
                  ) : (
                    "Guardar Permisos"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-sm font-medium">
                  Selecciona un usuario para configurar sus permisos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
