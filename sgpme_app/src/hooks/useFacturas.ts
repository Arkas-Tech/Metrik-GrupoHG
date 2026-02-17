"use client";

import { useState, useEffect, useCallback } from "react";
import { Factura, FiltrosFactura, EstadisticasFactura } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useFacturas() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFacturas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchConToken(`${API_URL}/facturas/`);

      if (!response.ok) {
        throw new Error(`Error al cargar facturas: ${response.status}`);
      }

      const data = await response.json();

      // Transformar los datos del backend para asegurar compatibilidad
      const facturasTransformadas = data.map(
        (factura: Factura & { evento_id?: number; monto?: number }) => ({
          ...factura,
          eventoId:
            factura.eventoId || factura.evento_id?.toString() || undefined,
          total: factura.total || factura.monto || 0,
        })
      );

      setFacturas(facturasTransformadas);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error cargando facturas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  const guardarFacturas = useCallback(async (nuevasFacturas: Factura[]) => {
    try {
      const response = await fetch("/api/facturas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevasFacturas),
      });

      if (!response.ok) throw new Error("Error al guardar facturas");
      setFacturas(nuevasFacturas);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      return false;
    }
  }, []);

  const guardarFactura = useCallback(
    async (factura: Factura): Promise<boolean> => {
      const facturasActualizadas = facturas.some((f) => f.id === factura.id)
        ? facturas.map((f) => (f.id === factura.id ? factura : f))
        : [...facturas, factura];
      return await guardarFacturas(facturasActualizadas);
    },
    [facturas, guardarFacturas]
  );

  const eliminarFactura = useCallback(
    async (id: string): Promise<boolean> => {
      const facturasActualizadas = facturas.filter((f) => f.id !== id);
      return await guardarFacturas(facturasActualizadas);
    },
    [facturas, guardarFacturas]
  );

  const marcarComoPagada = useCallback(
    async (id: string): Promise<boolean> => {
      const factura = facturas.find((f) => f.id === id);
      if (!factura) return false;

      const facturaActualizada: Factura = {
        ...factura,
        estado: "Pagada",
        fechaRealPago: new Date().toISOString().split("T")[0],
        fechaModificacion: new Date().toISOString(),
      };

      return await guardarFactura(facturaActualizada);
    },
    [facturas, guardarFactura]
  );

  const autorizar = useCallback(
    async (id: string, autorizadoPor: string): Promise<boolean> => {
      const factura = facturas.find((f) => f.id === id);
      if (!factura) return false;

      const facturaActualizada: Factura = {
        ...factura,
        estado: "Autorizada",
        autorizadoPor,
        fechaAutorizacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      };

      return await guardarFactura(facturaActualizada);
    },
    [facturas, guardarFactura]
  );

  const rechazar = useCallback(
    async (id: string): Promise<boolean> => {
      const factura = facturas.find((f) => f.id === id);
      if (!factura) return false;

      const facturaActualizada: Factura = {
        ...factura,
        estado: "Rechazada",
        fechaModificacion: new Date().toISOString(),
      };

      return await guardarFactura(facturaActualizada);
    },
    [facturas, guardarFactura]
  );

  const obtenerFacturasPorFiltros = useCallback(
    (filtros: FiltrosFactura): Factura[] => {
      return facturas.filter((factura) => {
        if (filtros.estado !== "Todas" && factura.estado !== filtros.estado) {
          return false;
        }
        if (filtros.busqueda) {
          const busqueda = filtros.busqueda.toLowerCase();
          const textoFactura = `${factura.folio} ${factura.proveedor} ${
            factura.observaciones || ""
          }`.toLowerCase();
          if (!textoFactura.includes(busqueda)) {
            return false;
          }
        }
        return true;
      });
    },
    [facturas]
  );

  const obtenerEstadisticas = useCallback(
    (facturasFiltradas: Factura[]): EstadisticasFactura => {
      const totalFacturas = facturasFiltradas.length;
      const montoTotal = facturasFiltradas.reduce((sum, f) => sum + f.total, 0);

      return {
        totalFacturas,
        montoTotal,
        facturasPendientes: facturasFiltradas.filter(
          (f) => f.estado === "Pendiente"
        ).length,
        facturasAutorizadas: facturasFiltradas.filter(
          (f) => f.estado === "Autorizada"
        ).length,
        facturasPagadas: facturasFiltradas.filter(
          (f) => f.estado === "Ingresada"
        ).length,
        montosPorEstado: {
          pendiente: facturasFiltradas
            .filter((f) => f.estado === "Pendiente")
            .reduce((sum, f) => sum + f.total, 0),
          autorizada: facturasFiltradas
            .filter((f) => f.estado === "Autorizada")
            .reduce((sum, f) => sum + f.total, 0),
          pagada: facturasFiltradas
            .filter((f) => f.estado === "Ingresada")
            .reduce((sum, f) => sum + f.total, 0),
        },
      };
    },
    []
  );

  const exportarPDF = useCallback(async (id?: string): Promise<boolean> => {
    console.log(`Exportando factura${id ? ` ${id}` : "s"} a PDF...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }, []);

  const exportarExcel = useCallback(async (): Promise<boolean> => {
    console.log("Exportando facturas a Excel...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }, []);

  return {
    facturas,
    loading,
    error,
    cargarFacturas,
    guardarFactura,
    eliminarFactura,
    marcarComoPagada,
    autorizar,
    rechazar,
    obtenerFacturasPorFiltros,
    obtenerEstadisticas,
    exportarPDF,
    exportarExcel,
  };
}
