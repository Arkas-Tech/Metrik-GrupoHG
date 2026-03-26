"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthProvider as AuthBackendProvider } from "@/hooks/useAuthBackend";
import { AuthConfigProvider } from "@/hooks/useAuthUnified";
import { MarcaProvider } from "@/contexts/MarcaContext";
import { DevToolsProvider } from "@/contexts/DevToolsContext";
import { useServiceWorker } from "@/hooks/useServiceWorker";

interface ClientProvidersProps {
  children: ReactNode;
  useBackend?: boolean;
}

export default function ClientProviders({
  children,
  useBackend = false,
}: ClientProvidersProps) {
  // Activar actualizaciones automáticas del service worker
  useServiceWorker();

  return (
    <AuthConfigProvider useBackend={useBackend}>
      <AuthProvider>
        <AuthBackendProvider>
          <MarcaProvider>
            <DevToolsProvider>{children}</DevToolsProvider>
          </MarcaProvider>
        </AuthBackendProvider>
      </AuthProvider>
    </AuthConfigProvider>
  );
}
