"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

// Mantenido por compatibilidad con DashboardGeneral
export type TipoPeriodo = "YTD" | "Mes" | "Q" | "Personalizado";

export interface PeriodoContextType {
  /** Meses seleccionados como array de números 1-12 */
  mesesSeleccionados: number[];
  setMesesSeleccionados: (meses: number[]) => void;
  año: number;
  setAño: (año: number) => void;
  // --- Compatibilidad con código existente ---
  /** Primer mes seleccionado (compat con páginas de un solo mes) */
  mes: number;
  setMes: (mes: number) => void;
  setTipoPeriodo: (tipo: TipoPeriodo) => void;
  /** Alias de mesesSeleccionados */
  mesesDelPeriodo: number[];
  /** Etiqueta legible del período, ej: "Abril", "Q2", "YTD", "Todos" */
  etiquetaPeriodo: string;
}

export const MESES_NOMBRES = [
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

export const MESES_COMPLETOS = [
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

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const añoActual = ahora.getFullYear();

  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([
    mesActual,
  ]);
  const [año, setAño] = useState<number>(añoActual);

  // Compatibilidad: primer mes seleccionado
  const mes = useMemo(
    () => mesesSeleccionados[0] ?? mesActual,
    [mesesSeleccionados, mesActual],
  );

  const setMes = (m: number) => setMesesSeleccionados([m]);

  // Compatibilidad con DashboardGeneral que usaba setTipoPeriodo
  const setTipoPeriodo = (tipo: TipoPeriodo) => {
    switch (tipo) {
      case "YTD":
        setMesesSeleccionados(
          Array.from({ length: mesActual }, (_, i) => i + 1),
        );
        break;
      case "Mes":
        // mantiene el mes actual seleccionado
        setMesesSeleccionados([mesesSeleccionados[0] ?? mesActual]);
        break;
      case "Q": {
        const q = Math.ceil((mesesSeleccionados[0] ?? mesActual) / 3);
        setMesesSeleccionados(Q_MESES[q]);
        break;
      }
      default:
        break;
    }
  };

  const etiquetaPeriodo = useMemo<string>(() => {
    const sorted = [...mesesSeleccionados].sort((a, b) => a - b);
    if (sorted.length === 12) return "Todos";
    // YTD = meses 1..mesActual
    const ytd = Array.from({ length: mesActual }, (_, i) => i + 1);
    if (arraysIguales(sorted, ytd) && sorted.length > 1) return "YTD";
    // Quarters
    for (let q = 1; q <= 4; q++) {
      if (arraysIguales(sorted, Q_MESES[q])) return `Q${q}`;
    }
    // Un solo mes
    if (sorted.length === 1) return MESES_COMPLETOS[sorted[0] - 1];
    // Varios meses
    if (sorted.length <= 3)
      return sorted.map((m) => MESES_NOMBRES[m - 1]).join(", ");
    return `${sorted.length} meses`;
  }, [mesesSeleccionados, mesActual]);

  return (
    <PeriodoContext.Provider
      value={{
        mesesSeleccionados,
        setMesesSeleccionados,
        año,
        setAño,
        mes,
        setMes,
        setTipoPeriodo,
        mesesDelPeriodo: mesesSeleccionados,
        etiquetaPeriodo,
      }}
    >
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodo(): PeriodoContextType {
  const ctx = useContext(PeriodoContext);
  if (!ctx) {
    throw new Error("usePeriodo debe usarse dentro de PeriodoProvider");
  }
  return ctx;
}
