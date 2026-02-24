"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhotoIcon,
  FolderIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/useToast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldTipo =
  | "texto"
  | "dinero"
  | "selector"
  | "fecha"
  | "imagenes"
  | "archivos";

export type TipoArchivo = "imagenes" | "pdf" | "cualquier";

export interface FieldConfig {
  id: string;
  tipo: FieldTipo;
  etiqueta: string;
  requerido: boolean;
  placeholder?: string;
  opciones?: string[]; // for tipo=selector
  tipoArchivo?: TipoArchivo; // for tipo=archivos
}

export interface SeccionConfig {
  id: string;
  nombre: string;
  activo: boolean;
  campos: FieldConfig[];
  esProveedorEspecial?: boolean;
}

export interface FormTemplateData {
  subcategoria: string;
  secciones: SeccionConfig[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_SECCIONES: SeccionConfig[] = [
  {
    id: "informacion_general",
    nombre: "Información General",
    activo: true,
    campos: [],
  },
  { id: "temporalidad", nombre: "Temporalidad", activo: true, campos: [] },
  { id: "alcance", nombre: "Alcance", activo: true, campos: [] },
  {
    id: "caracteristicas_fisicas",
    nombre: "Características Físicas",
    activo: true,
    campos: [],
  },
  {
    id: "proveedor",
    nombre: "Proveedor",
    activo: true,
    campos: [],
    esProveedorEspecial: true,
  },
  {
    id: "costos_contrato",
    nombre: "Costos y Contrato",
    activo: true,
    campos: [],
  },
  {
    id: "impresion_instalador",
    nombre: "Impresión e Instalador",
    activo: true,
    campos: [],
  },
  { id: "evidencia", nombre: "Evidencia", activo: true, campos: [] },
];

const FIELD_TYPES: {
  tipo: FieldTipo;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    tipo: "texto",
    label: "Texto",
    icon: <DocumentTextIcon className="w-5 h-5" />,
    color: "text-blue-600 bg-blue-50",
  },
  {
    tipo: "dinero",
    label: "Dinero",
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    color: "text-green-600 bg-green-50",
  },
  {
    tipo: "selector",
    label: "Selector",
    icon: <ListBulletIcon className="w-5 h-5" />,
    color: "text-purple-600 bg-purple-50",
  },
  {
    tipo: "fecha",
    label: "Fecha",
    icon: <CalendarIcon className="w-5 h-5" />,
    color: "text-orange-600 bg-orange-50",
  },
  {
    tipo: "imagenes",
    label: "Imágenes",
    icon: <PhotoIcon className="w-5 h-5" />,
    color: "text-pink-600 bg-pink-50",
  },
  {
    tipo: "archivos",
    label: "Archivos / PDF",
    icon: <FolderIcon className="w-5 h-5" />,
    color: "text-gray-600 bg-gray-50",
  },
];

const FIELD_COLORS: Record<FieldTipo, string> = {
  texto: "bg-blue-50 border-blue-200 text-blue-700",
  dinero: "bg-green-50 border-green-200 text-green-700",
  selector: "bg-purple-50 border-purple-200 text-purple-700",
  fecha: "bg-orange-50 border-orange-200 text-orange-700",
  imagenes: "bg-pink-50 border-pink-200 text-pink-700",
  archivos: "bg-gray-50 border-gray-200 text-gray-700",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-component: Field Modal ───────────────────────────────────────────────

interface FieldModalProps {
  initial?: FieldConfig;
  onSave: (field: FieldConfig) => void;
  onClose: () => void;
}

function FieldModal({ initial, onSave, onClose }: FieldModalProps) {
  const [tipo, setTipo] = useState<FieldTipo>(initial?.tipo ?? "texto");
  const [etiqueta, setEtiqueta] = useState(initial?.etiqueta ?? "");
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? "");
  const [requerido, setRequerido] = useState(initial?.requerido ?? false);
  const [opciones, setOpciones] = useState<string[]>(initial?.opciones ?? []);
  const [tipoArchivo, setTipoArchivo] = useState<TipoArchivo>(
    initial?.tipoArchivo ?? "imagenes",
  );
  const [nuevaOpcion, setNuevaOpcion] = useState("");

  function agregarOpcion() {
    if (!nuevaOpcion.trim()) return;
    setOpciones((p) => [...p, nuevaOpcion.trim()]);
    setNuevaOpcion("");
  }

  function eliminarOpcion(i: number) {
    setOpciones((p) => p.filter((_, idx) => idx !== i));
  }

  function moverOpcion(i: number, dir: "up" | "down") {
    const arr = [...opciones];
    const dest = dir === "up" ? i - 1 : i + 1;
    if (dest < 0 || dest >= arr.length) return;
    [arr[i], arr[dest]] = [arr[dest], arr[i]];
    setOpciones(arr);
  }

  function handleSave() {
    if (!etiqueta.trim()) return;
    const field: FieldConfig = {
      id: initial?.id ?? uid(),
      tipo,
      etiqueta: etiqueta.trim(),
      requerido,
      placeholder: placeholder.trim() || undefined,
      ...(tipo === "selector" ? { opciones } : {}),
      ...(tipo === "archivos" ? { tipoArchivo } : {}),
    };
    onSave(field);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            {initial ? "Editar campo" : "Agregar campo"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de campo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.tipo}
                  type="button"
                  onClick={() => setTipo(ft.tipo)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                    tipo === ft.tipo
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <span
                    className={
                      tipo === ft.tipo ? "text-blue-600" : "text-gray-500"
                    }
                  >
                    {ft.icon}
                  </span>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Etiqueta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del campo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="Ej. Nombre del medio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Placeholder (texto + dinero) */}
          {(tipo === "texto" || tipo === "dinero") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto de ayuda (placeholder)
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Ej. Ingresa el valor…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Opciones de selector */}
          {tipo === "selector" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opciones del selector
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nuevaOpcion}
                  onChange={(e) => setNuevaOpcion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarOpcion();
                    }
                  }}
                  placeholder="Nueva opción"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={agregarOpcion}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {opciones.map((op, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded"
                  >
                    <span className="flex-1 text-sm text-gray-900">{op}</span>
                    <button
                      onClick={() => moverOpcion(i, "up")}
                      disabled={i === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowUpIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moverOpcion(i, "down")}
                      disabled={i === opciones.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowDownIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => eliminarOpcion(i)}
                      className="p-0.5 text-red-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {opciones.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-1">
                    Sin opciones aún
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tipo de archivo */}
          {tipo === "archivos" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de archivo
              </label>
              <div className="flex gap-2">
                {(["imagenes", "pdf", "cualquier"] as TipoArchivo[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoArchivo(t)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all capitalize ${
                        tipoArchivo === t
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {t === "imagenes"
                        ? "Imágenes"
                        : t === "pdf"
                          ? "PDF"
                          : "Cualquier"}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Requerido */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              id="req-toggle"
              type="checkbox"
              checked={requerido}
              onChange={(e) => setRequerido(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label
              htmlFor="req-toggle"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Campo requerido
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!etiqueta.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {initial ? "Guardar cambios" : "Agregar campo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Campo Row ─────────────────────────────────────────────────

function CampoRow({
  campo,
  index,
  total,
  onEdit,
  onDelete,
  onMove,
}: {
  campo: FieldConfig;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const typeInfo = FIELD_TYPES.find((f) => f.tipo === campo.tipo);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${FIELD_COLORS[campo.tipo]}`}
    >
      <span className="shrink-0">{typeInfo?.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{campo.etiqueta}</span>
        {campo.requerido && (
          <span className="ml-1.5 text-xs font-semibold opacity-75">*</span>
        )}
        {campo.tipo === "selector" &&
          campo.opciones &&
          campo.opciones.length > 0 && (
            <span className="ml-2 text-xs opacity-60">
              ({campo.opciones.length} opcs.)
            </span>
          )}
        {campo.tipo === "archivos" && campo.tipoArchivo && (
          <span className="ml-2 text-xs opacity-60 capitalize">
            (
            {campo.tipoArchivo === "imagenes"
              ? "Imágenes"
              : campo.tipoArchivo === "pdf"
                ? "PDF"
                : "Cualquier"}
            )
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onMove("up")}
          disabled={index === 0}
          className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
          title="Subir"
        >
          <ArrowUpIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove("down")}
          disabled={index === total - 1}
          className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
          title="Bajar"
        >
          <ArrowDownIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onEdit}
          className="p-1 hover:bg-white/50 rounded"
          title="Editar"
        >
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-white/50 rounded text-red-500"
          title="Eliminar"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ConfiguracionFormulariosProps {
  onRefresh?: () => void;
}

export default function ConfiguracionFormularios({
  onRefresh,
}: ConfiguracionFormulariosProps) {
  const { showToast, ToastContainer } = useToast();

  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormTemplateData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Modal para agregar/editar campo
  const [fieldModal, setFieldModal] = useState<{
    open: boolean;
    seccionId: string;
    editingField?: FieldConfig;
  } | null>(null);

  // Secciones expandidas
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(DEFAULT_SECCIONES.map((s) => s.id)),
  );

  // Modal para nueva sección personalizada
  const [nuevaSeccionModal, setNuevSeccionModal] = useState(false);
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");

  // ── Auth helper ──
  const getHeaders = () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ── Load subcategorías from Medios Tradicionales (cat 3) ──
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_BASE}/categorias/`, {
          headers: getHeaders(),
        });
        const data: { id: number; nombre: string; subcategorias: string[] }[] =
          await res.json();
        const cat3 = data.find((c) => c.id === 3);
        const subs = cat3?.subcategorias ?? [];
        setSubcategorias(subs);
        if (subs.length > 0 && !selectedSubcat) setSelectedSubcat(subs[0]);
      } catch (err) {
        console.error("Error cargando subcategorías:", err);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load template when selectedSubcat changes ──
  const loadTemplate = useCallback(async (subcat: string) => {
    setLoadingTemplate(true);

    const fallback: FormTemplateData = {
      subcategoria: subcat,
      secciones: DEFAULT_SECCIONES.map((s) => ({ ...s, campos: [] })),
    };

    try {
      const res = await fetch(
        `${API_BASE}/form-templates/${encodeURIComponent(subcat)}/`,
        { headers: getHeaders() },
      );

      if (res.ok) {
        const data: { subcategoria: string; template: FormTemplateData } =
          await res.json();
        // Merge saved template with any missing default sections
        const savedIds = new Set(
          (data.template?.secciones ?? []).map((s) => s.id),
        );
        const merged = [
          ...(data.template?.secciones ?? []),
          ...DEFAULT_SECCIONES.filter((s) => !savedIds.has(s.id)),
        ];
        setTemplate({ subcategoria: subcat, secciones: merged });
      } else {
        // API not ready yet or error → show defaults so user can still configure
        setTemplate(fallback);
      }
    } catch (err) {
      console.error("Error cargando plantilla:", err);
      setTemplate(fallback);
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubcat) loadTemplate(selectedSubcat);
  }, [selectedSubcat, loadTemplate]);

  // ── Save template ──
  const saveTemplate = async () => {
    if (!template || !selectedSubcat) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/form-templates/${encodeURIComponent(selectedSubcat)}/`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ template }),
        },
      );
      if (res.ok) {
        showToast("Plantilla guardada", "success");
        setSavedRecently(true);
        setTimeout(() => setSavedRecently(false), 2500);
        if (onRefresh) onRefresh();
      } else {
        showToast("Error al guardar la plantilla", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Section helpers ──
  function toggleSeccion(seccionId: string) {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        secciones: prev.secciones.map((s) =>
          s.id === seccionId ? { ...s, activo: !s.activo } : s,
        ),
      };
    });
  }

  function toggleExpanded(seccionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(seccionId)) next.delete(seccionId);
      else next.add(seccionId);
      return next;
    });
  }

  function agregarSeccionPersonalizada() {
    const nombre = nuevaSeccionNombre.trim();
    if (!nombre) return;
    const nueva: SeccionConfig = {
      id: uid(),
      nombre,
      activo: true,
      campos: [],
    };
    setTemplate((prev) =>
      prev ? { ...prev, secciones: [...prev.secciones, nueva] } : prev,
    );
    setExpandedSections((prev) => new Set([...prev, nueva.id]));
    setNuevaSeccionNombre("");
    setNuevSeccionModal(false);
  }

  function eliminarSeccionPersonalizada(seccionId: string) {
    const defaultIds = new Set(DEFAULT_SECCIONES.map((s) => s.id));
    if (defaultIds.has(seccionId)) return; // can't delete defaults
    if (!confirm("¿Eliminar esta sección personalizada y todos sus campos?"))
      return;
    setTemplate((prev) =>
      prev
        ? {
            ...prev,
            secciones: prev.secciones.filter((s) => s.id !== seccionId),
          }
        : prev,
    );
  }

  function moverSeccion(seccionId: string, dir: "up" | "down") {
    setTemplate((prev) => {
      if (!prev) return prev;
      const arr = [...prev.secciones];
      const idx = arr.findIndex((s) => s.id === seccionId);
      const dest = dir === "up" ? idx - 1 : idx + 1;
      if (dest < 0 || dest >= arr.length) return prev;
      [arr[idx], arr[dest]] = [arr[dest], arr[idx]];
      return { ...prev, secciones: arr };
    });
  }

  // ── Field helpers ──
  function upsertCampo(seccionId: string, field: FieldConfig) {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        secciones: prev.secciones.map((s) => {
          if (s.id !== seccionId) return s;
          const exists = s.campos.findIndex((c) => c.id === field.id);
          const nuevos =
            exists >= 0
              ? s.campos.map((c) => (c.id === field.id ? field : c))
              : [...s.campos, field];
          return { ...s, campos: nuevos };
        }),
      };
    });
  }

  function eliminarCampo(seccionId: string, campoId: string) {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        secciones: prev.secciones.map((s) =>
          s.id === seccionId
            ? { ...s, campos: s.campos.filter((c) => c.id !== campoId) }
            : s,
        ),
      };
    });
  }

  function moverCampo(seccionId: string, campoId: string, dir: "up" | "down") {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        secciones: prev.secciones.map((s) => {
          if (s.id !== seccionId) return s;
          const arr = [...s.campos];
          const idx = arr.findIndex((c) => c.id === campoId);
          const dest = dir === "up" ? idx - 1 : idx + 1;
          if (dest < 0 || dest >= arr.length) return s;
          [arr[idx], arr[dest]] = [arr[dest], arr[idx]];
          return { ...s, campos: arr };
        }),
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  const defaultIds = new Set(DEFAULT_SECCIONES.map((s) => s.id));

  return (
    <>
      <ToastContainer />

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Formularios de Presencia Tradicional
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configura los campos de cada formulario por tipo de medio
            </p>
          </div>
        </div>

        <div className="flex min-h-[600px]">
          {/* ── Left panel: subcategorías ── */}
          <div className="w-56 border-r border-gray-200 shrink-0">
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Medios Tradicionales
              </p>
              {subcategorias.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Sin subcategorías
                </p>
              ) : (
                <ul className="space-y-1">
                  {subcategorias.map((sub) => (
                    <li key={sub}>
                      <button
                        onClick={() => setSelectedSubcat(sub)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedSubcat === sub
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {sub}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Right panel: template editor ── */}
          <div className="flex-1 min-w-0">
            {!selectedSubcat ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Selecciona un tipo de medio
              </div>
            ) : loadingTemplate ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Cargando plantilla…
              </div>
            ) : template ? (
              <div className="p-6 space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Formulario:{" "}
                    <span className="text-blue-600">{selectedSubcat}</span>
                  </h3>
                  <button
                    onClick={saveTemplate}
                    disabled={saving}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                      savedRecently
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-60`}
                  >
                    {savedRecently ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" /> Guardado
                      </>
                    ) : saving ? (
                      "Guardando…"
                    ) : (
                      "Guardar plantilla"
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Activa/desactiva secciones, agrega campos y ordénalos a tu
                  gusto. Cada cambio requiere guardar.
                </p>

                {/* Secciones */}
                <div className="space-y-3">
                  {template.secciones.map((seccion, sIdx) => {
                    const isExpanded = expandedSections.has(seccion.id);
                    const isDefault = defaultIds.has(seccion.id);

                    return (
                      <div
                        key={seccion.id}
                        className={`border rounded-xl overflow-hidden transition-all ${
                          seccion.activo
                            ? "border-gray-300 bg-white"
                            : "border-gray-200 bg-gray-50 opacity-70"
                        }`}
                      >
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleExpanded(seccion.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </button>

                          <span
                            className={`flex-1 font-semibold text-sm ${seccion.activo ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {seccion.nombre}
                            {seccion.esProveedorEspecial && (
                              <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                Selector de proveedor incluido
                              </span>
                            )}
                          </span>

                          {/* Campo count badge */}
                          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                            {seccion.campos.length} campo
                            {seccion.campos.length !== 1 ? "s" : ""}
                          </span>

                          {/* Reorder (non-default only reorderable freely; defaults also reorderable) */}
                          <button
                            onClick={() => moverSeccion(seccion.id, "up")}
                            disabled={sIdx === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                            title="Mover arriba"
                          >
                            <ArrowUpIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moverSeccion(seccion.id, "down")}
                            disabled={sIdx === template.secciones.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                            title="Mover abajo"
                          >
                            <ArrowDownIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete custom section */}
                          {!isDefault && (
                            <button
                              onClick={() =>
                                eliminarSeccionPersonalizada(seccion.id)
                              }
                              className="p-1 text-red-400 hover:text-red-600"
                              title="Eliminar sección"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* On/Off toggle */}
                          <button
                            onClick={() => toggleSeccion(seccion.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              seccion.activo ? "bg-blue-600" : "bg-gray-300"
                            }`}
                            title={
                              seccion.activo
                                ? "Desactivar sección"
                                : "Activar sección"
                            }
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                seccion.activo
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Section body */}
                        {isExpanded && (
                          <div className="p-4 space-y-2">
                            {/* Proveedor special row */}
                            {seccion.esProveedorEspecial && (
                              <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg">
                                <ListBulletIcon className="w-4 h-4 text-purple-600 shrink-0" />
                                <span className="text-sm text-purple-700 font-medium">
                                  Selector de proveedores
                                </span>
                                <span className="text-xs text-purple-500 ml-auto">
                                  (predeterminado)
                                </span>
                              </div>
                            )}

                            {/* Fields */}
                            {seccion.campos.length === 0 &&
                              !seccion.esProveedorEspecial && (
                                <p className="text-sm text-gray-400 italic py-1">
                                  Sin campos. Agrega el primero.
                                </p>
                              )}
                            {seccion.campos.length === 0 &&
                              seccion.esProveedorEspecial && (
                                <p className="text-sm text-gray-400 italic py-1">
                                  Puedes agregar campos adicionales de
                                  información manual del proveedor.
                                </p>
                              )}

                            {seccion.campos.map((campo, cIdx) => (
                              <CampoRow
                                key={campo.id}
                                campo={campo}
                                index={cIdx}
                                total={seccion.campos.length}
                                onEdit={() =>
                                  setFieldModal({
                                    open: true,
                                    seccionId: seccion.id,
                                    editingField: campo,
                                  })
                                }
                                onDelete={() => {
                                  if (
                                    confirm(
                                      `¿Eliminar el campo "${campo.etiqueta}"?`,
                                    )
                                  )
                                    eliminarCampo(seccion.id, campo.id);
                                }}
                                onMove={(dir) =>
                                  moverCampo(seccion.id, campo.id, dir)
                                }
                              />
                            ))}

                            {/* Add field button */}
                            <button
                              onClick={() =>
                                setFieldModal({
                                  open: true,
                                  seccionId: seccion.id,
                                })
                              }
                              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Agregar campo
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add custom section */}
                <button
                  onClick={() => setNuevSeccionModal(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Agregar sección personalizada
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Field modal ── */}
      {fieldModal?.open && (
        <FieldModal
          initial={fieldModal.editingField}
          onClose={() => setFieldModal(null)}
          onSave={(field) => {
            upsertCampo(fieldModal.seccionId, field);
            setFieldModal(null);
          }}
        />
      )}

      {/* ── Nueva sección modal ── */}
      {nuevaSeccionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Nueva sección
            </h3>
            <input
              type="text"
              value={nuevaSeccionNombre}
              onChange={(e) => setNuevaSeccionNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") agregarSeccionPersonalizada();
              }}
              placeholder="Nombre de la sección"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNuevSeccionModal(false);
                  setNuevaSeccionNombre("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={agregarSeccionPersonalizada}
                disabled={!nuevaSeccionNombre.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
