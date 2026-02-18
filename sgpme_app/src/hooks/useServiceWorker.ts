"use client";

import { useEffect } from "react";

/**
 * Hook para manejar actualizaciones automáticas del Service Worker
 * 
 * Funcionalidad:
 * - Detecta cuando hay una nueva versión del service worker
 * - Activa inmediatamente la nueva versión (skip waiting)
 * - Recarga la página automáticamente para aplicar cambios
 * - Solo se ejecuta en producción y cuando el navegador soporta service workers
 */
export function useServiceWorker() {
  useEffect(() => {
    // Solo en producción y con soporte de service worker
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let refreshing = false;

    // Listener para cuando el SW toma control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("🔄 Nueva versión disponible, recargando...");
      window.location.reload();
    });

    // Registrar y verificar actualizaciones
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
      })
      .then((registration) => {
        console.log("✅ Service Worker registrado");

        // Verificar actualizaciones cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);

        // Listener para cuando se instala un nuevo SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Hay una nueva versión del SW esperando
              console.log("📦 Nueva versión del SW lista");
              // Enviar mensaje al SW para que haga skip waiting
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        console.error("❌ Error registrando Service Worker:", error);
      });

    // Cleanup
    return () => {
      // No hay cleanup necesario, los listeners permanecen
    };
  }, []);
}
