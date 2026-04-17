"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { BriefEvento, Evento, Factura } from "@/types";
import { formatearMarca } from "@/lib/evento-utils";
import ImageUploadMultiple from "./ImageUploadMultiple";
import ImageModal from "./ImageModal";

interface FormularioBriefProps {
  evento: Evento;
  briefInicial?: BriefEvento;
  marcaSeleccionada?: string;
  agenciasDisponibles?: string[];
  facturas?: Factura[];
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

interface Partida {
  nombre: string;
  precio: number;
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
  facturas = [],
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

  // Partidas por factura
  const facturasEvento = facturas.filter((f) => f.eventoId === evento.id);
  const [partidas, setPartidas] = useState<Record<string, Partida[]>>(() => {
    if (briefInicial?.observacionesEspeciales) {
      try {
        const data = JSON.parse(briefInicial.observacionesEspeciales);
        return data.partidas || {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Refs for category file inputs
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const agregarPartida = (facturaId: string) => {
    setPartidas((prev) => ({
      ...prev,
      [facturaId]: [...(prev[facturaId] || []), { nombre: "", precio: 0 }],
    }));
  };

  const actualizarPartida = (
    facturaId: string,
    index: number,
    field: keyof Partida,
    value: string | number,
  ) => {
    setPartidas((prev) => ({
      ...prev,
      [facturaId]: (prev[facturaId] || []).map((p, i) =>
        i === index
          ? {
              ...p,
              [field]:
                field === "precio" ? parseFloat(String(value)) || 0 : value,
            }
          : p,
      ),
    }));
  };

  const removerPartida = (facturaId: string, index: number) => {
    setPartidas((prev) => ({
      ...prev,
      [facturaId]: (prev[facturaId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleCategoryImageUpload = (categoria: string, files: FileList) => {
    const newImages: Imagen[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: file.name,
      url: URL.createObjectURL(file),
      asignacion: categoria,
      checked: false,
      file,
    }));

    // Convert to base64
    newImages.forEach((img) => {
      if (img.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagenes((prev) =>
            prev.map((i) =>
              i.id === img.id ? { ...i, url: e.target?.result as string } : i,
            ),
          );
        };
        reader.readAsDataURL(img.file);
      }
    });

    setImagenes((prev) => [...prev, ...newImages]);
    setSeccionesExpandidas((prev) => ({ ...prev, [categoria]: true }));
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
          partidas,
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

          {/* Sección de Gastos / Facturas */}
          {facturasEvento.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                💰 Gastos del Evento ({facturasEvento.length} factura
                {facturasEvento.length !== 1 ? "s" : ""})
              </label>
              <div className="space-y-4">
                {facturasEvento.map((factura) => {
                  const partidasFactura = partidas[factura.id] || [];
                  const totalPartidas = partidasFactura.reduce(
                    (sum, p) => sum + p.precio,
                    0,
                  );
                  return (
                    <div
                      key={factura.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-800 text-sm">
                            {factura.proveedor}
                          </span>
                          <span className="text-xs text-gray-500">
                            Folio: {factura.folio}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              factura.estado === "Pagada"
                                ? "bg-green-100 text-green-700"
                                : factura.estado === "Autorizada"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {factura.estado}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatearMonto(factura.subtotal)}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Partidas
                          </span>
                          <button
                            type="button"
                            onClick={() => agregarPartida(factura.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                            disabled={loading}
                          >
                            + Agregar partida
                          </button>
                        </div>
                        {partidasFactura.length > 0 && (
                          <div className="space-y-2">
                            {partidasFactura.map((partida, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={partida.nombre}
                                  onChange={(e) =>
                                    actualizarPartida(
                                      factura.id,
                                      idx,
                                      "nombre",
                                      e.target.value,
                                    )
                                  }
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                                  placeholder="Nombre de la partida"
                                  disabled={loading}
                                />
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    value={partida.precio || ""}
                                    onChange={(e) =>
                                      actualizarPartida(
                                        factura.id,
                                        idx,
                                        "precio",
                                        e.target.value,
                                      )
                                    }
                                    className="w-32 pl-5 pr-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    placeholder="0.00"
                                    min={0}
                                    step="0.01"
                                    disabled={loading}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removerPartida(factura.id, idx)
                                  }
                                  className="text-red-500 hover:text-red-700 text-sm"
                                  disabled={loading}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <div className="flex justify-end pt-1 border-t border-gray-100">
                              <span className="text-sm font-medium text-gray-700">
                                Total partidas: {formatearMonto(totalPartidas)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end px-4 py-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">
                    Total Gastado:{" "}
                    {formatearMonto(
                      facturasEvento.reduce((sum, f) => sum + f.subtotal, 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desarrollo del evento *
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
              📸 Evidencia Fotográfica del Evento{" "}
              {imagenes.length > 0 && `(${imagenes.length} imágenes)`}
            </label>
            <div className="space-y-3">
              {ASIGNACIONES_IMAGEN.map((categoria) => {
                const imgsCategoria = imagenes.filter(
                  (i) => i.asignacion === categoria,
                );
                const isExpanded = seccionesExpandidas[categoria] || false;
                return (
                  <div
                    key={categoria}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSeccionesExpandidas((prev) => ({
                          ...prev,
                          [categoria]: !prev[categoria],
                        }))
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">
                          {categoria}
                        </span>
                        {imgsCategoria.length > 0 && (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {imgsCategoria.length}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {imgsCategoria.map((imagen) => (
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
                              <span className="text-xs text-gray-600 truncate block">
                                {imagen.nombre}
                              </span>
                            </div>
                          ))}
                          <div
                            onClick={() =>
                              categoryInputRefs.current[categoria]?.click()
                            }
                            className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[140px]"
                          >
                            <span className="text-3xl text-gray-400">+</span>
                            <span className="text-xs text-gray-500 mt-1">
                              Agregar
                            </span>
                            <input
                              ref={(el) => {
                                categoryInputRefs.current[categoria] = el;
                              }}
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => {
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  handleCategoryImageUpload(
                                    categoria,
                                    e.target.files,
                                  );
                                  e.target.value = "";
                                }
                              }}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
