"use client";

import React, { useState, useMemo } from "react";
import { BriefEvento, Evento, ImagenEvento } from "@/types";
import { formatearMarca } from "@/lib/evento-utils";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import Image from "next/image";
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PhotoIcon,
  StarIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface BriefTemplateProps {
  evento: Evento;
  brief: BriefEvento;
  onDescargarPDF: () => void;
  isPreview?: boolean;
}

export default function BriefTemplate({
  evento,
  brief,
  onDescargarPDF,
  isPreview = false,
}: BriefTemplateProps) {
  const [facturasExpandidas, setFacturasExpandidas] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<ImagenEvento | null>(null);
  const { facturas } = useFacturas();

  // Filtrar facturas asignadas a este evento (todos los estados)
  const facturasEvento = useMemo(() => {
    return facturas.filter((f) => f.eventoId === evento.id);
  }, [facturas, evento.id]);

  // Calcular total gastado
  const totalGastado = useMemo(() => {
    return facturasEvento.reduce((sum, f) => sum + f.subtotal, 0);
  }, [facturasEvento]);

  let evidencia = null;
  let imagenes = [];
  let descripcionEvento = "";
  let conclusiones = "";
  let areasDeMejora = [];
  let metricas = null;

  try {
    const observaciones = JSON.parse(brief.observacionesEspeciales || "{}");
    console.log("🔍 Observaciones parseadas:", observaciones);

    evidencia = observaciones.evidencia || {};
    imagenes = observaciones.imagenes || [];
    descripcionEvento = observaciones.feedback || "";
    conclusiones = observaciones.conclusiones || "";
    areasDeMejora = observaciones.areasDeMejora || [];

    metricas = observaciones.metricas || {
      pruebasManejo: 0,
      cotizaciones: 0,
      solicitudesCredito: 0,
      ventas: 0,
    };

    console.log("📊 Evidencia extraída:", evidencia);
    console.log("🖼️ Imágenes extraídas:", imagenes);
    console.log("📝 Descripción extraída:", descripcionEvento);
    console.log("🎯 Conclusiones extraídas:", conclusiones);
    console.log("🔄 Áreas de mejora extraídas:", areasDeMejora);
    console.log("📈 Métricas del brief:", metricas);
  } catch (error) {
    console.error("Error parsing evidencia:", error);
    metricas = {
      pruebasManejo: 0,
      cotizaciones: 0,
      solicitudesCredito: 0,
      ventas: 0,
    };
  }

  const formatearNumero = (num: number) => {
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const formatearMoneda = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatearFecha = (fecha: string) => {
    const [year, month, day] = fecha.split("T")[0].split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      className="bg-white shadow-lg rounded-lg overflow-hidden"
      data-brief-template
    >
      <div className="bg-blue-600 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{evento.nombre}</h1>
            <div className="flex flex-wrap gap-4 text-blue-100">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span>
                  {formatearFecha(evento.fechaInicio)} -{" "}
                  {formatearFecha(evento.fechaFin || evento.fechaInicio)}
                </span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                <span>{evento.ubicacion}</span>
              </div>
              <div className="flex items-center">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {formatearMarca(evento.marca)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onDescargarPDF}
            className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg flex items-center gap-2 text-white"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {isPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <PhotoIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                Vista Previa del Brief
              </span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              Esta es una vista previa de cómo se verá el brief completo para el
              auditor.
            </p>
          </div>
        )}
        {evidencia && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">
                    Asistentes Totales
                  </p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    {formatearNumero(evidencia.asistentes)}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Leads Generados
                  </p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">
                    {formatearNumero(evidencia.leads)}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">
                    Tasa de Conversión
                  </p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">
                    {((evidencia.leads / evidencia.asistentes) * 100).toFixed(
                      1,
                    )}
                    %
                  </p>
                </div>
                <StarIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}
        {metricas &&
          (metricas.pruebasManejo > 0 ||
            metricas.cotizaciones > 0 ||
            metricas.solicitudesCredito > 0 ||
            metricas.ventas > 0) && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <ChartBarIcon className="h-7 w-7 mr-3 text-green-600" />
                Métricas del Evento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">
                        Pruebas de Manejo
                      </p>
                      <p className="text-3xl font-bold text-green-700 mt-1">
                        {formatearNumero(metricas.pruebasManejo)}
                      </p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">
                        Cotizaciones
                      </p>
                      <p className="text-3xl font-bold text-yellow-700 mt-1">
                        {formatearNumero(metricas.cotizaciones)}
                      </p>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-600 text-sm font-medium">
                        Solicitudes de Crédito
                      </p>
                      <p className="text-3xl font-bold text-indigo-700 mt-1">
                        {formatearNumero(metricas.solicitudesCredito)}
                      </p>
                    </div>
                    <StarIcon className="h-8 w-8 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-sm font-medium">Ventas</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">
                        {formatearNumero(metricas.ventas)}
                      </p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
                Información del Evento
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Objetivo:</span>
                  <p className="text-gray-600 mt-1">
                    {brief.objetivoEspecifico || evento.objetivo}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Audiencia:</span>
                  <p className="text-gray-600 mt-1">
                    {brief.audienciaDetallada || evento.audiencia}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Tipo de Evento:
                  </span>
                  <p className="text-gray-600 mt-1">{evento.tipoEvento}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Presupuesto
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">
                    Presupuesto Estimado:
                  </span>
                  <span className="text-gray-600">
                    {formatearMoneda(evento.presupuestoEstimado)}
                  </span>
                </div>
                {evento.presupuestoReal && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Presupuesto Real:
                    </span>
                    <span className="text-gray-600">
                      {formatearMoneda(evento.presupuestoReal)}
                    </span>
                  </div>
                )}
                {evento.presupuestoReal && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium text-gray-700">
                      Diferencia:
                    </span>
                    <span
                      className={`font-medium ${
                        evento.presupuestoReal <= evento.presupuestoEstimado
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatearMoneda(
                        evento.presupuestoReal - evento.presupuestoEstimado,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Facturas/Gastos */}
            {facturasEvento.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                {/* Recuadro clickeable con Total Gastado */}
                <button
                  onClick={() => setFacturasExpandidas(!facturasExpandidas)}
                  className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">
                      Total Gastado:
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatearMoneda(totalGastado)}
                    </span>
                  </div>
                  {facturasExpandidas ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>

                {/* Lista de facturas */}
                {facturasExpandidas && (
                  <div className="border-t border-blue-200 bg-white p-4 space-y-2">
                    {facturasEvento.map((factura) => (
                      <div
                        key={factura.id}
                        className="border border-gray-200 rounded-md p-3 grid grid-cols-3 gap-3 text-sm"
                      >
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Proveedor
                          </span>
                          <span className="font-medium text-gray-800">
                            {factura.proveedor}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Subtotal
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatearMoneda(factura.subtotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">
                            Subcategoría
                          </span>
                          <span className="font-medium text-gray-800">
                            {factura.subcategoria || "Sin categoría"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {descripcionEvento && (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Descripción del Evento
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 leading-relaxed">
                    {descripcionEvento}
                  </p>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Responsables
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">
                    Responsable:
                  </span>
                  <span className="text-gray-600">{evento.responsable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Creado por:</span>
                  <span className="text-gray-600">{brief.creadoPor}</span>
                </div>
                {brief.aprobadoPor && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Aprobado por:
                    </span>
                    <span className="text-gray-600">{brief.aprobadoPor}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">
                    Fecha de creación:
                  </span>
                  <span className="text-gray-600">
                    {formatearFecha(brief.fechaCreacion)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {imagenes && imagenes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Galería del Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {imagenes.map((imagen: ImagenEvento) => (
                <div
                  key={imagen.id}
                  className="bg-white rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setImagenPreview(imagen)}
                >
                  <div className="relative h-48">
                    <Image
                      src={imagen.url}
                      alt={imagen.nombre}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-800 mb-1">
                      {imagen.nombre}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {imagen.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de preview de imagen */}
        {imagenPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => setImagenPreview(null)}
          >
            <div className="relative max-w-[60%] max-h-[90vh] w-full h-full flex items-center justify-center">
              <button
                onClick={() => setImagenPreview(null)}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
              >
                <XMarkIcon className="h-6 w-6 text-gray-700" />
              </button>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="relative max-w-full max-h-[85vh]">
                  <Image
                    src={imagenPreview.url}
                    alt={imagenPreview.nombre}
                    width={1200}
                    height={800}
                    className="object-contain max-h-[85vh] w-auto"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="mt-4 bg-white rounded-lg p-4 max-w-2xl">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {imagenPreview.nombre}
                  </h3>
                  {imagenPreview.descripcion && (
                    <p className="text-sm text-gray-600">
                      {imagenPreview.descripcion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {conclusiones && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-indigo-600" />
              Conclusiones
            </h3>
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
              <p className="text-gray-700 leading-relaxed">{conclusiones}</p>
            </div>
          </div>
        )}
        {areasDeMejora && areasDeMejora.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2 text-red-600" />
              Áreas de Mejora
            </h3>
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <ul className="space-y-3">
                {areasDeMejora.map((area: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="shrink-0 w-6 h-6 bg-red-500 text-white text-sm rounded-full flex items-center justify-center mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 leading-relaxed">
                      {area}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="border-t pt-6 mt-8">
          <div className="flex flex-wrap justify-between items-center text-sm text-gray-500">
            <div>
              <p>Brief generado el {formatearFecha(brief.fechaCreacion)}</p>
              {brief.fechaAprobacion && (
                <p>Aprobado el {formatearFecha(brief.fechaAprobacion)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  evento.estado === "Realizado"
                    ? "bg-green-100 text-green-800"
                    : evento.estado === "Confirmado"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {evento.estado}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
