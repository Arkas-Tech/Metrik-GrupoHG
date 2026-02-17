"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { checkVersion, acceptUpdate } from "@/lib/versionCheck";
import UpdateNotification from "./UpdateNotification";

/**
 * Componente inteligente de verificación de versión.
 *
 * ✅ Detecta actualizaciones automáticamente via /api/version
 * ✅ Respeta la actividad del usuario — no interrumpe edición
 * ✅ Verifica al volver a la pestaña, al reconectar, y periódicamente
 * ✅ Backoff progresivo si el usuario descarta la notificación
 */

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const IDLE_THRESHOLD = 30 * 1000; // 30 segundos sin actividad
const MAX_DISMISS_COUNT = 3; // Después de 3 descartes, dejar de molestar por un rato
const DISMISS_COOLDOWN = 30 * 60 * 1000; // 30 min cooldown después de múltiples descartes

export default function VersionChecker() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);

  const lastActivityRef = useRef(Date.now());
  const dismissCountRef = useRef(0);
  const lastDismissTimeRef = useRef(0);
  const checkingRef = useRef(false);

  // ─── Rastrear actividad del usuario ──────────────────────
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Eventos que indican actividad activa
    const events = ["keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) =>
      window.addEventListener(e, updateActivity, { passive: true }),
    );

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, []);

  // ─── Verificar versión (async) ───────────────────────────
  const doCheck = useCallback(async (respectIdle = true) => {
    // Evitar checks concurrentes
    if (checkingRef.current) return;

    // Si respetamos idle, solo verificar si el usuario está inactivo
    if (respectIdle) {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime < IDLE_THRESHOLD) return;
    }

    // Respetar cooldown de descartes
    if (dismissCountRef.current >= MAX_DISMISS_COUNT) {
      const timeSinceLastDismiss = Date.now() - lastDismissTimeRef.current;
      if (timeSinceLastDismiss < DISMISS_COOLDOWN) return;
      // Reset después del cooldown
      dismissCountRef.current = 0;
    }

    checkingRef.current = true;
    try {
      const result = await checkVersion();
      if (result.hasUpdate && result.serverBuildId) {
        setServerBuildId(result.serverBuildId);
        setShowUpdateNotification(true);
      }
    } catch {
      // Silencioso — no molestar al usuario por errores de red
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // ─── Setup de verificación periódica ─────────────────────
  useEffect(() => {
    // Check inicial (sin respetar idle — primera carga)
    const initialTimer = setTimeout(() => doCheck(false), 3000);

    // Verificar periódicamente
    const interval = setInterval(() => doCheck(true), CHECK_INTERVAL);

    // Verificar cuando la pestaña vuelve a estar visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Delay para no interferir con la navegación del usuario
        setTimeout(() => doCheck(false), 2000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Verificar cuando se reconecta a internet
    const handleOnline = () => {
      setTimeout(() => doCheck(false), 3000);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [doCheck]);

  // ─── Handlers ────────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    acceptUpdate(serverBuildId ?? undefined);
  }, [serverBuildId]);

  const handleDismiss = useCallback(() => {
    setShowUpdateNotification(false);
    dismissCountRef.current += 1;
    lastDismissTimeRef.current = Date.now();
  }, []);

  return (
    <UpdateNotification
      show={showUpdateNotification}
      onUpdate={handleUpdate}
      onDismiss={handleDismiss}
    />
  );
}
