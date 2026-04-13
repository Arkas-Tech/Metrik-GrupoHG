"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

export type TipoPeriodo = "YTD" | "Mes" | "Q" | "Personalizado";

export interface PeriodoContextType {
  tipoPeriodo: TipoPeriodo;
  setTipoPeriodo: (tipo: TipoPeriodo) => void;
  mes: number; // 1-12 (usado cuando tipoPeriodo === "Mes" o "Personalizado")
  setMes: (mes: number) => void;
  año: number;
  setAño: (año: number) => void;
  quarter: 1 | 2 | 3 | 4; // usado cuando tipoPeriodo === "Q"
  setQuarter: (q: 1 | 2 | 3 | 4) => void;
  mesInicio: number; // usado cuando tipoPeriodo === "Personalizado"
  setMesInicio: (mes: number) => void;
  mesFin: number; // usado cuando tipoPeriodo === "Personalizado"
  setMesFin: (mes: number) => void;
  /** Array de meses (1-12) incluidos en el período seleccionado */
  mesesDelPeriodo: number[];
  /** Etiqueta legible del período actual, ej: "Abr 2026" o "YTD 2026" */
  etiquetaPeriodo: string;
}

const MESES_NOMBRES = [
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

const MESES_COMPLETOS = [
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

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const añoActual = ahora.getFullYear();

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("Mes");
  const [mes, setMes] = useState<number>(mesActual);
  const [año, setAño] = useState<number>(añoActual);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(
    Math.ceil(mesActual / 3) as 1 | 2 | 3 | 4,
  );
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [mesFin, setMesFin] = useState<number>(mesActual);

  const mesesDelPeriodo = useMemo<number[]>(() => {
    switch (tipoPeriodo) {
      case "YTD":
        return Array.from({ length: mesActual }, (_, i) => i + 1);
      case "Mes":
        return [mes];
      case "Q": {
        const inicio = (quarter - 1) * 3 + 1;
        return [inicio, inicio + 1, inicio + 2];
      }
      case "Personalizado": {
        const result: number[] = [];
        for (let m = mesInicio; m <= mesFin; m++) result.push(m);
        return result;
      }
      default:
        return [mes];
    }
  }, [tipoPeriodo, mes, quarter, mesInicio, mesFin, mesActual]);

  const etiquetaPeriodo = useMemo<string>(() => {
    switch (tipoPeriodo) {
      case "YTD":
        return `YTD ${año}`;
      case "Mes":
        return `${MESES_COMPLETOS[mes - 1]} ${año}`;
      case "Q":
        return `Q${quarter} ${año}`;
      case "Personalizado":
        if (mesInicio === mesFin)
          return `${MESES_NOMBRES[mesInicio - 1]} ${año}`;
        return `${MESES_NOMBRES[mesInicio - 1]}–${MESES_NOMBRES[mesFin - 1]} ${año}`;
      default:
        return `${MESES_COMPLETOS[mes - 1]} ${año}`;
    }
  }, [tipoPeriodo, mes, año, quarter, mesInicio, mesFin]);

  return (
    <PeriodoContext.Provider
      value={{
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
        mesesDelPeriodo,
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

export { MESES_COMPLETOS, MESES_NOMBRES };
