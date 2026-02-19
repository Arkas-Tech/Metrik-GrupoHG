"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { MARCAS } from "@/types";
import { useAuth } from "@/hooks/useAuthUnified";

interface MarcaContextType {
  marcaSeleccionada: string | null;
  setMarcaSeleccionada: (marca: string | null) => void;
  marcasPermitidas: string[];
  /** Retorna true si la marca pasa el filtro actual (seleccionada + permisos) */
  filtraPorMarca: (marca: string) => boolean;
}

const MarcaContext = createContext<MarcaContextType | undefined>(undefined);

export { MarcaContext };

export function MarcaProvider({ children }: { children: ReactNode }) {
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string | null>(
    null,
  );

  // Obtener usuario para filtrar marcas según permisos de agencias
  let usuario: {
    tipo?: string;
    permisos_agencias?: Record<string, boolean>;
  } | null = null;
  try {
    const auth = useAuth();
    usuario = auth.usuario;
  } catch {
    // Si el contexto de auth no está disponible, usar todas las marcas
  }

  const marcasPermitidas = useMemo(() => {
    // Si no hay usuario o es admin, mostrar todas
    if (!usuario) return [...MARCAS];
    if (usuario.tipo === "administrador") return [...MARCAS];

    const agencias = usuario.permisos_agencias;
    // Si no tiene agencias asignadas, lista vacía
    if (!agencias || Object.keys(agencias).length === 0) return [];

    return MARCAS.filter((marca) => agencias[marca] === true);
  }, [usuario]);

  // Función de filtro: si hay marca seleccionada filtra por ella,
  // si no, filtra por las marcas permitidas del usuario
  const filtraPorMarca = useCallback(
    (marca: string): boolean => {
      if (marcaSeleccionada) return marca === marcaSeleccionada;
      return marcasPermitidas.includes(marca);
    },
    [marcaSeleccionada, marcasPermitidas],
  );

  // Auto-seleccionar si solo tiene una agencia permitida
  useEffect(() => {
    if (marcasPermitidas.length === 1) {
      setMarcaSeleccionada(marcasPermitidas[0]);
    } else if (
      marcaSeleccionada &&
      marcasPermitidas.length > 0 &&
      !marcasPermitidas.includes(marcaSeleccionada)
    ) {
      // Si la marca seleccionada ya no está permitida, resetear
      setMarcaSeleccionada(null);
    }
  }, [marcasPermitidas, marcaSeleccionada]);

  return (
    <MarcaContext.Provider
      value={{
        marcaSeleccionada,
        setMarcaSeleccionada,
        marcasPermitidas,
        filtraPorMarca,
      }}
    >
      {children}
    </MarcaContext.Provider>
  );
}

export function useMarcaGlobal() {
  const context = useContext(MarcaContext);
  if (context === undefined) {
    throw new Error("useMarcaGlobal must be used within a MarcaProvider");
  }
  return context;
}
