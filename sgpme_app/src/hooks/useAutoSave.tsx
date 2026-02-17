"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Hook de auto-guardado que preserva datos de formularios
 * durante actualizaciones y recargas de página.
 *
 * Uso:
 *   const { saveDraft, loadDraft, clearDraft } = useAutoSave("brief-form");
 *
 *   // Auto-guardar cada 5 segundos
 *   useAutoSave("brief-form", formData, 5000);
 *
 *   // Cargar borrador al montar
 *   useEffect(() => {
 *     const draft = loadDraft();
 *     if (draft) setFormData(draft);
 *   }, []);
 */

interface AutoSaveOptions {
  /** Intervalo en ms para auto-guardado (default: 5000) */
  interval?: number;
  /** Si auto-guardar está habilitado (default: true) */
  enabled?: boolean;
  /** Callback cuando se detecta un borrador al cargar */
  onDraftFound?: (draft: unknown) => void;
  /** Keys a excluir del guardado (ej: archivos, passwords) */
  excludeKeys?: string[];
}

const STORAGE_PREFIX = "sgpme_draft_";
const DRAFT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

export function useAutoSave<T extends Record<string, unknown>>(
  formId: string,
  formData?: T,
  options: AutoSaveOptions = {},
) {
  const {
    interval = 5000,
    enabled = true,
    onDraftFound,
    excludeKeys = [],
  } = options;

  const storageKey = `${STORAGE_PREFIX}${formId}`;
  const formDataRef = useRef(formData);

  // Actualizar ref en un efecto para evitar escritura durante render
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // ─── Guardar borrador ───────────────────────────────────
  const saveDraft = useCallback(
    (data?: T) => {
      try {
        const toSave = data || formDataRef.current;
        if (!toSave) return;

        // Filtrar keys excluídas (archivos, passwords, etc.)
        const filtered = { ...toSave };
        for (const key of excludeKeys) {
          delete filtered[key];
        }

        // No guardar si está vacío
        const hasData = Object.values(filtered).some(
          (v) => v !== "" && v !== null && v !== undefined && v !== 0,
        );
        if (!hasData) return;

        const envelope = {
          data: filtered,
          timestamp: Date.now(),
          formId,
        };

        localStorage.setItem(storageKey, JSON.stringify(envelope));
      } catch {
        // localStorage puede fallar (quota, private mode, etc.)
        console.warn(`[AutoSave] Error guardando borrador para ${formId}`);
      }
    },
    [storageKey, formId, excludeKeys],
  );

  // ─── Cargar borrador ────────────────────────────────────
  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const envelope = JSON.parse(raw);

      // Verificar que no sea muy viejo
      if (Date.now() - envelope.timestamp > DRAFT_MAX_AGE) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return envelope.data as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  // ─── Limpiar borrador ───────────────────────────────────
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silenciar error
    }
  }, [storageKey]);

  // ─── Verificar si hay borrador ──────────────────────────
  const hasDraft = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const envelope = JSON.parse(raw);
      return Date.now() - envelope.timestamp < DRAFT_MAX_AGE;
    } catch {
      return false;
    }
  }, [storageKey]);

  // ─── Auto-guardado periódico ────────────────────────────
  useEffect(() => {
    if (!enabled || !formData) return;

    const timer = setInterval(() => {
      saveDraft();
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, saveDraft, formData]);

  // ─── Guardar al salir de la página ──────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      saveDraft();
    };

    // beforeunload: cuando cierra/recarga tab
    window.addEventListener("beforeunload", handleBeforeUnload);

    // visibilitychange: cuando cambia de tab
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveDraft();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, saveDraft]);

  // ─── Notificar si hay borrador al montar ────────────────
  useEffect(() => {
    if (onDraftFound) {
      const draft = loadDraft();
      if (draft) {
        onDraftFound(draft);
      }
    }
  }, [onDraftFound, loadDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
  };
}

/**
 * Componente para mostrar banner de borrador recuperado
 */
interface DraftBannerProps {
  show: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftBanner({ show, onRestore, onDiscard }: DraftBannerProps) {
  if (!show) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-amber-600 text-lg">📝</span>
        <p className="text-sm text-amber-800">
          Se encontró un borrador guardado. ¿Deseas restaurarlo?
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRestore}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-md transition-colors"
        >
          Restaurar
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
