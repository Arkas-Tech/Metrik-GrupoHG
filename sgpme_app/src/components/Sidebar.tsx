"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  LayoutDashboard,
  Target,
  ReceiptText,
  CalendarDays,
  Monitor,
  ChevronDown,
  ChevronRight,
  Code2,
  ShieldAlert,
  UserRound,
  Lock,
  Settings,
  LogOut,
} from "lucide-react";
import { Usuario } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { useDevTools } from "@/contexts/DevToolsContext";
import { MAINTENANCE_ENDPOINTS } from "@/lib/api";

interface SidebarProps {
  usuario: Usuario;
  paginaActiva:
    | "dashboard"
    | "estrategia"
    | "facturas"
    | "eventos"
    | "digital"
    | "campanas"
    | "configuracion"
    | "presencias"
    | "embajadores"
    | "presupuesto"
    | "anuncios";
  onMenuClick: (item: string) => void;
  onCerrarSesion: () => void;
}

export default function Sidebar({
  usuario,
  paginaActiva,
  onMenuClick,
  onCerrarSesion,
}: SidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [agenciaOpen, setAgenciaOpen] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { openDevTools } = useDevTools();
  const { marcaSeleccionada, setMarcaSeleccionada, marcasPermitidas } =
    useMarcaGlobal();

  const permisos = usuario.permisos || {
    dashboard: true,
    estrategia: true,
    facturas: true,
    eventos: true,
    digital: true,
  };

  const isDeveloper = usuario.tipo === "developer";

  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const res = await fetch(MAINTENANCE_ENDPOINTS.STATUS);
      if (res.ok) {
        const data = await res.json();
        setMaintenanceActive(data.active);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isDeveloper) fetchMaintenanceStatus();
  }, [isDeveloper, fetchMaintenanceStatus]);

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(MAINTENANCE_ENDPOINTS.TOGGLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceActive(data.active);
      }
    } catch {
      // ignore
    }
    setMaintenanceLoading(false);
  };

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      visible: permisos.dashboard,
    },
    {
      key: "estrategia",
      label: "Estrategia",
      path: "/estrategia",
      icon: Target,
      visible: permisos.estrategia,
    },
    {
      key: "facturas",
      label: "Facturas",
      path: "/facturas",
      icon: ReceiptText,
      visible: permisos.facturas,
    },
    {
      key: "eventos",
      label: "Eventos",
      path: "/eventos",
      icon: CalendarDays,
      visible: permisos.eventos,
    },
    {
      key: "digital",
      label: "Digital",
      path: "/digital",
      icon: Monitor,
      visible: permisos.digital,
    },
  ];

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
        // also collapse sidebar if mouse is not over it
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(e.target as Node)
        ) {
          setIsExpanded(false);
          setAgenciaOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = usuario.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  // Shared nav button class — icon always at fixed left position (pl-3 = 12px + ul px-1.5 = 6px → icon starts at 18px, centered in 56px collapsed sidebar)
  const navBtnBase =
    "w-full flex items-center py-2.5 pl-3 pr-2 rounded-lg text-sm font-medium transition-colors";

  return (
    <aside
      ref={sidebarRef}
      className={`fixed top-14 left-0 bottom-0 z-20 flex flex-col bg-gray-100 border-r border-gray-200 transition-all duration-200 ease-in-out ${
        isExpanded ? "w-52 shadow-lg" : "w-14"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        if (userMenuOpen) return;
        setIsExpanded(false);
        setAgenciaOpen(false);
      }}
    >
      {/* Agency selector */}
      {marcasPermitidas.length > 0 && (
        <div className="shrink-0 px-1.5 pt-2 pb-1">
          <button
            onClick={() => setAgenciaOpen((p) => !p)}
            className={`${navBtnBase} text-gray-600 hover:bg-gray-200`}
          >
            <SlidersHorizontal
              className="h-5 w-5 shrink-0 text-red-600"
              strokeWidth={1.75}
            />
            {isExpanded && (
              <>
                <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">
                  {marcaSeleccionada ?? "Agencia"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${agenciaOpen ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </>
            )}
          </button>
          {isExpanded && agenciaOpen && (
            <div className="mt-1 px-2 pb-2">
              <select
                value={marcaSeleccionada || ""}
                onChange={(e) => {
                  setMarcaSeleccionada(e.target.value || null);
                  setAgenciaOpen(false);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                autoFocus
              >
                <option value="">Todas</option>
                {marcasPermitidas.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mx-2 mt-1 border-t border-gray-200" />
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-hidden">
        <ul className="space-y-0.5 px-1.5">
          {navItems.map(
            (item) =>
              item.visible && (
                <li key={item.key}>
                  <button
                    onClick={() => router.push(item.path)}
                    className={`${navBtnBase} ${
                      paginaActiva === item.key
                        ? "ring-1 ring-red-500 text-gray-700"
                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0 text-red-600"
                      strokeWidth={1.75}
                    />
                    {isExpanded && (
                      <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              ),
          )}
        </ul>

        {/* Developer section */}
        {isDeveloper && (
          <>
            <div className="mx-2 my-2 border-t border-gray-200" />
            <ul className="space-y-0.5 px-1.5">
              <li>
                <button
                  onClick={() => openDevTools()}
                  className={`${navBtnBase} text-amber-600 hover:bg-amber-100`}
                >
                  <Code2
                    className="h-5 w-5 shrink-0 text-amber-500"
                    strokeWidth={1.75}
                  />
                  {isExpanded && (
                    <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis">
                      Dev Tools
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={handleToggleMaintenance}
                  disabled={maintenanceLoading}
                  title={
                    maintenanceActive
                      ? "Activo — click para desactivar"
                      : "Click para activar mantenimiento"
                  }
                  className={`${navBtnBase} disabled:opacity-50 ${
                    maintenanceActive
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <ShieldAlert
                    className={`h-5 w-5 shrink-0 ${maintenanceActive ? "text-red-500" : "text-gray-400"}`}
                    strokeWidth={1.75}
                  />
                  {isExpanded && (
                    <>
                      <div className="ml-3 flex-1 text-left overflow-hidden min-w-0">
                        <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          Mantenimiento
                        </div>
                        <div
                          className={`text-xs ${maintenanceActive ? "text-red-500" : "text-gray-400"}`}
                        >
                          {maintenanceLoading
                            ? "Actualizando..."
                            : maintenanceActive
                              ? "Activo"
                              : "Inactivo"}
                        </div>
                      </div>
                      <div
                        className={`ml-2 relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                          maintenanceActive ? "bg-red-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            maintenanceActive
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </div>
                    </>
                  )}
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* User button — styled like a nav item, sits at bottom */}
      <div
        className="relative shrink-0 px-1.5 pb-2 pt-1 border-t border-gray-200"
        ref={userMenuRef}
      >
        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className="w-full flex items-center py-2 pl-3 pr-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">
              {initials}
            </span>
          </div>
          {isExpanded && (
            <>
              <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">
                {usuario.nombre}
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 text-red-500 shrink-0 ml-1"
                strokeWidth={2.5}
              />
            </>
          )}
        </button>

        {/* User popup menu — opens to the right, animated */}
        <div
          className={`absolute left-full bottom-2 ml-2 w-52 z-30 transition-all duration-150 origin-bottom-left ${
            userMenuOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="bg-gray-100 rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Top items */}
            <div className="py-1.5 px-1.5 space-y-0.5">
              <button
                onClick={() => {
                  onMenuClick("mi-perfil");
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <UserRound
                  className="h-4 w-4 mr-2.5 text-gray-500"
                  strokeWidth={1.75}
                />
                Mi perfil
              </button>
              <button
                onClick={() => {
                  onMenuClick("cambiar-contrasena");
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Lock
                  className="h-4 w-4 mr-2.5 text-gray-500"
                  strokeWidth={1.75}
                />
                Contraseña
              </button>
              <button
                onClick={() => {
                  onMenuClick("configuracion");
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Settings
                  className="h-4 w-4 mr-2.5 text-gray-500"
                  strokeWidth={1.75}
                />
                Configuración
              </button>
            </div>
            {/* Cerrar sesión — white background, icon on right */}
            <div className="px-1.5 pb-1.5">
              <button
                onClick={() => {
                  onCerrarSesion();
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-800 bg-white hover:bg-gray-50 rounded-xl transition-colors"
              >
                <span>Cerrar sesión</span>
                <LogOut className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
