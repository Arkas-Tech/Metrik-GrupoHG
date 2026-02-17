"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthProvider as AuthBackendProvider } from "@/hooks/useAuthBackend";
import { AuthConfigProvider } from "@/hooks/useAuthUnified";
import { MarcaProvider } from "@/contexts/MarcaContext";

interface ClientProvidersProps {
  children: ReactNode;
  useBackend?: boolean;
}

export default function ClientProviders({
  children,
  useBackend = false,
}: ClientProvidersProps) {
  return (
    <AuthConfigProvider useBackend={useBackend}>
      <AuthProvider>
        <AuthBackendProvider>
          <MarcaProvider>{children}</MarcaProvider>
        </AuthBackendProvider>
      </AuthProvider>
    </AuthConfigProvider>
  );
}
