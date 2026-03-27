"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useAuth as useAuthLocal,
  obtenerNombreRol as getNombreLocal,
  obtenerColorRol as getColorLocal,
} from "@/hooks/useAuth";
import { useAuth as useAuthBackend } from "@/hooks/useAuthBackend";

const AuthConfigContext = createContext<{ useBackend: boolean }>({
  useBackend: false,
});

export function AuthConfigProvider({
  children,
  useBackend = false,
}: {
  children: ReactNode;
  useBackend?: boolean;
}) {
  return (
    <AuthConfigContext.Provider value={{ useBackend }}>
      {children}
    </AuthConfigContext.Provider>
  );
}

export function useAuth() {
  const { useBackend } = useContext(AuthConfigContext);
  const authLocal = useAuthLocal();
  const authBackend = useAuthBackend();

  if (useBackend) {
    return authBackend;
  }

  return authLocal;
}

export const obtenerNombreRol = getNombreLocal;
export const obtenerColorRol = getColorLocal;
