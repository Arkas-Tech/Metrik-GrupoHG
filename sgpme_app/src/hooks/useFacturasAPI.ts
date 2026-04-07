"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Factura, FiltrosFactura, EstadisticasFactura } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";
import { showToast } from "@/lib/toast";
import {
  getCached,
  getStale,
  setCache,
  invalidateCacheByPrefix,
  deduplicateRequest,
} from "@/lib/dataCache";

interface FacturaBackend {
  id: number;
  numero_factura?: string;
  proveedor?: string;
  subtotal?: number;
  iva?: number;
  monto?: number;
  fecha_factura?: string;
  fecha_vencimiento?: string;
  fecha_pago?: string;
  fecha_ingresada?: string;
  estado?: string;
  observaciones?: string;
  productos?: string;
  proyeccion_id?: number;
  evento_id?: number;
  evento_nombre?: string;
  campanya_id?: number;
  campanya_nombre?: string;
  marca?: string;
  categoria?: string;
  subcategoria?: string;
  uso_cfdi?: string;
  metodo_pago?: string;
  orden_compra?: string;
  mes_asignado?: string;
  año_asignado?: number;
  fecha_creacion?: string;
  archivos?: ArchivoBackend[];
  cotizaciones?: CotizacionBackend[];
}

interface ArchivoBackend {
  id: number;
  nombre_archivo: string;
  tipo_archivo: string;
  fecha_subida: string;
  seccion?: string;
}

interface CotizacionBackend {
  id: number;
  proveedor: string;
  monto: number;
  nombre_archivo?: string;
  fecha_subida?: string;
  observaciones?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useFacturasAPI() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cargarFacturas = useCallback(async () => {
    const cacheKey = "facturas:all";

    // Return stale data immediately if available
    const stale = getStale<Factura[]>(cacheKey);
    if (stale) {
      setFacturas(stale);
      setLoading(false);
    }

    // Skip network if cache is fresh
    const fresh = getCached<Factura[]>(cacheKey);
    if (fresh) return;

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!stale) setLoading(true);

      const facturasTransformadas = await deduplicateRequest<Factura[]>(
        cacheKey,
        async () => {
          const response = await fetchConToken(`${API_URL}/facturas/`, {
            signal: controller.signal,
          });
          if (!response.ok)
            throw new Error(`Error al cargar facturas: ${response.status}`);
          const data = await response.json();

          return data.map((fact: FacturaBackend) => ({
            id: fact.id.toString(),
            folio: fact.numero_factura || "",
            proveedor: fact.proveedor || "",
            rfc: "",
            subtotal: fact.subtotal || 0,
            iva: fact.iva || 0,
            total: fact.monto || 0,
            fechaEmision:
              fact.fecha_factura || new Date().toISOString().split("T")[0],
            fechaEstimadaPago:
              fact.fecha_vencimiento || new Date().toISOString().split("T")[0],
            fechaRealPago: fact.fecha_pago || undefined,
            fechaIngresada: fact.fecha_ingresada || undefined,
            estado: fact.estado || "Pendiente",
            productos: fact.productos || "",
            observaciones: fact.observaciones || "",
            proyeccionId: fact.proyeccion_id
              ? fact.proyeccion_id.toString()
              : undefined,
            eventoId: fact.evento_id ? fact.evento_id.toString() : undefined,
            eventoNombre: fact.evento_nombre || undefined,
            campanyaId: fact.campanya_id
              ? fact.campanya_id.toString()
              : undefined,
            campanyaNombre: fact.campanya_nombre || undefined,
            marca: fact.marca || "",
            categoria: fact.categoria || undefined,
            subcategoria: fact.subcategoria || undefined,
            usoCfdi: fact.uso_cfdi || "",
            metodoPago: fact.metodo_pago || "",
            ordenCompra: fact.orden_compra || "",
            mesAsignado: fact.mes_asignado || undefined,
            añoAsignado: fact.año_asignado || undefined,
            archivos: (fact.archivos || []).map((archivo: ArchivoBackend) => ({
              id: archivo.id.toString(),
              nombre: archivo.nombre_archivo,
              tipo: archivo.tipo_archivo,
              url: `${API_URL}/facturas/${fact.id}/archivos/${archivo.id}/descargar`,
              fechaSubida: archivo.fecha_subida.split(" ")[0],
              seccion: archivo.seccion || undefined,
            })),
            cotizaciones: (fact.cotizaciones || []).map(
              (cotizacion: CotizacionBackend) => ({
                id: cotizacion.id.toString(),
                proveedor: cotizacion.proveedor,
                monto: cotizacion.monto,
                archivo: cotizacion.nombre_archivo
                  ? {
                      id: cotizacion.id.toString(),
                      nombre: cotizacion.nombre_archivo,
                      tipo:
                        cotizacion.nombre_archivo
                          .split(".")
                          .pop()
                          ?.toUpperCase() || "ARCHIVO",
                      url: `${API_URL}/facturas/${fact.id}/cotizaciones/${cotizacion.id}/descargar`,
                      fechaSubida:
                        cotizacion.fecha_subida?.split(" ")[0] ||
                        new Date().toISOString().split("T")[0],
                    }
                  : undefined,
                observaciones: cotizacion.observaciones,
              }),
            ),
            fechaCreacion: fact.fecha_creacion
              ? fact.fecha_creacion.split("T")[0]
              : new Date().toISOString().split("T")[0],
            fechaModificacion: undefined,
            autorizadoPor: undefined,
            fechaAutorizacion: undefined,
          }));
        },
      );

      if (!controller.signal.aborted) {
        setCache(cacheKey, facturasTransformadas);
        setFacturas(facturasTransformadas);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
    return () => {
      abortRef.current?.abort();
    };
  }, [cargarFacturas]);

