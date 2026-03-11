"use client";

/**
 * FormularioPresenciaDinamico
 * Builds its form sections/fields from the template stored in /form-templates/{subcategoria}.
 * Falls back to empty sections if the endpoint is unavailable.
 * Submits to /presencia-tradicional/ (create) or /presencia-tradicional/{id} (update).
 */

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  PencilIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import DateInput from "./DateInput";
import ImageUploadMultiple from "./ImageUploadMultiple";
import FormularioProveedor from "./FormularioProveedor";
import { compressImage } from "@/lib/imageCompression";
import type { Proveedor } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

// ─── Local imports from ConfiguracionFormularios ───────────────────────────

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

// ─── Image item type ───────────────────────────────────────────────────────
interface ImageItem {
  id: string;
  nombre: string;
  url: string;
  descripcion: string;
}

// ─── File item type ────────────────────────────────────────────────────────
interface FileItem {
  id: string;
  nombre: string;
  url: string; // base64
  tipo: "imagen" | "pdf" | "otro";
  mimeType: string;
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface FormularioPresenciaDinamicoProps {
  subcategoria: string;
  marcaActual: string;
  proveedores?: Proveedor[];
  presenciaInicial?: Record<string, unknown> | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onNavigateToProveedores?: () => void;
  loading?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Date helpers ──────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function FormularioPresenciaDinamico({
  subcategoria,
  marcaActual,
  proveedores = [],
  presenciaInicial = null,
  onSubmit,
  onCancel,
  loading = false,
}: FormularioPresenciaDinamicoProps) {
  const { marcasPermitidas } = useMarcaGlobal();

  const [template, setTemplate] = useState<FormTemplateData | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  // Flat map of fieldId → value (text, number, date, selector value)
  const [fieldValues, setFieldValues] = useState<
    Record<string, string | number>
  >({});

  // Per-campo image collections (fieldId → ImageItem[])
  const [fieldImages, setFieldImages] = useState<Record<string, ImageItem[]>>(
    {},
  );
  const [editingImageName, setEditingImageName] = useState<{
    fieldId: string;
    imgId: string;
    value: string;
  } | null>(null);

  // Per-campo file collections (fieldId → FileItem[])
  const [fieldFiles, setFieldFiles] = useState<Record<string, FileItem[]>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Proveedor state
  const [proveedoresLocales, setProveedoresLocales] =
    useState<Proveedor[]>(proveedores);
  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);
  const [cargandoProveedor, setCargandoProveedor] = useState(false);
  const [proveedorSelId, setProveedorSelId] = useState<string>("");
  const [proveedorNombreManual, setProveedorNombreManual] = useState("");

  // Selected marca
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(
    marcaActual || (marcasPermitidas[0] ?? ""),
  );

  // Sync local providers when prop changes
  useEffect(() => {
    setProveedoresLocales(proveedores);
  }, [proveedores]);

  // ── Load template ───────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setLoadingTemplate(true);
      try {
        const res = await fetch(
          `${API_BASE}/form-templates/${encodeURIComponent(subcategoria)}/`,
          { headers: getHeaders() },
        );
        if (res.ok) {
          const data: { subcategoria: string; template: FormTemplateData } =
            await res.json();
          setTemplate(data.template);
        } else {
          setTemplate({ subcategoria, secciones: [] });
        }
      } catch {
        setTemplate({ subcategoria, secciones: [] });
      } finally {
        setLoadingTemplate(false);
      }
    };
    cargar();
  }, [subcategoria]);

  // ── Pre-fill from presenciaInicial (when editing) ────────────────────────
  useEffect(() => {
    if (!presenciaInicial) return;
    const extras = presenciaInicial.datos_extra_json
      ? (() => {
          try {
            return JSON.parse(presenciaInicial.datos_extra_json as string);
          } catch {
            return {};
          }
        })()
      : {};
    setFieldValues(extras.fieldValues ?? {});
    setFieldImages(extras.fieldImages ?? {});
    setFieldFiles(extras.fieldFiles ?? {});
    if (extras.proveedorNombreManual)
      setProveedorNombreManual(extras.proveedorNombreManual);
    if (presenciaInicial.proveedor)
      setProveedorNombreManual(presenciaInicial.proveedor as string);
  }, [presenciaInicial]);

  // ── Field value helpers ──────────────────────────────────────────────────
  function setVal(id: string, value: string | number) {
    setFieldValues((p) => ({ ...p, [id]: value }));
  }

  // ── Image helpers ────────────────────────────────────────────────────────
  function addImages(fieldId: string, imgs: ImageItem[]) {
    setFieldImages((p) => ({
      ...p,
      [fieldId]: [...(p[fieldId] ?? []), ...imgs],
    }));
  }
  function removeImage(fieldId: string, imgId: string) {
    setFieldImages((p) => ({
      ...p,
      [fieldId]: (p[fieldId] ?? []).filter((i) => i.id !== imgId),
    }));
  }
  function renameImage(fieldId: string, imgId: string, newNombre: string) {
    setFieldImages((p) => ({
      ...p,
      [fieldId]: (p[fieldId] ?? []).map((i) =>
        i.id === imgId ? { ...i, nombre: newNombre } : i,
      ),
    }));
  }

  // ── File helpers ─────────────────────────────────────────────────────────
  async function handleFileSelect(
    fieldId: string,
    campo: FieldConfig,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");

      let base64 = "";
      let fileToUse = file;

      if (isImage) {
        try {
          const result = await compressImage(file);
          fileToUse = result.file;
        } catch {
          /* use original */
        }
      }

      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileToUse);
      });

      const item: FileItem = {
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        nombre: file.name,
        url: base64,
        tipo: isImage ? "imagen" : isPdf ? "pdf" : "otro",
        mimeType: file.type,
      };

      setFieldFiles((p) => ({
        ...p,
        [fieldId]: [...(p[fieldId] ?? []), item],
      }));
    }

    // reset input
    if (fileRefs.current[fieldId]) fileRefs.current[fieldId]!.value = "";
  }

  function removeFile(fieldId: string, fileId: string) {
    setFieldFiles((p) => ({
      ...p,
      [fieldId]: (p[fieldId] ?? []).filter((f) => f.id !== fileId),
    }));
  }

  // ── Create provider inline ───────────────────────────────────────────────
  async function crearProveedorInline(
    datos: Omit<Proveedor, "id" | "fechaCreacion">,
  ) {
    setCargandoProveedor(true);
    try {
      const res = await fetch(`${API_BASE}/proveedores/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          nombre: datos.nombre,
          razon_social: datos.razonSocial || "",
          contacto: datos.contacto,
          email: datos.email,
          rfc: datos.rfc || "",
          telefono: datos.telefono || "",
          direccion: datos.direccion || "",
          calle: datos.calle || "",
          numero_exterior: datos.numeroExterior || "",
          numero_interior: datos.numeroInterior || "",
          colonia: datos.colonia || "",
          ciudad: datos.ciudad || "",
          estado: datos.estado || "",
          codigo_postal: datos.codigoPostal || "",
          categoria: datos.categoria || "",
          activo: datos.activo ?? true,
        }),
      });
      if (!res.ok) throw new Error("Error al crear proveedor");
      // Backend returns snake_case — transform to Proveedor shape
      const raw = await res.json();
      const nuevo: Proveedor = {
        id: String(raw.id),
        nombre: raw.nombre || "",
        razonSocial: raw.razon_social || undefined,
        contacto: raw.contacto || "",
        email: raw.email || "",
        rfc: raw.rfc || "",
        telefono: raw.telefono || "",
        direccion: raw.direccion || "",
        calle: raw.calle || "",
        numeroExterior: raw.numero_exterior || "",
        numeroInterior: raw.numero_interior || "",
        colonia: raw.colonia || "",
        ciudad: raw.ciudad || "",
        estado: raw.estado || "",
        codigoPostal: raw.codigo_postal || "",
        categoria: raw.categoria || "",
        activo: raw.activo ?? true,
        fechaCreacion: raw.fecha_creacion
          ? raw.fecha_creacion.split("T")[0]
          : new Date().toISOString().split("T")[0],
      };
      setProveedoresLocales((prev) => [...prev, nuevo]);
      setProveedorSelId(String(nuevo.id));
      setProveedorNombreManual(nuevo.nombre);
      setMostrarModalProveedor(false);
    } catch (err) {
      console.error(err);
      alert("Error al crear el proveedor");
    } finally {
      setCargandoProveedor(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Determine DB required fields from template or defaults
    const secciones = template?.secciones ?? [];

    // Find nombre: first text field value across all sections
    let nombre = subcategoria;
    for (const s of secciones) {
      if (!s.activo) continue;
      for (const c of s.campos) {
        if (c.tipo === "texto" && fieldValues[c.id]) {
          nombre = String(fieldValues[c.id]);
          break;
        }
      }
      if (nombre !== subcategoria) break;
    }

    // fecha_instalacion: preserve original when editing, use today when creating.
    // Do NOT extract from dynamic date campos — those are for display only (datos_extra_json).
    // Using a user-picked date here could place the presencia outside the current
    // year/quarter filter and make it disappear from the list.
    const fecha_instalacion = presenciaInicial?.fecha_instalacion
      ? String(presenciaInicial.fecha_instalacion)
      : todayISO();

    // Resolve proveedor name
    let proveedorNombre = proveedorNombreManual;
    if (proveedorSelId) {
      const prov = proveedoresLocales.find(
        (p) => String(p.id) === proveedorSelId,
      );
      if (prov) proveedorNombre = prov.nombre;
    }

    // Collect all images across all imagenes fields → imagenes_json
    const allImages: ImageItem[] = Object.values(fieldImages).flat();
    const imagenes_json = allImages.length ? JSON.stringify(allImages) : null;

    // Bundle datos_extra_json
    const datos_extra_json = JSON.stringify({
      fieldValues,
      fieldImages,
      fieldFiles,
      proveedorNombreManual,
    });

    const payload: Record<string, unknown> = {
      tipo: subcategoria,
      nombre,
      agencia: marcaSeleccionada,
      marca: marcaSeleccionada,
      ciudad: String(fieldValues["__ciudad"] ?? ""),
      campanya: "",
      ubicacion: String(fieldValues["__ubicacion"] ?? ""),
      contenido: "",
      notas: "",
      fecha_instalacion,
      duracion: "",
      cambio_lona: null,
      vista: "",
      iluminacion: "",
      dimensiones: "",
      proveedor: proveedorNombre || null,
      codigo_proveedor: "",
      costo_mensual: null,
      duracion_contrato: "",
      inicio_contrato: null,
      termino_contrato: null,
      impresion: "",
      costo_impresion: null,
      instalacion: "",
      imagenes_json,
      observaciones: "",
      datos_extra_json,
    };

    await onSubmit(payload);
  }

  // ─── Render field ───────────────────────────────────────────────────────
  function renderField(campo: FieldConfig) {
    const val = fieldValues[campo.id] ?? "";
    const commonInput =
      "w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

    switch (campo.tipo) {
      case "texto":
        return (
          <input
            type="text"
            value={String(val)}
            onChange={(e) => setVal(campo.id, e.target.value)}
            placeholder={campo.placeholder ?? ""}
            required={campo.requerido}
            className={commonInput}
          />
        );

      case "dinero":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={String(val)}
              onChange={(e) =>
                setVal(campo.id, parseFloat(e.target.value) || 0)
              }
              placeholder={campo.placeholder ?? "0.00"}
              required={campo.requerido}
              className={`${commonInput} pl-7`}
            />
          </div>
        );

      case "selector":
        return (
          <select
            value={String(val)}
            onChange={(e) => setVal(campo.id, e.target.value)}
            required={campo.requerido}
            className={commonInput}
          >
            <option value="">— Seleccionar —</option>
            {(campo.opciones ?? []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        );

      case "fecha":
        return (
          <DateInput
            value={String(val)}
            onChange={(v) => setVal(campo.id, v)}
            placeholder="dd/mm/aaaa"
            className={commonInput}
          />
        );

      case "imagenes":
        return (
          <div className="space-y-3">
            <ImageUploadMultiple
              onImagesAdd={(imgs) => addImages(campo.id, imgs)}
              disabled={loading}
            />
            {(fieldImages[campo.id] ?? []).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {(fieldImages[campo.id] ?? []).map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <div className="relative h-24 w-full">
                      <Image
                        src={img.url}
                        alt={img.nombre}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Editar nombre */}
                    {editingImageName?.fieldId === campo.id &&
                    editingImageName?.imgId === img.id ? (
                      <div className="px-2 py-1 flex gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editingImageName.value}
                          onChange={(e) =>
                            setEditingImageName({
                              ...editingImageName,
                              value: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameImage(
                                campo.id,
                                img.id,
                                editingImageName.value,
                              );
                              setEditingImageName(null);
                            }
                            if (e.key === "Escape") setEditingImageName(null);
                          }}
                          className="flex-1 text-xs px-1 py-0.5 border border-blue-400 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            renameImage(
                              campo.id,
                              img.id,
                              editingImageName.value,
                            );
                            setEditingImageName(null);
                          }}
                          className="text-blue-600 text-xs"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span className="text-xs text-gray-700 truncate">
                          {img.nombre}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingImageName({
                                fieldId: campo.id,
                                imgId: img.id,
                                value: img.nombre,
                              })
                            }
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(campo.id, img.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "archivos": {
        const tipoArch = campo.tipoArchivo ?? "cualquier";
        const accept =
          tipoArch === "imagenes"
            ? "image/*"
            : tipoArch === "pdf"
              ? "application/pdf"
              : "*/*";

        return (
          <div className="space-y-2">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRefs.current[campo.id]?.click()}
            >
              <input
                ref={(el) => {
                  fileRefs.current[campo.id] = el;
                }}
                type="file"
                accept={accept}
                multiple={tipoArch !== "pdf"}
                className="hidden"
                onChange={(e) => handleFileSelect(campo.id, campo, e)}
              />
              <CloudArrowUpIcon className="w-8 h-8 mx-auto text-gray-400 mb-1" />
              <p className="text-sm text-gray-600">
                {tipoArch === "imagenes"
                  ? "Imágenes (JPG, PNG, WebP)"
                  : tipoArch === "pdf"
                    ? "Archivos PDF"
                    : "Cualquier archivo"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Haz clic o arrastra aquí
              </p>
            </div>

            {(fieldFiles[campo.id] ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(fieldFiles[campo.id] ?? []).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {file.tipo === "imagen" ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        <Image
                          src={file.url}
                          alt={file.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <DocumentIcon className="w-8 h-8 text-red-500 shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-gray-800 truncate">
                      {file.nombre}
                    </span>
                    {file.tipo === "pdf" && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline shrink-0"
                      >
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(campo.id, file.id)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }

  // ─── Render proveedor section ───────────────────────────────────────────
  function renderProveedorSection(seccion: SeccionConfig) {
    const selectedProv = proveedoresLocales.find(
      (p) => String(p.id) === proveedorSelId,
    );
    return (
      <div className="space-y-4">
        {/* Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
            Proveedor
          </label>
          <div className="flex gap-2">
            <select
              value={proveedorSelId}
              onChange={(e) => {
                setProveedorSelId(e.target.value);
                const p = proveedoresLocales.find(
                  (p) => String(p.id) === e.target.value,
                );
                if (p) setProveedorNombreManual(p.nombre);
                else setProveedorNombreManual("");
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar proveedor —</option>
              {proveedoresLocales.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setMostrarModalProveedor(true)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm whitespace-nowrap"
              title="Agregar nuevo proveedor"
            >
              <UserPlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
          {selectedProv?.direccion && (
            <p className="text-xs text-gray-500 mt-1 ml-1">
              📍 {selectedProv.direccion}
            </p>
          )}
        </div>

        {/* Manual name override */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
            Nombre del proveedor (manual)
          </label>
          <input
            type="text"
            value={proveedorNombreManual}
            onChange={(e) => setProveedorNombreManual(e.target.value)}
            placeholder="O escribe el nombre manualmente"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Extra fields from the section */}
        {seccion.campos.map((campo) => (
          <div key={campo.id}>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
              {campo.etiqueta}
              {campo.requerido && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            {renderField(campo)}
          </div>
        ))}
      </div>
    );
  }

  // ─── Loading / empty state ─────────────────────────────────────────────
  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
        Cargando formulario…
      </div>
    );
  }

  const activeSections = (template?.secciones ?? []).filter((s) => s.activo);

  if (activeSections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">Sin campos configurados</p>
        <p className="text-sm">
          Ve a Configuración → Formularios para agregar campos a{" "}
          <strong>{subcategoria}</strong>.
        </p>
        <button
          onClick={onCancel}
          className="mt-6 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    );
  }

  // ─── Full form ────────────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Marca selector (always shown) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">
            Marca / Agencia
          </label>
          <select
            value={marcaSeleccionada}
            onChange={(e) => setMarcaSeleccionada(e.target.value)}
            required
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Seleccionar marca —</option>
            {marcasPermitidas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic sections */}
        {activeSections.map((seccion) => (
          <div
            key={seccion.id}
            className="bg-gray-50 border border-gray-200 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-300">
              {seccion.nombre}
            </h3>

            {seccion.esProveedorEspecial ? (
              renderProveedorSection(seccion)
            ) : seccion.campos.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Sin campos configurados en esta sección.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seccion.campos.map((campo) => {
                  // Full-width for images, files
                  const fullWidth =
                    campo.tipo === "imagenes" || campo.tipo === "archivos";
                  return (
                    <div
                      key={campo.id}
                      className={fullWidth ? "md:col-span-2" : ""}
                    >
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                        {campo.etiqueta}
                        {campo.requerido && (
                          <span className="text-red-500 ml-0.5">*</span>
                        )}
                      </label>
                      {renderField(campo)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !marcaSeleccionada}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "Guardando…"
              : presenciaInicial
                ? "Actualizar"
                : "Crear presencia"}
          </button>
        </div>
      </form>

      {/* Modal: nuevo proveedor */}
      {mostrarModalProveedor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-gray-900">
                Agregar Nuevo Proveedor
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalProveedor(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <FormularioProveedor
                onSubmit={crearProveedorInline}
                onCancelar={() => setMostrarModalProveedor(false)}
                loading={cargandoProveedor}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
