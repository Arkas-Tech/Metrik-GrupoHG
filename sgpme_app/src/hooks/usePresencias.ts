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
  creado_por: string;
}

export const usePresencias = () => {
  const [presencias, setPresencias] = useState<Presencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { marcaSeleccionada } = useMarcaGlobal();

  const cargarPresencias = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const url = marcaSeleccionada
        ? `${API_URL}/presencia-tradicional/?agencia=${encodeURIComponent(
            marcaSeleccionada
          )}`
        : `${API_URL}/presencia-tradicional/`;

      const response = await fetchConToken(url);

      if (!response.ok) {
        throw new Error("Error al cargar presencias");
      }

      const data = await response.json();
      setPresencias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error cargando presencias:", err);
    } finally {
      setCargando(false);
    }
  }, [marcaSeleccionada]);

  const crearPresencia = async (presenciaData: {
    tipo: string;
    nombre: string;
    agencia: string;
    marca: string;
    ciudad: string;
    campana: string;
    ubicacion: string;
    contenido: string;
    notas: string;
    fecha_instalacion: string;
    duracion: string;
    cambio_lona: string;
    vista: string;
    iluminacion: string;
    dimensiones: string;
    proveedor: string;
    codigo_proveedor: string;
    costo_mensual: number;
    duracion_contrato: string;
    inicio_contrato: string;
    termino_contrato: string;
    impresion: string;
    costo_impresion: number;
    instalacion: string;
    observaciones: string;
    imagenes: Array<{
      id: string;
      nombre: string;
      url: string;
      descripcion: string;
    }>;
  }) => {
    try {
      const imagenesUrls =
        presenciaData.imagenes?.map((img: { url: string }) => img.url) || [];

      const formatDate = (
        dateStr: string | null | undefined
      ): string | null => {
        if (!dateStr) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
      };

      const parseNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      const fechaInstalacion = formatDate(presenciaData.fecha_instalacion);
      if (!fechaInstalacion) {
        throw new Error("La fecha de instalación es requerida");
      }

      const response = await fetchConToken(
        `${API_URL}/presencia-tradicional/`,
        {
          method: "POST",
          body: JSON.stringify({
            tipo: presenciaData.tipo,
            nombre: presenciaData.nombre,
            agencia: presenciaData.agencia || null,
            marca: presenciaData.marca,
            ciudad: presenciaData.ciudad || null,
            campana: presenciaData.campana || null,
            ubicacion: presenciaData.ubicacion || null,
            contenido: presenciaData.contenido || null,
            notas: presenciaData.notas || null,
            fecha_instalacion: fechaInstalacion,
            duracion: presenciaData.duracion || null,
            cambio_lona: formatDate(presenciaData.cambio_lona),
            vista: presenciaData.vista || null,
            iluminacion: presenciaData.iluminacion || null,
            dimensiones: presenciaData.dimensiones || null,
            proveedor: presenciaData.proveedor || null,
            codigo_proveedor: presenciaData.codigo_proveedor || null,
            costo_mensual: parseNumber(presenciaData.costo_mensual),
            duracion_contrato: presenciaData.duracion_contrato || null,
            inicio_contrato: formatDate(presenciaData.inicio_contrato),
            termino_contrato: formatDate(presenciaData.termino_contrato),
            impresion: presenciaData.impresion || null,
            costo_impresion: parseNumber(presenciaData.costo_impresion),
            instalacion: presenciaData.instalacion || null,
            imagenes_json: JSON.stringify(imagenesUrls),
            observaciones: presenciaData.observaciones || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Error al crear presencia: ${response.status}`;

        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map(
                (err: { loc?: string[]; msg: string }) =>
                  `${err.loc?.join(".") || "campo"}: ${err.msg}`
              )
              .join(", ");
          } else if (typeof errorData.detail === "object") {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message && typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }

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
    presenciaData: {
      tipo: string;
      nombre: string;
      agencia: string;
      marca: string;
      ciudad: string;
      campana: string;
      ubicacion: string;
      contenido: string;
      notas: string;
      fecha_instalacion: string;
      duracion: string;
      cambio_lona: string;
      vista: string;
      iluminacion: string;
      dimensiones: string;
      proveedor: string;
      codigo_proveedor: string;
      costo_mensual: number;
      duracion_contrato: string;
      inicio_contrato: string;
      termino_contrato: string;
      impresion: string;
      costo_impresion: number;
      instalacion: string;
      observaciones: string;
      imagenes: Array<{
        id: string;
        nombre: string;
        url: string;
        descripcion: string;
      }>;
    }
  ) => {
    try {
      const imagenesUrls =
        presenciaData.imagenes?.map((img: { url: string }) => img.url) || [];

      const formatDate = (
        dateStr: string | null | undefined
      ): string | null => {
        if (!dateStr) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
      };

      const parseNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      const fechaInstalacion = formatDate(presenciaData.fecha_instalacion);
      if (!fechaInstalacion) {
        throw new Error("La fecha de instalación es requerida");
      }

      const response = await fetchConToken(
        `${API_URL}/presencia-tradicional/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            tipo: presenciaData.tipo,
            nombre: presenciaData.nombre,
            agencia: presenciaData.agencia || null,
            marca: presenciaData.marca,
            ciudad: presenciaData.ciudad || null,
            campana: presenciaData.campana || null,
            ubicacion: presenciaData.ubicacion || null,
            contenido: presenciaData.contenido || null,
            notas: presenciaData.notas || null,
            fecha_instalacion: fechaInstalacion,
            duracion: presenciaData.duracion || null,
            cambio_lona: formatDate(presenciaData.cambio_lona),
            vista: presenciaData.vista || null,
            iluminacion: presenciaData.iluminacion || null,
            dimensiones: presenciaData.dimensiones || null,
            proveedor: presenciaData.proveedor || null,
            codigo_proveedor: presenciaData.codigo_proveedor || null,
            costo_mensual: parseNumber(presenciaData.costo_mensual),
            duracion_contrato: presenciaData.duracion_contrato || null,
            inicio_contrato: formatDate(presenciaData.inicio_contrato),
            termino_contrato: formatDate(presenciaData.termino_contrato),
            impresion: presenciaData.impresion || null,
            costo_impresion: parseNumber(presenciaData.costo_impresion),
            instalacion: presenciaData.instalacion || null,
            imagenes_json: JSON.stringify(imagenesUrls),
            observaciones: presenciaData.observaciones || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Error al actualizar presencia: ${response.status}`;

        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map(
                (err: { loc?: string[]; msg: string }) =>
                  `${err.loc?.join(".") || "campo"}: ${err.msg}`
              )
              .join(", ");
          } else if (typeof errorData.detail === "object") {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message && typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }

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
        }
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