  // Helper para actualización optimista local (sin recargar del servidor)
  const actualizarFacturaLocal = useCallback(
    (id: string, cambios: Partial<Factura>) => {
      setFacturas((prev) => {
        const updated = prev.map((f) =>
          f.id === id ? { ...f, ...cambios } : f,
        );
        invalidateCacheByPrefix("facturas:");
        setCache("facturas:all", updated);
        return updated;
      });
    },
    [],
  );

  const guardarFactura = useCallback(
    async (
      factura: Factura,
    ): Promise<{ success: boolean; facturaId?: string }> => {
      try {
        const isUpdate =
          factura.id &&
          factura.id !== "temp" &&
          facturas.some((f) => f.id === factura.id);

        const facturaData = {
          numero_factura: factura.folio,
          proveedor: factura.proveedor,
          subtotal: factura.subtotal,
          iva: factura.iva,
          monto: factura.total,
          fecha_factura: factura.fechaEmision,
          fecha_vencimiento: factura.fechaEstimadaPago,
          estado: factura.estado,
          marca: factura.marca,
          categoria: factura.categoria,
          subcategoria: factura.subcategoria,
          uso_cfdi: factura.usoCfdi,
          descripcion:
            factura.observaciones ||
            `Factura ${factura.folio} - ${factura.proveedor}`,
          autorizada: factura.estado === "Autorizada",
          fecha_pago: factura.fechaRealPago || null,
          metodo_pago: factura.metodoPago || null,
          orden_compra: factura.ordenCompra || null,
          productos: factura.productos || null,
          observaciones: factura.observaciones || null,
          fecha_ingresada: factura.fechaIngresada || null,
          proyeccion_id: factura.proyeccionId
            ? parseInt(factura.proyeccionId)
            : null,
          evento_id: factura.eventoId ? parseInt(factura.eventoId) : null,
          campanya_id: factura.campanyaId ? parseInt(factura.campanyaId) : null,
          mes_asignado: factura.mesAsignado || null,
          año_asignado: factura.añoAsignado || null,
        };

        let response: Response;

        if (isUpdate) {
          response = await fetchConToken(`${API_URL}/facturas/${factura.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(facturaData),
          });
        } else {
          response = await fetchConToken(`${API_URL}/facturas/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(facturaData),
          });
        }

        if (!response.ok) {
          const errorData = await response.text();
          console.error("❌ Error response:", response.status, errorData);
          throw new Error(
            `Error al ${isUpdate ? "actualizar" : "crear"} factura: ${
              response.status
            }`,
          );
        }

        let facturaId: string | undefined;
        if (!isUpdate) {
          const facturaCreada = await response.json();
          facturaId = facturaCreada.id?.toString();
          // Para nuevas facturas, necesitamos recargar para obtener datos completos
          invalidateCacheByPrefix("facturas:");
          await cargarFacturas();
        } else {
          facturaId = factura.id;
          // Actualización optimista: actualizar localmente sin recargar
          actualizarFacturaLocal(factura.id, factura);
        }

        return { success: true, facturaId };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error guardando factura:", err);
        return { success: false };
      }
    },
    [facturas, cargarFacturas, actualizarFacturaLocal],
  );

  const eliminarFactura = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(`${API_URL}/facturas/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Error al eliminar factura: ${response.status}`);
        }

        invalidateCacheByPrefix("facturas:");
        await cargarFacturas();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        return false;
      }
    },
    [cargarFacturas],
  );

  const marcarComoPagada = useCallback(
    async (id: string, comprobante: File): Promise<boolean> => {
      try {
        const formData = new FormData();

        // Agregar fecha de pago
        formData.append("fecha_pago", new Date().toISOString().split("T")[0]);

        // Agregar archivo (ahora es obligatorio)
        formData.append("comprobante", comprobante);

        const response = await fetchConToken(
          `${API_URL}/facturas/${id}/marcar-pagada`,
          {
            method: "PATCH",
            body: formData,
          },
        );

        if (!response.ok) {
          return false;
        }

        // Optimistic: actualizar localmente
        actualizarFacturaLocal(id, {
          estado: "Pagada" as Factura["estado"],
          fechaRealPago: new Date().toISOString().split("T")[0],
        });
        return true;
      } catch (error) {
        return false;
      }
    },
    [actualizarFacturaLocal],
  );

  const autorizar = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(
          `${API_URL}/facturas/${id}/autorizar`,
          {
            method: "PATCH",
          },
        );

        if (!response.ok) {
          return false;
        }

        // Optimistic: actualizar localmente
        actualizarFacturaLocal(id, {
          estado: "Autorizada" as Factura["estado"],
        });
        return true;
      } catch (error) {
        return false;
      }
    },
    [actualizarFacturaLocal],
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

      const result = await guardarFactura(facturaActualizada);
      return result.success;
    },
    [facturas, guardarFactura],
  );

  const ingresarFactura = useCallback(
    async (id: string, fechaIngreso: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(
          `${API_URL}/facturas/${id}/ingresar?fecha_ingreso=${fechaIngreso}`,
          {
            method: "PATCH",
          },
        );

        if (!response.ok) {
          return false;
        }

        // Optimistic: actualizar localmente
        actualizarFacturaLocal(id, {
          estado: "Ingresada" as Factura["estado"],
          fechaIngresada: fechaIngreso,
        });
        return true;
      } catch (error) {
        return false;
      }
    },
    [actualizarFacturaLocal],
  );

  const obtenerFacturasPorFiltros = useCallback(
    (filtros: FiltrosFactura): Factura[] => {
      const facturasFiltradas = facturas.filter((factura) => {
        // Filtro por estados múltiples (tiene prioridad sobre estado simple)
        if (filtros.estadosMultiples && filtros.estadosMultiples.length > 0) {
          if (!filtros.estadosMultiples.includes(factura.estado)) {
            return false;
          }
        } else if (
          filtros.estado !== "Todas" &&
          factura.estado !== filtros.estado
        ) {
          // Filtro por estado simple (solo si no hay estados múltiples)
          return false;
        }

        // Filtro por búsqueda
        if (filtros.busqueda) {
          const busqueda = filtros.busqueda.toLowerCase();
          const textoFactura = `${factura.folio} ${factura.proveedor} ${
            factura.observaciones || ""
          }`.toLowerCase();
          if (!textoFactura.includes(busqueda)) {
            return false;
          }
        }

        // Filtro por categoría
        if (filtros.categoria) {
          if (factura.categoria !== filtros.categoria) {
            return false;
          }
        }

        // Filtro por mes y año
        // - Si la factura tiene fechaIngresada (Autorizada/Pagada), usar fechaIngresada
        // - Si NO tiene fechaIngresada (Pendiente), usar mesAsignado y añoAsignado
        if (filtros.mes || filtros.año) {
          const meses = [
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
          ];

          // Determinar qué fecha/mes/año usar
          let mesFactura: string | undefined;
          let añoFactura: number | undefined;

          if (factura.fechaIngresada) {
            // Factura autorizada/pagada: usar fechaIngresada
            const fechaIngreso = new Date(factura.fechaIngresada);
            mesFactura = meses[fechaIngreso.getMonth()];
            añoFactura = fechaIngreso.getFullYear();
          } else {
            // Factura pendiente: usar mesAsignado y añoAsignado
            mesFactura = factura.mesAsignado;
            añoFactura = factura.añoAsignado;
          }

          // Aplicar filtros
          if (filtros.mes && mesFactura !== filtros.mes) {
            return false;
          }

          if (filtros.año && añoFactura !== filtros.año) {
            return false;
          }
        }

        return true;
      });

      // Ordenar por fecha de ingreso (las más recientes primero)
      return facturasFiltradas.sort((a, b) => {
        const fechaA = a.fechaIngresada || a.fechaCreacion;
        const fechaB = b.fechaIngresada || b.fechaCreacion;
        return new Date(fechaB).getTime() - new Date(fechaA).getTime();
      });
    },
    [facturas],
  );

  const obtenerEstadisticas = useCallback(
    (facturasFiltradas: Factura[]): EstadisticasFactura => {
      const totalFacturas = facturasFiltradas.length;
      const montoTotal = facturasFiltradas.reduce((sum, f) => sum + f.total, 0);

      return {
        totalFacturas,
        montoTotal,
        facturasPendientes: facturasFiltradas.filter(
          (f) => f.estado === "Pendiente",
        ).length,
        facturasAutorizadas: facturasFiltradas.filter(
          (f) => f.estado === "Autorizada",
        ).length,
        facturasPagadas: facturasFiltradas.filter(
          (f) => f.estado === "Ingresada",
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
    [],
  );

  const exportarExcel = useCallback(
    (facturasFiltradas: Factura[] = facturas) => {
      const headers = [
        "Folio",
        "Proveedor",
        "Monto",
        "Fecha Emisión",
        "Fecha Estimada Pago",
        "Estado",
        "Marca",
        "Observaciones",
      ].join(",");

      const rows = facturasFiltradas.map((factura) =>
        [
          `"${factura.folio}"`,
          `"${factura.proveedor}"`,
          factura.total,
          factura.fechaEmision,
          factura.fechaEstimadaPago,
          factura.estado,
          factura.marca,
          `"${factura.observaciones || ""}"`,
        ].join(","),
      );

      const csvContent = [headers, ...rows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `facturas_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [facturas],
  );

  const exportarPDF = useCallback(
    (facturasFiltradas: Factura[] = facturas) => {
      console.log("Exportando PDF de", facturasFiltradas.length, "facturas");
      showToast("Función de exportar PDF en desarrollo", "info");
    },
    [facturas],
  );

  const subirArchivos = useCallback(
    async (facturaId: string, archivos: File[]): Promise<boolean> => {
      try {
        console.log(
          "📤 Subiendo archivos a factura:",
          facturaId,
          archivos.length,
        );

        const formData = new FormData();
        archivos.forEach((archivo) => {
          formData.append("archivos", archivo);
        });

        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/archivos`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Error al subir archivos: ${response.status} - ${errorData}`,
          );
        }

        const result = await response.json();

        invalidateCacheByPrefix("facturas:");
        await cargarFacturas();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error subiendo archivos",
        );
        return false;
      }
    },
    [cargarFacturas],
  );

  const subirCotizacion = useCallback(
    async (
      facturaId: string,
      proveedor: string,
      monto: number,
      archivo: File,
      observaciones?: string,
    ): Promise<boolean> => {
      try {
        console.log("📤 Subiendo cotización a factura:", facturaId);

        const formData = new FormData();
        formData.append("proveedor", proveedor);
        formData.append("monto", monto.toString());
        formData.append("archivo", archivo);
        if (observaciones) {
          formData.append("observaciones", observaciones);
        }

        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/cotizaciones`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Error al subir cotización: ${response.status} - ${errorData}`,
          );
        }

        const result = await response.json();

        invalidateCacheByPrefix("facturas:");
        await cargarFacturas();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error subiendo cotización",
        );
        return false;
      }
    },
    [cargarFacturas],
  );

  const subirArchivosProductos = useCallback(
    async (facturaId: string, archivos: File[]): Promise<boolean> => {
      try {
        const formData = new FormData();
        archivos.forEach((archivo) => formData.append("archivos", archivo));

        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/archivos-productos`,
          { method: "POST", body: formData },
        );

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Error al subir archivos de productos: ${response.status} - ${errorData}`,
          );
        }

        invalidateCacheByPrefix("facturas:");
        await cargarFacturas();
        return true;
      } catch (err) {
        return false;
      }
    },
    [cargarFacturas],
  );

  const descargarArchivo = useCallback(
    async (facturaId: string, archivoId: string, nombreArchivo: string) => {
      try {
        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/archivos/${archivoId}/descargar`,
        );

        if (!response.ok) {
          throw new Error(`Error al descargar archivo: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error descargando archivo:", error);
        showToast("Error al descargar el archivo", "error");
      }
    },
    [],
  );

  const descargarCotizacion = useCallback(
    async (facturaId: string, cotizacionId: string, nombreArchivo: string) => {
      try {
        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/cotizaciones/${cotizacionId}/descargar`,
        );

        if (!response.ok) {
          throw new Error(`Error al descargar cotización: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error descargando cotización:", error);
        showToast("Error al descargar la cotización", "error");
      }
    },
    [],
  );

  const eliminarArchivo = useCallback(
    async (facturaId: string, archivoId: string): Promise<boolean> => {
      try {
        const response = await fetchConToken(
          `${API_URL}/facturas/${facturaId}/archivos/${archivoId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          return false;
        }

        invalidateCacheByPrefix("facturas:");
        await cargarFacturas();
        return true;
      } catch (error) {
        return false;
      }
    },
    [cargarFacturas],
  );

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
    ingresarFactura,
    obtenerFacturasPorFiltros,
    obtenerEstadisticas,
    exportarExcel,
    exportarPDF,
    subirArchivos,
    subirCotizacion,
    subirArchivosProductos,
    descargarArchivo,
    descargarCotizacion,
    eliminarArchivo,
  };
}
