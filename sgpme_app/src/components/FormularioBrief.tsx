"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BriefEvento, Evento } from "@/types";
import { formatearMarca } from "@/lib/evento-utils";
import ImageUploadMultiple from "./ImageUploadMultiple";
import ImageModal from "./ImageModal";

interface FormularioBriefProps {
  evento: Evento;
  briefInicial?: BriefEvento;
  marcaSeleccionada?: string;
  agenciasDisponibles?: string[];
  onSubmit: (
    brief: Omit<
      BriefEvento,
      "id" | "eventoId" | "fechaCreacion" | "fechaModificacion"
    >,
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface Imagen {
  id: string;
  nombre: string;
  url: string;
  asignacion: string;
  checked: boolean;
  file?: File;
}

const ASIGNACIONES_IMAGEN = [
  "Fachada de la agencia",
  "Decoración completa del showroom",
  "Decoración del vehiculo",
  "Trafico a Piso",
  "Exhibicion de obsequios",
  "Ejecucion de la actividad",
  "Servicio de catering",
  "Redes sociales",
  "Campaña invitación",
  "Invitación Clientes",
  "Video Invitacion",
  "Evidencia Hubspot / Leadlab",
] as const;

export default function FormularioBrief({
  evento,
  briefInicial,
  marcaSeleccionada,
  agenciasDisponibles,
  onSubmit,
  onCancel,
  loading = false,
}: FormularioBriefProps) {
  const [marcaActual, setMarcaActual] = useState<string>(
    marcaSeleccionada || briefInicial?.marca || agenciasDisponibles?.[0] || "",
  );

  const formData = {
    actividades: briefInicial?.actividades || [],
    cronograma: briefInicial?.cronograma || [],
    observacionesEspeciales: briefInicial?.observacionesEspeciales || "",
    creadoPor: briefInicial?.creadoPor || "usuario_actual",
    aprobadoPor: briefInicial?.aprobadoPor || "",
    fechaAprobacion: briefInicial?.fechaAprobacion || "",
  };

  const [asistentes, setAsistentes] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.evidencia?.asistentes || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [leads, setLeads] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.evidencia?.leads || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [pruebasManejo, setPruebasManejo] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.metricas?.pruebasManejo || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [cotizaciones, setCotizaciones] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.metricas?.cotizaciones || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [solicitudesCredito, setSolicitudesCredito] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.metricas?.solicitudesCredito || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [ventas, setVentas] = useState<string>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        const valor = evidencia.metricas?.ventas || 0;
        return valor > 0 ? valor.toString() : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [descripcionEvento, setDescripcionEvento] = useState(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        return evidencia.feedback || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [imagenes, setImagenes] = useState<Imagen[]>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        return (evidencia.imagenes || []).map(
          (img: Imagen & { descripcion?: string; categoria?: string }) => ({
            ...img,
            asignacion: img.asignacion || img.categoria || "",
            checked: img.checked ?? false,
          }),
        );
      } catch {
        return [];
      }
    }
    return [];
  });

  const [conclusiones, setConclusiones] = useState(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        return evidencia.conclusiones || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [areasDeMejora, setAreasDeMejora] = useState<string[]>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const evidencia = JSON.parse(briefInicial.observacionesEspeciales);
        return evidencia.areasDeMejora || [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [nuevaAreaMejora, setNuevaAreaMejora] = useState("");

  const [errores, setErrores] = useState<{ [key: string]: string }>({});

  // Estado para el modal de imagen
  const [imagenModal, setImagenModal] = useState<{
    isOpen: boolean;
    url: string;
    nombre: string;
  }>({ isOpen: false, url: "", nombre: "" });

  const abrirImagenModal = (imagen: Imagen) => {
    setImagenModal({
      isOpen: true,
      url: imagen.url,
      nombre: imagen.nombre,
    });
  };

  const cerrarImagenModal = () => {
    setImagenModal({ isOpen: false, url: "", nombre: "" });
  };

  const agregarAreaMejora = () => {
    if (nuevaAreaMejora.trim()) {
      setAreasDeMejora((prev) => [...prev, nuevaAreaMejora.trim()]);
      setNuevaAreaMejora("");
    }
  };

  const removerAreaMejora = (index: number) => {
    setAreasDeMejora((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImagesAdd = (imagesData: Imagen[]) => {
    setImagenes((prev) => [...prev, ...imagesData]);
  };

  const removerImagen = (id: string) => {
    setImagenes((prev) => prev.filter((i) => i.id !== id));
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [asignacionPendiente, setAsignacionPendiente] = useState("");
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<
    Record<string, boolean>
  >({});
  const imagenesSinAsignar = imagenes.filter((i) => !i.asignacion);
  const imagenesAsignadas = imagenes.filter((i) => i.asignacion);

  const toggleSeleccionImagen = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const seleccionarTodo = () => {
    if (
      selectedIds.length === imagenesSinAsignar.length &&
      imagenesSinAsignar.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(imagenesSinAsignar.map((i) => i.id));
    }
  };

  const confirmarAsignacion = () => {
    if (!asignacionPendiente) return;
    setImagenes((prev) =>
      prev.map((img) =>
        selectedIds.includes(img.id)
          ? { ...img, asignacion: asignacionPendiente }
          : img,
      ),
    );
    setSelectedIds([]);
    setAsignacionPendiente("");
    setSeccionesExpandidas((prev) => ({
      ...prev,
      [asignacionPendiente]: true,
    }));
  };

  const quitarAsignacion = (id: string) => {
    setImagenes((prev) =>
      prev.map((img) => (img.id === id ? { ...img, asignacion: "" } : img)),
    );
  };

  const validarFormulario = () => {
    const nuevosErrores: { [key: string]: string } = {};

    if (!descripcionEvento.trim()) {
      nuevosErrores.descripcionEvento =
        "La descripción del evento es requerida";
    }

    const numAsistentes = parseInt(asistentes) || 0;
    const numLeads = parseInt(leads) || 0;

    if (asistentes !== "" && numAsistentes < 0) {
      nuevosErrores.asistentes =
        "El número de asistentes no puede ser negativo";
    }

    if (leads !== "" && numLeads < 0) {
      nuevosErrores.leads = "El número de leads no puede ser negativo";
    }

    if (asistentes === "" || numAsistentes === 0) {
      nuevosErrores.asistentes = "El número de asistentes es requerido";
    }

    if (leads === "" || numLeads === 0) {
      nuevosErrores.leads = "El número de leads es requerido";
    }

    const numPruebasManejo = parseInt(pruebasManejo) || 0;
    const numCotizaciones = parseInt(cotizaciones) || 0;
    const numSolicitudesCredito = parseInt(solicitudesCredito) || 0;
    const numVentas = parseInt(ventas) || 0;

    if (pruebasManejo !== "" && numPruebasManejo < 0) {
      nuevosErrores.pruebasManejo =
        "El número de pruebas de manejo no puede ser negativo";
    }

    if (cotizaciones !== "" && numCotizaciones < 0) {
      nuevosErrores.cotizaciones =
        "El número de cotizaciones no puede ser negativo";
    }

    if (solicitudesCredito !== "" && numSolicitudesCredito < 0) {
      nuevosErrores.solicitudesCredito =
        "El número de solicitudes de crédito no puede ser negativo";
    }

    if (ventas !== "" && numVentas < 0) {
      nuevosErrores.ventas = "El número de ventas no puede ser negativo";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      const briefCompleto = {
        ...formData,
        marca: marcaActual || undefined,
        objetivoEspecifico: "",
        audienciaDetallada: "",
        mensajeClave: "",
        requerimientos: "",
        proveedores: "",
        logistica: "",
        presupuestoDetallado: "",
        observacionesEspeciales: JSON.stringify({
          evidencia: {
            asistentes: parseInt(asistentes) || 0,
            leads: parseInt(leads) || 0,
          },
          metricas: {
            pruebasManejo: parseInt(pruebasManejo) || 0,
            cotizaciones: parseInt(cotizaciones) || 0,
            solicitudesCredito: parseInt(solicitudesCredito) || 0,
            ventas: parseInt(ventas) || 0,
          },
          feedback: descripcionEvento,
          imagenes,
          conclusiones,
          areasDeMejora,
          observacionesOriginales: formData.observacionesEspeciales,
        }),
      };

      await onSubmit(briefCompleto);
    } catch (error) {
      console.error("Error al guardar reporte:", error);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(monto);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          📋 Información del Evento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Evento:</span>
            <p className="text-blue-700">{evento.nombre}</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Marca:</span>
            <p className="text-blue-700">{formatearMarca(evento.marca)}</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Presupuesto:</span>
            <p className="text-blue-700">
              {formatearMonto(evento.presupuestoEstimado)}
            </p>
          </div>
        </div>
      </div>

      {agenciasDisponibles && agenciasDisponibles.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🏢 Seleccionar Agencia para este Reporte
          </h3>
          <div className="flex flex-wrap gap-2">
            {agenciasDisponibles.map((ag) => (
              <button
                key={ag}
                type="button"
                onClick={() => setMarcaActual(ag)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  marcaActual === ag
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {ag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          📊 Reporte de Evidencia del Evento
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Asistentes *
              </label>
              <input
                type="number"
                min="0"
                value={asistentes}
                onChange={(e) => setAsistentes(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  errores.asistentes ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Ej: 150"
                disabled={loading}
              />
              {errores.asistentes && (
                <p className="mt-1 text-sm text-red-600">
                  {errores.asistentes}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leads Generados *
              </label>
              <input
                type="number"
                min="0"
                value={leads}
                onChange={(e) => setLeads(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  errores.leads ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Ej: 25"
                disabled={loading}
              />
              {errores.leads && (
                <p className="mt-1 text-sm text-red-600">{errores.leads}</p>
              )}
            </div>
          </div>
          <div>
            <h5 className="text-md font-medium text-gray-900 mb-4">
              📈 Métricas Adicionales (Opcional)
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pruebas de Manejo
                </label>
                <input
                  type="number"
                  min="0"
                  value={pruebasManejo}
                  onChange={(e) => setPruebasManejo(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errores.pruebasManejo ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0"
                  disabled={loading}
                />
                {errores.pruebasManejo && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.pruebasManejo}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cotizaciones
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotizaciones}
                  onChange={(e) => setCotizaciones(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errores.cotizaciones ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0"
                  disabled={loading}
                />
                {errores.cotizaciones && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.cotizaciones}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sol. de Crédito
                </label>
                <input
                  type="number"
                  min="0"
                  value={solicitudesCredito}
                  onChange={(e) => setSolicitudesCredito(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errores.solicitudesCredito
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                  placeholder="0"
                  disabled={loading}
                />
                {errores.solicitudesCredito && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.solicitudesCredito}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ventas
                </label>
                <input
                  type="number"
                  min="0"
                  value={ventas}
                  onChange={(e) => setVentas(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errores.ventas ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0"
                  disabled={loading}
                />
                {errores.ventas && (
                  <p className="mt-1 text-sm text-red-600">{errores.ventas}</p>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Desarrollo del Evento *
            </label>
            <textarea
              value={descripcionEvento}
              onChange={(e) => setDescripcionEvento(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.descripcionEvento ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Describe cómo se desarrolló el evento, actividades realizadas, participación del público, etc."
              disabled={loading}
            />
            {errores.descripcionEvento && (
              <p className="mt-1 text-sm text-red-600">
                {errores.descripcionEvento}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Imágenes del Evento{" "}
              {imagenes.length > 0 && `(${imagenes.length})`}
            </label>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-900 mb-3">
                📸 Agregar Imágenes del Evento
              </h4>
              <ImageUploadMultiple
                onImagesAdd={handleImagesAdd}
                disabled={loading}
              />
            </div>
            {imagenes.length > 0 && (
              <div className="space-y-4">
                {/* Imágenes sin asignar */}
                {imagenesSinAsignar.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === imagenesSinAsignar.length &&
                          imagenesSinAsignar.length > 0
                        }
                        onChange={seleccionarTodo}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {imagenesSinAsignar.length} sin asignar
                      </span>
                    </div>
                    {selectedIds.length > 0 && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200">
                        <span className="text-sm text-blue-700 whitespace-nowrap">
                          Asignar {selectedIds.length} imagen
                          {selectedIds.length !== 1 ? "es" : ""} a:
                        </span>
                        <select
                          value={asignacionPendiente}
                          onChange={(e) =>
                            setAsignacionPendiente(e.target.value)
                          }
                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                          disabled={loading}
                        >
                          <option value="">Seleccionar asignación...</option>
                          {ASIGNACIONES_IMAGEN.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={confirmarAsignacion}
                          disabled={!asignacionPendiente || loading}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors whitespace-nowrap"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                      {imagenesSinAsignar.map((imagen) => (
                        <div
                          key={imagen.id}
                          className={`border rounded-lg p-2 bg-white transition-colors ${
                            selectedIds.includes(imagen.id)
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-200"
                          }`}
                        >
                          <div
                            className="relative w-full h-28 rounded mb-2 cursor-pointer group overflow-hidden bg-gray-100"
                            onClick={() => abrirImagenModal(imagen)}
                          >
                            {imagen.url.startsWith("data:video/") ? (
                              <video
                                src={imagen.url}
                                className="w-full h-28 object-cover rounded"
                                muted
                              />
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={imagen.url}
                                alt={imagen.nombre}
                                className="w-full h-28 object-cover rounded"
                                loading="eager"
                              />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removerImagen(imagen.id);
                              }}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors z-10"
                              disabled={loading}
                            >
                              ✕
                            </button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(imagen.id)}
                              onChange={() => toggleSeleccionImagen(imagen.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={loading}
                            />
                            <span className="text-xs text-gray-600 truncate">
                              {imagen.nombre}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Imágenes asignadas por sección */}
                {Array.from(
                  new Set(imagenesAsignadas.map((i) => i.asignacion)),
                ).map((asig) => {
                  const imgs = imagenesAsignadas.filter(
                    (i) => i.asignacion === asig,
                  );
                  return (
                    <div
                      key={asig}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSeccionesExpandidas((prev) => ({
                            ...prev,
                            [asig]: !prev[asig],
                          }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-800 text-sm">
                            {asig}
                          </span>
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {imgs.length}
                          </span>
                        </div>
                        <span className="text-green-600 text-sm">
                          {seccionesExpandidas[asig] ? "▲" : "▼"}
                        </span>
                      </button>
                      {seccionesExpandidas[asig] && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                          {imgs.map((imagen) => (
                            <div
                              key={imagen.id}
                              className="border border-gray-200 rounded-lg p-2 bg-white"
                            >
                              <div
                                className="relative w-full h-28 rounded mb-2 cursor-pointer overflow-hidden bg-gray-100"
                                onClick={() => abrirImagenModal(imagen)}
                              >
                                {imagen.url.startsWith("data:video/") ? (
                                  <video
                                    src={imagen.url}
                                    className="w-full h-28 object-cover rounded"
                                    muted
                                  />
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={imagen.url}
                                    alt={imagen.nombre}
                                    className="w-full h-28 object-cover rounded"
                                    loading="eager"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removerImagen(imagen.id);
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors z-10"
                                  disabled={loading}
                                >
                                  ✕
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => quitarAsignacion(imagen.id)}
                                className="w-full text-xs text-gray-500 hover:text-blue-600 transition-colors py-0.5"
                                disabled={loading}
                              >
                                ↩ Quitar asignación
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              📝 Conclusiones del Evento
            </label>
            <textarea
              value={conclusiones}
              onChange={(e) => setConclusiones(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Escribe las conclusiones principales del evento..."
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              🎯 Áreas de Mejora
            </label>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Agregar área de mejora..."
                  value={nuevaAreaMejora}
                  onChange={(e) => setNuevaAreaMejora(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarAreaMejora();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={agregarAreaMejora}
                  disabled={!nuevaAreaMejora.trim() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
            {areasDeMejora.length > 0 && (
              <div className="space-y-2">
                {areasDeMejora.map((area, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-gray-900">{area}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerAreaMejora(index)}
                      className="text-red-600 hover:text-red-800 ml-4"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              📈 Resumen de Evidencia
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {asistentes}
                </div>
                <div className="text-sm text-gray-600">Asistentes</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-green-600">{leads}</div>
                <div className="text-sm text-gray-600">Leads</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {imagenes.length}
                </div>
                <div className="text-sm text-gray-600">Imágenes</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-indigo-600">
                  {conclusiones ? "✓" : "✗"}
                </div>
                <div className="text-sm text-gray-600">Conclusiones</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-2xl font-bold text-red-600">
                  {areasDeMejora.length}
                </div>
                <div className="text-sm text-gray-600">Áreas Mejora</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
            >
              Cancelar
            </button>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {loading
                    ? "Guardando..."
                    : briefInicial
                      ? "Actualizar Reporte"
                      : "Guardar Reporte"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal para ver imagen en tamaño completo */}
      <ImageModal
        isOpen={imagenModal.isOpen}
        imageUrl={imagenModal.url}
        imageName={imagenModal.nombre}
        imageDescription=""
        onClose={cerrarImagenModal}
      />
    </div>
  );
}
