"use client";

import React, { useState, useMemo } from "react";
import { Evento, Factura } from "@/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import ModalEventosDia from "./ModalEventosDia";
import GraficaPresupuestoVsGasto from "./GraficaPresupuestoVsGasto";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

interface CalendarioMensualProps {
  eventos: Evento[];
  facturas?: Factura[];
  onEventoClick?: (evento: Evento) => void;
  onCrearBrief?: (eventoId: string) => void;
  onVerBrief?: (eventoId: string) => void;
}

export default function CalendarioMensual({
  eventos,
  facturas = [],
  onCrearBrief,
  onVerBrief,
}: CalendarioMensualProps) {
  const { filtraPorMarca } = useMarcaGlobal();
  const [fechaActual, setFechaActual] = useState(new Date());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [eventosDelDiaSeleccionado, setEventosDelDiaSeleccionado] = useState<
    Evento[]
  >([]);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const diasCalendario = useMemo(() => {
    const primerDiaDelMes = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth(),
      1,
    );
    const ultimoDiaDelMes = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth() + 1,
      0,
    );

    const primerDiaCalendario = new Date(primerDiaDelMes);
    primerDiaCalendario.setDate(
      primerDiaDelMes.getDate() - primerDiaDelMes.getDay(),
    );

    const ultimoDiaCalendario = new Date(ultimoDiaDelMes);
    ultimoDiaCalendario.setDate(
      ultimoDiaDelMes.getDate() + (6 - ultimoDiaDelMes.getDay()),
    );

    const dias = [];
    const fecha = new Date(primerDiaCalendario);

    while (fecha <= ultimoDiaCalendario) {
      dias.push(new Date(fecha));
      fecha.setDate(fecha.getDate() + 1);
    }

    return dias;
  }, [fechaActual]);

  const parsearFecha = (fechaString: string) => {
    return new Date(fechaString + "T00:00:00");
  };

  // Filtrar eventos del mes actual
  const eventosDelMes = useMemo(() => {
    return eventos.filter((evento) => {
      const fechaEvento = parsearFecha(evento.fechaInicio);
      return (
        fechaEvento.getMonth() === fechaActual.getMonth() &&
        fechaEvento.getFullYear() === fechaActual.getFullYear()
      );
    });
  }, [eventos, fechaActual]);

  const navegarMes = (direccion: "anterior" | "siguiente") => {
    setFechaActual((prev) => {
      const nuevaFecha = new Date(prev);
      if (direccion === "anterior") {
        nuevaFecha.setMonth(prev.getMonth() - 1);
      } else {
        nuevaFecha.setMonth(prev.getMonth() + 1);
      }
      return nuevaFecha;
    });
  };

  const obtenerEventosDelDia = (fecha: Date) => {
    return eventos.filter((evento) => {
      const fechaInicio = parsearFecha(evento.fechaInicio);
      const fechaFin = evento.fechaFin
        ? parsearFecha(evento.fechaFin)
        : fechaInicio;

      const inicioNormalizada = new Date(
        fechaInicio.getFullYear(),
        fechaInicio.getMonth(),
        fechaInicio.getDate(),
      );
      const finNormalizada = new Date(
        fechaFin.getFullYear(),
        fechaFin.getMonth(),
        fechaFin.getDate(),
      );
      const fechaBuscada = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
      );

      const estaEnRango =
        fechaBuscada >= inicioNormalizada && fechaBuscada <= finNormalizada;
      const cumpleFiltro = filtroEstado ? evento.estado === filtroEstado : true;

      return estaEnRango && cumpleFiltro;
    });
  };

  const obtenerColorEvento = (evento: Evento) => {
    switch (evento.estado) {
      case "Realizado":
        return "bg-green-500";
      case "Confirmado":
        return "bg-blue-500";
      case "Por Suceder":
        return "bg-yellow-500";
      case "Prospectado":
        return "bg-purple-500";
      case "Cancelado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const nombreMes = fechaActual.toLocaleDateString("es-ES", {
    month: "long",
  });

  // Capitalizar primera letra del mes
  const nombreMesCapitalizado =
    nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <CalendarDaysIcon className="h-8 w-8 text-white" />
          <h3 className="text-2xl font-bold text-white">
            {nombreMesCapitalizado} de {fechaActual.getFullYear()} - Vista
            Mensual
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-white" />
          </button>
          <span className="px-3 py-1 text-sm font-medium text-white bg-white/20 rounded-md">
            {nombreMesCapitalizado}
          </span>
          <button
            onClick={() => navegarMes("siguiente")}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Métricas del mes - Botones de filtro */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => setFiltroEstado(null)}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === null
                ? "bg-gray-200 ring-2 ring-gray-400 shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">
              {eventosDelMes.length}
            </div>
            <div className="text-sm text-gray-500">Total Eventos</div>
          </button>
          <button
            onClick={() => setFiltroEstado("Realizado")}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === "Realizado"
                ? "bg-green-100 ring-2 ring-green-400 shadow-md"
                : "hover:bg-green-50"
            }`}
          >
            <div className="text-2xl font-bold text-green-600">
              {eventosDelMes.filter((e) => e.estado === "Realizado").length}
            </div>
            <div className="text-sm text-gray-500">Realizados</div>
          </button>
          <button
            onClick={() => setFiltroEstado("Confirmado")}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === "Confirmado"
                ? "bg-blue-100 ring-2 ring-blue-400 shadow-md"
                : "hover:bg-blue-50"
            }`}
          >
            <div className="text-2xl font-bold text-blue-600">
              {eventosDelMes.filter((e) => e.estado === "Confirmado").length}
            </div>
            <div className="text-sm text-gray-500">Confirmados</div>
          </button>
          <button
            onClick={() => setFiltroEstado("Por Suceder")}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === "Por Suceder"
                ? "bg-yellow-100 ring-2 ring-yellow-400 shadow-md"
                : "hover:bg-yellow-50"
            }`}
          >
            <div className="text-2xl font-bold text-yellow-600">
              {eventosDelMes.filter((e) => e.estado === "Por Suceder").length}
            </div>
            <div className="text-sm text-gray-500">Por Suceder</div>
          </button>
          <button
            onClick={() => setFiltroEstado("Prospectado")}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === "Prospectado"
                ? "bg-purple-100 ring-2 ring-purple-400 shadow-md"
                : "hover:bg-purple-50"
            }`}
          >
            <div className="text-2xl font-bold text-purple-600">
              {eventosDelMes.filter((e) => e.estado === "Prospectado").length}
            </div>
            <div className="text-sm text-gray-500">Prospectados</div>
          </button>
        </div>
      </div>

      {/* Gráfica de Presupuesto vs Gasto */}
      <div className="px-6 pb-6">
        <GraficaPresupuestoVsGasto
          eventos={eventosDelMes}
          gastoReal={facturas
            .filter(
              (f) =>
                f.eventoId &&
                f.fechaIngresada &&
                f.fechaIngresada.trim() !== "",
            )
            .filter((f) => {
              const [año, mes] = f.fechaIngresada!.split("-");
              return (
                parseInt(año) === fechaActual.getFullYear() &&
                parseInt(mes) === fechaActual.getMonth() + 1
              );
            })
            .filter((f) => filtraPorMarca(f.marca))
            .reduce((sum, f) => sum + f.subtotal, 0)}
          titulo={`Presupuesto vs Gasto - ${nombreMesCapitalizado}`}
          tipoCalendario="mensual"
          año={fechaActual.getFullYear()}
          mes={fechaActual.getMonth() + 1}
        />
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg"
            >
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {diasCalendario.map((dia) => {
            const esDelMesActual = dia.getMonth() === fechaActual.getMonth();
            const esHoy = dia.toDateString() === new Date().toDateString();
            const eventosDelDia = obtenerEventosDelDia(dia);

            return (
              <div
                key={dia.toDateString()}
                className={`min-h-[120px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  esDelMesActual
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-100"
                } ${esHoy ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => {
                  const eventosDelDia = obtenerEventosDelDia(dia);
                  setFechaSeleccionada(dia);
                  setEventosDelDiaSeleccionado(eventosDelDia);
                  setModalAbierto(true);
                }}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    esDelMesActual ? "text-gray-900" : "text-gray-400"
                  } ${esHoy ? "text-blue-600" : ""}`}
                >
                  {dia.getDate()}
                </div>
                <div className="space-y-1">
                  {eventosDelDia.slice(0, 3).map((evento, index) => (
                    <div
                      key={`${evento.id}-${index}`}
                      className={`text-xs p-1 rounded text-white truncate ${obtenerColorEvento(
                        evento,
                      )}`}
                      title={evento.nombre}
                    >
                      {evento.nombre}
                    </div>
                  ))}
                  {eventosDelDia.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{eventosDelDia.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-gray-50 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Estado de Eventos:
        </h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Realizado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Confirmado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">Por Suceder</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600">Prospectado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Cancelado</span>
          </div>
        </div>
      </div>

      <ModalEventosDia
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        fecha={fechaSeleccionada}
        eventos={eventosDelDiaSeleccionado}
        onCrearBrief={onCrearBrief}
        onVerBrief={onVerBrief}
      />
    </div>
  );
}
