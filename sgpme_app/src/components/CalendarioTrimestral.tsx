"use client";

import { useState, useMemo } from "react";
import { Evento, Factura } from "@/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import ModalEventosDia from "./ModalEventosDia";
import GraficaPresupuestoVsGasto from "./GraficaPresupuestoVsGasto";

interface CalendarioTrimestralProps {
  eventos: Evento[];
  facturas?: Factura[];
  onEventoClick?: (evento: Evento) => void;
  onCrearBrief?: (eventoId: string) => void;
  onVerBrief?: (eventoId: string) => void;
}

const MESES = [
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

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const COLORES_ESTADO = {
  Realizado: "bg-green-100 text-green-800 border-green-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  "Por Suceder": "bg-yellow-100 text-yellow-800 border-yellow-300",
  Prospectado: "bg-purple-100 text-purple-800 border-purple-300",
  Cancelado: "bg-red-100 text-red-800 border-red-300",
};

const parsearFecha = (fechaString: string) => {
  const [año, mes, dia] = fechaString.split("-").map(Number);
  return new Date(año, mes - 1, dia);
};

export default function CalendarioTrimestral({
  eventos,
  facturas = [],
  onEventoClick,
  onCrearBrief,
  onVerBrief,
}: CalendarioTrimestralProps) {
  const añoActual = new Date().getFullYear();
  const [año, setAño] = useState(añoActual);
  const [trimestre, setTrimestre] = useState(
    Math.floor(new Date().getMonth() / 3) + 1,
  );
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [eventosDelDiaSeleccionado, setEventosDelDiaSeleccionado] = useState<
    Evento[]
  >([]);

  const mesesDelTrimestre = useMemo(() => {
    const inicio = (trimestre - 1) * 3;
    return [inicio, inicio + 1, inicio + 2];
  }, [trimestre]);

  const eventosDelTrimestre = useMemo(() => {
    return eventos.filter((evento) => {
      const fechaEvento = parsearFecha(evento.fechaInicio);
      return (
        fechaEvento.getFullYear() === año &&
        mesesDelTrimestre.includes(fechaEvento.getMonth())
      );
    });
  }, [eventos, año, mesesDelTrimestre]);

  const obtenerEventosDelDia = (año: number, mes: number, dia: number) => {
    return eventosDelTrimestre.filter((evento) => {
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

      return (
        fechaBuscada >= inicioNormalizada && fechaBuscada <= finNormalizada
      );
    });
  };

  const generarCalendarioMes = (mes: number) => {
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

  const cambiarTrimestre = (direccion: number) => {
    let nuevoTrimestre = trimestre + direccion;
    let nuevoAño = año;

    if (nuevoTrimestre > 4) {
      nuevoTrimestre = 1;
      nuevoAño++;
    } else if (nuevoTrimestre < 1) {
      nuevoTrimestre = 4;
      nuevoAño--;
    }

    setTrimestre(nuevoTrimestre);
    setAño(nuevoAño);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <CalendarDaysIcon className="h-8 w-8 text-white" />
          <h3 className="text-2xl font-bold text-white">
            Q{trimestre} {año} - Vista Trimestral
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => cambiarTrimestre(-1)}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-white" />
          </button>
          <span className="px-3 py-1 text-sm font-medium text-white bg-white/20 rounded-md">
            {MESES[mesesDelTrimestre[0]]} - {MESES[mesesDelTrimestre[2]]}
          </span>
          <button
            onClick={() => cambiarTrimestre(1)}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {eventosDelTrimestre.length}
            </div>
            <div className="text-sm text-gray-500">Total Eventos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {
                eventosDelTrimestre.filter((e) => e.estado === "Realizado")
                  .length
              }
            </div>
            <div className="text-sm text-gray-500">Realizados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {
                eventosDelTrimestre.filter((e) => e.estado === "Confirmado")
                  .length
              }
            </div>
            <div className="text-sm text-gray-500">Confirmados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {
                eventosDelTrimestre.filter((e) => e.estado === "Por Suceder")
                  .length
              }
            </div>
            <div className="text-sm text-gray-500">Por Suceder</div>
          </div>
        </div>
      </div>

      {/* Gráfica de Presupuesto vs Gasto */}
      <div className="p-4">
        <GraficaPresupuestoVsGasto
          eventos={eventosDelTrimestre}
          gastoReal={
            // Lógica copiada de /facturas adaptada para trimestre
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
                  const [añoEvento, mesEvento] =
                    factura.eventoData.fechaInicio.split("-");
                  const trimestreEvento = Math.ceil(parseInt(mesEvento) / 3);
                  return (
                    parseInt(añoEvento) === año && trimestreEvento === trimestre
                  );
                });

              return facturasEventosPorPeriodo.reduce(
                (sum, f) => sum + f.total,
                0,
              );
            })()
          }
          titulo={`Presupuesto vs Gasto - Q${trimestre} ${año}`}
          tipoCalendario="trimestral"
          año={año}
          trimestre={trimestre}
        />
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mesesDelTrimestre.map((mesIndex) => {
            const diasDelMes = generarCalendarioMes(mesIndex);

            return (
              <div key={mesIndex} className="space-y-3">
                <h4 className="text-center font-semibold text-gray-900 py-2 bg-gray-50 rounded-md">
                  {MESES[mesIndex]}
                </h4>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DIAS_SEMANA.map((dia, idx) => (
                    <div
                      key={`${mesIndex}-day-${idx}`}
                      className="text-center text-xs font-medium text-gray-500 p-1"
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
                          className="h-10"
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
                        className={`h-10 flex flex-col items-center justify-center text-xs border rounded-md relative cursor-pointer transition-colors ${
                          esHoy
                            ? "bg-blue-100 border-blue-300 text-blue-900 font-semibold"
                            : eventosDelDia.length > 0
                              ? "bg-green-50 border-green-200 hover:bg-green-100 text-gray-900"
                              : "border-gray-200 hover:bg-gray-50 text-gray-900"
                        }`}
                        onClick={() => {
                          const fechaDia = new Date(año, mesIndex, dia);
                          setFechaSeleccionada(fechaDia);
                          setEventosDelDiaSeleccionado(eventosDelDia);
                          setModalAbierto(true);
                        }}
                      >
                        <span>{dia}</span>
                        {eventosDelDia.length > 0 && (
                          <div className="absolute -bottom-1 flex space-x-0.5">
                            {eventosDelDia.slice(0, 3).map((evento, idx) => (
                              <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  evento.estado === "Realizado"
                                    ? "bg-green-500"
                                    : evento.estado === "Confirmado"
                                      ? "bg-blue-500"
                                      : evento.estado === "Por Suceder"
                                        ? "bg-yellow-500"
                                        : evento.estado === "Prospectado"
                                          ? "bg-purple-500"
                                          : "bg-red-500"
                                }`}
                                title={evento.nombre}
                              />
                            ))}
                            {eventosDelDia.length > 3 && (
                              <div className="text-xs text-gray-600">+</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {eventosDelTrimestre.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            Eventos del Trimestre
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {eventosDelTrimestre.map((evento) => (
              <div
                key={evento.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEventoClick) {
                    onEventoClick(evento);
                  }
                }}
                className={`flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer hover:shadow-md ${
                  COLORES_ESTADO[evento.estado as keyof typeof COLORES_ESTADO]
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{evento.nombre}</div>
                  <div className="text-xs text-gray-600">
                    {evento.marca} • {evento.fechaInicio}
                  </div>
                </div>
                <div className="text-xs font-medium">{evento.estado}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
