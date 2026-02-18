"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Evento } from "@/types";
import { useState } from "react";

interface ModalEventosDiaProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: Date | null;
  eventos: Evento[];
  onCrearBrief?: (eventoId: string) => void;
  onVerBrief?: (eventoId: string) => void;
}

const COLORES_ESTADO = {
  Realizado: "bg-green-100 text-green-800 border-green-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  "Por Suceder": "bg-yellow-100 text-yellow-800 border-yellow-300",
  Prospectado: "bg-purple-100 text-purple-800 border-purple-300",
  Cancelado: "bg-red-100 text-red-800 border-red-300",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export default function ModalEventosDia({
  isOpen,
  onClose,
  fecha,
  eventos,
  onCrearBrief,
  onVerBrief,
}: ModalEventosDiaProps) {
  const [expandedEventos, setExpandedEventos] = useState<Set<string>>(
    new Set()
  );

  const toggleEvento = (eventoId: string) => {
    setExpandedEventos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventoId)) {
        newSet.delete(eventoId);
      } else {
        newSet.add(eventoId);
      }
      return newSet;
    });
  };

  const formatearFecha = (fecha: Date) => {
    const dia = fecha.getDate();
    const mes = MESES[fecha.getMonth()];
    const año = fecha.getFullYear();
    return `${dia} de ${mes} de ${año}`;
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold leading-6 text-gray-900"
                  >
                    {fecha
                      ? `Eventos del ${formatearFecha(fecha)}`
                      : "Eventos del día"}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Cerrar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {eventos.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl text-gray-300 mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay eventos programados
                    </h3>
                    <p className="text-gray-500">
                      No tienes eventos programados para este día.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {eventos.length} evento{eventos.length !== 1 ? "s" : ""}{" "}
                        programado{eventos.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {eventos.map((evento) => {
                      const isExpanded = expandedEventos.has(evento.id);
                      return (
                        <div
                          key={evento.id}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <div
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleEvento(evento.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className="text-lg font-semibold text-gray-900">
                                    {evento.nombre}
                                  </h4>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                                      COLORES_ESTADO[
                                        evento.estado as keyof typeof COLORES_ESTADO
                                      ]
                                    }`}
                                  >
                                    {evento.estado}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                  <span>
                                    📍 {evento.ubicacion || "Sin ubicación"}
                                  </span>
                                  <span>🏢 {evento.marca}</span>
                                  <span>
                                    💰{" "}
                                    {formatearMoneda(
                                      evento.presupuestoEstimado
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">
                                    Detalles
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        Objetivo:
                                      </span>
                                      <p className="text-gray-600">
                                        {evento.objetivo}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        Audiencia:
                                      </span>
                                      <p className="text-gray-600">
                                        {evento.audiencia}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        Responsable:
                                      </span>
                                      <p className="text-gray-600">
                                        {evento.responsable}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        Tipo:
                                      </span>
                                      <p className="text-gray-600">
                                        {evento.tipoEvento}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">
                                    Presupuesto
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-700">
                                        Estimado:
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {formatearMoneda(
                                          evento.presupuestoEstimado
                                        )}
                                      </span>
                                    </div>
                                    {evento.presupuestoReal && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-700">
                                          Real:
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {formatearMoneda(
                                            evento.presupuestoReal
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4">
                                    <h5 className="font-medium text-gray-900 mb-2">
                                      Brief del Evento
                                    </h5>
                                    {evento.brief ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                              <DocumentTextIcon className="h-3 w-3 mr-1" />
                                              Brief Disponible
                                            </span>
                                            {evento.brief.aprobadoPor && (
                                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                ✓ Aprobado
                                              </span>
                                            )}
                                          </div>
                                          {onVerBrief && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onVerBrief(evento.id.toString());
                                              }}
                                              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                            >
                                              Ver Brief
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                              ⚠️ Sin Brief
                                            </span>
                                          </div>
                                          {onCrearBrief && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onCrearBrief(evento.id.toString());
                                              }}
                                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                                            >
                                              Crear Brief
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {evento.descripcion && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-gray-900 mb-2">
                                    Descripción
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    {evento.descripcion}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
