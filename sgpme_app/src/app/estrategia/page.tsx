"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProyecciones } from "@/hooks/useProyecciones";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { usePeriodo, MESES_COMPLETOS } from "@/contexts/PeriodoContext";
import { FiltrosProyeccion, Proyeccion } from "@/types";
import {
  FormularioProyeccion,
  ListaProyecciones,
  FiltrosPanel,
} from "@/components";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import { showToast } from "@/lib/toast";

export default function ProyeccionesPage() {
  console.log("🚀 [INICIO] ProyeccionesPage se está renderizando");
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
    tienePermiso,
  } = useAuth();
  const { filtraPorMarca } = useMarcaGlobal();
  const { mes: periodoMes, año: periodoAño, mesesDelPeriodo } = usePeriodo();
  const [vistaActual, setVistaActual] = useState<
    "dashboard" | "nueva" | "editar"
  >("dashboard");

  // Navegación con soporte para botón atrás del navegador
  const navegarA = (vista: "dashboard" | "nueva" | "editar") => {
    window.history.pushState({ vista }, "");
    setVistaActual(vista);
  };

  useEffect(() => {
    window.history.replaceState({ vista: "dashboard" }, "");

    const handlePopState = (e: PopStateEvent) => {
      setVistaActual(
        (e.state?.vista as "dashboard" | "nueva" | "editar") ?? "dashboard",
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [proyeccionEditando, setProyeccionEditando] =
    useState<Proyeccion | null>(null);
  const [activeConfigView, setActiveConfigView] = useState("");

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      window.location.href = "/configuracion";
      return;
    }
    setActiveConfigView(item);
  };

  // Obtener mes y año actual
  const fechaActual = new Date();
  const mesesNombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const mesActual = mesesNombres[fechaActual.getMonth()];
  const añoActual = fechaActual.getFullYear();

  const [filtros, setFiltros] = useState<FiltrosProyeccion>({
    meses: [MESES_COMPLETOS[periodoMes - 1]],
    año: periodoAño,
  });
  const [errorVisible, setErrorVisible] = useState<string | null>(null);

  // Sincronizar filtros de estrategia con el período global del header
  useEffect(() => {
    setFiltros((prev) => ({
      ...prev,
      meses: mesesDelPeriodo.map((m) => MESES_COMPLETOS[m - 1]),
      año: periodoAño,
    }));
  }, [periodoMes, periodoAño, mesesDelPeriodo]);

  const {
    proyecciones,
    loading,
    error,
    guardarProyeccion,
    eliminarProyeccion,
    obtenerProyeccionesPorFiltros,
    aprobarProyeccion,
  } = useProyecciones();

  // Auto-dismiss error notification after 6 seconds
  useEffect(() => {
    if (error) {
      setErrorVisible(error);
      const t = setTimeout(() => setErrorVisible(null), 6000);
      return () => clearTimeout(t);
    } else {
      setErrorVisible(null);
    }
  }, [error]);

  useEffect(() => {
    console.log(
      "🔍 [Estrategia Page] Proyecciones actuales:",
      proyecciones.length,
    );
    console.log("🔍 [Estrategia Page] Proyecciones:", proyecciones);
  }, [proyecciones]);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  if (authLoading || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  console.log("✅ [ESTRATEGIA] Usuario autenticado, renderizando página");
  console.log("✅ [ESTRATEGIA] Proyecciones disponibles:", proyecciones.length);
  console.log("✅ [ESTRATEGIA] Array de proyecciones:", proyecciones);

  const proyeccionesFiltradas = obtenerProyeccionesPorFiltros(filtros)
    .filter((proyeccion) => filtraPorMarca(proyeccion.marca))
    .sort((a, b) => {
      // Ordenar por año primero
      if (a.año !== b.año) {
        return a.año - b.año;
      }
      // Luego por mes
      const meses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ];
      return meses.indexOf(a.mes) - meses.indexOf(b.mes);
    });

  const manejarCrearProyeccion = async (
    datos: Omit<Proyeccion, "id" | "fechaCreacion">,
  ) => {
    try {
      // Validar si ya existe una proyección para el mismo mes, año y marca
      const proyeccionExistente = proyecciones.find(
        (p) =>
          p.año === datos.año && p.mes === datos.mes && p.marca === datos.marca,
      );

      if (proyeccionExistente) {
        showToast(
          `Ya existe una proyección para ${datos.marca} en ${datos.mes} ${datos.año}. Solo se permite una proyección por mes y marca.`,
          "error",
        );
        return;
      }

      const nuevaProyeccion: Proyeccion = {
        ...datos,
        id: Date.now().toString(),
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      await guardarProyeccion(nuevaProyeccion);
      setVistaActual("dashboard");
    } catch (error) {
      console.error("Error al crear proyección:", error);
    }
  };

  const manejarEditarProyeccion = (proyeccion: Proyeccion) => {
    setProyeccionEditando(proyeccion);
    navegarA("editar");
  };

  const manejarActualizarProyeccion = async (datos: Partial<Proyeccion>) => {
    if (proyeccionEditando) {
      try {
        const proyeccionActualizada: Proyeccion = {
          ...proyeccionEditando,
          ...datos,
          fechaModificacion: new Date().toISOString(),
        };

        // Validar si ya existe otra proyección con el mismo mes, año y marca
        const proyeccionDuplicada = proyecciones.find(
          (p) =>
            p.id !== proyeccionEditando.id &&
            p.año === proyeccionActualizada.año &&
            p.mes === proyeccionActualizada.mes &&
            p.marca === proyeccionActualizada.marca,
        );

        if (proyeccionDuplicada) {
          showToast(
            `Ya existe una proyección para ${proyeccionActualizada.marca} en ${proyeccionActualizada.mes} ${proyeccionActualizada.año}. Solo se permite una proyección por mes y marca.`,
            "error",
          );
          return;
        }

        await guardarProyeccion(proyeccionActualizada);
        setVistaActual("dashboard");
        setProyeccionEditando(null);
      } catch (error) {
        console.error("Error al actualizar proyección:", error);
      }
    }
  };

  const manejarEliminarProyeccion = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta proyección?")) {
      try {
        await eliminarProyeccion(id);
      } catch (error) {
        console.error("Error al eliminar proyección:", error);
      }
    }
  };

  const manejarAprobarProyeccion = async (id: string) => {
    try {
      const exito = await aprobarProyeccion(id);
      if (exito) {
        showToast("Proyección aprobada exitosamente", "success");
      } else {
        showToast("Error al aprobar la proyección", "error");
      }
    } catch (error) {
      console.error("Error al aprobar proyección:", error);
      showToast("Error al aprobar la proyección", "error");
    }
  };

  const handleCerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      cerrarSesionAuth();
      router.push("/login");
    }
  };

  if (loading && proyecciones.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

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
        paginaActiva="estrategia"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          {vistaActual === "dashboard" && (
            <>
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Proyecciones Presupuestales
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {usuario?.tipo === "auditor"
                      ? "Consulta y auditoría de proyecciones presupuestales"
                      : "Gestión de presupuestos y proyecciones financieras"}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push("/presupuesto")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>💰</span>
                    <span>Gestionar Presupuestos</span>
                  </button>
                </div>
              </div>
              {tienePermiso("proyecciones", "crear") ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">
                        Nueva Proyección
                      </h3>
                      <button
                        onClick={() => navegarA("nueva")}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Crear Nueva Proyección
                      </button>
                    </div>
                    <div className="mt-6">
                      <FiltrosPanel
                        filtros={filtros}
                        onFiltrosChange={setFiltros}
                        disabled={true}
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <ListaProyecciones
                      proyecciones={proyeccionesFiltradas}
                      onEditar={manejarEditarProyeccion}
                      onEliminar={manejarEliminarProyeccion}
                      onAprobar={manejarAprobarProyeccion}
                      loading={loading}
                      permisos={{
                        editar: tienePermiso("proyecciones", "editar"),
                        eliminar:
                          isAdmin || tienePermiso("proyecciones", "eliminar"),
                        aprobar: isAdmin,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        🔍 Filtros de Búsqueda
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          👁️ Modo Auditor
                        </span>
                      </div>
                    </div>
                    <FiltrosPanel
                      filtros={filtros}
                      onFiltrosChange={setFiltros}
                      disabled={true}
                    />
                  </div>
                  <div className="w-full">
                    <ListaProyecciones
                      proyecciones={proyeccionesFiltradas}
                      onEditar={manejarEditarProyeccion}
                      onEliminar={manejarEliminarProyeccion}
                      onAprobar={manejarAprobarProyeccion}
                      loading={loading}
                      permisos={{
                        editar: tienePermiso("proyecciones", "editar"),
                        eliminar:
                          isAdmin || tienePermiso("proyecciones", "eliminar"),
                        aprobar: isAdmin,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {vistaActual === "nueva" && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Proyecciones
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Nueva Proyección
                </h2>
              </div>
              <FormularioProyeccion
                onSubmit={manejarCrearProyeccion}
                onCancel={() => setVistaActual("dashboard")}
                loading={loading}
                proyeccionesExistentes={proyecciones}
              />
            </div>
          )}

          {vistaActual === "editar" && proyeccionEditando && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Proyecciones
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Editar Proyección
                </h2>
              </div>
              <FormularioProyeccion
                proyeccionInicial={proyeccionEditando}
                onSubmit={manejarActualizarProyeccion}
                onCancel={() => setVistaActual("dashboard")}
                loading={loading}
                proyeccionesExistentes={proyecciones}
              />
            </div>
          )}

          {errorVisible && (
            <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-3 z-50">
              <span>{errorVisible}</span>
              <button
                onClick={() => setErrorVisible(null)}
                className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>
          )}
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
