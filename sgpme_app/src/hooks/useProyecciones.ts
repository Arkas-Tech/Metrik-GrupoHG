"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Proyeccion,
  Partida,
  FiltrosProyeccion,
  EstadisticasProyeccion,
} from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

interface ProyeccionBackend {
  id: number;
  nombre?: string;
  año?: number;
  ano?: number;
  mes: number;
  marca: string;
  monto_proyectado?: number;
  monto_real?: number;
  partidas?: PartidaBackend[];
  partidas_json?: string;
  total?: number;
  estado?: string;
  fecha_creacion?: string;
}

interface PartidaBackend {
  id: number;
  concepto: string;
  monto: number;
  categoria?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useProyecciones() {
  const [proyecciones, setProyecciones] = useState<Proyeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarProyecciones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchConToken(`${API_URL}/proyecciones/`);

      if (!response.ok) {
        throw new Error(`Error al cargar proyecciones: ${response.status}`);
      }

      const data = await response.json();

      const proyeccionesTransformadas = data.map((proj: ProyeccionBackend) => ({
        id: proj.id.toString(),
        año: proj.año || proj.ano || new Date().getFullYear(),
        mes: proj.mes
          ? [
              "Enero",
              "Febrero",
              "Marzo",
              "Abril",
              "Mayo",
              "Junio",
              "Julio",
              "Agosto",
              "Septiembre",
              "Octubre",
              "Noviembre",
              "Diciembre",
            ][proj.mes - 1] || "Enero"
          : "Enero",
        marca: proj.marca || "",
        montoTotal: proj.monto_proyectado || 0,
        fechaCreacion: proj.fecha_creacion
          ? proj.fecha_creacion.split("T")[0]
          : new Date().toISOString().split("T")[0],
        partidas: proj.partidas_json ? JSON.parse(proj.partidas_json) : [],
        estado: (proj.estado || "pendiente") as "pendiente" | "aprobada",
        excedePrespuesto: !!(
          proj as ProyeccionBackend & { excede_presupuesto?: boolean }
        ).excede_presupuesto,
        autorizadaPor: (proj as ProyeccionBackend & { autorizada_por?: string })
          .autorizada_por,
        fechaAutorizacion: (
          proj as ProyeccionBackend & { fecha_autorizacion?: string }
        ).fecha_autorizacion
          ? (
              proj as ProyeccionBackend & { fecha_autorizacion?: string }
            ).fecha_autorizacion!.split("T")[0]
          : undefined,
      }));

      setProyecciones(proyeccionesTransformadas);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error cargando proyecciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProyecciones();
  }, [cargarProyecciones]);

  const guardarProyeccion = useCallback(
    async (proyeccion: Proyeccion): Promise<boolean> => {
      try {
        const isUpdate =
          proyeccion.id &&
          proyeccion.id !== "temp" &&
          proyecciones.some((p) => p.id === proyeccion.id);

        const proyeccionData = {
          nombre:
            proyeccion.id || `Proyeccion ${proyeccion.mes} ${proyeccion.año}`,
          marca: proyeccion.marca,
          periodo: "mensual",
          año: proyeccion.año,
          mes:
            typeof proyeccion.mes === "string"
              ? [
                  "Enero",
                  "Febrero",
                  "Marzo",
                  "Abril",
                  "Mayo",
                  "Junio",
                  "Julio",
                  "Agosto",
                  "Septiembre",
                  "Octubre",
                  "Noviembre",
                  "Diciembre",
                ].indexOf(proyeccion.mes) + 1
              : proyeccion.mes || 1,
          categoria: "General",
          monto_proyectado: proyeccion.montoTotal,
          descripcion: `Proyección para ${proyeccion.marca} - ${
            proyeccion.mes
          } ${proyeccion.año}${
            proyeccion.partidas && proyeccion.partidas.length > 0
              ? ` (${proyeccion.partidas.length} partida(s))`
              : ""
          }`,
          estado: proyeccion.estado || "pendiente",
          partidas_json:
            proyeccion.partidas && proyeccion.partidas.length > 0
              ? JSON.stringify(proyeccion.partidas)
              : null,
          excede_presupuesto: proyeccion.excedePrespuesto || false,
        };

        console.log("Enviando datos al backend:", proyeccionData);
        console.log("Is update:", isUpdate, "ID:", proyeccion.id);

        let response;
        if (isUpdate) {
          response = await fetchConToken(
            `${API_URL}/proyecciones/${proyeccion.id}`,
            {
              method: "PUT",
              body: JSON.stringify(proyeccionData),
            },
          );
        } else {
          response = await fetchConToken(`${API_URL}/proyecciones/`, {
            method: "POST",
            body: JSON.stringify(proyeccionData),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status}: ${errorText}`);
          throw new Error(
            `Error al ${isUpdate ? "actualizar" : "crear"} proyección: ${
              response.status
            } - ${errorText}`,
          );
        }

        await cargarProyecciones();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al guardar proyección",
        );
        console.error("Error guardando proyección:", err);
        return false;
      }
    },
    [cargarProyecciones, proyecciones],
  );

  const crearProyeccion = useCallback(
    async (proyeccionData: Partial<Proyeccion>): Promise<boolean> => {
      const nuevaProyeccion: Proyeccion = {
        id: "temp",
        año: proyeccionData.año || new Date().getFullYear(),
        mes: proyeccionData.mes || "Enero",
        marca: proyeccionData.marca || "",
        montoTotal: proyeccionData.montoTotal || 0,
        fechaCreacion: new Date().toISOString().split("T")[0],
        partidas: proyeccionData.partidas || [],
        estado: "pendiente",
        excedePrespuesto: false,
      };

      return await guardarProyeccion(nuevaProyeccion);
    },
    [guardarProyeccion],
  );

  const eliminarProyeccion = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(`${API_URL}/proyecciones/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Error al eliminar proyección");
        }

        await cargarProyecciones();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al eliminar proyección",
        );
        console.error("Error eliminando proyección:", err);
        return false;
      }
    },
    [cargarProyecciones],
  );

  const obtenerProyeccionesPorFiltros = useCallback(
    (filtros: FiltrosProyeccion): Proyeccion[] => {
      return proyecciones.filter((proyeccion) => {
        // Filtrar por meses (ahora es un array)
        if (filtros.meses && filtros.meses.length > 0) {
          if (!filtros.meses.includes(proyeccion.mes)) {
            return false;
          }
        }

        if (filtros.año && proyeccion.año !== filtros.año) {
          return false;
        }

        return true;
      });
    },
    [proyecciones],
  );

  const obtenerEstadisticas = useCallback(
    (proyeccionesFiltradas: Proyeccion[]): EstadisticasProyeccion => {
      const totalProyecciones = proyeccionesFiltradas.length;
      const montoTotalGeneral = proyeccionesFiltradas.reduce(
        (sum, p) => sum + p.montoTotal,
        0,
      );

      const marcasUnicas = [
        ...new Set(proyeccionesFiltradas.map((p) => p.marca)),
      ];
      const mesesActivos = [
        ...new Set(proyeccionesFiltradas.map((p) => p.mes)),
      ];

      return {
        totalProyecciones,
        montoTotalGeneral,
        marcas: marcasUnicas,
        mesesActivos,
      };
    },
    [],
  );

  const exportarPDF = useCallback(async (id?: string): Promise<boolean> => {
    try {
      console.log(`Exportando proyección${id ? ` ${id}` : "es"} a PDF...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar PDF");
      return false;
    }
  }, []);

  const exportarExcel = useCallback(async (): Promise<boolean> => {
    try {
      console.log("Exportando proyecciones a Excel...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar Excel");
      return false;
    }
  }, []);

  const aprobarProyeccion = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(
          `${API_URL}/proyecciones/${id}/aprobar`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error al aprobar proyección: ${errorText}`);
        }

        await cargarProyecciones();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al aprobar proyección",
        );
        console.error("Error aprobando proyección:", err);
        return false;
      }
    },
    [cargarProyecciones],
  );

  return {
    proyecciones,
    loading,
    error,
    cargarProyecciones,
    crearProyeccion,
    guardarProyeccion,
    eliminarProyeccion,
    obtenerProyeccionesPorFiltros,
    obtenerEstadisticas,
    exportarPDF,
    exportarExcel,
    aprobarProyeccion,
  };
}

export const usePartidas = () => {
  const [partidas, setPartidas] = useState<Partida[]>([]);

  const agregarPartida = useCallback((partida: Omit<Partida, "id">) => {
    const nuevaPartida: Partida = {
      ...partida,
      id: Date.now().toString(),
    };
    setPartidas((prev) => [...prev, nuevaPartida]);
    return nuevaPartida;
  }, []);

  const actualizarPartida = useCallback(
    (id: string, datos: Partial<Partida>) => {
      setPartidas((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...datos } : p)),
      );
    },
    [],
  );

  const eliminarPartida = useCallback((id: string) => {
    setPartidas((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const limpiarPartidas = useCallback(() => {
    setPartidas([]);
  }, []);

  const calcularTotal = useCallback(() => {
    return partidas.reduce((total, partida) => total + partida.monto, 0);
  }, [partidas]);

  return {
    partidas,
    agregarPartida,
    actualizarPartida,
    eliminarPartida,
    limpiarPartidas,
    calcularTotal,
    setPartidas,
  };
};
