import { useState, useEffect, useCallback } from "react";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Metrica {
  id: number;
  leads: number;
  citas: number;
  pisos: number;
  utilidades: number;
  mes: number;
  anio: number;
  marca: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  creado_por: string;
  creado_por_nombre?: string;
}

export interface MetricaFormData {
  leads: number;
  citas: number;
  pisos: number;
  utilidades: number;
  mes: number;
  anio: number;
  marca: string;
}

const fetchConToken = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  return response;
};

export const useMetricas = () => {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { marcaSeleccionada } = useMarcaGlobal();

  const cargarMetricas = useCallback(
    async (mes?: number, anio?: number) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (marcaSeleccionada) {
          params.append("marca", marcaSeleccionada.toLowerCase());
        }
        if (mes !== undefined) {
          params.append("mes", mes.toString());
        }
        if (anio !== undefined) {
          params.append("anio", anio.toString());
        }

        const response = await fetchConToken(
          `${API_URL}/metricas?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Error al cargar métricas");
        }

        const data = await response.json();
        setMetricas(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error al cargar métricas:", err);
      } finally {
        setLoading(false);
      }
    },
    [marcaSeleccionada]
  );

  const crearMetrica = async (
    metricaData: MetricaFormData
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchConToken(`${API_URL}/metricas`, {
        method: "POST",
        body: JSON.stringify(metricaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al crear métrica");
      }

      await cargarMetricas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error al crear métrica:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const actualizarMetrica = async (
    id: number,
    metricaData: MetricaFormData
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchConToken(`${API_URL}/metricas/${id}`, {
        method: "PUT",
        body: JSON.stringify(metricaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al actualizar métrica");
      }

      await cargarMetricas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error al actualizar métrica:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const eliminarMetrica = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchConToken(`${API_URL}/metricas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al eliminar métrica");
      }

      await cargarMetricas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error al eliminar métrica:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  return {
    metricas,
    loading,
    error,
    cargarMetricas,
    crearMetrica,
    actualizarMetrica,
    eliminarMetrica,
  };
};
