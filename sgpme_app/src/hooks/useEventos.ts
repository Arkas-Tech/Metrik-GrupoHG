"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Evento,
  GastoEvento,
  BriefEvento,
  EstadisticasEvento,
  Factura,
} from "@/types";
import { fetchConToken } from "@/lib/auth-utils";
import { showToast } from "@/lib/toast";
import { obtenerArrayMarcas } from "@/lib/evento-utils";
import {
  getCached,
  getStale,
  setCache,
  invalidateCacheByPrefix,
  deduplicateRequest,
} from "@/lib/dataCache";

interface EventoBackend {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo_evento: string;
  marca: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto?: number;
  presupuesto_aprobado?: number;
  presupuesto_estimado?: number;
  presupuesto_real?: number;
  estado: string;
  ubicacion?: string;
  responsable?: string;
  objetivo?: string;
  audiencia?: string;
  horario?: string;
  audiencia_esperada?: number;
  demografia?: string;
  nse?: string;
  numero_autos?: number;
  observaciones?: string;
  notas?: string;
  datos_confirmacion?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_modificacion?: string;
}

interface ActividadBriefBackend {
  id: number;
  nombre: string;
  descripcion: string;
  duracion: string;
  responsable: string;
  recursos: string;
}

interface CronogramaBriefBackend {
  id: number;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  responsable: string;
  estado: string;
}

interface BriefBackendInline {
  id: number;
  evento_id: number;
  marca?: string;
  objetivo_especifico: string;
  audiencia_detallada: string;
  mensaje_clave: string;
  actividades: ActividadBriefBackend[];
  cronograma: CronogramaBriefBackend[];
  requerimientos?: string;
  proveedores?: string;
  logistica?: string;
  presupuesto_detallado?: string;
  observaciones_especiales?: string;
  fecha_creacion?: string;
  fecha_modificacion?: string;
  creado_por?: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
}

interface EventoWithBrief extends EventoBackend {
  briefs?: BriefBackendInline[] | null;
  // Backward compat: backend may still send single brief
  brief?: BriefBackendInline | null;
  fecha_creacion: string;
  fecha_modificacion?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mapEventos = useCallback((data: EventoWithBrief[]): Evento[] => {
    return data.map((evento) => {
      const rawBriefs = evento.briefs || (evento.brief ? [evento.brief] : []);
      const briefs: BriefEvento[] = rawBriefs.map((b) => ({
        id: b.id.toString(),
        eventoId: evento.id.toString(),
        marca: b.marca || undefined,
        objetivoEspecifico: b.objetivo_especifico,
        audienciaDetallada: b.audiencia_detallada,
        mensajeClave: b.mensaje_clave,
        actividades: (b.actividades || []).map(
          (act: ActividadBriefBackend) => ({
            id: act.id.toString(),
            nombre: act.nombre,
            descripcion: act.descripcion,
            duracion: act.duracion,
            responsable: act.responsable,
            recursos: act.recursos,
          }),
        ),
        cronograma: (b.cronograma || []).map(
          (cron: CronogramaBriefBackend) => ({
            id: cron.id.toString(),
            actividad: cron.actividad,
            fechaInicio: cron.fecha_inicio,
            fechaFin: cron.fecha_fin,
            responsable: cron.responsable,
            estado: cron.estado,
          }),
        ),
        requerimientos: b.requerimientos || "",
        proveedores: b.proveedores || "",
        logistica: b.logistica || "",
        presupuestoDetallado: b.presupuesto_detallado || "",
        observacionesEspeciales: b.observaciones_especiales || "",
        fechaCreacion: b.fecha_creacion ? b.fecha_creacion.split("T")[0] : "",
        fechaModificacion: b.fecha_modificacion,
        creadoPor: b.creado_por,
        aprobadoPor: b.aprobado_por,
        fechaAprobacion: b.fecha_aprobacion,
      }));

      return {
        id: evento.id.toString(),
        nombre: evento.nombre,
        descripcion: evento.descripcion || "",
        tipoEvento: evento.tipo_evento,
        fechaInicio: evento.fecha_inicio,
        fechaFin: evento.fecha_fin,
        ubicacion: evento.ubicacion || "",
        marca: obtenerArrayMarcas(evento.marca),
        responsable: evento.responsable || "",
        estado: evento.estado,
        objetivo: evento.objetivo || "",
        audiencia: evento.audiencia || "",
        horario: evento.horario || undefined,
        audienciaEsperada: evento.audiencia_esperada || undefined,
        demografia: evento.demografia || undefined,
        nse: evento.nse || undefined,
        numeroAutos: evento.numero_autos || undefined,
        presupuestoEstimado: evento.presupuesto_estimado || 0,
        presupuestoReal: evento.presupuesto_real,
        observaciones: evento.observaciones || "",
        datosConfirmacion: (() => {
          try {
            return evento.datos_confirmacion
              ? JSON.parse(evento.datos_confirmacion)
              : undefined;
          } catch {
            return undefined;
          }
        })(),
        gastosProyectados: [],
        briefs: briefs.length > 0 ? briefs : undefined,
        fechaCreacion: evento.fecha_creacion,
        fechaModificacion: evento.fecha_modificacion,
        creadoPor: evento.creado_por,
      };
    });
  }, []);

