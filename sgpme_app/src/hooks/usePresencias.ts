import { useState, useEffect, useCallback } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

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

  const cargarPresencias = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const url = marcaSeleccionada
        ? `${API_URL}/presencia-tradicional/?agencia=${encodeURIComponent(
            marcaSeleccionada,
          )}`
        : `${API_URL}/presencia-tradicional/`;

      const response = await fetchConToken(url);

      if (!response.ok) {
        throw new Error("Error al cargar presencias");
      }

      const data = await response.json();
      // Si no hay marca específica, filtrar por marcas permitidas del usuario
      if (!marcaSeleccionada && marcasPermitidas.length > 0) {
        setPresencias(
          data.filter((p: Presencia) =>
            p.agencia ? marcasPermitidas.includes(p.agencia) : false,
          ),
        );
      } else {
        setPresencias(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error cargando presencias:", err);
    } finally {
      setCargando(false);
    }
  }, [marcaSeleccionada, marcasPermitidas]);

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

      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error creando presencia:", err);
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

      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error actualizando presencia:", err);
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

      await cargarPresencias();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error eliminando presencia:", err);
      return false;
    }
  };

  useEffect(() => {
    cargarPresencias();
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
