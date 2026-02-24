"use client";

/**
 * PresenciaDetallesDinamico
 * Renders the detail view of a presencia using its form template.
 * Sections are shown/hidden based on the template config (activo flag).
 * Images support click-to-enlarge. PDFs have Ver + Descargar buttons.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import type { Presencia } from "@/hooks/usePresencias";

// ─── Shared types ────────────────────────────────────────────────────────────

type FieldTipo =
  | "texto"
  | "dinero"
  | "selector"
  | "fecha"
  | "imagenes"
  | "archivos";
type TipoArchivo = "imagenes" | "pdf" | "cualquier";

interface FieldConfig {
  id: string;
  tipo: FieldTipo;
  etiqueta: string;
  requerido: boolean;
  placeholder?: string;
  opciones?: string[];
  tipoArchivo?: TipoArchivo;
}

interface SeccionConfig {
  id: string;
  nombre: string;
  activo: boolean;
  campos: FieldConfig[];
  esProveedorEspecial?: boolean;
}

interface FormTemplateData {
  subcategoria: string;
  secciones: SeccionConfig[];
}

interface ImageItem {
  id: string;
  nombre: string;
  url: string;
  descripcion: string;
}

interface FileItem {
  id: string;
  nombre: string;
  url: string;
  tipo: "imagen" | "pdf" | "otro";
  mimeType: string;
}

interface ExtrasData {
  fieldValues?: Record<string, string | number>;
  fieldImages?: Record<string, ImageItem[]>;
  fieldFiles?: Record<string, FileItem[]>;
  proveedorNombreManual?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMoney(val: string | number | undefined | null) {
  if (val === undefined || val === null || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  presencia: Presencia;
}

export default function PresenciaDetallesDinamico({ presencia }: Props) {
  const subcategoria = presencia.tipo || "";
  const [template, setTemplate] = useState<FormTemplateData | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    nombre: string;
  } | null>(null);

  // Parse extras
  const extras: ExtrasData = (() => {
    if (!presencia.datos_extra_json) return {};
    try {
      return JSON.parse(presencia.datos_extra_json);
    } catch {
      return {};
    }
  })();

  const fieldValues = extras.fieldValues ?? {};
  const fieldImages = extras.fieldImages ?? {};
  const fieldFiles = extras.fieldFiles ?? {};
  const proveedorNombreManual = extras.proveedorNombreManual ?? "";

  // Load template
  useEffect(() => {
    if (!subcategoria) return;
    const cargar = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/form-templates/${encodeURIComponent(subcategoria)}/`,
          { headers: getHeaders() },
        );
        if (res.ok) {
          const data: { subcategoria: string; template: FormTemplateData } =
            await res.json();
          setTemplate(data.template);
        }
      } catch {
        /* use null fallback */
      }
    };
    cargar();
  }, [subcategoria]);

  // ── Render field value ─────────────────────────────────────────────────────
  function renderFieldValue(campo: FieldConfig) {
    if (campo.tipo === "imagenes") {
      const imgs: ImageItem[] = fieldImages[campo.id] ?? [];
      if (imgs.length === 0)
        return (
          <span className="text-gray-400 italic text-sm">Sin imágenes</span>
        );
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
          {imgs.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() =>
                setLightbox({
                  url: img.url,
                  nombre: img.nombre || campo.etiqueta,
                })
              }
              className="relative h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity group"
              title={img.nombre || "Ver imagen"}
            >
              <Image
                src={img.url}
                alt={img.nombre || ""}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <EyeIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {img.nombre && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                  {img.nombre}
                </div>
              )}
            </button>
          ))}
        </div>
      );
    }

    if (campo.tipo === "archivos") {
      const files: FileItem[] = fieldFiles[campo.id] ?? [];
      if (files.length === 0)
        return (
          <span className="text-gray-400 italic text-sm">Sin archivos</span>
        );
      return (
        <div className="space-y-2 mt-1">
          {files.map((file) => {
            const isPdf =
              file.tipo === "pdf" ||
              file.mimeType === "application/pdf" ||
              file.nombre?.toLowerCase().endsWith(".pdf");
            const isImg =
              file.tipo === "imagen" || file.mimeType?.startsWith("image/");
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <DocumentIcon className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="flex-1 text-sm text-gray-800 truncate">
                  {file.nombre}
                </span>
                {isImg && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        url: file.url,
                        nombre: file.nombre,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Ver
                  </button>
                )}
                {isPdf && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    title="Ver PDF"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Ver
                  </a>
                )}
                <a
                  href={file.url}
                  download={file.nombre}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                  title="Descargar"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Descargar
                </a>
              </div>
            );
          })}
        </div>
      );
    }

    const raw = fieldValues[campo.id];
    if (raw === undefined || raw === null || raw === "")
      return (
        <span className="text-gray-400 italic text-sm">Sin información</span>
      );

    if (campo.tipo === "dinero")
      return (
        <span className="font-semibold text-green-700">{formatMoney(raw)}</span>
      );
    if (campo.tipo === "fecha") return <span>{formatDate(String(raw))}</span>;
    return <span>{String(raw)}</span>;
  }

  // ── Legacy images from imagenes_json (old format) ─────────────────────────
  const legacyImages: Array<{ url: string; nombre: string }> = (() => {
    if (!presencia.imagenes_json) return [];
    try {
      const parsed = JSON.parse(presencia.imagenes_json);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: string | ImageItem, idx: number) => {
        if (typeof item === "string")
          return { url: item, nombre: `Imagen ${idx + 1}` };
        return { url: item.url, nombre: item.nombre || `Imagen ${idx + 1}` };
      });
    } catch {
      return [];
    }
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeSections = template?.secciones?.filter((s) => s.activo) ?? [];

  return (
    <>
      {/* ── Header badge: marca & tipo ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presencia.agencia && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase">
            {presencia.agencia}
          </span>
        )}
        {subcategoria && (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full uppercase">
            {subcategoria}
          </span>
        )}
      </div>

      {activeSections.length > 0 ? (
        /* ── Dynamic template-based view ── */
        <div className="space-y-5">
          {activeSections.map((seccion) => {
            const sectionIsEmpty =
              !seccion.esProveedorEspecial &&
              seccion.campos.every((c) => {
                if (c.tipo === "imagenes")
                  return (fieldImages[c.id]?.length ?? 0) === 0;
                if (c.tipo === "archivos")
                  return (fieldFiles[c.id]?.length ?? 0) === 0;
                const v = fieldValues[c.id];
                return v === undefined || v === null || v === "";
              });

            return (
              <div
                key={seccion.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                {/* Section header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    {seccion.nombre}
                  </h3>
                </div>

                {/* Section body */}
                <div className="p-5">
                  {seccion.esProveedorEspecial ? (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Proveedor
                      </label>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {presencia.proveedor || proveedorNombreManual || (
                          <span className="text-gray-400 italic">
                            Sin información
                          </span>
                        )}
                      </p>
                    </div>
                  ) : sectionIsEmpty ? (
                    <p className="text-sm text-gray-400 italic">
                      Sin información
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {seccion.campos.map((campo) => (
                        <div key={campo.id}>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            {campo.etiqueta}
                          </label>
                          <div className="text-sm text-gray-900">
                            {renderFieldValue(campo)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Legacy static view ── */
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-white border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Información General
              </h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Ciudad", presencia.ciudad],
                ["Campaña", presencia.campana],
                ["Ubicación", presencia.ubicacion],
                ["Contenido", presencia.contenido],
                ["Notas", presencia.notas],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    {label}
                  </label>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {val || "—"}
                  </p>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Fecha de instalación
                </label>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formatDate(presencia.fecha_instalacion)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Dimensiones
                </label>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {presencia.dimensiones || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Proveedor
                </label>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {presencia.proveedor || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Costo mensual
                </label>
                <p className="mt-0.5 text-sm font-semibold text-green-700">
                  {presencia.costo_mensual
                    ? formatMoney(presencia.costo_mensual)
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {legacyImages.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-white border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Imágenes
                </h3>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {legacyImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setLightbox({ url: img.url, nombre: img.nombre })
                    }
                    className="relative h-32 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity group"
                  >
                    <Image
                      src={img.url}
                      alt={img.nombre}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <EyeIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
          <div
            className="relative max-w-5xl max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.url}
              alt={lightbox.nombre}
              fill
              className="object-contain"
            />
            {lightbox.nombre && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm px-4 py-2 text-center">
                {lightbox.nombre}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
