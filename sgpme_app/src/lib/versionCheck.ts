/**
 * Sistema de verificación de versión AUTOMÁTICO.
 *
 * Detecta actualizaciones comparando el BUILD_ID del cliente
 * con el del servidor via /api/version.
 *
 * ✅ No requiere bump manual de versión
 * ✅ Cada `npm run build` genera un BUILD_ID único automáticamente
 * ✅ Preserva datos de formularios (borradores) durante la actualización
 */

const BUILD_ID_KEY = "sgpme_build_id";
const DRAFT_PREFIX = "sgpme_draft_";

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentBuildId: string | null;
  serverBuildId: string | null;
}

/**
 * Consulta /api/version para comparar el BUILD_ID actual del cliente
 * con el que tiene el servidor. Si difieren, hay una actualización.
 */
export async function checkVersion(): Promise<VersionCheckResult> {
  if (typeof window === "undefined") {
    return { hasUpdate: false, currentBuildId: null, serverBuildId: null };
  }

  try {
    // Fetch con no-cache para evitar respuestas stale
    const response = await fetch("/api/version", {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    });

    if (!response.ok) {
      console.warn("[VersionCheck] API responded with", response.status);
      return { hasUpdate: false, currentBuildId: null, serverBuildId: null };
    }

    const { buildId: serverBuildId } = await response.json();
    if (!serverBuildId) {
      return { hasUpdate: false, currentBuildId: null, serverBuildId: null };
    }

    const currentBuildId = localStorage.getItem(BUILD_ID_KEY);

    // Primera visita — guardar BUILD_ID actual sin notificar
    if (currentBuildId === null) {
      localStorage.setItem(BUILD_ID_KEY, serverBuildId);
      return { hasUpdate: false, currentBuildId: serverBuildId, serverBuildId };
    }

    // Comparar
    if (currentBuildId !== serverBuildId) {
      console.log(
        `🆕 Nueva versión: ${currentBuildId.slice(0, 8)}… → ${serverBuildId.slice(0, 8)}…`,
      );
      return { hasUpdate: true, currentBuildId, serverBuildId };
    }

    return { hasUpdate: false, currentBuildId, serverBuildId };
  } catch (error) {
    // Fallos de red silenciosos — el usuario puede estar offline
    console.warn("[VersionCheck] Error:", error);
    return { hasUpdate: false, currentBuildId: null, serverBuildId: null };
  }
}

/**
 * Aplica la actualización:
 * 1. Preserva borradores de formularios
 * 2. Limpia caché
 * 3. Guarda nuevo BUILD_ID
 * 4. Recarga la página
 */
export function acceptUpdate(serverBuildId?: string) {
  console.log("✅ Usuario aceptó actualización");

  // 1. Preservar borradores ANTES de limpiar
  const drafts = preserveDrafts();

  // 2. Limpiar caché
  clearAllCache();

  // 3. Restaurar borradores
  restoreDrafts(drafts);

  // 4. Guardar nuevo BUILD_ID
  if (serverBuildId) {
    localStorage.setItem(BUILD_ID_KEY, serverBuildId);
  }

  // 5. Recargar
  window.location.reload();
}

// ─── Funciones internas ────────────────────────────────────

/** Guarda temporalmente todos los borradores de formularios */
function preserveDrafts(): Array<[string, string]> {
  const drafts: Array<[string, string]> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) drafts.push([key, value]);
      }
    }
  } catch {
    // Silenciar
  }
  return drafts;
}

/** Restaura borradores después de limpiar caché */
function restoreDrafts(drafts: Array<[string, string]>) {
  for (const [key, value] of drafts) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silenciar
    }
  }
}

export function clearAllCache() {
  console.log("🧹 Limpiando caché...");

  try {
    // Limpiar localStorage (excepto borradores y BUILD_ID)
    const keysToKeep = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX) || key === BUILD_ID_KEY) {
        keysToKeep.add(key);
      }
    }
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToKeep.has(key)) {
        localStorage.removeItem(key);
      }
    });

    // Limpiar sessionStorage
    sessionStorage.clear();

    // Limpiar cookies (preservar token de autenticación)
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name && name !== "token") {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    // Actualizar Service Workers (no eliminar — actualizar)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.update();
          console.log("🔄 Service worker actualizado");
        });
      });
    }

    // Limpiar cache API
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    console.log("✅ Caché limpiado");
  } catch (error) {
    console.error("Error limpiando caché:", error);
  }
}

export function forceReload() {
  console.log("🔄 Forzando recarga completa...");
  clearAllCache();
  window.location.reload();
}
