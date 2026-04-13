"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  usePeriodo,
  TipoPeriodo,
  MESES_COMPLETOS,
  MESES_NOMBRES,
} from "@/contexts/PeriodoContext";
import { AÑOS } from "@/types";

const OPCIONES_TIPO: { value: TipoPeriodo; label: string; desc: string }[] = [
  { value: "Mes", label: "Mes", desc: "Un mes específico" },
  { value: "Q", label: "Trimestre", desc: "Q1 · Q2 · Q3 · Q4" },
  { value: "YTD", label: "YTD", desc: "Enero al mes actual" },
  { value: "Personalizado", label: "Personalizado", desc: "Rango de meses" },
];

export default function FiltroPeriodoGlobal() {
  const {
    tipoPeriodo,
    setTipoPeriodo,
    mes,
    setMes,
    año,
    setAño,
    quarter,
    setQuarter,
    mesInicio,
    setMesInicio,
    mesFin,
    setMesFin,
    etiquetaPeriodo,
  } = usePeriodo();

  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Botón principal — mismo estilo que los selectores del dashboard */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-300 hover:border-gray-400 transition-colors shadow-sm"
        title="Filtro de período global"
      >
        <CalendarDaysIcon className="h-4 w-4 text-red-500 shrink-0" />
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {etiquetaPeriodo}
        </span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header del dropdown */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Período global
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Año */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Año
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <CalendarDaysIcon className="h-4 w-4 text-red-400 shrink-0" />
                <select
                  value={año}
                  onChange={(e) => setAño(parseInt(e.target.value))}
                  className="flex-1 appearance-none bg-transparent text-sm font-medium text-gray-700 cursor-pointer focus:outline-none"
                >
                  {AÑOS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de período — chips */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Tipo de período
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OPCIONES_TIPO.map((op) => (
                  <button
                    key={op.value}
                    onClick={() => setTipoPeriodo(op.value)}
                    className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-colors ${
                      tipoPeriodo === op.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-semibold">{op.label}</span>
                    <span className="text-xs text-current opacity-60 leading-tight mt-0.5">
                      {op.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-selector: Mes */}
            {tipoPeriodo === "Mes" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Mes
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MESES_NOMBRES.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMes(idx + 1)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        mes === idx + 1
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-selector: Quarter */}
            {tipoPeriodo === "Q" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Trimestre
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([1, 2, 3, 4] as const).map((q) => {
                    const inicio = (q - 1) * 3 + 1;
                    return (
                      <button
                        key={q}
                        onClick={() => setQuarter(q)}
                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                          quarter === q
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Q{q}
                        <span className="block text-xs font-normal opacity-70">
                          {MESES_NOMBRES[inicio - 1]}–
                          {MESES_NOMBRES[inicio + 1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-selector: Personalizado */}
            {tipoPeriodo === "Personalizado" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Desde
                  </label>
                  <select
                    value={mesInicio}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setMesInicio(v);
                      if (v > mesFin) setMesFin(v);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                  >
                    {MESES_COMPLETOS.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Hasta
                  </label>
                  <select
                    value={mesFin}
                    onChange={(e) => setMesFin(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                  >
                    {MESES_COMPLETOS.map((m, idx) => (
                      <option
                        key={idx}
                        value={idx + 1}
                        disabled={idx + 1 < mesInicio}
                      >
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* YTD info */}
            {tipoPeriodo === "YTD" && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <CalendarDaysIcon className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 font-medium">
                  Enero → {MESES_COMPLETOS[new Date().getMonth()]} {año}
                </p>
              </div>
            )}
          </div>

          {/* Footer: cerrar */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setAbierto(false)}
              className="w-full py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
