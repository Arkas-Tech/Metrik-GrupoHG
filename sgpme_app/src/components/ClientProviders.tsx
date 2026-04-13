"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthProvider as AuthBackendProvider } from "@/hooks/useAuthBackend";
import { AuthConfigProvider } from "@/hooks/useAuthUnified";
import { MarcaProvider } from "@/contexts/MarcaContext";
import { PeriodoProvider } from "@/contexts/PeriodoContext";
import { DevToolsProvider } from "@/contexts/DevToolsContext";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import ToastNotification from "@/components/ToastNotification";

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
    <MaintenanceGuard>
      <AuthConfigProvider useBackend={useBackend}>
        <AuthProvider>
          <AuthBackendProvider>
            <MarcaProvider>
              <PeriodoProvider>
                <DevToolsProvider>
                  {children}
                  <ToastNotification />
                </DevToolsProvider>
              </PeriodoProvider>
            </MarcaProvider>
          </AuthBackendProvider>
        </AuthProvider>
      </AuthConfigProvider>
    </MaintenanceGuard>
  );
}
