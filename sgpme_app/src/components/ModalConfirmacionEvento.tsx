"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Evento } from "@/types";

interface DatosConfirmacion {
  asesores: boolean;
  asesoresAsignados?: number;
  objetivos?: {
    leads?: number;
    pruebasManejo?: number;
    solicitudesCredito?: number;
    ventas?: number;
  };
}

interface ModalConfirmacionEventoProps {
  evento: Evento;
  onConfirmar: (datos: DatosConfirmacion) => Promise<void>;
  onCancelar: () => void;
}

export default function ModalConfirmacionEvento({
  evento,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionEventoProps) {
  const [asesores, setAsesores] = useState<boolean | null>(null);
  const [asesoresAsignados, setAsesoresAsignados] = useState<number>(0);
  const [leads, setLeads] = useState<number>(0);
  const [pruebasManejo, setPruebasManejo] = useState<number>(0);
  const [solicitudesCredito, setSolicitudesCredito] = useState<number>(0);
  const [ventas, setVentas] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    if (asesores === null) return;
    setLoading(true);
    try {
      const datos: DatosConfirmacion = {
        asesores,
        ...(asesores && { asesoresAsignados }),
        ...(asesores && {
          objetivos: {
            leads: leads || undefined,
            pruebasManejo: pruebasManejo || undefined,
            solicitudesCredito: solicitudesCredito || undefined,
            ventas: ventas || undefined,
          },
        }),
      };
      await onConfirmar(datos);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              ✅ Confirmar Evento
            </h2>
            <p className="text-sm text-blue-100 mt-0.5 truncate max-w-[280px]">
              {evento.nombre}
            </p>
          </div>
          <button
            onClick={onCancelar}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pregunta Asesores */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">
              ¿El evento contará con Asesores?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAsesores(true)}
                className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  asesores === true
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Sí
              </button>
              <button
                onClick={() => setAsesores(false)}
                className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  asesores === false
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Campos condicionales si asesores = true */}
          {asesores === true && (
            <div className="space-y-5 border-t pt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Asesores asignados
                </label>
                <input
                  type="number"
                  min={0}
                  value={asesoresAsignados}
                  onChange={(e) =>
                    setAsesoresAsignados(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Número de asesores"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  Objetivos
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Leads", value: leads, setter: setLeads },
                    {
                      label: "Pruebas de manejo",
                      value: pruebasManejo,
                      setter: setPruebasManejo,
                    },
                    {
                      label: "Sol. de crédito",
                      value: solicitudesCredito,
                      setter: setSolicitudesCredito,
                    },
                    { label: "Ventas", value: ventas, setter: setVentas },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) => setter(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancelar}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={asesores === null || loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Confirmar evento
          </button>
        </div>
      </div>
    </div>
  );
}
