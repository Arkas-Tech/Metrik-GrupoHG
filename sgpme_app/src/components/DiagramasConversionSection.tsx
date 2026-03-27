"use client";

import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

/* ═══════════ Tipos ═══════════ */
interface Diagrama {
  id: number;
  marca: string;
  modelo: string;
  mes: number;
  anio: number;
  canal_proyeccion: string | null;
  canal_conversion: string | null;
  departamento: string | null;
  anuncios: string[];
  oferta_comercial: string | null;
  tipo: string | null;
  preguntas: string[];
  objetivo: string | null;
  tipo_destino: string | null;
  destinos: string[];
  notas: string | null;
  creado_por: string | null;
}

interface ModeloDef {
  id: string;
  label: string;
  desc: string;
  color: string;
  canal_proyeccion_fixed: string | null;
  canal_proyeccion_selector: boolean;
  tipo: string;
  canal_conversion: string;
  objetivo: string;
  tipo_destino: string;
}

/* ═══════════ Constantes ═══════════ */
const MODELOS: ModeloDef[] = [
  {
    id: "MFCRM",
    label: "MFCRM",
    desc: "Meta Form → CRM",
    color: "blue",
    canal_proyeccion_fixed: "Facebook / Instagram",
    canal_proyeccion_selector: false,
    tipo: "Formulario",
    canal_conversion: "Facebook",
    objetivo: "Lead",
    tipo_destino: "Intelimotor",
  },
  {
    id: "MWCRM",
    label: "MWCRM",
    desc: "Meta WhatsApp → CRM",
    color: "green",
    canal_proyeccion_fixed: "Facebook / Instagram",
    canal_proyeccion_selector: false,
    tipo: "WhatsApp",
    canal_conversion: "Facebook",
    objetivo: "Lead de WhatsApp",
    tipo_destino: "Intelimotor",
  },
  {
    id: "GFCRM",
    label: "GFCRM",
    desc: "Google Form → CRM",
    color: "red",
    canal_proyeccion_fixed: null,
    canal_proyeccion_selector: true,
    tipo: "Formulario",
    canal_conversion: "WEB",
    objetivo: "Lead",
    tipo_destino: "Correos Formularios / Intelimotor",
  },
];

const DEPARTAMENTOS = ["Ventas Nuevos"];
const OPCIONES_GFCRM_PROYECCION = ["Busqueda", "Pmax"];

const NOM_MES = [
  "",
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

/* ═══════════ Colores ═══════════ */
function modelColor(modelo: string) {
  const m = MODELOS.find((x) => x.id === modelo);
  if (!m)
    return {
      bg: "bg-gray-100",
      border: "border-gray-300",
      text: "text-gray-700",
      ring: "ring-gray-200",
      badge: "bg-gray-200 text-gray-700",
    };
  const map: Record<
    string,
    { bg: string; border: string; text: string; ring: string; badge: string }
  > = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-300",
      text: "text-blue-700",
      ring: "ring-blue-200",
      badge: "bg-blue-100 text-blue-800",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-300",
      text: "text-green-700",
      ring: "ring-green-200",
      badge: "bg-green-100 text-green-800",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-700",
      ring: "ring-red-200",
      badge: "bg-red-100 text-red-800",
    },
  };
  return map[m.color];
}

