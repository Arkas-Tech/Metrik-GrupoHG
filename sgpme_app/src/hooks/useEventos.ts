"use client";

import { useState, useEffect, useCallback } from "react";
import { Evento, GastoEvento, BriefEvento, EstadisticasEvento } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

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
  observaciones?: string;
  notas?: string;
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

/* interface BriefBackend {
  id: number;
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
  fecha_creacion: string;
  fecha_modificacion?: string;
  creado_por?: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
} */

/* interface GastoEventoBackend {
  id: number;
  evento_id: number;
  concepto: string;
  monto: number;
  fecha: string;
  estado: string;
  notas?: string;
  comprobante?: string;
} */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarEventos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchConToken(`${API_URL}/eventos/`);

      if (!response.ok) {
        throw new Error(`Error al cargar eventos: ${response.status}`);
      }

      const data = await response.json();
      const eventosMapeados = await Promise.all(
        data.map(async (evento: EventoBackend) => {
          let brief = undefined;

          try {
            const briefResponse = await fetchConToken(
              `${API_URL}/eventos/${evento.id}/brief`
            );
            if (briefResponse.ok) {
              const briefData = await briefResponse.json();
              brief = {
                id: briefData.id.toString(),
                eventoId: evento.id.toString(),
                objetivoEspecifico: briefData.objetivo_especifico,
                audienciaDetallada: briefData.audiencia_detallada,
                mensajeClave: briefData.mensaje_clave,
                actividades: briefData.actividades.map(
                  (act: ActividadBriefBackend) => ({
                    id: act.id.toString(),
                    nombre: act.nombre,
                    descripcion: act.descripcion,
                    duracion: act.duracion,
                    responsable: act.responsable,
                    recursos: act.recursos,
                  })
                ),
                cronograma: briefData.cronograma.map(
                  (cron: CronogramaBriefBackend) => ({
                    id: cron.id.toString(),
                    actividad: cron.actividad,
                    fechaInicio: cron.fecha_inicio,
                    fechaFin: cron.fecha_fin,
                    responsable: cron.responsable,
                    estado: cron.estado,
                  })
                ),
                requerimientos: briefData.requerimientos || "",
                proveedores: briefData.proveedores || "",
                logistica: briefData.logistica || "",
                presupuestoDetallado: briefData.presupuesto_detallado || "",
                observacionesEspeciales:
                  briefData.observaciones_especiales || "",
                fechaCreacion: briefData.fecha_creacion.split("T")[0],
                fechaModificacion: briefData.fecha_modificacion,
                creadoPor: briefData.creado_por,
                aprobadoPor: briefData.aprobado_por,
                fechaAprobacion: briefData.fecha_aprobacion,
              };
            }
          } catch {
            console.log(
              `No hay brief para evento ${evento.id} o error al cargarlo`
            );
          }

          return {
            id: evento.id.toString(),
            nombre: evento.nombre,
            descripcion: evento.descripcion || "",
            tipoEvento: evento.tipo_evento,
            fechaInicio: evento.fecha_inicio,
            fechaFin: evento.fecha_fin,
            ubicacion: evento.ubicacion || "",
            marca: evento.marca,
            responsable: evento.responsable,
            estado: evento.estado,
            objetivo: evento.objetivo || "",
            audiencia: evento.audiencia || "",
            presupuestoEstimado: evento.presupuesto_estimado || 0,
            presupuestoReal: evento.presupuesto_real,
            observaciones: evento.observaciones || "",
            gastosProyectados: [],
            brief,
            fechaCreacion: evento.fecha_creacion,
            fechaModificacion: evento.fecha_modificacion,
            creadoPor: evento.creado_por,
          };
        })
      );
      setEventos(eventosMapeados);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error cargando eventos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarEventos();
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
          marca: nuevoEvento.marca,
          responsable: nuevoEvento.responsable,
          estado: nuevoEvento.estado,
          objetivo: nuevoEvento.objetivo,
          audiencia: nuevoEvento.audiencia,
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
              errorData
            )}`
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
          marca: eventoCreado.marca,
          responsable: eventoCreado.responsable,
          estado: eventoCreado.estado,
          objetivo: eventoCreado.objetivo || "",
          audiencia: eventoCreado.audiencia || "",
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
        return eventoMapeado;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear evento");
        throw err;
      }
    },
    []
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
          marca: datosActualizados.marca || evento.marca,
          responsable: datosActualizados.responsable || evento.responsable,
          estado: datosActualizados.estado || evento.estado,
          objetivo: datosActualizados.objetivo || evento.objetivo,
          audiencia: datosActualizados.audiencia || evento.audiencia,
          presupuesto_estimado:
            datosActualizados.presupuestoEstimado || evento.presupuestoEstimado,
          presupuesto_real:
            datosActualizados.presupuestoReal || evento.presupuestoReal,
          observaciones:
            datosActualizados.observaciones || evento.observaciones,
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
          prev.map((e) => (e.id === id ? eventoActualizado : e))
        );

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al actualizar evento"
        );
        return false;
      }
    },
    [eventos]
  );

  const eliminarEvento = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetchConToken(`${API_URL}/eventos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar evento");

      setEventos((prev) => prev.filter((evento) => evento.id !== id));
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
        prev.map((e) => (e.id === eventoId ? eventoActualizado : e))
      );

      return true;
    },
    [eventos]
  );

  const actualizarGastoEvento = useCallback(
    async (
      eventoId: string,
      gastoId: string,
      gastoActualizado: Partial<GastoEvento>
    ) => {
      const evento = eventos.find((e) => e.id === eventoId);
      if (!evento) return false;

      const eventoActualizadoLocal: Evento = {
        ...evento,
        gastosProyectados: (evento.gastosProyectados || []).map((gasto) =>
          gasto.id === gastoId ? { ...gasto, ...gastoActualizado } : gasto
        ),
        fechaModificacion: new Date().toISOString(),
      };

      setEventos((prev) =>
        prev.map((e) => (e.id === eventoId ? eventoActualizadoLocal : e))
      );

      return true;
    },
    [eventos]
  );

  const guardarBrief = useCallback(
    async (
      eventoId: string,
      brief: Omit<BriefEvento, "id" | "eventoId" | "fechaCreacion">
    ) => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);
        if (!evento) return null;

        const briefParaBackend = {
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
            fecha_inicio: new Date(cron.fechaInicio).toISOString(),
            fecha_fin: new Date(cron.fechaFin).toISOString(),
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

        const esActualizacion = evento.brief !== undefined;
        const method = esActualizacion ? "PUT" : "POST";

        const response = await fetchConToken(
          `${API_URL}/eventos/${eventoId}/brief`,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(briefParaBackend),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Error al ${esActualizacion ? "actualizar" : "crear"} brief`
          );
        }

        const briefCreado = await response.json();

        const briefMapeado: BriefEvento = {
          id: briefCreado.id.toString(),
          eventoId: briefCreado.evento_id.toString(),
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
            })
          ),
          cronograma: briefCreado.cronograma.map(
            (cron: CronogramaBriefBackend) => ({
              id: cron.id.toString(),
              actividad: cron.actividad,
              fechaInicio: cron.fecha_inicio,
              fechaFin: cron.fecha_fin,
              responsable: cron.responsable,
              estado: cron.estado,
            })
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

        const eventoActualizado: Evento = {
          ...evento,
          brief: briefMapeado,
          fechaModificacion: new Date().toISOString(),
        };

        setEventos((prev) =>
          prev.map((e) => (e.id === eventoId ? eventoActualizado : e))
        );

        return briefMapeado;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar brief");
        console.error("Error guardando brief:", err);
        return null;
      }
    },
    [eventos]
  );

  const [estadisticas, setEstadisticas] = useState<EstadisticasEvento>({
    realizados: 0,
    prospectados: 0,
    confirmados: 0,
    porSuceder: 0,
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
          porSuceder: stats.porSuceder || 0,
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

  const exportarBriefPDF = useCallback(
    async (eventoId: string): Promise<boolean> => {
      try {
        const evento = eventos.find((e) => e.id === eventoId);

        if (!evento || !evento.brief) {
          alert("No se encontró el brief para este evento");
          return false;
        }

        const jsPDF = (await import("jspdf")).jsPDF;

        const briefElement = document.querySelector(
          "[data-brief-template]"
        ) as HTMLElement;

        if (!briefElement) {
          alert("No se encontró el contenido del brief para exportar");
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

          const evidencia = JSON.parse(
            evento.brief.observacionesEspeciales || "{}"
          );

          let yPos = 20;
          const pageHeight = pdf.internal.pageSize.getHeight();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 20;
          const lineHeight = 7;

          const addText = (
            text: string,
            fontSize: number = 12,
            isBold: boolean = false
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
            "es-ES"
          )} - ${new Date(
            evento.fechaFin || evento.fechaInicio
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
              asistentes
            )}`,
            12
          );
          addText(
            `• Leads Generados: ${new Intl.NumberFormat("es-MX").format(
              leads
            )}`,
            12
          );
          addText(`• Tasa de Conversión: ${conversion}%`, 12);
          addText(
            `• Pruebas de Manejo: ${new Intl.NumberFormat("es-MX").format(
              pruebasManejo
            )}`,
            12
          );
          addText(
            `• Cotizaciones: ${new Intl.NumberFormat("es-MX").format(
              cotizaciones
            )}`,
            12
          );
          addText(
            `• Solicitudes de Crédito: ${new Intl.NumberFormat("es-MX").format(
              solicitudesCredito
            )}`,
            12
          );
          addText(
            `• Ventas: ${new Intl.NumberFormat("es-MX").format(ventas)}`,
            12
          );
          addSpace(10);

          addText("INFORMACIÓN DEL EVENTO", 16, true);
          addSpace(3);
          addText(`Objetivo: ${evento.objetivo || "No especificado"}`, 12);
          addText(`Audiencia: ${evento.audiencia || "No especificado"}`, 12);
          addText(`Ubicación: ${evento.ubicacion || "No especificado"}`, 12);
          addText(
            `Presupuesto Estimado: ${new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(evento.presupuestoEstimado)}`,
            12
          );
          if (evento.presupuestoReal) {
            addText(
              `Presupuesto Real: ${new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(evento.presupuestoReal)}`,
              12
            );
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

            for (const [index, imagen] of evidencia.imagenes.entries()) {
              if (yPos > pageHeight - 100) {
                pdf.addPage();
                yPos = 20;
              }

              addText(`${index + 1}. ${imagen.nombre}`, 12, true);
              if (imagen.descripcion) {
                addText(`   ${imagen.descripcion}`, 10);
              }
              addSpace(3);

              try {
                if (imagen.url) {
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
                        imgHeight
                      );
                      yPos += imgHeight + 10;
                      resolve();
                    };

                    img.onerror = () => {
                      console.warn(
                        `No se pudo cargar la imagen ${imagen.nombre}`
                      );
                      resolve();
                    };
                  });
                }
              } catch (imgError) {
                console.warn(
                  `No se pudo agregar la imagen ${imagen.nombre}:`,
                  imgError
                );
                addText(`   (Imagen no disponible)`, 10);
              }

              addSpace(5);
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
          const fileName = `Brief_${nombreLimpio}_${fechaEvento}.pdf`;
          pdf.save(fileName);

          return true;
        } finally {
          document.body.removeChild(loadingMessage);
        }
      } catch (err) {
        console.error("Error al exportar PDF:", err);
        setError(err instanceof Error ? err.message : "Error al exportar PDF");
        alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
        return false;
      }
    },
    [eventos]
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
    exportarBriefPDF,
  };
}
