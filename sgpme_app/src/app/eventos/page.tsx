"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import { useEventos } from "@/hooks/useEventos";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import FormularioEvento from "@/components/FormularioEvento";
import FormularioBrief from "@/components/FormularioBrief";
import BriefTemplate from "@/components/BriefTemplate";
import CalendarioTrimestral from "@/components/CalendarioTrimestral";
import CalendarioAnual from "@/components/CalendarioAnual";
import CalendarioMensual from "@/components/CalendarioMensual";
import { Evento, FiltrosEvento, BriefEvento } from "@/types";
import { eventoPerteneceAMarca, formatearMarca } from "@/lib/evento-utils";
import { Bars3Icon } from "@heroicons/react/24/outline";
import ConfigSidebar from "@/components/ConfigSidebar";
import ConfigSidebarCoordinador from "@/components/ConfigSidebarCoordinador";
import GestionAccesos from "@/components/GestionAccesos";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import PopupConfiguracion from "@/components/PopupConfiguracion";

export default function EventosPage() {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
    tienePermiso,
  } = useAuth();
  const {
    eventos,
    loading,
    estadisticas,
    cargarEventos,
    crearEvento,
    actualizarEvento,
    eliminarEvento,
    guardarBrief,
    eliminarBrief,
    exportarBriefPDF,
  } = useEventos();
  const { facturas } = useFacturas();
  const { marcaSeleccionada } = useMarcaGlobal();

  const [vistaActual, setVistaActual] = useState<
    | "dashboard"
    | "calendario-trimestral"
    | "calendario-anual"
    | "calendario-mensual"
    | "nuevo"
    | "editar"
    | "brief"
    | "template"
    | "preview"
  >("dashboard");
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [calendarioAbierto, setCalendarioAbierto] = useState<
    "mensual" | "trimestral" | "anual" | null
  >("mensual");
  const [filtros, setFiltros] = useState<FiltrosEvento>({
    estado: "Todos",
    mes: String(new Date().getMonth() + 1),
    año: new Date().getFullYear(),
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [filtroBriefs, setFiltroBriefs] = useState<
    "disponibles" | "pendientes"
  >("disponibles");

  const isAdmin = usuario?.tipo === "administrador";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  const handleMenuClick = (item: string) => {
    setActiveConfigView(item);
    setConfigSidebarOpen(false);
  };

  const parsearFecha = (fechaString: string) => {
    const [año, mes, dia] = fechaString.split("-").map(Number);
    return new Date(año, mes - 1, dia);
  };

  const eventosFiltrados = useMemo(() => {
    return eventos
      .filter((evento) => {
        if (
          marcaSeleccionada &&
          !eventoPerteneceAMarca(evento.marca, marcaSeleccionada)
        ) {
          return false;
        }

        if (filtros.año) {
          const añoEvento = parsearFecha(evento.fechaInicio).getFullYear();
          if (añoEvento !== filtros.año) {
            return false;
          }
        }

        if (filtros.mes) {
          const mesEvento = parsearFecha(evento.fechaInicio).getMonth() + 1;
          const mesSeleccionado = parseInt(filtros.mes);
          if (mesEvento !== mesSeleccionado) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // Ordenar por fecha de inicio
        const fechaA = parsearFecha(a.fechaInicio);
        const fechaB = parsearFecha(b.fechaInicio);
        const diff = fechaA.getTime() - fechaB.getTime();
        return ordenAscendente ? diff : -diff;
      });
  }, [eventos, filtros, marcaSeleccionada, ordenAscendente]);

  // Eventos solo filtrados por marca para calendarios (sin filtros de mes/año)
  const eventosParaCalendarios = useMemo(() => {
    return eventos.filter((evento) => {
      if (
        marcaSeleccionada &&
        !eventoPerteneceAMarca(evento.marca, marcaSeleccionada)
      ) {
        return false;
      }
      return true;
    });
  }, [eventos, marcaSeleccionada]);

  const calcularMetricasBriefs = useMemo(() => {
    const eventosConBrief = eventosFiltrados.filter((evento) => evento.brief);
    let totalLeads = 0;
    let totalPruebasManejo = 0;
    let totalCotizaciones = 0;
    let totalSolicitudesCredito = 0;
    let totalVentas = 0;
    let totalAsistentes = 0;

    eventosConBrief.forEach((evento) => {
      try {
        const observacionesBrief = JSON.parse(
          evento.brief?.observacionesEspeciales || "{}",
        );
        const evidencia = observacionesBrief.evidencia || {};
        const metricas = observacionesBrief.metricas || {};

        if (evidencia.leads) totalLeads += evidencia.leads;
        if (evidencia.asistentes) totalAsistentes += evidencia.asistentes;

        if (metricas.pruebasManejo)
          totalPruebasManejo += metricas.pruebasManejo;
        if (metricas.cotizaciones) totalCotizaciones += metricas.cotizaciones;
        if (metricas.solicitudesCredito)
          totalSolicitudesCredito += metricas.solicitudesCredito;
        if (metricas.ventas) totalVentas += metricas.ventas;
      } catch (error) {
        console.error("Error parsing métricas del evento:", evento.id, error);
      }
    });

    return {
      totalLeads,
      totalPruebasManejo,
      totalCotizaciones,
      totalSolicitudesCredito,
      totalVentas,
      totalAsistentes,
      eventosConBrief: eventosConBrief.length,
      tasaConversion:
        totalAsistentes > 0 ? (totalLeads / totalAsistentes) * 100 : 0,
    };
  }, [eventosFiltrados]);

  const manejarEditarEvento = (evento: Evento) => {
    setEventoEditando(evento);
    setVistaActual("editar");
  };

  const manejarEliminarEvento = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este evento?")) {
      await eliminarEvento(id);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const formatearFecha = (fecha: string) => {
    return parsearFecha(fecha).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getEstadoColor = (estado: Evento["estado"]) => {
    switch (estado) {
      case "Realizado":
        return "bg-green-100 text-green-800";
      case "Confirmado":
        return "bg-blue-100 text-blue-800";
      case "Por Suceder":
        return "bg-yellow-100 text-yellow-800";
      case "Prospectado":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
          <p className="text-gray-600">Cargando sistema...</p>
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

  const manejarCrearEvento = async (
    eventoData: Omit<Evento, "id" | "fechaCreacion" | "fechaModificacion">,
  ) => {
    await crearEvento(eventoData);
    setVistaActual("dashboard");
  };

  const manejarActualizarEvento = async (
    eventoData: Omit<Evento, "id" | "fechaCreacion" | "fechaModificacion">,
  ) => {
    if (eventoEditando) {
      await actualizarEvento(eventoEditando.id, eventoData);
      setEventoEditando(null);
      setVistaActual("dashboard");
    }
  };

  const manejarGuardarBrief = async (
    briefData: Omit<
      BriefEvento,
      "id" | "eventoId" | "fechaCreacion" | "fechaModificacion"
    >,
  ) => {
    if (eventoEditando) {
      await guardarBrief(eventoEditando.id, briefData);
      setVistaActual("dashboard");
    }
  };

  const manejarVerTemplate = (evento: Evento) => {
    setEventoEditando(evento);
    setVistaActual("template");
  };

  const manejarVerPreview = (evento: Evento) => {
    setEventoEditando(evento);
    setVistaActual("preview");
  };

  const manejarExportarBriefPDF = async () => {
    if (eventoEditando) {
      try {
        await exportarBriefPDF(eventoEditando.id, facturas);
      } catch (error) {
        console.error("Error al exportar PDF:", error);
      }
    }
  };

  const manejarEliminarBrief = async (evento: Evento) => {
    if (!evento.brief) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el brief del evento "${evento.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmacion) return;

    try {
      const exito = await eliminarBrief(evento.id);
      if (exito) {
        alert("Brief eliminado correctamente");
        await cargarEventos();
      } else {
        alert("Error al eliminar el brief");
      }
    } catch (error) {
      console.error("Error al eliminar brief:", error);
      alert("Error al eliminar el brief");
    }
  };

  const toggleExpandRow = (eventoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventoId)) {
      newExpanded.delete(eventoId);
    } else {
      newExpanded.add(eventoId);
    }
    setExpandedRows(newExpanded);
  };

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
                <h1 className="text-xl font-semibold text-gray-900">SGPME</h1>
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-14">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center px-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push("/estrategia")}
              className="flex items-center px-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              🎯 Estrategia
            </button>
            <button
              onClick={() => router.push("/facturas")}
              className="flex items-center px-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              📋 Facturas
            </button>
            <button className="flex items-center px-1 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              🎉 Eventos
            </button>
            <button
              onClick={() => router.push("/metricas")}
              className="flex items-center px-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              📈 Métricas
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {vistaActual === "dashboard" && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Gestión de Eventos
                  </h2>
                  <p className="text-gray-600">
                    {usuario?.tipo === "auditor"
                      ? "Consulta y auditoría de eventos corporativos"
                      : "Planificación, seguimiento y control de eventos"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {tienePermiso("proyecciones", "crear") && (
                    <button
                      onClick={() => setVistaActual("nuevo")}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      🎉 Nuevo Evento
                    </button>
                  )}
                  {usuario?.tipo === "auditor" && (
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        👁️ Modo Auditor
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de Calendarios - MOVIDA ARRIBA */}
            <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div className="px-6 py-4 bg-linear-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  📅 Vistas de Calendario
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Explora los eventos en diferentes formatos de calendario
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() =>
                      setCalendarioAbierto(
                        calendarioAbierto === "mensual" ? null : "mensual",
                      )
                    }
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          🗓️ Calendario Mensual
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Vista detallada por mes
                        </p>
                      </div>
                      <span className="text-green-600 text-lg">
                        {calendarioAbierto === "mensual" ? "▼" : "▶"}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setCalendarioAbierto(
                        calendarioAbierto === "trimestral"
                          ? null
                          : "trimestral",
                      )
                    }
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          📊 Calendario Trimestral
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Vista por trimestres
                        </p>
                      </div>
                      <span className="text-blue-600 text-lg">
                        {calendarioAbierto === "trimestral" ? "▼" : "▶"}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setCalendarioAbierto(
                        calendarioAbierto === "anual" ? null : "anual",
                      )
                    }
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          📅 Calendario Anual
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Vista completa del año
                        </p>
                      </div>
                      <span className="text-purple-600 text-lg">
                        {calendarioAbierto === "anual" ? "▼" : "▶"}
                      </span>
                    </div>
                  </button>
                </div>
                {calendarioAbierto === "mensual" && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <CalendarioMensual
                      eventos={eventosParaCalendarios}
                      facturas={facturas}
                      onEventoClick={(evento) => {
                        setEventoEditando(evento);
                        setVistaActual("editar");
                      }}
                      onCrearBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento) {
                          setEventoEditando(evento);
                          setVistaActual("brief");
                        }
                      }}
                      onVerBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento && evento.brief) {
                          setEventoEditando(evento);
                          setVistaActual("template");
                        }
                      }}
                    />
                  </div>
                )}

                {calendarioAbierto === "trimestral" && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <CalendarioTrimestral
                      eventos={eventosParaCalendarios}
                      facturas={facturas}
                      onEventoClick={(evento) => {
                        setEventoEditando(evento);
                        setVistaActual("editar");
                      }}
                      onCrearBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento) {
                          setEventoEditando(evento);
                          setVistaActual("brief");
                        }
                      }}
                      onVerBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento && evento.brief) {
                          setEventoEditando(evento);
                          setVistaActual("template");
                        }
                      }}
                    />
                  </div>
                )}

                {calendarioAbierto === "anual" && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                    <CalendarioAnual
                      eventos={eventosParaCalendarios}
                      facturas={facturas}
                      onEventoClick={(evento) => {
                        setEventoEditando(evento);
                        setVistaActual("editar");
                      }}
                      onCrearBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento) {
                          setEventoEditando(evento);
                          setVistaActual("brief");
                        }
                      }}
                      onVerBrief={(eventoId) => {
                        const evento = eventos.find((e) => e.id === eventoId);
                        if (evento && evento.brief) {
                          setEventoEditando(evento);
                          setVistaActual("template");
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Filtros */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Filtros
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <select
                    value={filtros.año ?? ""}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        año:
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
                  >
                    <option value="">Todos</option>
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - 2 + i,
                    ).map((año) => (
                      <option key={año} value={año}>
                        {año}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes
                  </label>
                  <select
                    value={filtros.mes}
                    onChange={(e) =>
                      setFiltros({ ...filtros, mes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
              </div>
            </div>
            {calcularMetricasBriefs.eventosConBrief > 0 && (
              <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                <div className="px-6 py-4 bg-linear-to-r from-green-50 to-blue-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    📊 Resumen de Métricas
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {calcularMetricasBriefs.eventosConBrief} eventos con brief
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Consolidado de todas las métricas de eventos con brief
                    completado
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="text-center">
                        <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">
                          Leads Generados
                        </p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">
                          {calcularMetricasBriefs.totalLeads.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="text-center">
                        <p className="text-green-600 text-xs font-medium uppercase tracking-wide">
                          Pruebas Manejo
                        </p>
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          {calcularMetricasBriefs.totalPruebasManejo.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                      <div className="text-center">
                        <p className="text-yellow-600 text-xs font-medium uppercase tracking-wide">
                          Cotizaciones
                        </p>
                        <p className="text-2xl font-bold text-yellow-700 mt-1">
                          {calcularMetricasBriefs.totalCotizaciones.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                      <div className="text-center">
                        <p className="text-indigo-600 text-xs font-medium uppercase tracking-wide">
                          Sol. Crédito
                        </p>
                        <p className="text-2xl font-bold text-indigo-700 mt-1">
                          {calcularMetricasBriefs.totalSolicitudesCredito.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                      <div className="text-center">
                        <p className="text-red-600 text-xs font-medium uppercase tracking-wide">
                          Ventas
                        </p>
                        <p className="text-2xl font-bold text-red-700 mt-1">
                          {calcularMetricasBriefs.totalVentas.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <div className="text-center">
                        <p className="text-purple-600 text-xs font-medium uppercase tracking-wide">
                          Conv. Rate
                        </p>
                        <p className="text-2xl font-bold text-purple-700 mt-1">
                          {calcularMetricasBriefs.tasaConversion.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-700">
                          👥{" "}
                          {calcularMetricasBriefs.totalAsistentes.toLocaleString()}{" "}
                          Asistentes Totales
                        </span>
                      </div>
                      <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                        <span className="font-medium text-blue-700">
                          📈{" "}
                          {calcularMetricasBriefs.totalLeads.toLocaleString()}{" "}
                          Leads de{" "}
                          {calcularMetricasBriefs.totalAsistentes.toLocaleString()}{" "}
                          asistentes
                        </span>
                      </div>
                      {calcularMetricasBriefs.totalVentas > 0 && (
                        <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                          <span className="font-medium text-green-700">
                            💰{" "}
                            {(
                              (calcularMetricasBriefs.totalVentas /
                                calcularMetricasBriefs.totalLeads) *
                              100
                            ).toFixed(1)}
                            % Ventas/Leads
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-bold">
                        🎉
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">
                        Total Eventos
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {estadisticas.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-bold">
                        ✅
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">
                        Realizados
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {estadisticas.realizados}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-bold">
                        📋
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">
                        Confirmados
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {estadisticas.confirmados}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-bold">
                        💰
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-700 truncate">
                        Presupuesto Total
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {formatearMonto(estadisticas.presupuestoTotal)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden bg-white rounded-lg shadow mb-6 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Filtros (Duplicado)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filtros.estado}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        estado: e.target.value as FiltrosEvento["estado"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Realizado">Realizados</option>
                    <option value="Confirmado">Confirmados</option>
                    <option value="Por Suceder">Por Suceder</option>
                    <option value="Prospectado">Prospectados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <select
                    value={filtros.año ?? ""}
                    onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        año:
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes
                  </label>
                  <select
                    value={filtros.mes}
                    onChange={(e) =>
                      setFiltros({ ...filtros, mes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div className="px-6 py-4 bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      📅 Lista de Eventos
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {eventosFiltrados.length} eventos
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Vista detallada de todos los eventos con opciones de
                      gestión
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      <span className="font-medium text-green-800">
                        📋 {eventosFiltrados.filter((e) => e.brief).length}{" "}
                        Briefs Completados
                      </span>
                    </div>
                    <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                      <span className="font-medium text-orange-800">
                        ⏳ {eventosFiltrados.filter((e) => !e.brief).length}{" "}
                        Briefs Pendientes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>Fecha</span>
                          <button
                            onClick={() => setOrdenAscendente(!ordenAscendente)}
                            className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                            title={
                              ordenAscendente
                                ? "Ordenar de reciente a antiguo"
                                : "Ordenar de antiguo a reciente"
                            }
                          >
                            {ordenAscendente ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 13l-5 5m0 0l-5-5m5 5V6"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eventosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="text-gray-500 text-6xl mb-4">🎉</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay eventos
                          </h3>
                          <p className="text-gray-500">
                            Crea tu primer evento para comenzar.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      eventosFiltrados.map((evento) => (
                        <React.Fragment key={evento.id}>
                          <tr
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleExpandRow(evento.id)}
                          >
                            <td className="px-6 py-4 text-center">
                              <button className="text-gray-400 hover:text-gray-600">
                                {expandedRows.has(evento.id) ? "▼" : "▶"}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {evento.nombre}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {evento.tipoEvento}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatearMarca(evento.marca)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatearFecha(evento.fechaInicio)}
                              {evento.fechaFin &&
                                evento.fechaFin !== evento.fechaInicio && (
                                  <div className="text-xs text-gray-500">
                                    hasta {formatearFecha(evento.fechaFin)}
                                  </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={evento.estado}
                                onClick={(e) => e.stopPropagation()}
                                onChange={async (e) => {
                                  e.stopPropagation();
                                  const nuevoEstado = e.target
                                    .value as Evento["estado"];
                                  try {
                                    await actualizarEvento(evento.id, {
                                      estado: nuevoEstado,
                                    });
                                    await cargarEventos();
                                  } catch (error) {
                                    console.error(
                                      "Error actualizando estado:",
                                      error,
                                    );
                                    alert(
                                      "Error al actualizar el estado del evento",
                                    );
                                  }
                                }}
                                className={`px-2 py-1 text-xs font-semibold rounded-full border-none cursor-pointer ${getEstadoColor(
                                  evento.estado,
                                )}`}
                                disabled={usuario?.tipo === "auditor"}
                              >
                                <option value="Prospectado">Prospectado</option>
                                <option value="Confirmado">Confirmado</option>
                                <option value="Por Suceder">Por Suceder</option>
                                <option value="Realizado">Realizado</option>
                              </select>
                            </td>
                          </tr>
                          {expandedRows.has(evento.id) && (
                            <tr className="bg-gray-50">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 flex items-center">
                                      📋 Información General
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">
                                          Responsable:
                                        </span>{" "}
                                        <span className="text-gray-900">
                                          {evento.responsable}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">
                                          Ubicación:
                                        </span>{" "}
                                        <span className="text-gray-900">
                                          {evento.ubicacion}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">
                                          Presupuesto:
                                        </span>{" "}
                                        <span className="text-gray-900 font-medium">
                                          {formatearMonto(
                                            evento.presupuestoEstimado,
                                          )}
                                        </span>
                                      </div>
                                      {evento.presupuestoReal && (
                                        <div>
                                          <span className="text-gray-600">
                                            Real:
                                          </span>{" "}
                                          <span className="text-gray-900 font-medium">
                                            {formatearMonto(
                                              evento.presupuestoReal,
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 flex items-center">
                                      📄 Brief del Evento
                                    </h4>
                                    <div className="space-y-2">
                                      {evento.brief ? (
                                        <div>
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mb-2">
                                            ✓ Brief Completado
                                          </span>
                                          <div className="flex flex-col gap-2">
                                            {usuario.tipo === "auditor" ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  manejarVerTemplate(evento);
                                                }}
                                                className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                                              >
                                                📋 Ver Brief Completo
                                              </button>
                                            ) : (
                                              <div className="flex gap-2 flex-wrap">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEventoEditando(evento);
                                                    setVistaActual("brief");
                                                  }}
                                                  className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium transition-colors"
                                                >
                                                  ✏️ Editar Brief
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    manejarVerPreview(evento);
                                                  }}
                                                  className="px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium transition-colors"
                                                >
                                                  👁️ Preview
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    manejarEliminarBrief(
                                                      evento,
                                                    );
                                                  }}
                                                  className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors"
                                                >
                                                  🗑️ Borrar
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-600 mb-2">
                                            ⏳ Brief Pendiente
                                          </span>
                                          {(usuario.tipo === "administrador" ||
                                            usuario.tipo === "coordinador") && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEventoEditando(evento);
                                                setVistaActual("brief");
                                              }}
                                              className="px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors block"
                                            >
                                              ➕ Crear Brief
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900 flex items-center">
                                      ⚙️ Acciones
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                      {tienePermiso(
                                        "proyecciones",
                                        "editar",
                                      ) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            manejarEditarEvento(evento);
                                          }}
                                          className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors text-left"
                                        >
                                          ✏️ Editar Evento
                                        </button>
                                      )}
                                      {tienePermiso(
                                        "proyecciones",
                                        "eliminar",
                                      ) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            manejarEliminarEvento(evento.id);
                                          }}
                                          className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors text-left"
                                        >
                                          🗑️ Eliminar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección de Briefs - Siempre visible */}
            <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
              <div className="px-6 py-4 bg-linear-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      ⭐ Briefs
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFiltroBriefs("disponibles")}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          filtroBriefs === "disponibles"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Cerrados (
                        {eventosFiltrados.filter((e) => e.brief).length})
                      </button>
                      <button
                        onClick={() => setFiltroBriefs("pendientes")}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          filtroBriefs === "pendientes"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Pendientes (
                        {eventosFiltrados.filter((e) => !e.brief).length})
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {filtroBriefs === "disponibles"
                    ? usuario?.tipo === "auditor"
                      ? "Haz clic en cualquier brief para ver la documentación completa"
                      : "Explora los briefs completados o crea vista previa antes de finalizar"
                    : "Eventos que aún no tienen brief creado"}
                </p>
              </div>

              <div className="p-6">
                {filtroBriefs === "disponibles" ? (
                  eventosFiltrados.filter((e) => e.brief).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-2">📋</div>
                      <p>No hay briefs cerrados</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {eventosFiltrados
                        .filter((e) => e.brief)
                        .slice(0, 6)
                        .map((evento) => {
                          let briefData = null;
                          try {
                            const observaciones = JSON.parse(
                              evento.brief?.observacionesEspeciales || "{}",
                            );
                            briefData = observaciones.evidencia;
                          } catch (error) {
                            console.error("Error parsing brief:", error);
                          }

                          return (
                            <div
                              key={evento.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                    {evento.nombre}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                      {formatearMarca(evento.marca)}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {parsearFecha(
                                        evento.fechaInicio,
                                      ).toLocaleDateString("es-MX")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {briefData &&
                                (() => {
                                  const conversionRate =
                                    (briefData.leads / briefData.asistentes) *
                                    100;
                                  const getBarColor = (rate: number) => {
                                    if (rate >= 50)
                                      return "bg-gradient-to-r from-green-400 to-green-500";
                                    if (rate >= 30)
                                      return "bg-gradient-to-r from-amber-400 to-amber-500";
                                    if (rate >= 15)
                                      return "bg-gradient-to-r from-orange-400 to-orange-500";
                                    return "bg-gradient-to-r from-red-400 to-red-500";
                                  };

                                  return (
                                    <div className="mb-3">
                                      <div className="flex justify-between text-xs text-gray-600 mb-2">
                                        <span>
                                          👥{" "}
                                          {briefData.asistentes?.toLocaleString()}{" "}
                                          asistentes
                                        </span>
                                        <span>📊 {briefData.leads} leads</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                        <div
                                          className={`${getBarColor(
                                            conversionRate,
                                          )} h-1.5 rounded-full transition-all duration-300`}
                                          style={{
                                            width: `${Math.min(
                                              conversionRate,
                                              100,
                                            )}%`,
                                          }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {conversionRate.toFixed(1)}% conversión
                                      </span>
                                    </div>
                                  );
                                })()}

                              <div className="flex gap-2 mt-3">
                                {usuario?.tipo === "auditor" ? (
                                  <button
                                    onClick={() => manejarVerTemplate(evento)}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    📋 Ver Brief Completo
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => manejarVerPreview(evento)}
                                      className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 text-xs rounded-md hover:bg-purple-200 transition-colors"
                                    >
                                      👁️ Preview
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEventoEditando(evento);
                                        setVistaActual("brief");
                                      }}
                                      className="px-3 py-2 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 transition-colors"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() =>
                                        manejarEliminarBrief(evento)
                                      }
                                      className="px-3 py-2 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                      title="Borrar Brief"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )
                ) : /* Vista de Pendientes */
                eventosFiltrados.filter((e) => !e.brief).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p>Todos los eventos tienen brief</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventosFiltrados
                      .filter((e) => !e.brief)
                      .slice(0, 10)
                      .map((evento) => (
                        <div
                          key={evento.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">
                              {evento.nombre}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="font-medium">
                                  Responsable:
                                </span>
                                {evento.responsable || "No especificado"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Fecha:</span>
                                {parsearFecha(
                                  evento.fechaInicio,
                                ).toLocaleDateString("es-MX")}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEventoEditando(evento);
                              setVistaActual("brief");
                            }}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            📋 Crear Brief
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {vistaActual === "calendario-trimestral" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setVistaActual("dashboard")}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Volver al Dashboard
              </button>
            </div>
            <CalendarioTrimestral
              eventos={eventosFiltrados}
              onEventoClick={(evento) => {
                setEventoEditando(evento);
                setVistaActual("editar");
              }}
              onCrearBrief={(eventoId) => {
                const evento = eventos.find((e) => e.id === eventoId);
                if (evento) {
                  setEventoEditando(evento);
                  setVistaActual("brief");
                }
              }}
              onVerBrief={(eventoId) => {
                const evento = eventos.find((e) => e.id === eventoId);
                if (evento && evento.brief) {
                  setEventoEditando(evento);
                  setVistaActual("template");
                }
              }}
            />
          </div>
        )}

        {vistaActual === "calendario-anual" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setVistaActual("dashboard")}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Volver al Dashboard
              </button>
            </div>
            <CalendarioAnual
              eventos={eventosFiltrados}
              onEventoClick={(evento) => {
                setEventoEditando(evento);
                setVistaActual("editar");
              }}
              onCrearBrief={(eventoId) => {
                const evento = eventos.find((e) => e.id === eventoId);
                if (evento) {
                  setEventoEditando(evento);
                  setVistaActual("brief");
                }
              }}
              onVerBrief={(eventoId) => {
                const evento = eventos.find((e) => e.id === eventoId);
                if (evento && evento.brief) {
                  setEventoEditando(evento);
                  setVistaActual("template");
                }
              }}
            />
          </div>
        )}

        {vistaActual === "nuevo" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setVistaActual("dashboard")}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Volver al Dashboard
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Crear Nuevo Evento
              </h2>
              <p className="text-gray-600 mt-2">
                Completa la información para registrar un nuevo evento
              </p>
            </div>
            <FormularioEvento
              onSubmit={manejarCrearEvento}
              onCancel={() => setVistaActual("dashboard")}
              loading={loading}
            />
          </div>
        )}

        {vistaActual === "editar" && eventoEditando && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setVistaActual("dashboard")}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Volver al Dashboard
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Editar Evento
              </h2>
              <p className="text-gray-600 mt-2">
                Modifica la información del evento: {eventoEditando.nombre}
              </p>
            </div>
            <FormularioEvento
              eventoInicial={eventoEditando}
              onSubmit={manejarActualizarEvento}
              onCancel={() => {
                setEventoEditando(null);
                setVistaActual("dashboard");
              }}
              loading={loading}
            />
          </div>
        )}

        {vistaActual === "brief" && eventoEditando && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setVistaActual("dashboard")}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Volver al Dashboard
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Brief del Evento: {eventoEditando.nombre}
              </h2>
              <p className="text-gray-600 mt-2">
                Documenta la evidencia y resultados del evento
              </p>
            </div>
            <FormularioBrief
              evento={eventoEditando}
              briefInicial={eventoEditando.brief}
              onSubmit={manejarGuardarBrief}
              onCancel={() => setVistaActual("dashboard")}
              loading={loading}
            />
          </div>
        )}
        {vistaActual === "template" &&
          eventoEditando &&
          eventoEditando.brief && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver al Dashboard
                </button>
              </div>
              <BriefTemplate
                evento={eventoEditando}
                brief={eventoEditando.brief}
                onDescargarPDF={manejarExportarBriefPDF}
              />
            </div>
          )}
        {vistaActual === "preview" &&
          eventoEditando &&
          eventoEditando.brief && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver al Dashboard
                </button>
              </div>
              <BriefTemplate
                evento={eventoEditando}
                brief={eventoEditando.brief}
                onDescargarPDF={manejarExportarBriefPDF}
                isPreview={true}
              />
            </div>
          )}
      </main>
      <ConfigSidebar
        isOpen={configSidebarOpen}
        onClose={() => setConfigSidebarOpen(false)}
        onNavigate={handleMenuClick}
      />
      {activeConfigView === "accesos" && (
        <GestionAccesos onClose={() => setActiveConfigView("")} />
      )}

      {/* Sidebar para coordinadores y administradores */}
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
          {activeConfigView === "configuracion" && (
            <PopupConfiguracion
              isOpen={true}
              onClose={() => setActiveConfigView("")}
              onRefresh={() => window.location.reload()}
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
    </div>
  );
}
