"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { usePeriodo } from "@/contexts/PeriodoContext";
import {
  ArrowTrendingUpIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import { fetchConToken } from "@/lib/auth-utils";
import { useCampanas } from "@/hooks/useCampanas";
import FormularioPresencia from "@/components/FormularioPresencia";
import { usePresencias, Presencia } from "@/hooks/usePresencias";
import { useProveedoresAPI as useProveedores } from "@/hooks/useProveedoresAPI";
import { showToast } from "@/lib/toast";
import { useMetricas, Metrica, MetricaFormData } from "@/hooks/useMetricas";
import FormularioMetricaSimple from "@/components/FormularioMetricaSimple";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import ConciliacionBDCSection from "@/components/ConciliacionBDCSection";
import DiagramasConversionSection from "@/components/DiagramasConversionSection";

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

const MetricasPage = () => {
  const buildProfileUrl = (
    plataforma: string,
    usuario: string,
  ): string | null => {
    const u = usuario.replace(/^@/, "").trim();
    if (!u) return null;
    switch (plataforma) {
      case "Instagram":
        return `https://www.instagram.com/${u}`;
      case "TikTok":
        return `https://www.tiktok.com/@${u}`;
      case "YouTube":
        return `https://www.youtube.com/@${u}`;
      case "Facebook":
        return `https://www.facebook.com/${u}`;
      case "X (Twitter)":
        return `https://x.com/${u}`;
      case "Twitch":
        return `https://www.twitch.tv/${u}`;
      case "LinkedIn":
        return `https://www.linkedin.com/in/${u}`;
      default:
        return null;
    }
  };

  const capitalize = (str: string | null | undefined) => {
    if (!str) return "N/A";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { marcaSeleccionada, filtraPorMarca } = useMarcaGlobal();
  const { mes: periodoMes, año: periodoAño } = usePeriodo();
  const [vistaActual, setVistaActual] = useState<
    "dashboard" | "nueva-presencia"
  >("dashboard");
  const [activeConfigView, setActiveConfigView] = useState("");
  const [modalPresencia, setModalPresencia] = useState<Presencia | null>(null);
  const [presenciaEditando, setPresenciaEditando] = useState<Presencia | null>(
    null,
  );
  const [modalMetricaOpen, setModalMetricaOpen] = useState(false);
  const [metricaEditando, setMetricaEditando] = useState<Metrica | null>(null);
  const [historialExpanded, setHistorialExpanded] = useState(false);

  // Embajadores
  const [embajadoresDig, setEmbajadoresDig] = useState<
    Array<{
      id: number;
      nombre: string;
      plataformas_json: string | null;
      presupuesto: number;
      leads: number;
      audiencia: number;
      marca: string | null;
    }>
  >([]);

  const [mesSeleccionado, setMesSeleccionado] = useState<number | undefined>(
    periodoMes,
  );
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(
    periodoAño,
  );

  // Sincronizar con el período global del header
  useEffect(() => {
    setMesSeleccionado(periodoMes);
    setAnioSeleccionado(periodoAño);
  }, [periodoMes, periodoAño]);

  const { campanas: campanasDb, cargarCampanas } = useCampanas();

  const {
    cargarPresencias,
    crearPresencia,
    actualizarPresencia,
    eliminarPresencia,
  } = usePresencias();

  const { proveedores } = useProveedores();

  const {
    metricas: metricasDb,
    cargarMetricas,
    crearMetrica,
    actualizarMetrica,
    eliminarMetrica,
  } = useMetricas();

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    fetchConToken(`${API_URL}/embajadores/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setEmbajadoresDig(Array.isArray(data) ? data : []))
      .catch(() => setEmbajadoresDig([]));
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarCampanas(marcaSeleccionada || undefined);
      cargarPresencias();
      cargarMetricas(mesSeleccionado, anioSeleccionado);
    }
  }, [
    usuario,
    marcaSeleccionada,
    mesSeleccionado,
    anioSeleccionado,
    cargarCampanas,
    cargarPresencias,
    cargarMetricas,
  ]);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;
  const isAuditor = usuario?.tipo === "auditor";

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
  };

  const metricasDelMes = metricasDb.filter(
    (m) =>
      (mesSeleccionado === undefined || m.mes === mesSeleccionado) &&
      m.anio === anioSeleccionado,
  );

  const metricaActual =
    metricasDelMes.length > 0
      ? {
          leads: metricasDelMes.reduce((sum, m) => sum + (m.leads || 0), 0),
          citas: metricasDelMes.reduce((sum, m) => sum + (m.citas || 0), 0),
          pisos: metricasDelMes.reduce((sum, m) => sum + (m.pisos || 0), 0),
          utilidades: metricasDelMes.reduce(
            (sum, m) => sum + (m.utilidades || 0),
            0,
          ),
        }
      : null;

  const mesAnterior =
    mesSeleccionado === undefined
      ? undefined
      : mesSeleccionado === 1
        ? 12
        : mesSeleccionado - 1;
  const anioAnterior =
    mesSeleccionado === undefined
      ? anioSeleccionado - 1
      : mesSeleccionado === 1
        ? anioSeleccionado - 1
        : anioSeleccionado;

  const metricasDelMesAnterior = metricasDb.filter(
    (m) =>
      (mesAnterior === undefined || m.mes === mesAnterior) &&
      m.anio === anioAnterior,
  );

  const metricaMesAnterior =
    metricasDelMesAnterior.length > 0
      ? {
          leads: metricasDelMesAnterior.reduce(
            (sum, m) => sum + (m.leads || 0),
            0,
          ),
          citas: metricasDelMesAnterior.reduce(
            (sum, m) => sum + (m.citas || 0),
            0,
          ),
          pisos: metricasDelMesAnterior.reduce(
            (sum, m) => sum + (m.pisos || 0),
            0,
          ),
          utilidades: metricasDelMesAnterior.reduce(
            (sum, m) => sum + (m.utilidades || 0),
            0,
          ),
        }
      : null;

  const calcularCambio = (
    actual: number,
    anterior: number | undefined,
  ): { valor: string; tipo: "positive" | "negative" | "neutral" } => {
    if (!anterior || anterior === 0) return { valor: "", tipo: "neutral" };
    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      valor: `${cambio > 0 ? "+" : ""}${cambio.toFixed(1)}%`,
      tipo: cambio > 0 ? "positive" : cambio < 0 ? "negative" : "neutral",
    };
  };

  const leadsCambio = calcularCambio(
    metricaActual?.leads || 0,
    metricaMesAnterior?.leads,
  );
  const citasCambio = calcularCambio(
    metricaActual?.citas || 0,
    metricaMesAnterior?.citas,
  );
  const utilidadesCambio = calcularCambio(
    metricaActual?.utilidades || 0,
    metricaMesAnterior?.utilidades,
  );

  const metrics: MetricCard[] = [
    {
      title: "Leads",
      value: (metricaActual?.leads || 0).toLocaleString(),
      change: leadsCambio.valor,
      changeType: leadsCambio.tipo,
      icon: ArrowTrendingUpIcon,
    },
    {
      title: "Citas",
      value: (metricaActual?.citas || 0).toLocaleString(),
      change: citasCambio.valor,
      changeType: citasCambio.tipo,
      icon: CalendarIcon,
    },
    {
      title: "Ventas",
      value: (metricaActual?.utilidades || 0).toLocaleString(),
      change: utilidadesCambio.valor,
      changeType: utilidadesCambio.tipo,
      icon: CurrencyDollarIcon,
    },
  ];

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Calcular métricas por plataforma
  const calcularMetricasPlataforma = (plataforma: string) => {
    const campanasActivas = campanasDb.filter(
      (c) =>
        c.plataforma === plataforma &&
        c.estado === "Activa" &&
        filtraPorMarca(c.marca),
    );

    const leadsTotal = campanasActivas.reduce(
      (sum, c) => sum + (c.leads || 0),
      0,
    );
    const inversionTotal = campanasActivas.reduce(
      (sum, c) => sum + (c.gasto_actual || c.presupuesto || 0),
      0,
    );
    const cxcPromedio =
      campanasActivas.length > 0
        ? campanasActivas.reduce((sum, c) => sum + (c.cxc_porcentaje || 0), 0) /
          campanasActivas.length
        : 0;

    return {
      leads: leadsTotal,
      inversion: inversionTotal,
      cxc: cxcPromedio,
    };
  };

  const metricasMeta = calcularMetricasPlataforma("Meta Ads");
  const metricasGoogle = calcularMetricasPlataforma("Google Ads");
  const metricasTikTok = calcularMetricasPlataforma("TikTok Ads");

  if (vistaActual === "nueva-presencia") {
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
          paginaActiva="digital"
          onMenuClick={handleMenuClick}
          onCerrarSesion={handleCerrarSesion}
        />

        <div className="pt-14 pl-14 bg-white min-h-screen">
          <main className="px-4 sm:px-6 lg:px-8 pt-8">
            <div className="mb-6">
              <button
                onClick={() => {
                  setVistaActual("dashboard");
                  setPresenciaEditando(null);
                }}
                className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {presenciaEditando
                  ? "Editar Presencia"
                  : "Registrar Nueva Presencia"}
              </h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <FormularioPresencia
                marcaActual={marcaSeleccionada || ""}
                presenciaInicial={presenciaEditando}
                proveedores={proveedores}
                onNavigateToProveedores={() => {
                  router.push("/facturas?action=nuevo-proveedor");
                }}
                onCancel={() => {
                  setVistaActual("dashboard");
                  setPresenciaEditando(null);
                }}
                onSubmit={async (presencia) => {
                  if (presenciaEditando) {
                    const success = await actualizarPresencia(
                      presenciaEditando.id,
                      presencia,
                    );
                    if (success) {
                      showToast(
                        "Presencia actualizada exitosamente",
                        "success",
                      );
                    } else {
                      showToast("Error al actualizar la presencia", "error");
                    }
                  } else {
                    const success = await crearPresencia(presencia);
                    if (success) {
                      showToast("Presencia creada exitosamente", "success");
                    } else {
                      showToast("Error al crear la presencia", "error");
                    }
                  }
                  setVistaActual("dashboard");
                  setPresenciaEditando(null);
                }}
              />
            </div>
          </main>
        </div>

        {activeConfigView === "mi-perfil" && (
          <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
        )}
        {activeConfigView === "cambiar-contrasena" && (
          <CambiarContrasenaCoordinador
            onClose={() => setActiveConfigView("")}
          />
        )}
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
        paginaActiva="digital"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          <div className="space-y-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Digital</h1>
              <p className="text-gray-600">
                Panel de control de rendimiento y campañas
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-900">
                  Filtrar por período:
                </label>
                <div
                  title="Controlado por el filtro de período del header"
                  className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 text-sm cursor-not-allowed min-w-[130px]"
                >
                  {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][mesSeleccionado !== undefined ? mesSeleccionado - 1 : new Date().getMonth()] ?? "—"}
                </div>
                <div
                  title="Controlado por el filtro de período del header"
                  className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                >
                  {anioSeleccionado}
                </div>
                <span className="text-xs text-blue-600">
                  📅 Controlado por el filtro del header
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Funnel</h2>
                {!isAuditor && (
                  <button
                    onClick={() => {
                      setMetricaEditando(null);
                      setModalMetricaOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    + Registrar Métricas
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <span
                          className={`text-sm font-medium ${getChangeColor(
                            metric.changeType,
                          )}`}
                        >
                          {metric.change}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">
                        {metric.title}
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {metric.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-8">
              <button
                onClick={() => setHistorialExpanded(!historialExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Historial de Métricas
                </h3>
                {historialExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {historialExpanded && (
                <div className="px-6 pb-6 border-t border-gray-200">
                  <div className="mt-4 overflow-x-auto">
                    {metricasDb.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No hay métricas registradas
                      </p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Período
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Agencia
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Leads
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Citas
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                              Ventas
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              Creado por
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {metricasDb.slice(0, 10).map((metrica) => (
                            <tr key={metrica.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(
                                  0,
                                  metrica.mes - 1,
                                ).toLocaleDateString("es-MX", {
                                  month: "short",
                                })}{" "}
                                {metrica.anio}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {metrica.marca && (
                                  <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded capitalize">
                                    {metrica.marca}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                {metrica.leads.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                {metrica.citas.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                {metrica.utilidades.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                {metrica.creado_por_nombre ||
                                  metrica.creado_por}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                {!isAuditor && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setMetricaEditando(metrica);
                                        setModalMetricaOpen(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (
                                          confirm("¿Eliminar esta métrica?")
                                        ) {
                                          await eliminarMetrica(metrica.id);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                      Eliminar
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {metricasDb.length > 10 && (
                      <p className="text-xs text-gray-500 text-center mt-4">
                        Mostrando las últimas 10 métricas de {metricasDb.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sección Conciliación con BDC */}
            <ConciliacionBDCSection />

            {/* Sección Diagramas de Conversión */}
            <DiagramasConversionSection />

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Campañas Digitales
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Meta */}
                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-blue-900">Meta</h3>
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Leads totales:
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {new Intl.NumberFormat("es-MX").format(
                          metricasMeta.leads,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Inversión:
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        $
                        {new Intl.NumberFormat("es-MX").format(
                          metricasMeta.inversion,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        CxC:
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {metricasMeta.cxc.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/campanas?plataforma=meta")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Ver campañas
                  </button>
                </div>

                {/* Google */}
                <div className="bg-linear-to-br from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-red-900">Google</h3>
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Leads totales:
                      </span>
                      <span className="text-lg font-bold text-red-900">
                        {new Intl.NumberFormat("es-MX").format(
                          metricasGoogle.leads,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Inversión:
                      </span>
                      <span className="text-lg font-bold text-red-900">
                        $
                        {new Intl.NumberFormat("es-MX").format(
                          metricasGoogle.inversion,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        CxC:
                      </span>
                      <span className="text-lg font-bold text-red-900">
                        {metricasGoogle.cxc.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/campanas?plataforma=google")}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Ver campañas
                  </button>
                </div>

                {/* TikTok */}
                <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">TikTok</h3>
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Leads totales:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat("es-MX").format(
                          metricasTikTok.leads,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Inversión:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        $
                        {new Intl.NumberFormat("es-MX").format(
                          metricasTikTok.inversion,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        CxC:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {metricasTikTok.cxc.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/campanas?plataforma=tiktok")}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Ver campañas
                  </button>
                </div>
              </div>
            </div>

            {/* Sección Embajadores */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Embajadores
                </h2>
                <button
                  onClick={() => router.push("/embajadores?from=digital")}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Ver todos →
                </button>
              </div>

              {(() => {
                const embFiltrados = embajadoresDig.filter((e) =>
                  !e.marca ? true : filtraPorMarca(e.marca),
                );
                if (embFiltrados.length === 0) {
                  return (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-sm">No hay embajadores registrados.</p>
                      <button
                        onClick={() => router.push("/embajadores?from=digital")}
                        className="mt-3 text-purple-600 hover:underline text-sm font-medium"
                      >
                        Administrar embajadores →
                      </button>
                    </div>
                  );
                }
                const paletas = [
                  {
                    bg: "from-purple-50 to-purple-100",
                    border: "border-purple-200",
                    avatar: "bg-purple-600",
                    text: "text-purple-900",
                  },
                  {
                    bg: "from-pink-50 to-pink-100",
                    border: "border-pink-200",
                    avatar: "bg-pink-600",
                    text: "text-pink-900",
                  },
                  {
                    bg: "from-indigo-50 to-indigo-100",
                    border: "border-indigo-200",
                    avatar: "bg-indigo-600",
                    text: "text-indigo-900",
                  },
                ];
                const fmtAud = (n: number) => {
                  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
                  return String(n);
                };
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {embFiltrados.slice(0, 6).map((emb, idx) => {
                      const p = paletas[idx % paletas.length];
                      let plataformas: Array<{
                        plataforma: string;
                        usuario: string;
                      }> = [];
                      try {
                        if (emb.plataformas_json)
                          plataformas = JSON.parse(emb.plataformas_json);
                      } catch {
                        /* ignore */
                      }
                      return (
                        <div
                          key={emb.id}
                          className={`bg-linear-to-br ${p.bg} rounded-lg p-6 border-2 ${p.border} hover:shadow-lg transition-shadow`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3
                                className={`text-lg font-bold ${p.text} leading-tight`}
                              >
                                {emb.nombre}
                              </h3>
                              {emb.marca && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {emb.marca}
                                </p>
                              )}
                            </div>
                            <div
                              className={`w-12 h-12 ${p.avatar} rounded-full flex items-center justify-center shrink-0`}
                            >
                              <svg
                                className="w-7 h-7 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          </div>
                          {plataformas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {plataformas.map((pl, i) => {
                                const profileUrl = pl.usuario
                                  ? buildProfileUrl(pl.plataforma, pl.usuario)
                                  : null;
                                const label = `${pl.plataforma}${pl.usuario ? ` · ${pl.usuario}` : ""}`;
                                return profileUrl ? (
                                  <a
                                    key={i}
                                    href={profileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/60 text-purple-700 text-xs px-2 py-0.5 rounded-full hover:bg-purple-100 hover:underline transition-colors cursor-pointer"
                                  >
                                    {label}
                                  </a>
                                ) : (
                                  <span
                                    key={i}
                                    className="bg-white/60 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Presupuesto:
                              </span>
                              <span className={`text-base font-bold ${p.text}`}>
                                $
                                {new Intl.NumberFormat("es-MX").format(
                                  emb.presupuesto,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Leads:
                              </span>
                              <span className={`text-base font-bold ${p.text}`}>
                                {new Intl.NumberFormat("es-MX").format(
                                  emb.leads,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Audiencia:
                              </span>
                              <span className={`text-base font-bold ${p.text}`}>
                                {fmtAud(emb.audiencia)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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

      {modalPresencia && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0"
              onClick={() => setModalPresencia(null)}
            ></div>

            <div className="relative w-full max-w-4xl bg-white shadow-xl rounded-lg z-10">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 uppercase">
                  {modalPresencia.nombre}
                </h2>
                <div className="flex items-center gap-3">
                  {!isAuditor && (
                    <>
                      <button
                        onClick={() => {
                          setPresenciaEditando(modalPresencia);
                          setModalPresencia(null);
                          setVistaActual("nueva-presencia");
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              "¿Estás seguro de que deseas eliminar esta presencia?",
                            )
                          ) {
                            const success = await eliminarPresencia(
                              modalPresencia.id,
                            );
                            if (success) {
                              setModalPresencia(null);
                              showToast(
                                "Presencia eliminada exitosamente",
                                "success",
                              );
                            } else {
                              showToast(
                                "Error al eliminar la presencia",
                                "error",
                              );
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setModalPresencia(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                    INFORMACIÓN GENERAL
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        AGENCIA:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {capitalize(modalPresencia.agencia)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CIUDAD:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.ciudad}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CAMPAÑA:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.campana}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        UBICACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.ubicacion}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CONTENIDO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.contenido}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        NOTAS:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.notas || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        FECHA DE INSTALACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.fecha_instalacion
                          ? new Date(
                              modalPresencia.fecha_instalacion,
                            ).toLocaleDateString("es-MX")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DURACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.duracion}
                      </p>
                    </div>
                  </div>

                  {modalPresencia.cambio_lona && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase">
                          CAMBIO DE LONA:
                        </label>
                        <p className="text-sm font-semibold text-gray-900">
                          {modalPresencia.cambio_lona}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        VISTA:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.vista}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        ILUMINACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.iluminacion}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DIMENSIONES:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.dimensiones}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        PROVEEDOR:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.proveedor}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CÓDIGO INT PROVEEDOR:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.codigo_proveedor || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        COSTO MENSUAL:
                      </label>
                      <p className="text-sm font-semibold text-green-600">
                        {modalPresencia.costo_mensual
                          ? `$${new Intl.NumberFormat("es-MX").format(
                              modalPresencia.costo_mensual,
                            )}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DURACIÓN DEL CONTRATO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.duracion_contrato}
                      </p>
                    </div>
                    <div></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        INICIO DE CONTRATO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.inicio_contrato
                          ? new Date(
                              modalPresencia.inicio_contrato,
                            ).toLocaleDateString("es-MX")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        TERMINO DE CONTRATO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.termino_contrato
                          ? new Date(
                              modalPresencia.termino_contrato,
                            ).toLocaleDateString("es-MX")
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        IMPRESIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.impresion}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        COSTO:
                      </label>
                      <p className="text-sm font-semibold text-green-600">
                        {modalPresencia.costo_impresion
                          ? new Intl.NumberFormat("es-MX", {
                              style: "currency",
                              currency: "MXN",
                            }).format(modalPresencia.costo_impresion)
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        INSTALACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.instalacion}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                    UBICACIÓN E IMÁGENES
                  </h3>
                  {modalPresencia.tipo === "espectacular" && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase block mb-2">
                        Ubicación Google Maps
                      </label>
                      <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">
                            Mapa de ubicación
                          </p>
                          <p className="text-xs text-gray-500">
                            {modalPresencia.ubicacion}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalPresencia.imagenes_json &&
                    (() => {
                      try {
                        const imagenes = JSON.parse(
                          modalPresencia.imagenes_json,
                        );
                        if (Array.isArray(imagenes) && imagenes.length > 0) {
                          return (
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase block mb-2">
                                {modalPresencia.tipo === "espectacular"
                                  ? "Imágenes del Espectacular"
                                  : modalPresencia.tipo === "revista"
                                    ? "Imagen del Anuncio"
                                    : "Imagen de la Publicación"}
                              </label>
                              <div className="grid grid-cols-1 gap-4">
                                {imagenes.map(
                                  (imagen: string, index: number) => (
                                    <div key={index} className="relative">
                                      <Image
                                        src={imagen}
                                        alt={`${modalPresencia.tipo} ${
                                          index + 1
                                        }`}
                                        width={400}
                                        height={192}
                                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                                      />
                                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                        Imagen {index + 1}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        console.error("Error parsing imagenes_json:", e);
                      }
                      return null;
                    })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMetricaOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {metricaEditando ? "Editar Métricas" : "Registrar Métricas"}
              </h2>
              <button
                onClick={() => {
                  setModalMetricaOpen(false);
                  setMetricaEditando(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <FormularioMetricaSimple
                onSubmit={async (data: MetricaFormData) => {
                  const success = metricaEditando
                    ? await actualizarMetrica(metricaEditando.id, data)
                    : await crearMetrica(data);

                  if (success) {
                    setModalMetricaOpen(false);
                    setMetricaEditando(null);
                  }
                  return success;
                }}
                onCancel={() => {
                  setModalMetricaOpen(false);
                  setMetricaEditando(null);
                }}
                metricaInicial={metricaEditando || undefined}
                metricasExistentes={metricasDb.map((m) => ({
                  mes: m.mes,
                  anio: m.anio,
                  marca: m.marca,
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricasPage;
