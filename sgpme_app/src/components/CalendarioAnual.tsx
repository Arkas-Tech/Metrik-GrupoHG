"use client";

import { useState, useMemo } from "react";
import { Evento, Factura } from "@/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import ModalEventosDia from "./ModalEventosDia";
import GraficaPresupuestoVsGasto from "./GraficaPresupuestoVsGasto";

interface CalendarioAnualProps {
  eventos: Evento[];
  facturas?: Factura[];
  onEventoClick?: (evento: Evento) => void;
  onCrearBrief?: (eventoId: string) => void;
  onVerBrief?: (eventoId: string) => void;
}

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const COLORES_ESTADO = {
  Realizado: "bg-green-500",
  Confirmado: "bg-blue-500",
  "Por Suceder": "bg-yellow-500",
  Prospectado: "bg-purple-500",
  Cancelado: "bg-red-500",
};

const parsearFecha = (fechaString: string) => {
  const [año, mes, dia] = fechaString.split("-").map(Number);
  return new Date(año, mes - 1, dia);
};

export default function CalendarioAnual({
  eventos,
  facturas = [],
  onEventoClick,
  onCrearBrief,
  onVerBrief,
}: CalendarioAnualProps) {
  const añoActual = new Date().getFullYear();
  const [año, setAño] = useState(añoActual);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [eventosDelDiaSeleccionado, setEventosDelDiaSeleccionado] = useState<
    Evento[]
  >([]);
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<number>>(
    new Set(),
  );
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const eventosDelAño = useMemo(() => {
    return eventos.filter((evento) => {
      const fechaEvento = parsearFecha(evento.fechaInicio);
      return fechaEvento.getFullYear() === año;
    });
  }, [eventos, año]);

  const eventosPorMes = useMemo(() => {
    const meses: { [key: number]: Evento[] } = {};

    for (let i = 0; i < 12; i++) {
      meses[i] = [];
    }

    eventosDelAño.forEach((evento) => {
      const fechaEvento = parsearFecha(evento.fechaInicio);
      const mes = fechaEvento.getMonth();
      meses[mes].push(evento);
    });

    return meses;
  }, [eventosDelAño]);

  const generarCalendarioMiniatura = (mes: number) => {
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaSemanaInicio = (primerDia.getDay() + 6) % 7;

    const dias = [];

    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia);
    }

    return dias;
  };

  const obtenerEventosDelDia = (año: number, mes: number, dia: number) => {
    return eventosDelAño.filter((evento) => {
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
      const fechaBuscada = new Date(año, mes, dia);

      const estaEnRango =
        fechaBuscada >= inicioNormalizada && fechaBuscada <= finNormalizada;
      const cumpleFiltro = filtroEstado ? evento.estado === filtroEstado : true;

      return estaEnRango && cumpleFiltro;
    });
  };

  const estadisticasPorTrimestre = useMemo(() => {
    const trimestres = [
      { nombre: "Q1", meses: [0, 1, 2] },
      { nombre: "Q2", meses: [3, 4, 5] },
      { nombre: "Q3", meses: [6, 7, 8] },
      { nombre: "Q4", meses: [9, 10, 11] },
    ];

    return trimestres.map((trimestre) => {
      const eventosDelTrimestre = eventosDelAño.filter((evento) => {
        const mes = new Date(evento.fechaInicio).getMonth();
        return trimestre.meses.includes(mes);
      });

      return {
        ...trimestre,
        total: eventosDelTrimestre.length,
        realizados: eventosDelTrimestre.filter((e) => e.estado === "Realizado")
          .length,
        confirmados: eventosDelTrimestre.filter(
          (e) => e.estado === "Confirmado",
        ).length,
        porSuceder: eventosDelTrimestre.filter(
          (e) => e.estado === "Por Suceder",
        ).length,
      };
    });
  }, [eventosDelAño]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-8 w-8 text-white" />
          <h3 className="text-2xl font-bold text-white">Vista Anual {año}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAño(año - 1)}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-white" />
          </button>
          <span className="px-3 py-1 text-sm font-medium text-white bg-white/20 rounded-md">
            {año}
          </span>
          <button
            onClick={() => setAño(año + 1)}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <button
            onClick={() => setFiltroEstado(null)}
            className={`text-center p-3 rounded-lg transition-all ${
              filtroEstado === null
                ? "bg-gray-200 ring-2 ring-gray-400 shadow-md"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">
              {eventosDelAño.length}
            </div>
            <div className="text-sm text-gray-500">Total {año}</div>
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
              {eventosDelAño.filter((e) => e.estado === "Realizado").length}
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
              {eventosDelAño.filter((e) => e.estado === "Confirmado").length}
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
              {eventosDelAño.filter((e) => e.estado === "Por Suceder").length}
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
              {eventosDelAño.filter((e) => e.estado === "Prospectado").length}
            </div>
            <div className="text-sm text-gray-500">Prospectados</div>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {estadisticasPorTrimestre.map((trimestre) => (
            <div
              key={trimestre.nombre}
              className="bg-white p-3 rounded-md border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-700 mb-1">
                {trimestre.nombre}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {trimestre.total}
              </div>
              <div className="flex space-x-2 text-xs">
                <span className="text-green-600">{trimestre.realizados}R</span>
                <span className="text-blue-600">{trimestre.confirmados}C</span>
                <span className="text-yellow-600">{trimestre.porSuceder}P</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfica de Presupuesto vs Gasto */}
      <div className="p-4">
        <GraficaPresupuestoVsGasto
          eventos={eventosDelAño}
          gastoReal={
            // Lógica copiada de /facturas adaptada para año
            (() => {
              const facturasConEventosIngresadas = facturas
                .filter(
                  (factura) =>
                    factura.eventoId &&
                    factura.fechaIngresada &&
                    factura.fechaIngresada.trim() !== "",
                )
                .map((factura) => {
                  const evento = eventos.find((e) => e.id === factura.eventoId);
                  return {
                    ...factura,
                    eventoData: evento,
                  };
                });

              const facturasEventosPorPeriodo =
                facturasConEventosIngresadas.filter((factura) => {
                  if (!factura.eventoData?.fechaInicio) return false;
                  const [añoEvento] = factura.eventoData.fechaInicio.split("-");
                  return parseInt(añoEvento) === año;
                });

              return facturasEventosPorPeriodo.reduce(
                (sum, f) => sum + f.subtotal,
                0,
              );
            })()
          }
          titulo={`Presupuesto vs Gasto - Año ${año}`}
          tipoCalendario="anual"
          año={año}
        />
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, mesIndex) => {
            const diasDelMes = generarCalendarioMiniatura(mesIndex);
            const eventosDelMes = eventosPorMes[mesIndex];

            return (
              <div
                key={mesIndex}
                className="border border-gray-200 rounded-md p-3 hover:shadow-md transition-shadow"
              >
                <h4 className="text-center font-semibold text-gray-900 mb-2 text-sm">
                  {MESES_CORTOS[mesIndex]}
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {eventosDelMes.length}
                  </span>
                </h4>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["L", "M", "M", "J", "V", "S", "D"].map((dia, idx) => (
                    <div
                      key={`${mesIndex}-day-${idx}`}
                      className="text-center text-xs text-gray-400 font-medium"
                    >
                      {dia}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {diasDelMes.map((dia, index) => {
                    if (dia === null) {
                      return (
                        <div
                          key={`${mesIndex}-empty-${index}`}
                          className="h-6"
                        ></div>
                      );
                    }

                    const eventosDelDia = obtenerEventosDelDia(
                      año,
                      mesIndex,
                      dia,
                    );
                    const hoy = new Date();
                    const esHoy =
                      hoy.getFullYear() === año &&
                      hoy.getMonth() === mesIndex &&
                      hoy.getDate() === dia;

                    return (
                      <div
                        key={`${mesIndex}-${dia}`}
                        className={`h-6 flex items-center justify-center text-xs rounded cursor-pointer transition-colors ${
                          esHoy
                            ? "bg-blue-500 text-white font-bold"
                            : eventosDelDia.length > 0
                              ? "bg-green-100 text-green-800 font-medium hover:bg-green-200"
                              : "text-gray-900 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          const fechaDia = new Date(año, mesIndex, dia);
                          setFechaSeleccionada(fechaDia);
                          setEventosDelDiaSeleccionado(eventosDelDia);
                          setModalAbierto(true);
                        }}
                        title={eventosDelDia.map((e) => e.nombre).join(", ")}
                      >
                        {dia}
                      </div>
                    );
                  })}
                </div>
                {eventosDelMes.length > 0 && (
                  <div className="mt-2">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(mesesExpandidos.has(mesIndex)
                        ? eventosDelMes
                        : eventosDelMes.slice(0, 2)
                      ).map((evento) => (
                        <div
                          key={evento.id}
                          onClick={() => onEventoClick?.(evento)}
                          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 p-1 rounded text-xs"
                        >
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              COLORES_ESTADO[
                                evento.estado as keyof typeof COLORES_ESTADO
                              ]
                            }`}
                          />
                          <span className="truncate text-gray-700">
                            {evento.nombre}
                          </span>
                        </div>
                      ))}
                    </div>
                    {eventosDelMes.length > 2 && (
                      <button
                        onClick={() => {
                          setMesesExpandidos((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(mesIndex)) {
                              newSet.delete(mesIndex);
                            } else {
                              newSet.add(mesIndex);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full mt-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-1 rounded transition-colors"
                      >
                        {mesesExpandidos.has(mesIndex)
                          ? "Ver menos"
                          : `Ver todos (${eventosDelMes.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-900">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Realizado</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Por Suceder</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Prospectado</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Cancelado</span>
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
