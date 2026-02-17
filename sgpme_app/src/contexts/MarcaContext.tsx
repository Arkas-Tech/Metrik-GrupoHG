"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface MarcaContextType {
  marcaSeleccionada: string | null;
  setMarcaSeleccionada: (marca: string | null) => void;
}

const MarcaContext = createContext<MarcaContextType | undefined>(undefined);

export { MarcaContext };

export function MarcaProvider({ children }: { children: ReactNode }) {
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string | null>(
    null
  );

  return (
    <MarcaContext.Provider value={{ marcaSeleccionada, setMarcaSeleccionada }}>
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