/* ═══════════ Helpers ═══════════ */
function pj(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDiagrama(r: Record<string, unknown>): Diagrama {
  return {
    id: r.id as number,
    marca: r.marca as string,
    modelo: r.modelo as string,
    mes: r.mes as number,
    anio: r.anio as number,
    canal_proyeccion: (r.canal_proyeccion as string) || null,
    canal_conversion: (r.canal_conversion as string) || null,
    departamento: (r.departamento as string) || null,
    anuncios: pj(r.anuncio as string | null),
    oferta_comercial: (r.oferta_comercial as string) || null,
    tipo: (r.tipo as string) || null,
    preguntas: pj(r.preguntas as string | null),
    objetivo: (r.objetivo as string) || null,
    tipo_destino: (r.tipo_destino as string) || null,
    destinos: pj(r.destino as string | null),
    notas: (r.notas as string) || null,
    creado_por: (r.creado_por as string) || null,
  };
}

/* ═══════════ FlowStep ═══════════ */
function FlowStep({
  label,
  value,
  items,
  colorText,
  colorBorder,
}: {
  label: string;
  value?: string | null;
  items?: string[];
  colorText: string;
  colorBorder: string;
}) {
  const display = items && items.length > 0 ? items : value ? [value] : [];
  if (display.length === 0) return null;
  return (
    <div className="flex flex-col items-center min-w-[90px] max-w-[140px]">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 text-center leading-tight">
        {label}
      </span>
      <div
        className={`rounded-lg px-2 py-2 text-center border ${colorBorder} bg-white shadow-sm w-full`}
      >
        {display.map((item, i) => (
          <span
            key={i}
            className={`block text-xs font-semibold ${colorText} leading-tight`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ DiagramaFlowCard ═══════════ */
function DiagramaFlowCard({
  d,
  onEdit,
  onDelete,
}: {
  d: Diagrama;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = modelColor(d.modelo);
  const steps: Array<{
    label: string;
    value?: string | null;
    items?: string[];
  }> = [
    { label: "Modelo", value: d.modelo },
    { label: "Canal de Proyección", value: d.canal_proyeccion },
    { label: "Departamento", value: d.departamento },
    { label: "Campaña", items: d.anuncios },
    { label: "Oferta Comercial", value: d.oferta_comercial },
    { label: "Tipo", value: d.tipo },
    { label: "Canal de Conversión", value: d.canal_conversion },
    { label: "Preguntas", items: d.preguntas },
    { label: "Objetivo", value: d.objetivo },
    { label: "Tipo de Destino", value: d.tipo_destino },
    { label: "Destino", items: d.destinos },
  ].filter((s) => (s.items ? s.items.length > 0 : !!s.value));

  return (
    <div
      className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 transition-shadow hover:shadow-md`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}
          >
            {d.modelo}
          </span>
          <span className="text-xs text-gray-500">{d.marca}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg"
          >
            <PencilIcon className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-lg"
          >
            <TrashIcon className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>

      {/* Flow steps */}
      <div className="flex flex-wrap items-start gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <FlowStep
              label={s.label}
              value={s.value}
              items={s.items}
              colorText={c.text}
              colorBorder={c.border}
            />
            {i < steps.length - 1 && (
              <svg
                className="w-4 h-4 text-gray-400 shrink-0 mt-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {d.notas && (
        <p className="mt-3 text-xs text-gray-500 italic border-t pt-2">
          {d.notas}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export default function DiagramasConversionSection() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const { filtraPorMarca, marcasPermitidas } = useMarcaGlobal();

  /* ── Data ── */
  const [registros, setRegistros] = useState<Diagrama[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filtros ── */
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroModelo, setFiltroModelo] = useState("");

  /* ── Accordion ── */
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  /* ── Modal form ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  /* Form fields */
  const [fMarca, setFMarca] = useState("");
  const [fModelo, setFModelo] = useState("MFCRM");
  const [fCanalProyeccionGFCRM, setFCanalProyeccionGFCRM] =
    useState("Busqueda");
  const [fDepartamento, setFDepartamento] = useState("Ventas Nuevos");
  const [fAnuncios, setFAnuncios] = useState<string[]>([""]);
  const [fOfertaComercial, setFOfertaComercial] = useState("");
  const [fPreguntas, setFPreguntas] = useState<string[]>([""]);
  const [fDestinos, setFDestinos] = useState<string[]>([""]);
  const [fNotas, setFNotas] = useState("");

  /* Campañas disponibles para el campo Campaña */
  const [campanasDisponibles, setCampanasDisponibles] = useState<string[]>([]);
  const [loadingCampanas, setLoadingCampanas] = useState(false);

  /* Derived auto-fill from model */
  const modelInfo = MODELOS.find((m) => m.id === fModelo) || MODELOS[0];
  const canalProyeccionAuto = modelInfo.canal_proyeccion_fixed
    ? modelInfo.canal_proyeccion_fixed
    : fCanalProyeccionGFCRM;

  /* ── Fetch campañas al cambiar marca/modelo en modal ── */
  useEffect(() => {
    if (!modalOpen || !fMarca) return;
    const plataforma = fModelo === "GFCRM" ? "google-ads" : "meta-ads";
    let cancelled = false;
    setLoadingCampanas(true);
    fetchConToken(
      `${API}/${plataforma}/campanas?marca=${encodeURIComponent(fMarca)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { nombre: string }[] | null) => {
        if (cancelled) return;
        setCampanasDisponibles(
          data && Array.isArray(data)
            ? data.map((c) => c.nombre).filter(Boolean)
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setCampanasDisponibles([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCampanas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [API, fMarca, fModelo, modalOpen]);

  /* ── Fetch ── */
  const cargar = () => {
    fetchConToken(`${API}/diagramas-conversion/?anio=${filtroAnio}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setRegistros((data as Record<string, unknown>[]).map(parseDiagrama)),
      )
      .catch(() => {});
  };

  useEffect(() => {
    fetchConToken(`${API}/diagramas-conversion/?anio=${filtroAnio}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setRegistros((data as Record<string, unknown>[]).map(parseDiagrama)),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API, filtroAnio]);

  /* ── Filtered ── */
  const registrosMes = useMemo(() => {
    return registros
      .filter(
        (r) =>
          r.mes === filtroMes &&
          r.anio === filtroAnio &&
          (!r.marca || filtraPorMarca(r.marca)) &&
          (!filtroModelo || r.modelo === filtroModelo),
      )
      .sort((a, b) => a.modelo.localeCompare(b.modelo));
  }, [registros, filtroMes, filtroAnio, filtraPorMarca, filtroModelo]);

  /* Group by model */
  const byModel = useMemo(() => {
    const map = new Map<string, Diagrama[]>();
    for (const r of registrosMes) {
      const arr = map.get(r.modelo) || [];
      arr.push(r);
      map.set(r.modelo, arr);
    }
    return map;
  }, [registrosMes]);

  /* ── Toggle modelo ── */
  const toggleModel = (m: string) => {
    setExpandedModels((prev) => {
      const n = new Set(prev);
      if (n.has(m)) {
        n.delete(m);
      } else {
        n.add(m);
      }
      return n;
    });
  };

  /* ── Abrir form ── */
  const abrirNuevo = () => {
    setEditandoId(null);
    setFMarca(marcasPermitidas.length === 1 ? marcasPermitidas[0] : "");
    setFModelo("MFCRM");
    setFCanalProyeccionGFCRM("Busqueda");
    setFDepartamento("Ventas Nuevos");
    setFAnuncios([""]);
    setFOfertaComercial("");
    setFPreguntas([""]);
    setFDestinos([""]);
    setFNotas("");
    setCampanasDisponibles([]);
    setModalOpen(true);
  };

  const abrirEditar = (d: Diagrama) => {
    setEditandoId(d.id);
    setFMarca(d.marca);
    setFModelo(d.modelo);
    if (d.modelo === "GFCRM" && d.canal_proyeccion) {
      setFCanalProyeccionGFCRM(d.canal_proyeccion);
    } else {
      setFCanalProyeccionGFCRM("Busqueda");
    }
    setFDepartamento(d.departamento || "Ventas Nuevos");
    setFAnuncios(d.anuncios.length > 0 ? [...d.anuncios] : [""]);
    setFOfertaComercial(d.oferta_comercial || "");
    setFPreguntas(d.preguntas.length > 0 ? [...d.preguntas] : [""]);
    setFDestinos(d.destinos.length > 0 ? [...d.destinos] : [""]);
    setFNotas(d.notas || "");
    setCampanasDisponibles([]);
    setModalOpen(true);
  };

  /* ── Guardar ── */
  const guardar = async () => {
    if (!fMarca) return;
    setGuardando(true);
    const mi = MODELOS.find((m) => m.id === fModelo) || MODELOS[0];
    const canalProy = mi.canal_proyeccion_fixed || fCanalProyeccionGFCRM;
    const body = {
      marca: fMarca,
      modelo: fModelo,
      mes: filtroMes,
      anio: filtroAnio,
      canal_proyeccion: canalProy,
      canal_conversion: mi.canal_conversion,
      departamento: fDepartamento,
      anuncio: JSON.stringify(fAnuncios.filter((a) => a.trim())),
      oferta_comercial: fOfertaComercial,
      tipo: mi.tipo,
      preguntas: JSON.stringify(fPreguntas.filter((p) => p.trim())),
      objetivo: mi.objetivo,
      tipo_destino: mi.tipo_destino,
      destino: JSON.stringify(fDestinos.filter((d) => d.trim())),
      notas: fNotas,
    };
    try {
      const url = editandoId
        ? `${API}/diagramas-conversion/${editandoId}`
        : `${API}/diagramas-conversion/`;
      const method = editandoId ? "PUT" : "POST";
      await fetchConToken(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      cargar();
    } catch {
      /* ignore */
    }
    setGuardando(false);
  };

  /* ── Eliminar ── */
  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este diagrama?")) return;
    await fetchConToken(`${API}/diagramas-conversion/${id}`, {
      method: "DELETE",
    });
    cargar();
  };

  /* ── List helpers ── */
  const updItem = (
    setter: Dispatch<SetStateAction<string[]>>,
    i: number,
    v: string,
  ) => setter((p) => p.map((x, j) => (j === i ? v : x)));
  const addItem = (setter: Dispatch<SetStateAction<string[]>>) =>
    setter((p) => [...p, ""]);
  const rmItem = (setter: Dispatch<SetStateAction<string[]>>, i: number) =>
    setter((p) => p.filter((_, j) => j !== i));

  /* ── Summary ── */
  const totalDiagramas = registrosMes.length;
  const countByModel = MODELOS.map((m) => ({
    ...m,
    count: registrosMes.filter((r) => r.modelo === m.id).length,
  }));

  /* ══════════ RENDER ══════════ */
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Diagramas de Conversión
        </h2>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo diagrama
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={filtroAnio}
          onChange={(e) => setFiltroAnio(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
        >
          {[2024, 2025, 2026, 2027].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
        >
          {NOM_MES.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={filtroModelo}
          onChange={(e) => setFiltroModelo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
        >
          <option value="">Todos los modelos</option>
          {MODELOS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
          <span className="text-xs font-medium text-gray-600">Total</span>
          <span className="text-sm font-bold text-gray-900">
            {totalDiagramas}
          </span>
        </div>
        {countByModel.map((m) => {
          const c = modelColor(m.id);
          return (
            <div
              key={m.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.badge}`}
            >
              <span className="text-xs font-medium">{m.label}</span>
              <span className="text-sm font-bold">{m.count}</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : totalDiagramas === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">
            No hay diagramas para {NOM_MES[filtroMes]} {filtroAnio}
          </p>
          <p className="text-sm">
            Presiona &quot;Nuevo diagrama&quot; para agregar uno.
          </p>
        </div>
      ) : (
        /* Accordion by model */
        <div className="space-y-4">
          {Array.from(byModel.entries()).map(([modelo, items]) => {
            const c = modelColor(modelo);
            const open = expandedModels.has(modelo);
            const mInfo = MODELOS.find((x) => x.id === modelo);
            return (
              <div
                key={modelo}
                className={`border-2 ${c.border} rounded-xl overflow-hidden`}
              >
                <button
                  onClick={() => toggleModel(modelo)}
                  className={`w-full flex items-center justify-between px-5 py-3 ${c.bg} hover:brightness-95 transition-all text-left`}
                >
                  <div className="flex items-center gap-3">
                    {open ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                    )}
                    <span className={`font-bold text-lg ${c.text}`}>
                      {modelo}
                    </span>
                    {mInfo && (
                      <span className="text-sm text-gray-500">
                        {mInfo.desc}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded-full ${c.badge}`}
                  >
                    {items.length}
                  </span>
                </button>

                {open && (
                  <div className="p-4 space-y-4 bg-white">
                    {items.map((d) => (
                      <DiagramaFlowCard
                        key={d.id}
                        d={d}
                        onEdit={() => abrirEditar(d)}
                        onDelete={() => eliminar(d.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ Modal formulario ═══════════ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {editandoId
                  ? "Editar diagrama"
                  : "Nuevo diagrama de conversión"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Agencia + Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agencia
                  </label>
                  <select
                    value={fMarca}
                    onChange={(e) => setFMarca(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                  >
                    <option value="">Seleccionar</option>
                    {marcasPermitidas.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <div className="flex gap-2">
                    {MODELOS.map((m) => {
                      const selected = fModelo === m.id;
                      const mc = modelColor(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => setFModelo(m.id)}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            selected
                              ? `${mc.bg} ${mc.border} ${mc.text} ring-2 ${mc.ring}`
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{modelInfo.desc}</p>
                </div>
              </div>

              {/* Canal Proyección + Departamento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canal de Proyección
                    {!modelInfo.canal_proyeccion_selector && (
                      <span className="ml-1 text-xs text-gray-400">(auto)</span>
                    )}
                  </label>
                  {modelInfo.canal_proyeccion_selector ? (
                    <select
                      value={fCanalProyeccionGFCRM}
                      onChange={(e) => setFCanalProyeccionGFCRM(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                    >
                      {OPCIONES_GFCRM_PROYECCION.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                      {canalProyeccionAuto}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={fDepartamento}
                    onChange={(e) => setFDepartamento(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                  >
                    {DEPARTAMENTOS.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campaña (lista dinámica) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaña
                  {loadingCampanas && (
                    <span className="ml-2 text-xs text-gray-400">
                      Cargando campañas...
                    </span>
                  )}
                  {!loadingCampanas && campanasDisponibles.length > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      {campanasDisponibles.length} campañas disponibles
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  {fAnuncios.map((a, i) => (
                    <div key={i} className="flex gap-2">
                      {campanasDisponibles.length > 0 ? (
                        <select
                          value={a}
                          onChange={(e) =>
                            updItem(setFAnuncios, i, e.target.value)
                          }
                          className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                        >
                          <option value="">Seleccionar campaña...</option>
                          {campanasDisponibles.map((nombre) => (
                            <option key={nombre} value={nombre}>
                              {nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={a}
                          onChange={(e) =>
                            updItem(setFAnuncios, i, e.target.value)
                          }
                          placeholder={
                            loadingCampanas
                              ? "Cargando campañas..."
                              : `Campaña ${i + 1}`
                          }
                          disabled={loadingCampanas}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
                        />
                      )}
                      {fAnuncios.length > 1 && (
                        <button
                          onClick={() => rmItem(setFAnuncios, i)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addItem(setFAnuncios)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  <PlusIcon className="w-4 h-4" /> Agregar campaña
                </button>
              </div>

              {/* Oferta Comercial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oferta Comercial
                </label>
                <input
                  type="text"
                  value={fOfertaComercial}
                  onChange={(e) => setFOfertaComercial(e.target.value)}
                  placeholder="Ej. Bono $10,000 en accesorios"
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
                />
              </div>

              {/* Auto fields: Tipo, Canal Conversión, Objetivo, Tipo Destino */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-xs text-gray-400">(auto)</span>
                  </label>
                  <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                    {modelInfo.tipo}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canal de Conversión{" "}
                    <span className="text-xs text-gray-400">(auto)</span>
                  </label>
                  <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                    {modelInfo.canal_conversion}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivo{" "}
                    <span className="text-xs text-gray-400">(auto)</span>
                  </label>
                  <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                    {modelInfo.objetivo}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Destino{" "}
                    <span className="text-xs text-gray-400">(auto)</span>
                  </label>
                  <div className="border rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-600">
                    {modelInfo.tipo_destino}
                  </div>
                </div>
              </div>

              {/* Preguntas (lista dinámica) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preguntas
                </label>
                <div className="space-y-2">
                  {fPreguntas.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={p}
                        onChange={(e) =>
                          updItem(setFPreguntas, i, e.target.value)
                        }
                        placeholder={`P${i + 1} (ej. Nombre, Celular, Correo)`}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900"
                      />
                      {fPreguntas.length > 1 && (
                        <button
                          onClick={() => rmItem(setFPreguntas, i)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addItem(setFPreguntas)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  <PlusIcon className="w-4 h-4" /> Agregar pregunta
                </button>
              </div>

              {/* Destinos (lista dinámica) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destino
                </label>
                <div className="space-y-2">
                  {fDestinos.map((dest, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={dest}
                        onChange={(e) =>
                          updItem(setFDestinos, i, e.target.value)
                        }
                        placeholder={`Destino ${i + 1} (URL, email, teléfono)`}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900"
                      />
                      {fDestinos.length > 1 && (
                        <button
                          onClick={() => rmItem(setFDestinos, i)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addItem(setFDestinos)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  <PlusIcon className="w-4 h-4" /> Agregar destino
                </button>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={fNotas}
                  onChange={(e) => setFNotas(e.target.value)}
                  rows={2}
                  placeholder="Observaciones adicionales..."
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !fMarca}
                className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