  const cargarEventos = useCallback(async () => {
    const cacheKey = "eventos:all";

    // Return stale data immediately if available
    const stale = getStale<Evento[]>(cacheKey);
    if (stale) {
      setEventos(stale);
      setLoading(false);
    }

    // Skip network if cache is fresh
    const fresh = getCached<Evento[]>(cacheKey);
    if (fresh) return;

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Progressive loading: if no cached data, load current month first for instant display
      if (!stale) {
        setLoading(true);
        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

        try {
          const monthResponse = await fetchConToken(
            `${API_URL}/eventos/with-briefs?fecha_desde=${firstDay}&fecha_hasta=${lastDayStr}`,
            { signal: controller.signal },
          );
          if (monthResponse.ok && !controller.signal.aborted) {
            const monthData: EventoWithBrief[] = await monthResponse.json();
            const monthEventos = mapEventos(monthData);
            setEventos(monthEventos);
            setLoading(false);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      // Load all events without images (fast ~1.4MB)
      const eventosMapeados = await deduplicateRequest<Evento[]>(
        cacheKey,
        async () => {
          const response = await fetchConToken(
            `${API_URL}/eventos/with-briefs`,
            { signal: controller.signal },
          );
          if (!response.ok)
            throw new Error(`Error al cargar eventos: ${response.status}`);
          const data: EventoWithBrief[] = await response.json();
          return mapEventos(data);
        },
      );

      if (!controller.signal.aborted) {
        setCache(cacheKey, eventosMapeados);
        setEventos(eventosMapeados);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [mapEventos]);

  useEffect(() => {
    cargarEventos();
    return () => {
      abortRef.current?.abort();
    };
  }, [cargarEventos]);

  const crearEvento = useCallback(
    async (nuevoEvento: Omit<Evento, "id" | "fechaCreacion">) => {
      try {
        const eventoParaBackend = {
          nombre: nuevoEvento.nombre,
          descripcion: nuevoEvento.descripcion,
          tipo_evento: nuevoEvento.tipoEvento,
          fecha_inicio: nuevoEvento.fechaInicio,
          fecha_fin: nuevoEvento.fechaFin,
          ubicacion: nuevoEvento.ubicacion,
          marca: Array.isArray(nuevoEvento.marca)
            ? [...new Set(nuevoEvento.marca)].join("|")
            : nuevoEvento.marca,
          responsable: nuevoEvento.responsable,
          estado: nuevoEvento.estado,
          objetivo: nuevoEvento.objetivo,
          audiencia: nuevoEvento.audiencia,
          horario: nuevoEvento.horario || null,
          audiencia_esperada: nuevoEvento.audienciaEsperada || null,
          demografia: nuevoEvento.demografia || null,
          nse: nuevoEvento.nse || null,
          numero_autos: nuevoEvento.numeroAutos || null,
          presupuesto_estimado: nuevoEvento.presupuestoEstimado,
          presupuesto_real: nuevoEvento.presupuestoReal,
          observaciones: nuevoEvento.observaciones,
        };

        const response = await fetchConToken(`${API_URL}/eventos/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventoParaBackend),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error al crear evento:", response.status, errorData);
          throw new Error(
            `Error al crear evento: ${response.status} - ${JSON.stringify(
              errorData,
            )}`,
          );
        }

        const eventoCreado = await response.json();
        const eventoMapeado = {
          id: eventoCreado.id.toString(),
          nombre: eventoCreado.nombre,
          descripcion: eventoCreado.descripcion || "",
          tipoEvento: eventoCreado.tipo_evento,
          fechaInicio: eventoCreado.fecha_inicio,
          fechaFin: eventoCreado.fecha_fin,
          ubicacion: eventoCreado.ubicacion || "",
          marca: obtenerArrayMarcas(eventoCreado.marca),
          responsable: eventoCreado.responsable,
          estado: eventoCreado.estado,
          objetivo: eventoCreado.objetivo || "",
          audiencia: eventoCreado.audiencia || "",
          horario: eventoCreado.horario || undefined,
          audienciaEsperada: eventoCreado.audiencia_esperada || undefined,
          demografia: eventoCreado.demografia || undefined,
          nse: eventoCreado.nse || undefined,
          numeroAutos: eventoCreado.numero_autos || undefined,
          presupuestoEstimado: eventoCreado.presupuesto_estimado || 0,
          presupuestoReal: eventoCreado.presupuesto_real,
          observaciones: eventoCreado.observaciones || "",
          gastosProyectados: [],
          brief: undefined,
          fechaCreacion: eventoCreado.fecha_creacion,
          fechaModificacion: eventoCreado.fecha_modificacion,
          creadoPor: eventoCreado.creado_por,
        };
        setEventos((prev) => [eventoMapeado, ...prev]);
        invalidateCacheByPrefix("eventos:");
        return eventoMapeado;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear evento");
        throw err;
      }
    },
    [],
  );

  const actualizarEvento = useCallback(
    async (id: string, datosActualizados: Partial<Evento>) => {
      try {
        const evento = eventos.find((e) => e.id === id);
        if (!evento) return false;

        const eventoParaBackend = {
          nombre: datosActualizados.nombre || evento.nombre,
          descripcion: datosActualizados.descripcion || evento.descripcion,
          tipo_evento: datosActualizados.tipoEvento || evento.tipoEvento,
          fecha_inicio: datosActualizados.fechaInicio || evento.fechaInicio,
          fecha_fin: datosActualizados.fechaFin || evento.fechaFin,
          ubicacion: datosActualizados.ubicacion || evento.ubicacion,
          marca: (() => {
            const m = datosActualizados.marca ?? evento.marca;
            return Array.isArray(m) ? [...new Set(m)].join("|") : m;
          })(),
          responsable: datosActualizados.responsable || evento.responsable,
          estado: datosActualizados.estado || evento.estado,
          objetivo: datosActualizados.objetivo || evento.objetivo,
          audiencia: datosActualizados.audiencia || evento.audiencia,
          horario: datosActualizados.horario ?? evento.horario ?? null,
          audiencia_esperada:
            datosActualizados.audienciaEsperada ??
            evento.audienciaEsperada ??
            null,
          demografia: datosActualizados.demografia ?? evento.demografia ?? null,
          nse: datosActualizados.nse ?? evento.nse ?? null,
          numero_autos:
            datosActualizados.numeroAutos ?? evento.numeroAutos ?? null,
          presupuesto_estimado:
            datosActualizados.presupuestoEstimado || evento.presupuestoEstimado,
          presupuesto_real:
            datosActualizados.presupuestoReal || evento.presupuestoReal,
          observaciones:
            datosActualizados.observaciones || evento.observaciones,
          datos_confirmacion: (() => {
            const dc =
              datosActualizados.datosConfirmacion ?? evento.datosConfirmacion;
            return dc ? JSON.stringify(dc) : null;
          })(),
        };

        const response = await fetchConToken(`${API_URL}/eventos/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventoParaBackend),
        });

        if (!response.ok) throw new Error("Error al actualizar evento");

        const eventoActualizado: Evento = {
          ...evento,
          ...datosActualizados,
          fechaModificacion: new Date().toISOString(),
        };

        setEventos((prev) =>
          prev.map((e) => (e.id === id ? eventoActualizado : e)),
        );
        invalidateCacheByPrefix("eventos:");

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al actualizar evento",
        );
        return false;
      }
    },
    [eventos],
  );

  const eliminarEvento = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetchConToken(`${API_URL}/eventos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar evento");

      setEventos((prev) => prev.filter((evento) => evento.id !== id));
      invalidateCacheByPrefix("eventos:");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      return false;
    }
  }, []);

  const agregarGastoEvento = useCallback(
    async (eventoId: string, gasto: Omit<GastoEvento, "id">) => {
      const evento = eventos.find((e) => e.id === eventoId);
      if (!evento) return false;

      const nuevoGasto: GastoEvento = {
        ...gasto,
        id: `gasto${Date.now()}`,
      };

      const eventoActualizado: Evento = {
        ...evento,
        gastosProyectados: [...(evento.gastosProyectados || []), nuevoGasto],
        fechaModificacion: new Date().toISOString(),
      };

      setEventos((prev) =>
        prev.map((e) => (e.id === eventoId ? eventoActualizado : e)),
      );

      return true;
    },
    [eventos],
  );

  const actualizarGastoEvento = useCallback(
    async (
      eventoId: string,
      gastoId: string,
      gastoActualizado: Partial<GastoEvento>,
    ) => {
      const evento = eventos.find((e) => e.id === eventoId);
      if (!evento) return false;

      const eventoActualizadoLocal: Evento = {
        ...evento,
        gastosProyectados: (evento.gastosProyectados || []).map((gasto) =>
          gasto.id === gastoId ? { ...gasto, ...gastoActualizado } : gasto,
        ),
        fechaModificacion: new Date().toISOString(),
      };

      setEventos((prev) =>
        prev.map((e) => (e.id === eventoId ? eventoActualizadoLocal : e)),
      );

      return true;
    },
    [eventos],
  );

  const guardarBrief = useCallback(
    async (
      eventoId: string,
      brief: Omit<BriefEvento, "id" | "eventoId" | "fechaCreacion">,
    ) => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);
        if (!evento) return null;

        const briefParaBackend = {
          marca: brief.marca || null,
          objetivo_especifico: brief.objetivoEspecifico,
          audiencia_detallada: brief.audienciaDetallada,
          mensaje_clave: brief.mensajeClave,
          actividades: brief.actividades.map((act) => ({
            nombre: act.nombre,
            descripcion: act.descripcion,
            duracion: act.duracion,
            responsable: act.responsable,
            recursos: act.recursos,
            orden: 0,
          })),
          cronograma: brief.cronograma.map((cron) => ({
            actividad: cron.actividad,
            fecha_inicio: new Date(
              cron.fechaInicio.split(".")[0].replace(" ", "T"),
            ).toISOString(),
            fecha_fin: new Date(
              cron.fechaFin.split(".")[0].replace(" ", "T"),
            ).toISOString(),
            responsable: cron.responsable,
            estado: cron.estado || "Pendiente",
            orden: 0,
          })),
          requerimientos: brief.requerimientos,
          proveedores: brief.proveedores,
          logistica: brief.logistica,
          presupuesto_detallado: brief.presupuestoDetallado,
          observaciones_especiales: brief.observacionesEspeciales,
          aprobado_por: brief.aprobadoPor,
          fecha_aprobacion: brief.fechaAprobacion
            ? new Date(brief.fechaAprobacion).toISOString()
            : null,
        };

        // Intentar PUT primero (actualizar). Si devuelve 404 (no existe aún), usar POST.
        const marcaParam = brief.marca
          ? `?marca=${encodeURIComponent(brief.marca)}`
          : "";
        let response = await fetchConToken(
          `${API_URL}/eventos/${eventoId}/brief${marcaParam}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(briefParaBackend),
          },
        );

        if (response.status === 404) {
          // Brief no existe todavía → crearlo
          response = await fetchConToken(
            `${API_URL}/eventos/${eventoId}/brief`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(briefParaBackend),
            },
          );
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Error al guardar brief: ${response.status} - ${JSON.stringify(errorData)}`,
          );
        }

        const briefCreado = await response.json();

        const briefMapeado: BriefEvento = {
          id: briefCreado.id.toString(),
          eventoId: briefCreado.evento_id.toString(),
          marca: briefCreado.marca || undefined,
          objetivoEspecifico: briefCreado.objetivo_especifico,
          audienciaDetallada: briefCreado.audiencia_detallada,
          mensajeClave: briefCreado.mensaje_clave,
          actividades: briefCreado.actividades.map(
            (act: ActividadBriefBackend) => ({
              id: act.id.toString(),
              nombre: act.nombre,
              descripcion: act.descripcion,
              duracion: act.duracion,
              responsable: act.responsable,
              recursos: act.recursos,
            }),
          ),
          cronograma: briefCreado.cronograma.map(
            (cron: CronogramaBriefBackend) => ({
              id: cron.id.toString(),
              actividad: cron.actividad,
              fechaInicio: cron.fecha_inicio,
              fechaFin: cron.fecha_fin,
              responsable: cron.responsable,
              estado: cron.estado,
            }),
          ),
          requerimientos: briefCreado.requerimientos || "",
          proveedores: briefCreado.proveedores || "",
          logistica: briefCreado.logistica || "",
          presupuestoDetallado: briefCreado.presupuesto_detallado || "",
          observacionesEspeciales: briefCreado.observaciones_especiales || "",
          fechaCreacion: briefCreado.fecha_creacion.split("T")[0],
          fechaModificacion: briefCreado.fecha_modificacion,
          creadoPor: briefCreado.creado_por,
          aprobadoPor: briefCreado.aprobado_por,
          fechaAprobacion: briefCreado.fecha_aprobacion,
        };

        const existingBriefs = evento.briefs || [];
        const updatedBriefs = existingBriefs.some(
          (b) => b.marca === briefMapeado.marca,
        )
          ? existingBriefs.map((b) =>
              b.marca === briefMapeado.marca ? briefMapeado : b,
            )
          : [...existingBriefs, briefMapeado];

        const eventoActualizado: Evento = {
          ...evento,
          briefs: updatedBriefs,
          fechaModificacion: new Date().toISOString(),
        };

        setEventos((prev) =>
          prev.map((e) => (e.id === eventoId ? eventoActualizado : e)),
        );

        return briefMapeado;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar brief");
        console.error("Error guardando brief:", err);
        return null;
      }
    },
    [eventos],
  );

  const [estadisticas, setEstadisticas] = useState<EstadisticasEvento>({
    realizados: 0,
    prospectados: 0,
    confirmados: 0,
    cancelados: 0,
    total: 0,
    presupuestoTotal: 0,
    gastosReales: 0,
    diferencia: 0,
  });

  const cargarEstadisticas = useCallback(async () => {
    try {
      const response = await fetchConToken(`${API_URL}/eventos/estadisticas`);
      if (response.ok) {
        const stats = await response.json();
        setEstadisticas({
          realizados: stats.realizados || 0,
          prospectados: stats.prospectados || 0,
          confirmados: stats.confirmados || 0,
          cancelados: stats.cancelados || 0,
          total: stats.total || 0,
          presupuestoTotal: stats.presupuestoTotal || 0,
          gastosReales: stats.presupuestoReal || 0,
          diferencia: stats.diferencia || 0,
        });
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
  }, []);

  useEffect(() => {
    if (eventos.length > 0) {
      cargarEstadisticas();
    }
  }, [eventos.length, cargarEstadisticas]);

  const eliminarBrief = useCallback(
    async (eventoId: string, marca?: string): Promise<boolean> => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);
        if (!evento || !evento.briefs?.length) {
          throw new Error("No se encontró el brief para este evento");
        }

        const marcaParam = marca ? `?marca=${encodeURIComponent(marca)}` : "";
        const response = await fetchConToken(
          `${API_URL}/eventos/${eventoId}/brief${marcaParam}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Error al eliminar brief");
        }

