import { useState, useEffect, useCallback, useRef } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import {
  getCached,
  getStale,
  setCache,
  invalidateCacheByPrefix,
  deduplicateRequest,
} from "@/lib/dataCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Presencia {
  id: number;
  tipo: string;
  nombre: string;
  agencia: string | null;
  marca: string;
  ciudad: string | null;
  campana: string | null;
  ubicacion: string | null;
  contenido: string | null;
  notas: string | null;
  fecha_instalacion: string;
  duracion: string | null;
  cambio_lona: string | null;
  vista: string | null;
  iluminacion: string | null;
  dimensiones: string | null;
  proveedor: string | null;
  codigo_proveedor: string | null;
  costo_mensual: number | null;
  duracion_contrato: string | null;
  inicio_contrato: string | null;
  termino_contrato: string | null;
  impresion: string | null;
  costo_impresion: number | null;
  instalacion: string | null;
  imagenes_json: string | null;
  observaciones: string | null;
  datos_extra_json: string | null;
  creado_por: string;
}

export const usePresencias = () => {
  const [presencias, setPresencias] = useState<Presencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { marcaSeleccionada, marcasPermitidas } = useMarcaGlobal();
  const abortRef = useRef<AbortController | null>(null);

  const filterByMarcas = useCallback(
    (data: Presencia[]) => {
      if (!marcaSeleccionada && marcasPermitidas.length > 0) {
        return data.filter((p) =>
          p.agencia ? marcasPermitidas.includes(p.agencia) : false,
        );
      }
      return data;
    },
    [marcaSeleccionada, marcasPermitidas],
  );

  const cargarPresencias = useCallback(
    async () => {
      const cacheKey = `presencias:${marcaSeleccionada || "all"}`;

      // Return stale data immediately if available
      const stale = getStale<Presencia[]>(cacheKey);
      if (stale) {
        setPresencias(filterByMarcas(stale));
        setCargando(false);
      }

      // Skip network if cache is fresh
      const fresh = getCached<Presencia[]>(cacheKey);
      if (fresh) return;

      // Abort previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!stale) setCargando(true);
        setError(null);

        const url = marcaSeleccionada
          ? `${API_URL}/presencia-tradicional/?agencia=${encodeURIComponent(
              marcaSeleccionada,
            )}`
          : `${API_URL}/presencia-tradicional/`;

        const data = await deduplicateRequest<Presencia[]>(
          cacheKey,
          async () => {
            // Retry loop interno: hasta 3 intentos sin abortar el controller actual
            let lastStatus = 0;
            for (let attempt = 0; attempt <= 2; attempt++) {
              if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
              if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
              const response = await fetchConToken(url, { signal: controller.signal });
              if (response.ok) return response.json();
              lastStatus = response.status;
            }
            throw new Error(`Error al cargar presencias (${lastStatus})`);
          },
        );

        if (!controller.signal.aborted && Array.isArray(data)) {
          setCache(cacheKey, data, url);
          setPresencias(filterByMarcas(data));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    },
    [marcaSeleccionada, marcasPermitidas, filterByMarcas],
  );

  const crearPresencia = async (presenciaData: Record<string, unknown>) => {
    try {
      const formatDate = (dateStr: unknown): string | null => {
        if (!dateStr) return null;
        const s = String(dateStr);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      };
      const parseNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return isNaN(n) ? null : n;
      };

      const fechaInstalacion = formatDate(presenciaData.fecha_instalacion);
      if (!fechaInstalacion)
        throw new Error("La fecha de instalación es requerida");

      const response = await fetchConToken(
        `${API_URL}/presencia-tradicional/`,
        {
          method: "POST",
          body: JSON.stringify({
            ...presenciaData,
            fecha_instalacion: fechaInstalacion,
            cambio_lona: formatDate(presenciaData.cambio_lona),
            inicio_contrato: formatDate(presenciaData.inicio_contrato),
            termino_contrato: formatDate(presenciaData.termino_contrato),
            costo_mensual: parseNumber(presenciaData.costo_mensual),
            costo_impresion: parseNumber(presenciaData.costo_impresion),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Error al crear presencia: ${response.status}`;
        if (errorData.detail) {
          if (typeof errorData.detail === "string")
            errorMessage = errorData.detail;
          else if (Array.isArray(errorData.detail))
            errorMessage = errorData.detail
              .map(
                (e: { loc?: string[]; msg: string }) =>
                  `${e.loc?.join(".") || "campo"}: ${e.msg}`,
              )
              .join(", ");
          else errorMessage = JSON.stringify(errorData.detail);
        } else if (errorData.message) errorMessage = String(errorData.message);
        throw new Error(errorMessage);
      }

      invalidateCacheByPrefix("presencias:");
      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    }
  };

  const actualizarPresencia = async (
    id: number,
    presenciaData: Record<string, unknown>,
  ) => {
    try {
      const formatDate = (dateStr: unknown): string | null => {
        if (!dateStr) return null;
        const s = String(dateStr);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      };
      const parseNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return isNaN(n) ? null : n;
      };

      const fechaInstalacion = formatDate(presenciaData.fecha_instalacion);
      if (!fechaInstalacion)
        throw new Error("La fecha de instalación es requerida");

      const response = await fetchConToken(
        `${API_URL}/presencia-tradicional/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...presenciaData,
            fecha_instalacion: fechaInstalacion,
            cambio_lona: formatDate(presenciaData.cambio_lona),
            inicio_contrato: formatDate(presenciaData.inicio_contrato),
            termino_contrato: formatDate(presenciaData.termino_contrato),
            costo_mensual: parseNumber(presenciaData.costo_mensual),
            costo_impresion: parseNumber(presenciaData.costo_impresion),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Error al actualizar presencia: ${response.status}`;
        if (errorData.detail) {
          if (typeof errorData.detail === "string")
            errorMessage = errorData.detail;
          else if (Array.isArray(errorData.detail))
            errorMessage = errorData.detail
              .map(
                (e: { loc?: string[]; msg: string }) =>
                  `${e.loc?.join(".") || "campo"}: ${e.msg}`,
              )
              .join(", ");
          else errorMessage = JSON.stringify(errorData.detail);
        } else if (errorData.message) errorMessage = String(errorData.message);
        throw new Error(errorMessage);
      }

      invalidateCacheByPrefix("presencias:");
      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    }
  };

  const eliminarPresencia = async (id: number) => {
    try {
      const response = await fetchConToken(
        `${API_URL}/presencia-tradicional/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Error al eliminar presencia");
      }

      invalidateCacheByPrefix("presencias:");
      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    }
  };

  useEffect(() => {
    cargarPresencias();
    return () => {
      abortRef.current?.abort();
    };
  }, [cargarPresencias]);

  return {
    presencias,
    cargando,
    error,
    cargarPresencias,
    crearPresencia,
    actualizarPresencia,
    eliminarPresencia,
  };
};
