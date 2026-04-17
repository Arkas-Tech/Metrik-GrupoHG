"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuthUnified";
import { useEventos } from "@/hooks/useEventos";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { usePeriodo } from "@/contexts/PeriodoContext";
import FormularioEvento from "@/components/FormularioEvento";
import FormularioBrief from "@/components/FormularioBrief";
import BriefTemplate from "@/components/BriefTemplate";
import CalendarioTrimestral from "@/components/CalendarioTrimestral";
import CalendarioAnual from "@/components/CalendarioAnual";
import CalendarioMensual from "@/components/CalendarioMensual";
import UbicacionDisplay from "@/components/UbicacionDisplay";
import ModalConfirmacionEvento from "@/components/ModalConfirmacionEvento";
import { Evento, FiltrosEvento, BriefEvento } from "@/types";
import {
  eventoPerteneceAMarca,
  eventoPerteneceAMarcas,
  formatearMarca,
  obtenerArrayMarcas,
} from "@/lib/evento-utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import FiltroPeriodoGlobal from "@/components/FiltroPeriodoGlobal";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import { showToast } from "@/lib/toast";
import Image from "next/image";

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
    exportarEventoPDF,
    cargarBriefCompleto,
  } = useEventos();
  const { facturas } = useFacturas();
  const { marcaSeleccionada, marcasPermitidas } = useMarcaGlobal();
  const { mes: periodoMes, año: periodoAño } = usePeriodo();

  // Sincronizar filtros de eventos con el período global del header
  useEffect(() => {
    setFiltros((prev) => ({
      ...prev,
      mes: String(periodoMes),
      año: periodoAño,
    }));
  }, [periodoMes, periodoAño]);

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
    mes: String(periodoMes),
    año: periodoAño,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [activeConfigView, setActiveConfigView] = useState("");
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [filtroBriefs, setFiltroBriefs] = useState<
    "disponibles" | "pendientes"
  >("disponibles");
  const [briefMarcaSeleccionada, setBriefMarcaSeleccionada] = useState<
    string | undefined
  >(undefined);
  const [eventoParaConfirmar, setEventoParaConfirmar] = useState<Evento | null>(
    null,
  );

  // Navegación con soporte para botón atrás del navegador
  const navegarA = (
    vista:
      | "dashboard"
      | "calendario-trimestral"
      | "calendario-anual"
      | "calendario-mensual"
      | "nuevo"
      | "editar"
      | "brief"
      | "template"
      | "preview",
  ) => {
    window.history.pushState({ vista }, "");
    setVistaActual(vista);
  };

  useEffect(() => {
    window.history.replaceState({ vista: "dashboard" }, "");

    const handlePopState = (e: PopStateEvent) => {
      setVistaActual((e.state?.vista as typeof vistaActual) ?? "dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const parsearFecha = (fechaString: string) => {
    const [año, mes, dia] = fechaString.split("-").map(Number);
    return new Date(año, mes - 1, dia);
  };

  const eventosFiltrados = useMemo(() => {
    return eventos
      .filter((evento) => {
        // Filtrar por marca: si hay selección específica usar esa, sino por marcas permitidas
        if (marcaSeleccionada) {
          if (!eventoPerteneceAMarca(evento.marca, marcaSeleccionada))
            return false;
        } else {
          if (!eventoPerteneceAMarcas(evento.marca, marcasPermitidas))
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
  }, [eventos, filtros, marcaSeleccionada, marcasPermitidas, ordenAscendente]);

  // Eventos solo filtrados por marca para calendarios (sin filtros de mes/año)
  const eventosParaCalendarios = useMemo(() => {
    return eventos.filter((evento) => {
      if (marcaSeleccionada) {
        return eventoPerteneceAMarca(evento.marca, marcaSeleccionada);
      }
      return eventoPerteneceAMarcas(evento.marca, marcasPermitidas);
    });
  }, [eventos, marcaSeleccionada, marcasPermitidas]);

  const calcularMetricasBriefs = useMemo(() => {
    const eventosConBrief = eventosFiltrados.filter(
      (evento) => evento.briefs && evento.briefs.length > 0,
    );
    let totalLeads = 0;
    let totalPruebasManejo = 0;
    let totalCotizaciones = 0;
    let totalSolicitudesCredito = 0;
    let totalVentas = 0;
    let totalAsistentes = 0;

    eventosConBrief.forEach((evento) => {
      (evento.briefs || []).forEach((brief) => {
        try {
          const observacionesBrief = JSON.parse(
            brief.observacionesEspeciales || "{}",
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
    navegarA("editar");
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
      const resultado = await guardarBrief(eventoEditando.id, briefData);
      if (resultado) {
        setVistaActual("dashboard");
      } else {
        showToast(
          "Error al guardar el reporte. Por favor intenta de nuevo.",
          "error",
        );
      }
    }
  };

  const manejarVerTemplate = async (evento: Evento, marca?: string) => {
    const eventoConBrief = await cargarBriefCompleto(evento.id, marca);
    setBriefMarcaSeleccionada(marca);
    setEventoEditando(eventoConBrief || evento);
    navegarA("template");
  };

  const manejarVerPreview = async (evento: Evento, marca?: string) => {
    const eventoConBrief = await cargarBriefCompleto(evento.id, marca);
    setBriefMarcaSeleccionada(marca);
    setEventoEditando(eventoConBrief || evento);
    navegarA("preview");
  };

  const manejarExportarBriefPDF = async () => {
    if (eventoEditando) {
      try {
        await exportarBriefPDF(
          eventoEditando.id,
          facturas,
          briefMarcaSeleccionada,
        );
      } catch (error) {
        console.error("Error al exportar PDF:", error);
      }
    }
  };

  const manejarEliminarBrief = async (evento: Evento, marca?: string) => {
    if (!evento.briefs?.length) return;

    const agenciaLabel = marca ? ` de la agencia "${marca}"` : "";
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el reporte${agenciaLabel} del evento "${evento.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmacion) return;

    try {
      const exito = await eliminarBrief(evento.id, marca);
      if (exito) {
        showToast("Reporte eliminado correctamente", "success");
        await cargarEventos();
      } else {
        showToast("Error al eliminar el reporte", "error");
      }
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
      showToast("Error al eliminar el reporte", "error");
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
        <div className="ml-auto pr-4 shrink-0">
          <FiltroPeriodoGlobal />
        </div>
      </header>

      <Sidebar
        usuario={usuario}
        paginaActiva="eventos"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
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
                        onClick={() => navegarA("nuevo")}
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
                          navegarA("editar");
                        }}
                        onCrearBrief={(eventoId) => {
                          const evento = eventos.find((e) => e.id === eventoId);
                          if (evento) {
                            setEventoEditando(evento);
                            navegarA("brief");
                          }
                        }}
                        onVerBrief={async (eventoId) => {
                          const eventoConBrief =
                            await cargarBriefCompleto(eventoId);
                          if (eventoConBrief && eventoConBrief.briefs?.length) {
                            setEventoEditando(eventoConBrief);
                            navegarA("template");
                          }
                        }}
                        onDescargarEventoPDF={(eventoId) =>
                          exportarEventoPDF(eventoId)
                        }
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
                          navegarA("editar");
                        }}
                        onCrearBrief={(eventoId) => {
                          const evento = eventos.find((e) => e.id === eventoId);
                          if (evento) {
                            setEventoEditando(evento);
                            navegarA("brief");
                          }
                        }}
                        onVerBrief={async (eventoId) => {
                          const eventoConBrief =
                            await cargarBriefCompleto(eventoId);
                          if (eventoConBrief && eventoConBrief.briefs?.length) {
                            setEventoEditando(eventoConBrief);
                            navegarA("template");
                          }
                        }}
                        onDescargarEventoPDF={(eventoId) =>
                          exportarEventoPDF(eventoId)
                        }
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
                          navegarA("editar");
                        }}
                        onCrearBrief={(eventoId) => {
                          const evento = eventos.find((e) => e.id === eventoId);
                          if (evento) {
                            setEventoEditando(evento);
                            navegarA("brief");
                          }
                        }}
                        onVerBrief={async (eventoId) => {
                          const eventoConBrief =
                            await cargarBriefCompleto(eventoId);
                          if (eventoConBrief && eventoConBrief.briefs?.length) {
                            setEventoEditando(eventoConBrief);
                            navegarA("template");
                          }
                        }}
                        onDescargarEventoPDF={(eventoId) =>
                          exportarEventoPDF(eventoId)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de Filtros — Mes y Año controlados por el filtro global del header */}
              <div className="bg-white rounded-lg shadow mb-6 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Filtros
                </h3>
                <p className="text-xs text-blue-600 mb-4">
                  📅 Mes y año controlados por el filtro global del header
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Año
                    </label>
                    <div
                      title="Controlado por el filtro de período del header"
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                    >
                      {filtros.año ?? "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mes
                    </label>
                    <div
                      title="Controlado por el filtro de período del header"
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                    >
                      {[
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
                      ][parseInt(filtros.mes || "0") - 1] || "—"}
                    </div>
                  </div>
                </div>
              </div>
              {calcularMetricasBriefs.eventosConBrief > 0 && (
                <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                  <div className="px-6 py-4 bg-linear-to-r from-green-50 to-blue-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      📊 Resumen de Métricas
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {calcularMetricasBriefs.eventosConBrief} eventos con
                        reporte
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Consolidado de todas las métricas de eventos con reporte
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
                          📋{" "}
                          {eventosFiltrados.reduce(
                            (sum, e) => sum + (e.briefs?.length || 0),
                            0,
                          )}{" "}
                          Reportes Completados
                        </span>
                      </div>
                      <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                        <span className="font-medium text-orange-800">
                          ⏳{" "}
                          {eventosFiltrados.reduce((sum, e) => {
                            const totalMarcas = obtenerArrayMarcas(
                              e.marca,
                            ).length;
                            const briefsHechos = e.briefs?.length || 0;
                            return (
                              sum + Math.max(0, totalMarcas - briefsHechos)
                            );
                          }, 0)}{" "}
                          Reportes Pendientes
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
                              onClick={() =>
                                setOrdenAscendente(!ordenAscendente)
                              }
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
                            <div className="text-gray-500 text-6xl mb-4">
                              🎉
                            </div>
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
                                    // Solo admins pueden confirmar
                                    if (nuevoEstado === "Confirmado") {
                                      if (!isAdmin) {
                                        showToast(
                                          "Solo los administradores pueden confirmar un evento",
                                          "error",
                                        );
                                        e.target.value = evento.estado;
                                        return;
                                      }
                                      setEventoParaConfirmar(evento);
                                      return;
                                    }
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
                                      showToast(
                                        "Error al actualizar el estado del evento",
                                        "error",
                                      );
                                    }
                                  }}
                                  className={`px-2 py-1 text-xs font-semibold rounded-full border-none cursor-pointer ${getEstadoColor(
                                    evento.estado,
                                  )}`}
                                  disabled={usuario?.tipo === "auditor"}
                                >
                                  <option value="Prospectado">
                                    Prospectado
                                  </option>
                                  <option value="Confirmado">Confirmado</option>
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
                                          {(() => {
                                            try {
                                              const p = JSON.parse(
                                                evento.ubicacion || "",
                                              );
                                              if (
                                                p &&
                                                typeof p.lat === "number"
                                              ) {
                                                return (
                                                  <UbicacionDisplay value={p} />
                                                );
                                              }
                                            } catch {}
                                            return (
                                              <span className="text-gray-900">
                                                {evento.ubicacion ||
                                                  "Sin ubicación"}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                        {evento.numeroAutos != null &&
                                          evento.numeroAutos > 0 && (
                                            <div>
                                              <span className="text-gray-600">
                                                Número de Autos:
                                              </span>{" "}
                                              <span className="text-gray-900 font-medium">
                                                {new Intl.NumberFormat(
                                                  "es-MX",
                                                ).format(evento.numeroAutos)}
                                              </span>
                                            </div>
                                          )}
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
                                        {/* Datos de confirmación */}
                                        {evento.estado === "Confirmado" &&
                                          evento.datosConfirmacion && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                                ✅ Detalles de confirmación
                                              </p>
                                              <div>
                                                <span className="text-gray-600">
                                                  Asesores:
                                                </span>{" "}
                                                <span className="text-gray-900 font-medium">
                                                  {evento.datosConfirmacion
                                                    .asesores
                                                    ? "Sí"
                                                    : "No"}
                                                </span>
                                              </div>
                                              {evento.datosConfirmacion
                                                .asesores && (
                                                <>
                                                  {evento.datosConfirmacion
                                                    .asesoresAsignados !=
                                                    null &&
                                                    evento.datosConfirmacion
                                                      .asesoresAsignados >
                                                      0 && (
                                                      <div>
                                                        <span className="text-gray-600">
                                                          Asesores asignados:
                                                        </span>{" "}
                                                        <span className="text-gray-900 font-medium">
                                                          {
                                                            evento
                                                              .datosConfirmacion
                                                              .asesoresAsignados
                                                          }
                                                        </span>
                                                      </div>
                                                    )}
                                                  {evento.datosConfirmacion
                                                    .objetivos && (
                                                    <div className="space-y-0.5">
                                                      <p className="text-gray-600 text-xs font-medium">
                                                        Objetivos:
                                                      </p>
                                                      {evento.datosConfirmacion
                                                        .objetivos.leads !=
                                                        null &&
                                                        evento.datosConfirmacion
                                                          .objetivos.leads >
                                                          0 && (
                                                          <div className="pl-2 text-xs">
                                                            <span className="text-gray-500">
                                                              Leads:
                                                            </span>{" "}
                                                            <span className="font-medium text-gray-900">
                                                              {
                                                                evento
                                                                  .datosConfirmacion
                                                                  .objetivos
                                                                  .leads
                                                              }
                                                            </span>
                                                          </div>
                                                        )}
                                                      {evento.datosConfirmacion
                                                        .objetivos
                                                        .pruebasManejo !=
                                                        null &&
                                                        evento.datosConfirmacion
                                                          .objetivos
                                                          .pruebasManejo >
                                                          0 && (
                                                          <div className="pl-2 text-xs">
                                                            <span className="text-gray-500">
                                                              Pruebas de manejo:
                                                            </span>{" "}
                                                            <span className="font-medium text-gray-900">
                                                              {
                                                                evento
                                                                  .datosConfirmacion
                                                                  .objetivos
                                                                  .pruebasManejo
                                                              }
                                                            </span>
                                                          </div>
                                                        )}
                                                      {evento.datosConfirmacion
                                                        .objetivos
                                                        .solicitudesCredito !=
                                                        null &&
                                                        evento.datosConfirmacion
                                                          .objetivos
                                                          .solicitudesCredito >
                                                          0 && (
                                                          <div className="pl-2 text-xs">
                                                            <span className="text-gray-500">
                                                              Sol. de crédito:
                                                            </span>{" "}
                                                            <span className="font-medium text-gray-900">
                                                              {
                                                                evento
                                                                  .datosConfirmacion
                                                                  .objetivos
                                                                  .solicitudesCredito
                                                              }
                                                            </span>
                                                          </div>
                                                        )}
                                                      {evento.datosConfirmacion
                                                        .objetivos.ventas !=
                                                        null &&
                                                        evento.datosConfirmacion
                                                          .objetivos.ventas >
                                                          0 && (
                                                          <div className="pl-2 text-xs">
                                                            <span className="text-gray-500">
                                                              Ventas:
                                                            </span>{" "}
                                                            <span className="font-medium text-gray-900">
                                                              {
                                                                evento
                                                                  .datosConfirmacion
                                                                  .objetivos
                                                                  .ventas
                                                              }
                                                            </span>
                                                          </div>
                                                        )}
                                                    </div>
                                                  )}
                                                </>
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
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            exportarEventoPDF(evento.id);
                                          }}
                                          className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium transition-colors text-left"
                                        >
                                          ⬇️ Descargar PDF
                                        </button>
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
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-gray-900 flex items-center">
                                        📄 Reportes del Evento
                                        {(() => {
                                          const marcas = obtenerArrayMarcas(
                                            evento.marca,
                                          );
                                          const hechos =
                                            evento.briefs?.length || 0;
                                          return (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({hechos}/{marcas.length})
                                            </span>
                                          );
                                        })()}
                                      </h4>
                                      <div className="space-y-2">
                                        {obtenerArrayMarcas(evento.marca).map(
                                          (marca) => {
                                            const briefDeAgencia =
                                              evento.briefs?.find(
                                                (b) => b.marca === marca,
                                              );
                                            return (
                                              <div
                                                key={marca}
                                                className="border border-gray-100 rounded p-2"
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-medium text-gray-700">
                                                    {marca}
                                                  </span>
                                                  {briefDeAgencia ? (
                                                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                      ✓ Completado
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-600">
                                                      ⏳ Pendiente
                                                    </span>
                                                  )}
                                                </div>
                                                {briefDeAgencia ? (
                                                  <div className="flex gap-2 flex-wrap">
                                                    {usuario.tipo ===
                                                    "auditor" ? (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          manejarVerTemplate(
                                                            evento,
                                                            marca,
                                                          );
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                                                      >
                                                        📋 Ver Reporte
                                                      </button>
                                                    ) : (
                                                      <>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBriefMarcaSeleccionada(
                                                              marca,
                                                            );
                                                            setEventoEditando(
                                                              evento,
                                                            );
                                                            navegarA("brief");
                                                          }}
                                                          className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium transition-colors"
                                                        >
                                                          ✏️ Editar
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            manejarVerPreview(
                                                              evento,
                                                              marca,
                                                            );
                                                          }}
                                                          className="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium transition-colors"
                                                        >
                                                          👁️ Preview
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            manejarEliminarBrief(
                                                              evento,
                                                              marca,
                                                            );
                                                          }}
                                                          className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors"
                                                        >
                                                          🗑️
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                ) : (
                                                  (usuario.tipo ===
                                                    "administrador" ||
                                                    usuario.tipo ===
                                                      "developer" ||
                                                    usuario.tipo ===
                                                      "coordinador") && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBriefMarcaSeleccionada(
                                                          marca,
                                                        );
                                                        setEventoEditando(
                                                          evento,
                                                        );
                                                        navegarA("brief");
                                                      }}
                                                      className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
                                                    >
                                                      ➕ Crear Reporte
                                                    </button>
                                                  )
                                                )}
                                              </div>
                                            );
                                          },
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

              {/* Sección de Reportes - Siempre visible */}
              <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
                <div className="px-6 py-4 bg-linear-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        ⭐ Reportes
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
                          {eventosFiltrados.reduce(
                            (sum, e) => sum + (e.briefs?.length || 0),
                            0,
                          )}
                          )
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
                          {
                            eventosFiltrados.filter((e) => {
                              const total = obtenerArrayMarcas(e.marca).length;
                              const hechos = e.briefs?.length || 0;
                              return hechos < total;
                            }).length
                          }
                          )
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {filtroBriefs === "disponibles"
                      ? usuario?.tipo === "auditor"
                        ? "Haz clic en cualquier reporte para ver la documentación completa"
                        : "Explora los reportes completados o crea vista previa antes de finalizar"
                      : "Eventos que aún no tienen reporte creado"}
                  </p>
                </div>

                <div className="p-6">
                  {filtroBriefs === "disponibles" ? (
                    eventosFiltrados.reduce(
                      (sum, e) => sum + (e.briefs?.length || 0),
                      0,
                    ) === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <p>No hay reportes cerrados</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {eventosFiltrados
                          .flatMap((evento) =>
                            (evento.briefs || []).map((brief) => ({
                              evento,
                              brief,
                            })),
                          )
                          .slice(0, 6)
                          .map(({ evento, brief }) => {
                            let briefData = null;
                            try {
                              const observaciones = JSON.parse(
                                brief.observacionesEspeciales || "{}",
                              );
                              briefData = observaciones.evidencia;
                            } catch (error) {
                              console.error("Error parsing brief:", error);
                            }

                            return (
                              <div
                                key={`${evento.id}-${brief.marca}`}
                                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                      {evento.nombre}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                        {brief.marca ||
                                          formatearMarca(evento.marca)}
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
                                          <span>
                                            📊 {briefData.leads} leads
                                          </span>
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
                                          {conversionRate.toFixed(1)}%
                                          conversión
                                        </span>
                                      </div>
                                    );
                                  })()}

                                <div className="flex gap-2 mt-3">
                                  {usuario?.tipo === "auditor" ? (
                                    <button
                                      onClick={() =>
                                        manejarVerTemplate(evento, brief.marca)
                                      }
                                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                      📋 Ver Reporte Completo
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() =>
                                          manejarVerPreview(evento, brief.marca)
                                        }
                                        className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 text-xs rounded-md hover:bg-purple-200 transition-colors"
                                      >
                                        👁️ Preview
                                      </button>
                                      <button
                                        onClick={() => {
                                          setBriefMarcaSeleccionada(
                                            brief.marca,
                                          );
                                          setEventoEditando(evento);
                                          navegarA("brief");
                                        }}
                                        className="px-3 py-2 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 transition-colors"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() =>
                                          manejarEliminarBrief(
                                            evento,
                                            brief.marca,
                                          )
                                        }
                                        className="px-3 py-2 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                        title="Borrar Reporte"
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
                  eventosFiltrados.filter((e) => {
                      const total = obtenerArrayMarcas(e.marca).length;
                      const hechos = e.briefs?.length || 0;
                      return hechos < total;
                    }).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-2">✅</div>
                      <p>Todos los eventos tienen reporte</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eventosFiltrados
                        .filter((e) => {
                          const total = obtenerArrayMarcas(e.marca).length;
                          const hechos = e.briefs?.length || 0;
                          return hechos < total;
                        })
                        .slice(0, 10)
                        .map((evento) => {
                          const marcas = obtenerArrayMarcas(evento.marca);
                          const totalMarcas = marcas.length;
                          const briefsHechos = evento.briefs?.length || 0;
                          const faltantes = totalMarcas - briefsHechos;
                          const marcasSinReporte = marcas.filter(
                            (m) => !evento.briefs?.some((b) => b.marca === m),
                          );
                          return (
                            <div
                              key={evento.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between">
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
                                      <span className="font-medium">
                                        Fecha:
                                      </span>
                                      {parsearFecha(
                                        evento.fechaInicio,
                                      ).toLocaleDateString("es-MX")}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                                      Crear {faltantes}/{totalMarcas} reportes
                                    </span>
                                    <div className="flex gap-1 flex-wrap">
                                      {marcasSinReporte.map((marca) => (
                                        <span
                                          key={marca}
                                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                        >
                                          {marca}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setBriefMarcaSeleccionada(
                                      marcasSinReporte.length === 1
                                        ? marcasSinReporte[0]
                                        : undefined,
                                    );
                                    setEventoEditando(evento);
                                    navegarA("brief");
                                  }}
                                  className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                                >
                                  📋 Crear Reporte
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
                onVerBrief={async (eventoId) => {
                  const eventoConBrief = await cargarBriefCompleto(eventoId);
                  if (eventoConBrief && eventoConBrief.briefs?.length) {
                    setEventoEditando(eventoConBrief);
                    setVistaActual("template");
                  }
                }}
                onDescargarEventoPDF={(eventoId) => exportarEventoPDF(eventoId)}
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
                onVerBrief={async (eventoId) => {
                  const eventoConBrief = await cargarBriefCompleto(eventoId);
                  if (eventoConBrief && eventoConBrief.briefs?.length) {
                    setEventoEditando(eventoConBrief);
                    setVistaActual("template");
                  }
                }}
                onDescargarEventoPDF={(eventoId) => exportarEventoPDF(eventoId)}
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
                  ← Volver a Eventos
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
                  ← Volver a Eventos
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
                  ← Volver a Eventos
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
                briefInicial={
                  briefMarcaSeleccionada
                    ? eventoEditando.briefs?.find(
                        (b) => b.marca === briefMarcaSeleccionada,
                      )
                    : eventoEditando.briefs?.[0]
                }
                marcaSeleccionada={briefMarcaSeleccionada}
                agenciasDisponibles={obtenerArrayMarcas(
                  eventoEditando.marca,
                ).filter(
                  (m) =>
                    !eventoEditando.briefs?.some((b) => b.marca === m) ||
                    m === briefMarcaSeleccionada,
                )}
                facturas={facturas}
                onSubmit={manejarGuardarBrief}
                onCancel={() => setVistaActual("dashboard")}
                loading={loading}
              />
            </div>
          )}
          {vistaActual === "template" &&
            eventoEditando &&
            (() => {
              const briefSeleccionado = briefMarcaSeleccionada
                ? eventoEditando.briefs?.find(
                    (b) => b.marca === briefMarcaSeleccionada,
                  )
                : eventoEditando.briefs?.[0];
              return briefSeleccionado ? (
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => setVistaActual("dashboard")}
                      className="text-blue-600 hover:text-blue-800 mb-4"
                    >
                      ← Volver a Eventos
                    </button>
                  </div>
                  <BriefTemplate
                    evento={eventoEditando}
                    brief={briefSeleccionado}
                    onDescargarPDF={manejarExportarBriefPDF}
                  />
                </div>
              ) : null;
            })()}
          {vistaActual === "preview" &&
            eventoEditando &&
            (() => {
              const briefSeleccionado = briefMarcaSeleccionada
                ? eventoEditando.briefs?.find(
                    (b) => b.marca === briefMarcaSeleccionada,
                  )
                : eventoEditando.briefs?.[0];
              return briefSeleccionado ? (
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => setVistaActual("dashboard")}
                      className="text-blue-600 hover:text-blue-800 mb-4"
                    >
                      ← Volver a Eventos
                    </button>
                  </div>
                  <BriefTemplate
                    evento={eventoEditando}
                    brief={briefSeleccionado}
                    onDescargarPDF={manejarExportarBriefPDF}
                    isPreview={true}
                  />
                </div>
              ) : null;
            })()}
        </main>
      </div>

      {activeConfigView === "mi-perfil" && (
        <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
      )}
      {activeConfigView === "cambiar-contrasena" && (
        <CambiarContrasenaCoordinador onClose={() => setActiveConfigView("")} />
      )}

      {/* Modal checkpoint confirmación de evento */}
      {eventoParaConfirmar && (
        <ModalConfirmacionEvento
          evento={eventoParaConfirmar}
          onCancelar={() => setEventoParaConfirmar(null)}
          onConfirmar={async (datos) => {
            try {
              await actualizarEvento(eventoParaConfirmar.id, {
                estado: "Confirmado",
                datosConfirmacion: datos,
              });
              await cargarEventos();
              showToast("Evento confirmado correctamente", "success");
            } catch {
              showToast("Error al confirmar el evento", "error");
            } finally {
              setEventoParaConfirmar(null);
            }
          }}
        />
      )}
    </div>
  );
}