        // Actualizar el evento en el estado local eliminando el brief
        setEventos((prev) =>
          prev.map((e) => {
            if (e.id !== eventoId) return e;
            const remainingBriefs = (e.briefs || []).filter(
              (b) => b.marca !== marca,
            );
            return {
              ...e,
              briefs: remainingBriefs.length > 0 ? remainingBriefs : undefined,
            };
          }),
        );

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al eliminar brief",
        );
        console.error("Error eliminando brief:", err);
        return false;
      }
    },
    [eventos],
  );

  const exportarBriefPDF = useCallback(
    async (
      eventoId: string,
      facturas: Factura[] = [],
      marca?: string,
    ): Promise<boolean> => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);
        const brief = marca
          ? evento?.briefs?.find((b) => b.marca === marca)
          : evento?.briefs?.[0];

        if (!evento || !brief) {
          showToast("No se encontró el brief para este evento", "error");
          return false;
        }

        // Filtrar facturas asignadas a este evento (todos los estados)
        const facturasEvento = facturas.filter((f) => f.eventoId === evento.id);

        const totalGastado = facturasEvento.reduce(
          (sum, f) => sum + f.subtotal,
          0,
        );

        const jsPDF = (await import("jspdf")).jsPDF;

        const briefElement = document.querySelector(
          "[data-brief-template]",
        ) as HTMLElement;

        if (!briefElement) {
          showToast(
            "No se encontró el contenido del brief para exportar",
            "error",
          );
          return false;
        }

        const loadingMessage = document.createElement("div");
        loadingMessage.innerHTML = `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
               background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; 
               z-index: 9999; font-family: Arial, sans-serif;">
            <div>📄 Generando PDF...</div>
            <div style="font-size: 12px; margin-top: 8px;">Por favor espere un momento</div>
          </div>
        `;
        document.body.appendChild(loadingMessage);

        try {
          const pdf = new jsPDF("p", "mm", "a4");

          const evidencia = JSON.parse(brief.observacionesEspeciales || "{}");

          let yPos = 20;
          const pageHeight = pdf.internal.pageSize.getHeight();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 20;
          const lineHeight = 7;

          const addText = (
            text: string,
            fontSize: number = 12,
            isBold: boolean = false,
          ) => {
            if (yPos > pageHeight - 30) {
              pdf.addPage();
              yPos = 20;
            }

            pdf.setFontSize(fontSize);
            if (isBold) {
              pdf.setFont("helvetica", "bold");
            } else {
              pdf.setFont("helvetica", "normal");
            }

            const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

            lines.forEach((line: string) => {
              if (yPos > pageHeight - 30) {
                pdf.addPage();
                yPos = 20;
              }
              pdf.text(line, margin, yPos);
              yPos += lineHeight;
            });
          };

          const addSpace = (space: number = 5) => {
            yPos += space;
          };

          pdf.setFillColor(37, 99, 235);
          pdf.rect(0, 0, pageWidth, 40, "F");

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(20);
          pdf.setFont("helvetica", "bold");
          pdf.text(evento.nombre, margin, 20);

          pdf.setFontSize(11);
          pdf.setFont("helvetica", "normal");
          const fechaTexto = `${new Date(evento.fechaInicio).toLocaleDateString(
            "es-ES",
          )} - ${new Date(
            evento.fechaFin || evento.fechaInicio,
          ).toLocaleDateString("es-ES")}`;
          pdf.text(fechaTexto, margin, 28);

          pdf.text(evento.marca, margin, 35);

          yPos = 50;
          pdf.setTextColor(0, 0, 0);

          addText("MÉTRICAS PRINCIPALES", 16, true);
          addSpace(3);

          const asistentes = evidencia.evidencia?.asistentes || 0;
          const leads = evidencia.evidencia?.leads || 0;
          const conversion =
            asistentes > 0 ? ((leads / asistentes) * 100).toFixed(1) : 0;

          const pruebasManejo = evidencia.metricas?.pruebasManejo || 0;
          const cotizaciones = evidencia.metricas?.cotizaciones || 0;
          const solicitudesCredito =
            evidencia.metricas?.solicitudesCredito || 0;
          const ventas = evidencia.metricas?.ventas || 0;

          addText(
            `• Asistentes Totales: ${new Intl.NumberFormat("es-MX").format(
              asistentes,
            )}`,
            12,
          );
          addText(
            `• Leads Generados: ${new Intl.NumberFormat("es-MX").format(
              leads,
            )}`,
            12,
          );
          addText(`• Tasa de Conversión: ${conversion}%`, 12);
          addText(
            `• Pruebas de Manejo: ${new Intl.NumberFormat("es-MX").format(
              pruebasManejo,
            )}`,
            12,
          );
          addText(
            `• Cotizaciones: ${new Intl.NumberFormat("es-MX").format(
              cotizaciones,
            )}`,
            12,
          );
          addText(
            `• Solicitudes de Crédito: ${new Intl.NumberFormat("es-MX").format(
              solicitudesCredito,
            )}`,
            12,
          );
          addText(
            `• Ventas: ${new Intl.NumberFormat("es-MX").format(ventas)}`,
            12,
          );
          addSpace(10);

          addText("INFORMACIÓN DEL EVENTO", 16, true);
          addSpace(3);
          addText(`Objetivo: ${evento.objetivo || "No especificado"}`, 12);
          addText(`Audiencia: ${evento.audiencia || "No especificado"}`, 12);
          const ubicacionTexto1 = (() => {
            try {
              const p = JSON.parse(evento.ubicacion || "");
              if (p && typeof p.lat === "number")
                return p.address || evento.ubicacion;
            } catch {}
            return evento.ubicacion || "No especificado";
          })();
          addText(`Ubicación: ${ubicacionTexto1}`, 12);
          addText(
            `Presupuesto Estimado: ${new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(evento.presupuestoEstimado)}`,
            12,
          );
          if (evento.presupuestoReal) {
            addText(
              `Presupuesto Real: ${new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(evento.presupuestoReal)}`,
              12,
            );
          }

          // Sección de facturas/gastos
          if (facturasEvento.length > 0) {
            addSpace(5);
            addText(
              `Total Gastado: ${new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(totalGastado)}`,
              12,
              true,
            );
            addSpace(3);
            addText("Desglose de Facturas:", 11, true);
            addSpace(2);

            facturasEvento.forEach((factura, index) => {
              addText(
                `${index + 1}. ${factura.proveedor} - ${new Intl.NumberFormat(
                  "es-MX",
                  {
                    style: "currency",
                    currency: "MXN",
                  },
                ).format(
                  factura.subtotal,
                )} - ${factura.subcategoria || "Sin categoría"}`,
                10,
              );
            });
          }

          addSpace(10);

          if (evidencia.conclusiones) {
            addText("CONCLUSIONES", 16, true);
            addSpace(3);
            addText(evidencia.conclusiones, 12);
            addSpace(10);
          }

          if (evidencia.areasDeMejora?.length) {
            addText("ÁREAS DE MEJORA", 16, true);
            addSpace(3);
            evidencia.areasDeMejora.forEach((area: string, index: number) => {
              addText(`${index + 1}. ${area}`, 12);
            });
            addSpace(10);
          }

          if (evidencia.imagenes?.length) {
            addText("IMÁGENES DEL EVENTO", 16, true);
            addSpace(5);

            // Agrupar imágenes por asignación
            const porAsignacion: Record<string, typeof evidencia.imagenes> = {};
            const sinAsignacion: typeof evidencia.imagenes = [];
            for (const imagen of evidencia.imagenes) {
              const cat =
                imagen.asignacion ||
                (imagen as typeof imagen & { categoria?: string }).categoria ||
                "";
              if (cat) {
                if (!porAsignacion[cat]) porAsignacion[cat] = [];
                porAsignacion[cat].push(imagen);
              } else {
                sinAsignacion.push(imagen);
              }
            }

            const asignaciones = Object.keys(porAsignacion);

            for (const asignacion of asignaciones) {
              addText(asignacion.toUpperCase(), 14, true);
              addSpace(3);

              for (const [index, imagen] of porAsignacion[
                asignacion
              ].entries()) {
                if (yPos > pageHeight - 100) {
                  pdf.addPage();
                  yPos = 20;
                }

                addText(`${index + 1}. ${imagen.nombre || "Imagen"}`, 12, true);
                addSpace(3);

                try {
                  if (imagen.url && !imagen.url.startsWith("data:video/")) {
                    const img = new Image();
                    img.src = imagen.url;

                    await new Promise<void>((resolve) => {
                      img.onload = () => {
                        const maxWidth = pageWidth - 2 * margin;
                        const maxHeight = 100;

                        let imgWidth = img.width;
                        let imgHeight = img.height;

                        if (imgWidth > maxWidth) {
                          const ratio = maxWidth / imgWidth;
                          imgWidth = maxWidth;
                          imgHeight = imgHeight * ratio;
                        }

                        if (imgHeight > maxHeight) {
                          const ratio = maxHeight / imgHeight;
                          imgHeight = maxHeight;
                          imgWidth = imgWidth * ratio;
                        }

                        if (yPos + imgHeight > pageHeight - 30) {
                          pdf.addPage();
                          yPos = 20;
                        }

                        pdf.addImage(
                          imagen.url,
                          "JPEG",
                          margin,
                          yPos,
                          imgWidth,
                          imgHeight,
                        );
                        yPos += imgHeight + 10;
                        resolve();
                      };

                      img.onerror = () => {
                        console.warn(
                          `No se pudo cargar la imagen ${imagen.nombre}`,
                        );
                        resolve();
                      };
                    });
                  } else if (imagen.url?.startsWith("data:video/")) {
                    addText(`   (Video - no incluido en PDF)`, 10);
                  }
                } catch (imgError) {
                  console.warn(
                    `No se pudo agregar la imagen ${imagen.nombre}:`,
                    imgError,
                  );
                  addText(`   (Imagen no disponible)`, 10);
                }

                addSpace(5);
              }
              addSpace(5);
            }

            if (sinAsignacion.length > 0) {
              addText("SIN ASIGNACIÓN", 14, true);
              addSpace(3);

              for (const [index, imagen] of sinAsignacion.entries()) {
                if (yPos > pageHeight - 100) {
                  pdf.addPage();
                  yPos = 20;
                }

                addText(`${index + 1}. ${imagen.nombre || "Imagen"}`, 12, true);
                addSpace(3);

                try {
                  if (imagen.url && !imagen.url.startsWith("data:video/")) {
                    const img = new Image();
                    img.src = imagen.url;

                    await new Promise<void>((resolve) => {
                      img.onload = () => {
                        const maxWidth = pageWidth - 2 * margin;
                        const maxHeight = 100;

                        let imgWidth = img.width;
                        let imgHeight = img.height;

                        if (imgWidth > maxWidth) {
                          const ratio = maxWidth / imgWidth;
                          imgWidth = maxWidth;
                          imgHeight = imgHeight * ratio;
                        }

                        if (imgHeight > maxHeight) {
                          const ratio = maxHeight / imgHeight;
                          imgHeight = maxHeight;
                          imgWidth = imgWidth * ratio;
                        }

                        if (yPos + imgHeight > pageHeight - 30) {
                          pdf.addPage();
                          yPos = 20;
                        }

                        pdf.addImage(
                          imagen.url,
                          "JPEG",
                          margin,
                          yPos,
                          imgWidth,
                          imgHeight,
                        );
                        yPos += imgHeight + 10;
                        resolve();
                      };

                      img.onerror = () => {
                        console.warn(
                          `No se pudo cargar la imagen ${imagen.nombre}`,
                        );
                        resolve();
                      };
                    });
                  }
                } catch (imgError) {
                  console.warn(
                    `No se pudo agregar la imagen ${imagen.nombre}:`,
                    imgError,
                  );
                  addText(`   (Imagen no disponible)`, 10);
                }

                addSpace(5);
              }
            }

            addSpace(10);
          }

          const fechaGeneracion = new Date().toLocaleString("es-ES");
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Generado el ${fechaGeneracion}`, margin, pageHeight - 10);

          const fechaEvento = new Date(evento.fechaInicio)
            .toLocaleDateString("es-ES")
            .replace(/\//g, "-");
          const nombreLimpio = evento.nombre
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_");
          const fileName = `Reporte_${nombreLimpio}_${fechaEvento}.pdf`;
          pdf.save(fileName);

          return true;
        } finally {
          document.body.removeChild(loadingMessage);
        }
      } catch (err) {
        console.error("Error al exportar PDF:", err);
        setError(err instanceof Error ? err.message : "Error al exportar PDF");
        showToast(
          "Error al generar el PDF. Por favor, inténtalo de nuevo.",
          "error",
        );
        return false;
      }
    },
    [eventos],
  );

  const exportarEventoPDF = useCallback(
    async (eventoId: string): Promise<boolean> => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);
        if (!evento) {
          showToast("No se encontró el evento", "error");
          return false;
        }

        const jsPDF = (await import("jspdf")).jsPDF;
        const pdf = new jsPDF("p", "mm", "a4");

        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 7;
        let yPos = 20;

        const addText = (
          text: string,
          fontSize: number = 12,
          isBold: boolean = false,
        ) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(fontSize);
          pdf.setFont("helvetica", isBold ? "bold" : "normal");
          const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
          lines.forEach((line: string) => {
            if (yPos > pageHeight - 30) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(line, margin, yPos);
            yPos += lineHeight;
          });
        };

        const addSpace = (space: number = 5) => {
          yPos += space;
        };

        const addField = (label: string, value: string) => {
          if (!value) return;
          addText(`${label}: ${value}`, 12, false);
          addSpace(2);
        };

        // Header
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 40, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text(evento.nombre, margin, 20);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        const fechaTexto = `${new Date(evento.fechaInicio).toLocaleDateString("es-ES")} - ${new Date(evento.fechaFin || evento.fechaInicio).toLocaleDateString("es-ES")}`;
        pdf.text(fechaTexto, margin, 28);
        const marcaTexto = Array.isArray(evento.marca)
          ? evento.marca.join(", ")
          : evento.marca;
        pdf.text(marcaTexto, margin, 35);

        yPos = 50;
        pdf.setTextColor(0, 0, 0);

        // Información General
        addText("INFORMACIÓN GENERAL", 16, true);
        addSpace(3);
        addField("Tipo de Evento", evento.tipoEvento);
        addField("Estado", evento.estado);
        addField("Responsable", evento.responsable);
        addField("Marca/Agencia", marcaTexto);
        addField("Horario", evento.horario || "");
        const ubicacionTexto2 = (() => {
          try {
            const p = JSON.parse(evento.ubicacion || "");
            if (p && typeof p.lat === "number")
              return p.address || evento.ubicacion || "";
          } catch {}
          return evento.ubicacion || "";
        })();
        addField("Ubicación", ubicacionTexto2);

        // Datos de confirmación
        if (evento.estado === "Confirmado" && evento.datosConfirmacion) {
          addSpace(3);
          addText("DATOS DE CONFIRMACIÓN", 14, true);
          addSpace(2);
          const dc = evento.datosConfirmacion;
          addField("Asesores", dc.asesores ? "Sí" : "No");
          if (dc.asesores) {
            if (dc.asesoresAsignados)
              addField("Asesores asignados", String(dc.asesoresAsignados));
            if (dc.objetivos) {
              if (dc.objetivos.leads)
                addField("Objetivo Leads", String(dc.objetivos.leads));
              if (dc.objetivos.pruebasManejo)
                addField(
                  "Objetivo Pruebas de manejo",
                  String(dc.objetivos.pruebasManejo),
                );
              if (dc.objetivos.solicitudesCredito)
                addField(
                  "Objetivo Sol. de crédito",
                  String(dc.objetivos.solicitudesCredito),
                );
              if (dc.objetivos.ventas)
                addField("Objetivo Ventas", String(dc.objetivos.ventas));
            }
          }
        }

        addSpace(5);

        // Fechas
        addText("FECHAS", 16, true);
        addSpace(3);
        addField(
          "Fecha de Inicio",
          new Date(evento.fechaInicio).toLocaleDateString("es-ES"),
        );
        addField(
          "Fecha de Fin",
          evento.fechaFin
            ? new Date(evento.fechaFin).toLocaleDateString("es-ES")
            : "",
        );
        if (evento.fechasTentativas && evento.fechasTentativas.length > 0) {
          addField(
            "Fechas Tentativas",
            evento.fechasTentativas
              .map((f) => new Date(f).toLocaleDateString("es-ES"))
              .join(", "),
          );
        }
        addSpace(5);

        // Objetivo y Audiencia
        addText("OBJETIVO Y AUDIENCIA", 16, true);
        addSpace(3);
        addText("Objetivo:", 12, true);
        addText(evento.objetivo, 12);
        addSpace(3);
        if (evento.audienciaEsperada) {
          addField(
            "Audiencia Esperada",
            new Intl.NumberFormat("es-MX").format(evento.audienciaEsperada),
          );
        }
        addField("Demografía", evento.demografia || "");
        addField("NSE", evento.nse || "");
        if (evento.numeroAutos) {
          addField(
            "Número de Autos",
            new Intl.NumberFormat("es-MX").format(evento.numeroAutos),
          );
        }
        if (evento.audiencia) {
          addField("Audiencia (notas)", evento.audiencia);
        }
        addSpace(5);

        // Presupuesto
        addText("PRESUPUESTO", 16, true);
        addSpace(3);
        addField(
          "Presupuesto Estimado",
          `$${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(evento.presupuestoEstimado)}`,
        );
        if (evento.presupuestoReal) {
          addField(
            "Presupuesto Real",
            `$${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(evento.presupuestoReal)}`,
          );
        }
        addSpace(5);

        // Gastos Proyectados
        if (evento.gastosProyectados && evento.gastosProyectados.length > 0) {
          addText("GASTOS PROYECTADOS", 16, true);
          addSpace(3);
          evento.gastosProyectados.forEach((gasto) => {
            addText(
              `• ${gasto.concepto}: $${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(gasto.monto)}`,
              12,
            );
          });
          addSpace(5);
        }

        // Descripción
        if (evento.descripcion) {
          addText("DESCRIPCIÓN", 16, true);
          addSpace(3);
          addText(evento.descripcion, 12);
          addSpace(5);
        }

        // Observaciones
        if (evento.observaciones) {
          addText("OBSERVACIONES", 16, true);
          addSpace(3);
          addText(evento.observaciones, 12);
          addSpace(5);
        }

        // Footer
        const fechaGeneracion = new Date().toLocaleString("es-ES");
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generado el ${fechaGeneracion}`, margin, pageHeight - 10);

        const fechaEvento = new Date(evento.fechaInicio)
          .toLocaleDateString("es-ES")
          .replace(/\//g, "-");
        const nombreLimpio = evento.nombre
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "_");
        pdf.save(`Evento_${nombreLimpio}_${fechaEvento}.pdf`);

        return true;
      } catch (err) {
        console.error("Error al exportar PDF del evento:", err);
        showToast(
          "Error al generar el PDF. Por favor, inténtalo de nuevo.",
          "error",
        );
        return false;
      }
    },
    [eventos],
  );

  // On-demand: fetch full brief with images for a specific event
  const cargarBriefCompleto = useCallback(
    async (eventoId: string, marca?: string): Promise<Evento | null> => {
      const evento = eventos.find((e) => e.id === eventoId);
      if (!evento) return null;

      const targetBrief = marca
        ? evento.briefs?.find((b) => b.marca === marca)
        : evento.briefs?.[0];

      // If brief already has images loaded, return as-is
      if (targetBrief?.observacionesEspeciales) {
        try {
          const obs = JSON.parse(targetBrief.observacionesEspeciales);
          if (obs.imagenes && obs.imagenes.length > 0 && obs.imagenes[0].url) {
            return evento;
          }
        } catch {
          // continue to fetch
        }
      }

      if (!targetBrief) return evento;

      try {
        const marcaParam = marca ? `?marca=${encodeURIComponent(marca)}` : "";
        const response = await fetchConToken(
          `${API_URL}/eventos/${eventoId}/brief${marcaParam}`,
        );
        if (!response.ok) return evento;

        const briefData = await response.json();
        const briefMapeado: BriefEvento = {
          id: briefData.id.toString(),
          eventoId: briefData.evento_id.toString(),
          marca: briefData.marca || undefined,
          objetivoEspecifico: briefData.objetivo_especifico,
          audienciaDetallada: briefData.audiencia_detallada,
          mensajeClave: briefData.mensaje_clave,
          actividades: (briefData.actividades || []).map(
            (act: ActividadBriefBackend) => ({
              id: act.id.toString(),
              nombre: act.nombre,
              descripcion: act.descripcion,
              duracion: act.duracion,
              responsable: act.responsable,
              recursos: act.recursos,
            }),
          ),
          cronograma: (briefData.cronograma || []).map(
            (cron: CronogramaBriefBackend) => ({
              id: cron.id.toString(),
              actividad: cron.actividad,
              fechaInicio: cron.fecha_inicio,
              fechaFin: cron.fecha_fin,
              responsable: cron.responsable,
              estado: cron.estado,
            }),
          ),
          requerimientos: briefData.requerimientos || "",
          proveedores: briefData.proveedores || "",
          logistica: briefData.logistica || "",
          presupuestoDetallado: briefData.presupuesto_detallado || "",
          observacionesEspeciales: briefData.observaciones_especiales || "",
          fechaCreacion: briefData.fecha_creacion
            ? briefData.fecha_creacion.split("T")[0]
            : "",
          fechaModificacion: briefData.fecha_modificacion,
          creadoPor: briefData.creado_por,
          aprobadoPor: briefData.aprobado_por,
          fechaAprobacion: briefData.fecha_aprobacion,
        };

        const updatedBriefs = (evento.briefs || []).map((b) =>
          b.id === briefMapeado.id ? briefMapeado : b,
        );
        const eventoConBrief = { ...evento, briefs: updatedBriefs };
        setEventos((prev) =>
          prev.map((e) => (e.id === eventoId ? eventoConBrief : e)),
        );
        return eventoConBrief;
      } catch {
        return evento;
      }
    },
    [eventos],
  );

  return {
    eventos,
    loading,
    error,
    estadisticas,
    cargarEventos,
    cargarEstadisticas,
    crearEvento,
    actualizarEvento,
    eliminarEvento,
    agregarGastoEvento,
    actualizarGastoEvento,
    guardarBrief,
    eliminarBrief,
    exportarBriefPDF,
    exportarEventoPDF,
    cargarBriefCompleto,
  };
}
