"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import NavBar from "@/components/NavBar";
import FormularioCampana from "@/components/FormularioCampana";
import { useCampanas } from "@/hooks/useCampanas";
import type { CampanaFormData } from "@/hooks/useCampanas";
import { fetchConToken } from "@/lib/auth-utils";
import {
  ArrowLeftIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  HeartIcon,
  Bars3Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import ConfigSidebar from "@/components/ConfigSidebar";
import ConfigSidebarCoordinador from "@/components/ConfigSidebarCoordinador";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";

interface CampanaDetallada {
  id: number;
  nombre: string;
  presupuesto: number;
  gasto_actual: number;
  plataforma: string;
  estado: string;
  leads: number;
  alcance: number;
  interacciones: number;
  fecha_inicio: string;
  fecha_fin: string;
  auto_objetivo: string;
  marca: string;
  conversion: number;
  cxc_porcentaje: number;
  imagenes_json?: string;
  google_ads_id?: string;
}

interface GadsItem {
  id: string;
  nombre: string;
  estado: string;
  gasto: number;
  impresiones: number;
  clics: number;
  ctr: number;
}

const CampanasPage = () => {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { marcaSeleccionada, filtraPorMarca } = useMarcaGlobal();
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");
  const [modalFormulario, setModalFormulario] = useState(false);
  const [campanaEditando, setCampanaEditando] =
    useState<CampanaDetallada | null>(null);
  const [modalAnuncios, setModalAnuncios] = useState(false);
  const [campanaAnuncios, setCampanaAnuncios] =
    useState<CampanaDetallada | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  // Google Ads state
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [gadsConfigured, setGadsConfigured] = useState<boolean | null>(null);

  const [modalVincular, setModalVincular] = useState<CampanaDetallada | null>(
    null,
  );
  const [gadsCampanas, setGadsCampanas] = useState<GadsItem[]>([]);
  const [loadingGadsLista, setLoadingGadsLista] = useState(false);
  const [gadsCampanaIdSeleccionada, setGadsCampanaIdSeleccionada] =
    useState("");
  const [vinculando, setVinculando] = useState(false);
  const [modalGadsSetup, setModalGadsSetup] = useState(false);
  const [gadsSetupTab, setGadsSetupTab] = useState<"oauth" | "cuentas">(
    "oauth",
  );
  const [gadsOAuthUrl, setGadsOAuthUrl] = useState("");
  const [gadsAuthCode, setGadsAuthCode] = useState("");
  const [gadsSetupLoading, setGadsSetupLoading] = useState(false);
  const [gadsSetupMsg, setGadsSetupMsg] = useState("");
  const [gadsCustomerMap, setGadsCustomerMap] = useState<
    Record<string, string>
  >({});
  const [savingCustomerMap, setSavingCustomerMap] = useState(false);
  const [importando, setImportando] = useState(false);

  // Marcas conocidas — filas por defecto en el mapa de cuentas
  const MARCAS_CONOCIDAS = [
    "GWM Chihuahua",
    "Kia Juventud",
    "Kia Juarez",
    "Subaru Chihuahua",
    "Toyota Chihuahua",
    "Toyota Monclova",
  ];

  // Estado para editar gasto
  const [editandoGasto, setEditandoGasto] = useState<number | null>(null);
  const [gastoTemporal, setGastoTemporal] = useState<number>(0);

  // Filtros
  const fechaActual = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(0); // 0 = Todos
  const [añoSeleccionado, setAñoSeleccionado] = useState(0); // 0 = Todos

  // Métricas filtradas por período (google_ads_id → métricas)
  const [metricasPeriodo, setMetricasPeriodo] = useState<Record<string, {
    alcance: number; interacciones: number; leads: number;
    gasto_actual: number; ctr: number; conversion: number; cxc_porcentaje: number;
  }>>({});

  // Hook para obtener parámetros de la URL
  const searchParams = useSearchParams();

  // Obtener plataforma inicial de URL usando useMemo
  const plataformaInicial = useMemo(() => {
    const plataformaParam = searchParams.get("plataforma");
    if (plataformaParam) {
      const plataformaMap: { [key: string]: string } = {
        meta: "Meta Ads",
        google: "Google Ads",
        tiktok: "TikTok Ads",
      };
      return plataformaMap[plataformaParam.toLowerCase()] || "Todas";
    }
    return "Todas";
  }, [searchParams]);

  // Estado para plataforma seleccionada
  const [plataformaSeleccionada, setPlataformaSeleccionada] =
    useState<string>(plataformaInicial);

  // Sincronizar con cambios de URL
  useEffect(() => {
    setPlataformaSeleccionada(plataformaInicial);
  }, [plataformaInicial]);

  const {
    campanas: campanasDb,
    loading: loadingCampanas,
    cargarCampanas,
    crearCampana,
    actualizarCampana,
    eliminarCampana,
  } = useCampanas();

  const isAdmin = usuario?.tipo === "administrador";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;
  const isAuditor = usuario?.tipo === "auditor";

  // Google Ads helpers
  const cargarGadsStatus = useCallback(async () => {
    try {
      const res = await fetchConToken(`${API_URL}/google-ads/status`);
      if (res.ok) {
        const data = await res.json();
        setGadsConfigured(data.configured);
      }
    } catch {
      setGadsConfigured(false);
    }
  }, [API_URL]);

  const cargarCampanasGads = useCallback(async () => {
    setLoadingGadsLista(true);
    try {
      const res = await fetchConToken(`${API_URL}/google-ads/campanas`);
      if (res.ok) setGadsCampanas(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoadingGadsLista(false);
    }
  }, [API_URL]);

  const importarCampanas = useCallback(
    async (marca?: string) => {
      setImportando(true);
      try {
        const res = await fetchConToken(`${API_URL}/google-ads/importar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(marca ? { marca } : {}),
        });
        const data = await res.json();
        if (res.ok) {
          await cargarCampanas(marcaSeleccionada || undefined);
          const total = data.creadas + data.actualizadas;
          alert(
            `✅ Importación completada:\n• ${data.creadas} campañas nuevas\n• ${data.actualizadas} actualizadas\n• Total: ${total}`,
          );
        } else {
          alert(data.detail || "Error al importar campañas");
        }
      } catch {
        alert("Error al conectar con el servidor");
      } finally {
        setImportando(false);
      }
    },
    [API_URL, cargarCampanas, marcaSeleccionada],
  );





  const vincularCampana = useCallback(async () => {
    if (!modalVincular) return;
    setVinculando(true);
    try {
      const res = await fetchConToken(
        `${API_URL}/google-ads/vincular/${modalVincular.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            google_ads_id: gadsCampanaIdSeleccionada || null,
          }),
        },
      );
      if (res.ok) {
        await cargarCampanas(marcaSeleccionada || undefined);
        setModalVincular(null);
      } else {
        const err = await res.json();
        alert(err.detail || "Error al vincular");
      }
    } catch {
      alert("Error al vincular campaña");
    } finally {
      setVinculando(false);
    }
  }, [
    API_URL,
    modalVincular,
    gadsCampanaIdSeleccionada,
    cargarCampanas,
    marcaSeleccionada,
  ]);



  const guardarCustomerMap = useCallback(async () => {
    setSavingCustomerMap(true);
    try {
      const res = await fetchConToken(`${API_URL}/google-ads/customer-map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gadsCustomerMap),
      });
      const data = await res.json();
      if (res.ok) {
        setGadsSetupMsg(`✅ ${data.cuentas_guardadas} cuentas guardadas`);
        setGadsSetupTab("oauth");
      } else {
        setGadsSetupMsg("❌ " + (data.detail || "Error al guardar"));
      }
    } catch {
      setGadsSetupMsg("❌ Error de conexión");
    } finally {
      setSavingCustomerMap(false);
    }
  }, [API_URL, gadsCustomerMap]);

  const enviarCodigoOAuth = useCallback(async () => {
    if (!gadsAuthCode.trim()) return;
    setGadsSetupLoading(true);
    setGadsSetupMsg("");
    try {
      const res = await fetchConToken(`${API_URL}/google-ads/oauth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: gadsAuthCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setGadsSetupMsg("✅ " + data.message);
        setGadsConfigured(true);
        setTimeout(() => setModalGadsSetup(false), 2000);
      } else {
        setGadsSetupMsg("❌ " + (data.detail || "Error desconocido"));
      }
    } catch {
      setGadsSetupMsg("❌ Error de conexión");
    } finally {
      setGadsSetupLoading(false);
    }
  }, [API_URL, gadsAuthCode]);

  useEffect(() => {
    if (usuario) {
      cargarCampanas(marcaSeleccionada || undefined);
    }
  }, [usuario, marcaSeleccionada, cargarCampanas]);

  useEffect(() => {
    if (isAdmin && usuario) cargarGadsStatus();
  }, [isAdmin, usuario, cargarGadsStatus]);

  // Cargar métricas filtradas cuando cambia mes/año
  useEffect(() => {
    if (mesSeleccionado === 0 && añoSeleccionado === 0) {
      setMetricasPeriodo({});
      return;
    }
    const year = añoSeleccionado || new Date().getFullYear();
    const month = mesSeleccionado || 1;
    if (mesSeleccionado === 0 || añoSeleccionado === 0) {
      setMetricasPeriodo({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchConToken(
          `${API_URL}/google-ads/metrics?year=${year}&month=${month}`,
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMetricasPeriodo(data);
        }
      } catch {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [mesSeleccionado, añoSeleccionado, API_URL]);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  // Debug del estado del modal
  useEffect(() => {
    console.log("Estado del modal cambió:", {
      editandoGasto,
      gastoTemporal,
      usuario: usuario?.tipo,
      isAuditor,
    });
  }, [editandoGasto, gastoTemporal, usuario, isAuditor]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && imagenPreview) {
        setImagenPreview(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [imagenPreview]);

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

  const handleSubmitCampana = async (
    data: Omit<CampanaFormData, "imagenes_json"> & {
      imagenes: Array<{ url: string; nombre: string; descripcion?: string }>;
    },
  ) => {
    try {
      const campanaData: CampanaFormData = {
        ...data,
        imagenes_json: JSON.stringify(data.imagenes),
      };

      if (campanaEditando) {
        await actualizarCampana(campanaEditando.id, campanaData);
      } else {
        await crearCampana(campanaData);
      }

      setModalFormulario(false);
      setCampanaEditando(null);
    } catch (error) {
      console.error("Error al guardar campaña:", error);
      alert("Error al guardar la campaña. Por favor intenta de nuevo.");
    }
  };

  const handleEditarCampana = (campana: CampanaDetallada) => {
    setCampanaEditando(campana);
    setModalFormulario(true);
  };

  const handleEliminarCampana = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar la campaña "${nombre}"?`)) {
      try {
        await eliminarCampana(id);
      } catch {
        alert("Error al eliminar la campaña");
      }
    }
  };

  const handleActualizarGasto = async (campana: CampanaDetallada) => {
    try {
      console.log("Actualizando gasto:", {
        campanaId: campana.id,
        gastoAnterior: campana.gasto_actual,
        gastoNuevo: gastoTemporal,
      });

      const campanaData: CampanaFormData = {
        nombre: campana.nombre,
        estado: campana.estado,
        plataforma: campana.plataforma,
        leads: campana.leads,
        alcance: campana.alcance,
        interacciones: campana.interacciones,
        fecha_inicio: campana.fecha_inicio,
        fecha_fin: campana.fecha_fin,
        presupuesto: campana.presupuesto,
        gasto_actual: gastoTemporal,
        auto_objetivo: campana.auto_objetivo,
        conversion: campana.conversion,
        cxc_porcentaje: campana.cxc_porcentaje,
        marca: campana.marca,
        imagenes_json: campana.imagenes_json,
      };

      console.log("Datos a enviar:", campanaData);
      const resultado = await actualizarCampana(campana.id, campanaData);
      console.log("Resultado actualización:", resultado);

      await cargarCampanas();
      console.log("Campañas recargadas");

      // Verificar que la campaña se actualizó
      const campanaActualizada = campanasDb.find((c) => c.id === campana.id);
      console.log("Campaña después de recargar:", {
        id: campana.id,
        gastoAntes: campana.gasto_actual,
        gastoEnviado: gastoTemporal,
        gastoDespues: campanaActualizada?.gasto_actual,
      });

      // Log completo de la campaña actualizada
      console.log("Campaña completa después de recargar:", campanaActualizada);

      setEditandoGasto(null);
      setGastoTemporal(0);
    } catch (error) {
      console.error("Error al actualizar gasto:", error);
      alert("Error al actualizar el gasto");
    }
  };

  const handleVerAnuncios = (campana: CampanaDetallada) => {
    setCampanaAnuncios(campana);
    setModalAnuncios(true);
  };

  const getPlatformColor = (plataforma: string) => {
    switch (plataforma) {
      case "Meta Ads":
        return "bg-blue-100 text-blue-800";
      case "Google Ads":
        return "bg-red-100 text-red-800";
      case "TikTok Ads":
        return "bg-gray-100 text-gray-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "Activa":
        return "bg-green-100 text-green-800";
      case "Pausada":
        return "bg-yellow-100 text-yellow-800";
      case "Completada":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-ES").format(num);
  };

  // Filtrar campañas por mes, año y plataforma
  const hayFiltroFecha = mesSeleccionado !== 0 && añoSeleccionado !== 0;

  const campanasFiltradas = campanasDb
    .filter((campana) => {
      // Filtrar por marcas permitidas del usuario
      if (!filtraPorMarca(campana.marca)) return false;

      const cumplePlataforma =
        plataformaSeleccionada === "Todas" ||
        campana.plataforma === plataformaSeleccionada;

      // Sin filtro de fecha → mostrar todas
      if (!hayFiltroFecha) return cumplePlataforma;

      // Campañas Google Ads: mostrar si estaron activas en el período filtrado
      if (campana.google_ads_id) {
        // Si hay métricas para este período, mostrar
        if (metricasPeriodo[campana.google_ads_id]) return cumplePlataforma;
        // Sin métricas = no tuvo actividad ese mes
        return false;
      }

      // Campañas manuales: filtrar por fecha de inicio
      if (!campana.fecha_inicio) return false;
      const fechaInicio = new Date(campana.fecha_inicio);
      const mesCampana = fechaInicio.getMonth() + 1;
      const añoCampana = fechaInicio.getFullYear();
      return mesCampana === mesSeleccionado && añoCampana === añoSeleccionado && cumplePlataforma;
    })
    .map((campana) => {
      // Sobrescribir métricas con las del período si hay filtro activo
      if (hayFiltroFecha && campana.google_ads_id && metricasPeriodo[campana.google_ads_id]) {
        const m = metricasPeriodo[campana.google_ads_id];
        return { ...campana, ...m };
      }
      return campana;
    })
    .sort((a, b) => {
      const fechaA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
      const fechaB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
      return fechaB - fechaA;
    });

  const meses = [
    { value: 0, label: "Todos" },
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const años = [
    0, // Todos
    ...Array.from({ length: 5 }, (_, i) => fechaActual.getFullYear() - 2 + i),
  ];

  const plataformas = ["Todas", "Meta Ads", "Google Ads", "TikTok Ads"];

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
      <NavBar usuario={usuario} paginaActiva="dashboard" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Volver a Dashboard
              </button>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && gadsConfigured && (
                <button
                  onClick={() =>
                    importarCampanas(marcaSeleccionada || undefined)
                  }
                  disabled={importando}
                  title="Sincronizar campañas desde Google Ads"
                  className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm"
                >
                  <svg
                    className={`w-4 h-4 ${importando ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {importando ? "Actualizando..." : "Actualizar"}
                </button>
              )}
              {!isAuditor && (
                <button
                  onClick={() => {
                    setCampanaEditando(null);
                    setModalFormulario(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Nueva Campaña
                </button>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Campañas Digitales
            </h1>
            <p className="text-gray-600">
              Análisis detallado de rendimiento de todas las campañas
              {marcaSeleccionada && ` - ${marcaSeleccionada}`}
            </p>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes
                </label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
                >
                  {meses.map((mes) => (
                    <option key={mes.value} value={mes.value}>
                      {mes.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año
                </label>
                <select
                  value={añoSeleccionado}
                  onChange={(e) => setAñoSeleccionado(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
                >
                  {años.map((año) => (
                    <option key={año} value={año}>
                      {año === 0 ? "Todos" : año}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma
                </label>
                <select
                  value={plataformaSeleccionada}
                  onChange={(e) => setPlataformaSeleccionada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
                >
                  {plataformas.map((plataforma) => (
                    <option key={plataforma} value={plataforma}>
                      {plataforma}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {loadingCampanas && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando campañas...</p>
            </div>
          )}
          {!loadingCampanas && campanasFiltradas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600">
                No hay campañas para los filtros seleccionados
                {marcaSeleccionada && ` en ${marcaSeleccionada}`}
              </p>
            </div>
          )}
          {!loadingCampanas && campanasFiltradas.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {campanasFiltradas.map((campana) => (
                <div
                  key={campana.id}
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                        {campana.nombre}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                          campana.estado,
                        )}`}
                      >
                        {campana.estado}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(
                          campana.plataforma,
                        )}`}
                      >
                        {campana.plataforma}
                      </span>
                      {campana.presupuesto > 0 && (
                        <span className="font-medium text-gray-900">
                          $
                          {new Intl.NumberFormat("es-MX").format(
                            campana.presupuesto,
                          )}/día
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">Leads</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {formatNumber(campana.leads)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UsersIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Alcance</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {formatNumber(campana.alcance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <HeartIcon className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">
                          Interacciones
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {formatNumber(campana.interacciones)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">CxC</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {campana.cxc_porcentaje > 0
                          ? `$${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(campana.cxc_porcentaje)}`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Gasto actual */}
                  {(campana.gasto_actual || 0) > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Inversión
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        $
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                        }).format(campana.gasto_actual)}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>
                        Inicio:{" "}
                        {campana.fecha_inicio
                          ? campana.fecha_inicio.split("-").reverse().join("/")
                          : "—"}
                      </span>
                      <span>
                        Fin:{" "}
                        {campana.fecha_fin
                          ? campana.fecha_fin.split("-").reverse().join("/")
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleVerAnuncios(campana)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>Ver Anuncios</span>
                    </button>

                    {!isAuditor && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarCampana(campana)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <PencilIcon className="w-4 h-4" />
                          <span>Editar</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleEliminarCampana(campana.id, campana.nombre)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ConfigSidebar
        isOpen={configSidebarOpen}
        onClose={() => setConfigSidebarOpen(false)}
        onNavigate={handleMenuClick}
      />

      {/* Modales para administradores */}
      {isAdmin && (
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

      {/* Sidebar para coordinadores */}
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

      {/* Modal para editar gasto */}
      {editandoGasto !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Solo cerrar si se hace click en el fondo, no en el modal
            if (e.target === e.currentTarget) {
              console.log("Cerrando modal por click en fondo");
              setEditandoGasto(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Editar Gasto Actual
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gasto Actual ($)
              </label>
              <input
                type="number"
                value={gastoTemporal === 0 ? "" : gastoTemporal}
                onChange={(e) => {
                  const valor = e.target.value;
                  const numero = valor === "" ? 0 : Number(valor);
                  console.log("Cambio en input:", { valor, numero });
                  setGastoTemporal(numero);
                }}
                placeholder="0"
                min="0"
                step="0.01"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log("Click en Guardar");
                  const campana = campanasDb.find(
                    (c) => c.id === editandoGasto,
                  );
                  if (campana) handleActualizarGasto(campana);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  console.log("Click en Cancelar");
                  setEditandoGasto(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar campaña */}
      {modalFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {campanaEditando ? "Editar Campaña" : "Nueva Campaña"}
              </h2>
              <button
                onClick={() => {
                  setModalFormulario(false);
                  setCampanaEditando(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6">
              <FormularioCampana
                onSubmit={handleSubmitCampana}
                onCancel={() => {
                  setModalFormulario(false);
                  setCampanaEditando(null);
                }}
                initialData={
                  campanaEditando
                    ? {
                        nombre: campanaEditando.nombre,
                        estado: campanaEditando.estado,
                        plataforma: campanaEditando.plataforma,
                        leads: campanaEditando.leads,
                        alcance: campanaEditando.alcance,
                        interacciones: campanaEditando.interacciones,
                        fecha_inicio: campanaEditando.fecha_inicio,
                        fecha_fin: campanaEditando.fecha_fin,
                        presupuesto: campanaEditando.presupuesto,
                        gasto_actual: campanaEditando.gasto_actual,
                        auto_objetivo: campanaEditando.auto_objetivo,
                        conversion: campanaEditando.conversion,
                        cxc_porcentaje: campanaEditando.cxc_porcentaje,
                        marca: campanaEditando.marca,
                        imagenes: (() => {
                          try {
                            return campanaEditando.imagenes_json
                              ? JSON.parse(campanaEditando.imagenes_json)
                              : [];
                          } catch {
                            return [];
                          }
                        })(),
                      }
                    : undefined
                }
                loading={loadingCampanas}
              />
            </div>
          </div>
        </div>
      )}
      {modalAnuncios && campanaAnuncios && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Anuncios de {campanaAnuncios.nombre}
              </h2>
              <button
                onClick={() => {
                  setModalAnuncios(false);
                  setCampanaAnuncios(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎯 Auto Objetivo
                </h3>
                <p className="text-gray-700 text-lg font-medium">
                  {campanaAnuncios.auto_objetivo}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📊 Tasa de Conversión
                </h3>
                <p className="text-gray-700 text-2xl font-bold">
                  {campanaAnuncios.conversion}%
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  💳 CxC
                </h3>
                <p className="text-gray-700 text-2xl font-bold">
                  {campanaAnuncios.cxc_porcentaje}%
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  💰 Presupuesto Total
                </h3>
                <p className="text-gray-700 text-2xl font-bold">
                  $
                  {new Intl.NumberFormat("es-MX").format(
                    campanaAnuncios.presupuesto,
                  )}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  � Anuncios
                </h3>
                {(() => {
                  try {
                    const imagenes = JSON.parse(
                      campanaAnuncios.imagenes_json || "[]",
                    );
                    if (imagenes.length > 0) {
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {imagenes.map(
                            (
                              imagen: {
                                url: string;
                                nombre: string;
                                descripcion?: string;
                              },
                              index: number,
                            ) => (
                              <div key={index} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imagen.url}
                                  alt={imagen.nombre}
                                  onClick={() => setImagenPreview(imagen.url)}
                                  className="w-full h-48 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <div className="mt-2">
                                  {imagen.nombre && (
                                    <a
                                      href={
                                        imagen.nombre.startsWith("http")
                                          ? imagen.nombre
                                          : `https://${imagen.nombre}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-blue-600 hover:text-blue-800 underline block truncate"
                                      title={imagen.nombre}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      🔗 Ver anuncio
                                    </a>
                                  )}
                                  {imagen.descripcion && (
                                    <p className="text-xs text-gray-600 truncate mt-1">
                                      {imagen.descripcion}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-gray-500 text-center py-8">
                          No hay imágenes disponibles para esta campaña
                        </p>
                      );
                    }
                  } catch {
                    return (
                      <p className="text-gray-500 text-center py-8">
                        No hay imágenes disponibles para esta campaña
                      </p>
                    );
                  }
                })()}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setModalAnuncios(false);
                    setCampanaAnuncios(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vincular campaña con Google Ads */}
      {modalVincular && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-red-600" />
                Vincular con Google Ads
              </h2>
              <button
                onClick={() => setModalVincular(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Campaña local:{" "}
                <span className="font-semibold text-gray-900">
                  {modalVincular.nombre}
                </span>
              </p>
              {loadingGadsLista ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Cargando campañas de Google Ads...
                  </p>
                </div>
              ) : gadsCampanas.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No se encontraron campañas en Google Ads, o Google Ads no está
                  configurado.
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar campaña de Google Ads
                  </label>
                  <select
                    value={gadsCampanaIdSeleccionada}
                    onChange={(e) =>
                      setGadsCampanaIdSeleccionada(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-gray-900"
                  >
                    <option value="">— Sin vincular —</option>
                    {gadsCampanas.map((gc) => (
                      <option key={gc.id} value={gc.id}>
                        {gc.nombre} ({gc.estado}) — $
                        {gc.gasto?.toLocaleString()} |{" "}
                        {gc.impresiones?.toLocaleString()} imp.
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={vincularCampana}
                  disabled={vinculando || loadingGadsLista}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {vinculando ? "Guardando..." : "Guardar vínculo"}
                </button>
                <button
                  onClick={() => setModalVincular(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurar Google Ads (OAuth + Cuentas) */}
      {modalGadsSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                Configurar Google Ads
              </h2>
              <button
                onClick={() => setModalGadsSetup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 shrink-0">
              {(["oauth", "cuentas"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setGadsSetupTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    gadsSetupTab === tab
                      ? "border-b-2 border-red-600 text-red-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "oauth" ? "🔐 Autorización" : "🗺️ Cuentas por marca"}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-700 space-y-4">
              {gadsSetupMsg && (
                <p
                  className={`font-medium ${gadsSetupMsg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
                >
                  {gadsSetupMsg}
                </p>
              )}

              {/* Tab: OAuth */}
              {gadsSetupTab === "oauth" && (
                <>
                  <p className="font-medium text-gray-900">
                    Sigue estos pasos para autorizar el acceso a Google Ads:
                  </p>
                  <ol className="list-decimal ml-5 space-y-2">
                    <li>
                      Abre el siguiente enlace con la cuenta MCC/administradora
                      (la que agrupa todas las marcas):
                      {gadsOAuthUrl ? (
                        <a
                          href={gadsOAuthUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-xs text-blue-600 underline break-all"
                        >
                          {gadsOAuthUrl.slice(0, 80)}...
                        </a>
                      ) : (
                        <span className="block mt-1 text-gray-400 italic">
                          Generando URL...
                        </span>
                      )}
                    </li>
                    <li>Acepta los permisos solicitados.</li>
                    <li>
                      Serás redirigido a localhost (la página no carga, es
                      normal). Copia el valor del parámetro{" "}
                      <strong>code=</strong> que aparece en la barra de URL y
                      pégalo abajo.
                    </li>
                  </ol>
                  <div>
                    <label className="block font-medium text-gray-800 mb-1">
                      Código de autorización
                    </label>
                    <input
                      type="text"
                      value={gadsAuthCode}
                      onChange={(e) => setGadsAuthCode(e.target.value)}
                      placeholder="4/0AX4XfWj..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={enviarCodigoOAuth}
                      disabled={gadsSetupLoading || !gadsAuthCode.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      {gadsSetupLoading ? "Conectando..." : "Conectar"}
                    </button>
                    <button
                      onClick={() => setGadsSetupTab("cuentas")}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Siguiente: Cuentas →
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    ⚠️ El servidor debe tener GOOGLE_ADS_DEVELOPER_TOKEN,
                    CLIENT_ID, CLIENT_SECRET y GOOGLE_ADS_MANAGER_ID (ID de la
                    cuenta MCC) en el .env.
                  </p>
                </>
              )}

              {/* Tab: Cuentas por marca */}
              {gadsSetupTab === "cuentas" && (
                <>
                  <p className="text-gray-600">
                    Asigna el{" "}
                    <span className="font-semibold">
                      Customer ID de Google Ads
                    </span>{" "}
                    (10 dígitos, sin guiones) a cada marca. Se usa
                    automáticamente al sincronizar campañas.
                  </p>
                  <div className="space-y-3">
                    {MARCAS_CONOCIDAS.map((marca) => (
                      <div key={marca} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 text-gray-800 font-medium text-xs">
                          {marca}
                        </span>
                        <input
                          type="text"
                          value={gadsCustomerMap[marca] || ""}
                          onChange={(e) =>
                            setGadsCustomerMap((prev) => ({
                              ...prev,
                              [marca]: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder="1234567890"
                          maxLength={12}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Encuéntralos en ads.google.com → selecciona la cuenta de
                    cada marca → el número de 10 dígitos aparece arriba a la
                    derecha.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={guardarCustomerMap}
                      disabled={savingCustomerMap}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      {savingCustomerMap ? "Guardando..." : "Guardar cuentas"}
                    </button>
                    <button
                      onClick={() => setModalGadsSetup(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview de Imagen */}
      {imagenPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4"
          onClick={() => setImagenPreview(null)}
        >
          <div className="relative max-w-[60%] max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImagenPreview(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <XMarkIcon className="h-6 w-6 text-gray-700" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagenPreview}
              alt="Preview"
              className="object-contain max-h-[85vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Componente wrapper con Suspense
const CampanasPageWithSuspense = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando campañas...</p>
          </div>
        </div>
      }
    >
      <CampanasPage />
    </Suspense>
  );
};

export default CampanasPageWithSuspense;
