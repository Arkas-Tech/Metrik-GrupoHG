"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  usePeriodo,
  MESES_COMPLETOS,
  MESES_NOMBRES,
} from "@/contexts/PeriodoContext";
import { AÑOS } from "@/types";

const Q_MESES: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

function arraysIguales(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

export default function FiltroPeriodoGlobal() {
  const {
    mesesSeleccionados,
    setMesesSeleccionados,
    año,
    setAño,
    etiquetaPeriodo,
  } = usePeriodo();

  const mesActual = new Date().getMonth() + 1;

  const [abiertoPeriodo, setAbiertoPeriodo] = useState(false);
  const [abiertoAño, setAbiertoAño] = useState(false);
  const refPeriodo = useRef<HTMLDivElement>(null);
  const refAño = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refPeriodo.current && !refPeriodo.current.contains(e.target as Node))
        setAbiertoPeriodo(false);
      if (refAño.current && !refAño.current.contains(e.target as Node))
        setAbiertoAño(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Helpers de selección ---
  const toggleMes = (m: number) => {
    const ya = mesesSeleccionados.includes(m);
    if (ya) {
      // No dejar vacío
      if (mesesSeleccionados.length === 1) return;
      setMesesSeleccionados(mesesSeleccionados.filter((x) => x !== m));
    } else {
      setMesesSeleccionados([...mesesSeleccionados, m].sort((a, b) => a - b));
    }
  };

  const seleccionarTodos = () =>
    setMesesSeleccionados([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const seleccionarYTD = () =>
    setMesesSeleccionados(Array.from({ length: mesActual }, (_, i) => i + 1));
  const seleccionarQ = (q: number) => setMesesSeleccionados(Q_MESES[q]);

  const esTodos = mesesSeleccionados.length === 12;
  const esYTD =
    arraysIguales(
      mesesSeleccionados,
      Array.from({ length: mesActual }, (_, i) => i + 1),
    ) && mesesSeleccionados.length > 1;

  return (
    <div className="flex items-center gap-2">
      {/* ── Botón AÑO ── */}
      <div className="relative" ref={refAño}>
        <button
          onClick={() => {
            setAbiertoAño(!abiertoAño);
            setAbiertoPeriodo(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-300 hover:border-gray-400 transition-colors shadow-sm"
        >
          <span className="text-sm font-semibold text-gray-700">{año}</span>
          <ChevronDownIcon
            className={`h-3 w-3 text-gray-400 transition-transform ${abiertoAño ? "rotate-180" : ""}`}
          />
        </button>

        {abiertoAño && (
          <div className="absolute right-0 top-full mt-2 w-28 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden py-1">
            {AÑOS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAño(a);
                  setAbiertoAño(false);
                }}
                className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                  a === año
                    ? "bg-red-50 text-red-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Botón PERÍODO ── */}
      <div className="relative" ref={refPeriodo}>
        <button
          onClick={() => {
            setAbiertoPeriodo(!abiertoPeriodo);
            setAbiertoAño(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-300 hover:border-gray-400 transition-colors shadow-sm"
        >
          <CalendarDaysIcon className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {etiquetaPeriodo}
          </span>
          <ChevronDownIcon
            className={`h-3 w-3 text-gray-400 transition-transform ${abiertoPeriodo ? "rotate-180" : ""}`}
          />
        </button>

        {abiertoPeriodo && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Período
              </p>
            </div>

            <div className="p-3 space-y-2.5">
              {/* Todos + YTD */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={seleccionarTodos}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    esTodos
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={seleccionarYTD}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    esYTD
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  YTD
                </button>
              </div>

              {/* Q1 Q2 Q3 Q4 */}
              <div className="grid grid-cols-4 gap-1">
                {([1, 2, 3, 4] as const).map((q) => {
                  const activo = arraysIguales(mesesSeleccionados, Q_MESES[q]);
                  return (
                    <button
                      key={q}
                      onClick={() => seleccionarQ(q)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        activo
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Q{q}
                    </button>
                  );
                })}
              </div>

              {/* Meses — multi-select */}
              <div className="grid grid-cols-4 gap-1">
                {MESES_NOMBRES.map((nombre, idx) => {
                  const m = idx + 1;
                  const seleccionado = mesesSeleccionados.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMes(m)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        seleccionado
                          ? "bg-red-500 text-white"
                          : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-3 pb-3">
              <button
                onClick={() => setAbiertoPeriodo(false)}
                className="w-full py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
