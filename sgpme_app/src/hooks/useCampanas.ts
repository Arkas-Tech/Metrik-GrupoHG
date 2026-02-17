import { useState, useCallback } from "react";
import { fetchConToken } from "@/lib/auth-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Campana {
  id: number;
  nombre: string;
  estado: string;
  plataforma: string;
  leads: number;
  alcance: number;
  interacciones: number;
  ctr: number;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: number;
  gasto_actual: number;
  auto_objetivo: string;
  conversion: number;
  cxc_porcentaje: number;
  marca: string;
  imagenes_json?: string;
  creado_por: string;
}

export interface CampanaFormData {
  nombre: string;
  estado: string;
  plataforma: string;
  leads: number;
  alcance: number;
  interacciones: number;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: number;
  gasto_actual: number;
  auto_objetivo: string;
  conversion: number;
  cxc_porcentaje: number;
  marca: string;
  imagenes_json?: string;
}

export function useCampanas() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarCampanas = useCallback(async (marca?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = marca
        ? `${API_URL}/campanas/?marca=${encodeURIComponent(marca)}`
        : `${API_URL}/campanas/`;

      const response = await fetchConToken(url);

      if (!response.ok) {
        throw new Error("Error al cargar campañas");
      }

      const data = await response.json();
      setCampanas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error al cargar campañas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearCampana = useCallback(
    async (campanaData: CampanaFormData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchConToken(`${API_URL}/campanas/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(campanaData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al crear campaña");
        }

        await cargarCampanas();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error al crear campaña:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cargarCampanas]
  );

  const actualizarCampana = useCallback(
    async (id: number, campanaData: CampanaFormData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchConToken(`${API_URL}/campanas/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(campanaData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al actualizar campaña");
        }

        await cargarCampanas();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error al actualizar campaña:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cargarCampanas]
  );

  const eliminarCampana = useCallback(
    async (id: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchConToken(`${API_URL}/campanas/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al eliminar campaña");
        }

        await cargarCampanas();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error al eliminar campaña:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cargarCampanas]
  );

  return {
    campanas,
    loading,
    error,
    cargarCampanas,
    crearCampana,
    actualizarCampana,
    eliminarCampana,
  };
}
