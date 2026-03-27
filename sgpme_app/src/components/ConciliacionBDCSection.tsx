"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

/* ═══════════ Tipos ═══════════ */
interface LeadEstado {
  estado: string;
  bdc: number;
  mkt: number;
  ventas?: number;
}
interface MedioComp {
  medio: string;
  bdc: number;
  mkt: number;
  notas: string;
}
interface Conciliacion {
  id: number;
  marca: string;
  semana_inicio: string;
  semana_fin: string;
  mes: number;
  anio: number;
  leads_activos: LeadEstado[];
  leads_cerrados: LeadEstado[];
  comparacion_medios: MedioComp[];
  notas_generales: string;
  creado_por: string | null;
}

/* ═══════════ Constantes ═══════════ */
const ACTIVOS_DEF = [
  "Por contactar",
  "Contactado",
  "Cita agendada",
  "Cita cumplida",
];
const CERRADOS_DEF = [
  "No compran",
  "Se van a esperar",
  "Foráneo",
  "Sin enganche",
  "Crédito rechazado",
  "Compró otra marca",
  "Falta de vehículo",
  "Teléfono incorrecto",
  "Dejaron de responder",
  "Respuesta nula",
  "Duplicado",
  "No solicitó info",
  "Fuera de presupuesto",
];
const MEDIOS_DEF = ["Forms", "Messenger", "Web", "WhatsApp"];
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

/* ═══════════ Helpers ═══════════ */
function pj<T>(s: string | null | undefined, fb: T): T {
  if (!s) return fb;
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
}
function parseConciliacion(r: Record<string, unknown>): Conciliacion {
  return {
    id: r.id as number,
    marca: r.marca as string,
    semana_inicio: r.semana_inicio as string,
    semana_fin: r.semana_fin as string,
    mes: r.mes as number,
    anio: r.anio as number,
    leads_activos: pj(r.leads_activos as string | null, []),
    leads_cerrados: pj(r.leads_cerrados as string | null, []),
    comparacion_medios: pj(r.comparacion_medios as string | null, []),
    notas_generales: (r.notas_generales as string) || "",
    creado_por: (r.creado_por as string) || null,
  };
}

function sumL(a: LeadEstado[], k: "bdc" | "mkt") {
  return a.reduce((s, r) => s + (r[k] || 0), 0);
}
function sumM(a: MedioComp[], k: "bdc" | "mkt") {
  return a.reduce((s, r) => s + (r[k] || 0), 0);
}
function fmtSem(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
function DifSpan({ a, b }: { a: number; b: number }) {
  const d = a - b;
  if (d > 0) return <span className="text-green-600 font-semibold">+{d}</span>;
  if (d < 0) return <span className="text-red-600 font-semibold">{d}</span>;
  return <span className="text-gray-400">0</span>;
}

interface Resumen {
  actBDC: number;
  actMKT: number;
  cerBDC: number;
  cerMKT: number;
  medBDC: number;
  medMKT: number;
  sem: number;
}
function calcResumen(rs: Conciliacion[]): Resumen {
  let actBDC = 0,
    actMKT = 0,
    cerBDC = 0,
    cerMKT = 0,
    medBDC = 0,
    medMKT = 0;
  for (const r of rs) {
    actBDC += sumL(r.leads_activos, "bdc");
    actMKT += sumL(r.leads_activos, "mkt");
    cerBDC += sumL(r.leads_cerrados, "bdc");
    cerMKT += sumL(r.leads_cerrados, "mkt");
    medBDC += sumM(r.comparacion_medios, "bdc");
    medMKT += sumM(r.comparacion_medios, "mkt");
  }
  return { actBDC, actMKT, cerBDC, cerMKT, medBDC, medMKT, sem: rs.length };
}

function agregadoPorEstado(
  rs: Conciliacion[],
  campo: "leads_activos" | "leads_cerrados",
) {
  const map = new Map<string, { bdc: number; mkt: number; ventas: number }>();
  for (const r of rs) {
    for (const item of r[campo]) {
      const prev = map.get(item.estado) || { bdc: 0, mkt: 0, ventas: 0 };
      map.set(item.estado, {
        bdc: prev.bdc + (item.bdc || 0),
        mkt: prev.mkt + (item.mkt || 0),
        ventas: prev.ventas + (item.ventas || 0),
      });
    }
  }
  return Array.from(map.entries()).map(([estado, v]) => ({
    estado,
    ...v,
  }));
}
function agregadoPorMedio(rs: Conciliacion[]) {
  const map = new Map<string, { bdc: number; mkt: number }>();
  for (const r of rs) {
    for (const item of r.comparacion_medios) {
      const prev = map.get(item.medio) || { bdc: 0, mkt: 0 };
      map.set(item.medio, {
        bdc: prev.bdc + (item.bdc || 0),
        mkt: prev.mkt + (item.mkt || 0),
      });
    }
  }
  return Array.from(map.entries()).map(([medio, v]) => ({ medio, ...v }));
}

function weekDates() {
  const n = new Date();
  const d = n.getDay();
  const mon = new Date(n);
  mon.setDate(n.getDate() - (d === 0 ? 6 : d - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    i: mon.toISOString().split("T")[0],
    f: sun.toISOString().split("T")[0],
  };
}

/* ═══════════ Sub-componentes ═══════════ */
function TarjetaResumen({
  label,
  bdc,
  mkt,
  color,
  showMkt = true,
}: {
  label: string;
  bdc: number;
  mkt: number;
  color: string;
  showMkt?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border-2 ${color} flex flex-col items-center`}
    >
      <h4 className="text-sm font-semibold text-gray-600 mb-3">{label}</h4>
      {showMkt ? (
        <div className="grid grid-cols-3 gap-4 w-full text-center">
          <div>
            <p className="text-xs text-gray-500">BDC</p>
            <p className="text-xl font-bold text-gray-900">{bdc}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">MKT</p>
            <p className="text-xl font-bold text-gray-900">{mkt}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Dif.</p>
            <p className="text-xl font-bold">
              <DifSpan a={bdc} b={mkt} />
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full text-center">
          <p className="text-xs text-gray-500">BDC</p>
          <p className="text-2xl font-bold text-gray-900">{bdc}</p>
        </div>
      )}
    </div>
  );
}

function TablaLeads({
  titulo,
  filas,
  showVentas = false,
}: {
  titulo: string;
  filas: LeadEstado[];
  showVentas?: boolean;
}) {
  const totBDC = sumL(filas, "bdc");
  const totVentas = showVentas
    ? filas.reduce((s, r) => s + (r.ventas || 0), 0)
    : 0;
  return (
    <div className="mb-4">
      <h5 className="text-sm font-bold text-gray-700 mb-2">{titulo}</h5>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="text-left px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-center w-20">BDC</th>
              {showVentas && (
                <th className="px-3 py-2 text-center w-20">Ventas</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1.5 text-gray-700">{f.estado}</td>
                <td className="px-3 py-1.5 text-center font-medium">
                  {f.bdc}
                </td>
                {showVentas && (
                  <td className="px-3 py-1.5 text-center font-medium">
                    {f.ventas ?? 0}
                  </td>
                )}
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="px-3 py-1.5 text-gray-800">TOTAL</td>
              <td className="px-3 py-1.5 text-center">{totBDC}</td>
              {showVentas && (
                <td className="px-3 py-1.5 text-center">{totVentas}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TablaMedios({ filas }: { filas: MedioComp[] }) {
  const totBDC = sumM(filas, "bdc");
  const totMKT = sumM(filas, "mkt");
  return (
    <div className="mb-4">
      <h5 className="text-sm font-bold text-gray-700 mb-2">
        Leads generados / recibidos
      </h5>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="text-left px-3 py-2">Medio</th>
              <th className="px-3 py-2 text-center w-20">BDC</th>
              <th className="px-3 py-2 text-center w-20">MKT</th>
              <th className="px-3 py-2 text-center w-20">Dif.</th>
              <th className="text-left px-3 py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-1.5 text-gray-700 font-medium">
                  {f.medio}
                </td>
                <td className="px-3 py-1.5 text-center">{f.bdc}</td>
                <td className="px-3 py-1.5 text-center">{f.mkt}</td>
                <td className="px-3 py-1.5 text-center">
                  <DifSpan a={f.bdc} b={f.mkt} />
                </td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{f.notas}</td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="px-3 py-1.5 text-gray-800">TOTAL</td>
              <td className="px-3 py-1.5 text-center">{totBDC}</td>
              <td className="px-3 py-1.5 text-center">{totMKT}</td>
              <td className="px-3 py-1.5 text-center">
                <DifSpan a={totBDC} b={totMKT} />
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export default function ConciliacionBDCSection() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const { filtraPorMarca, marcasPermitidas } = useMarcaGlobal();

  /* ── Data ── */
  const [registros, setRegistros] = useState<Conciliacion[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filtros ── */
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);

  /* ── Comparación ── */
  const [comparando, setComparando] = useState(false);
  const [comparaTipo, setComparaTipo] = useState<"mes" | "agencia">("mes");
  const [compMes2, setCompMes2] = useState(
    new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
  );
  const [compAnio2, setCompAnio2] = useState(new Date().getFullYear());
  const [compAg1, setCompAg1] = useState("");
  const [compAg2, setCompAg2] = useState("");

  /* ── Accordion ── */
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [detalleOpen, setDetalleOpen] = useState(false);

  /* ── Modal form ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [fMarca, setFMarca] = useState("");
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [fActivos, setFActivos] = useState<LeadEstado[]>([]);
  const [fCerrados, setFCerrados] = useState<LeadEstado[]>([]);
  const [fMedios, setFMedios] = useState<MedioComp[]>([]);
  const [fNotas, setFNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  /* ── Sección activa del form ── */
  const [formTab, setFormTab] = useState<"activos" | "cerrados" | "medios">(
    "activos",
  );

  /* ── Fetch ── */
  const cargar = () => {
    fetchConToken(`${API}/conciliacion-bdc/?anio=${filtroAnio}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setRegistros(
          (data as Record<string, unknown>[]).map(parseConciliacion),
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchConToken(`${API}/conciliacion-bdc/?anio=${filtroAnio}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setRegistros(
          (data as Record<string, unknown>[]).map(parseConciliacion),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API, filtroAnio]);

  /* ── Datos filtrados por mes actual ── */
  const registrosMes = useMemo(
    () =>
      registros
        .filter(
          (r) =>
            r.mes === filtroMes &&
            r.anio === filtroAnio &&
            (!r.marca || filtraPorMarca(r.marca)),
        )
        .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio)),
    [registros, filtroMes, filtroAnio, filtraPorMarca],
  );
  const resumen = useMemo(() => calcResumen(registrosMes), [registrosMes]);

  /* ── Datos para comparación ── */
  const datosComp1 = useMemo(() => {
    if (!comparando) return registrosMes;
    if (comparaTipo === "agencia") {
      return registros
        .filter(
          (r) =>
            r.mes === filtroMes && r.anio === filtroAnio && r.marca === compAg1,
        )
        .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio));
    }
    return registrosMes;
  }, [
    comparando,
    comparaTipo,
    registros,
    registrosMes,
    filtroMes,
    filtroAnio,
    compAg1,
  ]);
  const datosComp2 = useMemo(() => {
    if (!comparando) return [];
    if (comparaTipo === "mes") {
      return registros
        .filter(
          (r) =>
            r.mes === compMes2 &&
            r.anio === compAnio2 &&
            (!r.marca || filtraPorMarca(r.marca)),
        )
        .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio));
    }
    return registros
      .filter(
        (r) =>
          r.mes === filtroMes && r.anio === filtroAnio && r.marca === compAg2,
      )
      .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio));
  }, [
    comparando,
    comparaTipo,
    registros,
    compMes2,
    compAnio2,
    filtroMes,
    filtroAnio,
    filtraPorMarca,
    compAg2,
  ]);
  const resComp1 = useMemo(() => calcResumen(datosComp1), [datosComp1]);
  const resComp2 = useMemo(() => calcResumen(datosComp2), [datosComp2]);

  /* ── Desglose mensual ── */
  const desgActivos = useMemo(
    () => agregadoPorEstado(registrosMes, "leads_activos"),
    [registrosMes],
  );
  const desgCerrados = useMemo(
    () => agregadoPorEstado(registrosMes, "leads_cerrados"),
    [registrosMes],
  );
  const desgMedios = useMemo(
    () => agregadoPorMedio(registrosMes),
    [registrosMes],
  );

  /* ── Toggle semana ── */
  const toggleWeek = (id: number) => {
    setExpandedWeeks((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  /* ── Abrir form ── */
  const abrirNuevo = () => {
    const w = weekDates();
    setEditandoId(null);
    setFMarca(marcasPermitidas.length === 1 ? marcasPermitidas[0] : "");
    setFInicio(w.i);
    setFFin(w.f);
    setFActivos(ACTIVOS_DEF.map((e) => ({ estado: e, bdc: 0, mkt: 0, ventas: 0 })));
    setFCerrados(CERRADOS_DEF.map((e) => ({ estado: e, bdc: 0, mkt: 0 })));
    setFMedios(
      MEDIOS_DEF.map((m) => ({ medio: m, bdc: 0, mkt: 0, notas: "" })),
    );
    setFNotas("");
    setFormTab("activos");
    setModalOpen(true);
  };
  const abrirEditar = (c: Conciliacion) => {
    setEditandoId(c.id);
    setFMarca(c.marca);
    setFInicio(c.semana_inicio);
    setFFin(c.semana_fin);
    setFActivos(
      c.leads_activos.length > 0
        ? c.leads_activos.map((x) => ({ ...x, ventas: x.ventas ?? 0 }))
        : ACTIVOS_DEF.map((e) => ({ estado: e, bdc: 0, mkt: 0, ventas: 0 })),
    );
    setFCerrados(
      c.leads_cerrados.length > 0
        ? c.leads_cerrados.map((x) => ({ ...x }))
        : CERRADOS_DEF.map((e) => ({ estado: e, bdc: 0, mkt: 0 })),
    );
    setFMedios(
      c.comparacion_medios.length > 0
        ? c.comparacion_medios.map((x) => ({ ...x }))
        : MEDIOS_DEF.map((m) => ({ medio: m, bdc: 0, mkt: 0, notas: "" })),
    );
    setFNotas(c.notas_generales);
    setFormTab("activos");
    setModalOpen(true);
  };

  /* ── Guardar ── */
  const guardar = async () => {
    if (!fMarca || !fInicio || !fFin) return;
    setGuardando(true);
    const inicio = new Date(fInicio + "T00:00:00");
    const body = {
      marca: fMarca,
      semana_inicio: fInicio,
      semana_fin: fFin,
      mes: inicio.getMonth() + 1,
      anio: inicio.getFullYear(),
      leads_activos: JSON.stringify(fActivos),
      leads_cerrados: JSON.stringify(fCerrados),
      comparacion_medios: JSON.stringify(fMedios),
      notas_generales: fNotas,
    };
    try {
      const url = editandoId
        ? `${API}/conciliacion-bdc/${editandoId}`
        : `${API}/conciliacion-bdc/`;
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
    if (!confirm("¿Eliminar esta conciliación?")) return;
    await fetchConToken(`${API}/conciliacion-bdc/${id}`, {
      method: "DELETE",
    });
    cargar();
  };

  /* ── Form: update helpers ── */
  const updActivo = (i: number, k: "bdc" | "mkt" | "ventas", v: number) =>
    setFActivos((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const updCerrado = (
    i: number,
    k: "bdc" | "mkt" | "estado",
    v: number | string,
  ) =>
    setFCerrados((p) =>
      p.map((r, j) => (j === i ? { ...r, [k]: v as never } : r)),
    );
  const updMedio = (
    i: number,
    k: "bdc" | "mkt" | "notas",
    v: number | string,
  ) =>
    setFMedios((p) =>
      p.map((r, j) => (j === i ? { ...r, [k]: v as never } : r)),
    );

  /* ──────────── MAIN RETURN ──────────── */
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Conciliación con BDC
        </h2>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva conciliación
        </button>
      </div>

      {/* ═══ Filtros ═══ */}
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

        <button
          onClick={() => setComparando(!comparando)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            comparando
              ? "bg-blue-50 text-blue-700 border-blue-300"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
          Comparar
        </button>

        {comparando && (
          <>
            <select
              value={comparaTipo}
              onChange={(e) =>
                setComparaTipo(e.target.value as "mes" | "agencia")
              }
              className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
            >
              <option value="mes">Mes vs Mes</option>
              <option value="agencia">Agencia vs Agencia</option>
            </select>

            {comparaTipo === "mes" ? (
              <>
                <span className="text-gray-400 text-sm">vs</span>
                <select
                  value={compMes2}
                  onChange={(e) => setCompMes2(Number(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                >
                  {NOM_MES.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={compAnio2}
                  onChange={(e) => setCompAnio2(Number(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                >
                  {[2024, 2025, 2026, 2027].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  value={compAg1}
                  onChange={(e) => setCompAg1(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                >
                  <option value="">Agencia 1</option>
                  {marcasPermitidas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400 text-sm">vs</span>
                <select
                  value={compAg2}
                  onChange={(e) => setCompAg2(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                >
                  <option value="">Agencia 2</option>
                  {marcasPermitidas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : comparando ? (
        /* ═══ Vista comparación ═══ */
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Columna 1 */}
            <div className="border rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                {comparaTipo === "mes"
                  ? `${NOM_MES[filtroMes]} ${filtroAnio}`
                  : compAg1 || "Agencia 1"}
                <span className="text-sm text-gray-500 ml-2">
                  ({resComp1.sem} sem.)
                </span>
              </h3>
              <div className="space-y-3">
                <TarjetaResumen
                  label="Leads Activos"
                  bdc={resComp1.actBDC}
                  mkt={resComp1.actMKT}
                  color="border-green-200 bg-green-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads Cerrados"
                  bdc={resComp1.cerBDC}
                  mkt={resComp1.cerMKT}
                  color="border-orange-200 bg-orange-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads generados / recibidos"
                  bdc={resComp1.medBDC}
                  mkt={resComp1.medMKT}
                  color="border-blue-200 bg-blue-50"
                />
              </div>
            </div>
            {/* Columna 2 */}
            <div className="border rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                {comparaTipo === "mes"
                  ? `${NOM_MES[compMes2]} ${compAnio2}`
                  : compAg2 || "Agencia 2"}
                <span className="text-sm text-gray-500 ml-2">
                  ({resComp2.sem} sem.)
                </span>
              </h3>
              <div className="space-y-3">
                <TarjetaResumen
                  label="Leads Activos"
                  bdc={resComp2.actBDC}
                  mkt={resComp2.actMKT}
                  color="border-green-200 bg-green-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads Cerrados"
                  bdc={resComp2.cerBDC}
                  mkt={resComp2.cerMKT}
                  color="border-orange-200 bg-orange-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads generados / recibidos"
                  bdc={resComp2.medBDC}
                  mkt={resComp2.medMKT}
                  color="border-blue-200 bg-blue-50"
                />
              </div>
            </div>
          </div>
          {/* Tabla diferencia */}
          <div className="border rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
              Diferencia
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="text-left px-4 py-2">Métrica</th>
                    <th className="text-center px-4 py-2">
                      {comparaTipo === "mes"
                        ? NOM_MES[filtroMes]
                        : compAg1 || "Ag1"}
                    </th>
                    <th className="text-center px-4 py-2">
                      {comparaTipo === "mes"
                        ? NOM_MES[compMes2]
                        : compAg2 || "Ag2"}
                    </th>
                    <th className="text-center px-4 py-2">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      l: "Activos BDC",
                      a: resComp1.actBDC,
                      b: resComp2.actBDC,
                    },
                    {
                      l: "Cerrados BDC",
                      a: resComp1.cerBDC,
                      b: resComp2.cerBDC,
                    },
                    {
                      l: "Gen/Rec BDC",
                      a: resComp1.medBDC,
                      b: resComp2.medBDC,
                    },
                    {
                      l: "Gen/Rec MKT",
                      a: resComp1.medMKT,
                      b: resComp2.medMKT,
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-2 font-medium text-gray-700">
                        {row.l}
                      </td>
                      <td className="px-4 py-2 text-center font-bold">
                        {row.a}
                      </td>
                      <td className="px-4 py-2 text-center font-bold">
                        {row.b}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <DifSpan a={row.a} b={row.b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ Vista normal ═══ */
        <div>
          {/* Resumen mensual */}
          {registrosMes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">
                No hay conciliaciones para {NOM_MES[filtroMes]} {filtroAnio}
              </p>
              <p className="text-sm">
                Presiona &quot;Nueva conciliación&quot; para agregar la primera
                semana.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-2">
                <p className="text-sm text-gray-500 mb-3">
                  Resumen {NOM_MES[filtroMes]} {filtroAnio} &middot;{" "}
                  {resumen.sem} semana{resumen.sem !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <TarjetaResumen
                  label="Leads Activos"
                  bdc={resumen.actBDC}
                  mkt={resumen.actMKT}
                  color="border-green-200 bg-green-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads Cerrados"
                  bdc={resumen.cerBDC}
                  mkt={resumen.cerMKT}
                  color="border-orange-200 bg-orange-50"
                  showMkt={false}
                />
                <TarjetaResumen
                  label="Leads generados / recibidos"
                  bdc={resumen.medBDC}
                  mkt={resumen.medMKT}
                  color="border-blue-200 bg-blue-50"
                />
              </div>

              {/* Desglose mensual expandible */}
              <div className="mb-6">
                <button
                  onClick={() => setDetalleOpen(!detalleOpen)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {detalleOpen ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                  {detalleOpen
                    ? "Ocultar desglose mensual"
                    : "Ver desglose mensual"}
                </button>
                {detalleOpen && (
                  <div className="mt-4 border rounded-xl p-4 bg-gray-50 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activos acumulado */}
                    <div>
                      <h5 className="text-sm font-bold text-green-700 mb-2">
                        Activos (acumulado)
                      </h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">Estado</th>
                            <th className="text-center py-1 w-14">BDC</th>
                            <th className="text-center py-1 w-14">Ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {desgActivos.map((f, i) => (
                            <tr key={i}>
                              <td className="py-0.5 text-gray-700">
                                {f.estado}
                              </td>
                              <td className="py-0.5 text-center">{f.bdc}</td>
                              <td className="py-0.5 text-center">{f.ventas ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Cerrados acumulado */}
                    <div>
                      <h5 className="text-sm font-bold text-orange-700 mb-2">
                        Cerrados (acumulado)
                      </h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">Estado</th>
                            <th className="text-center py-1 w-14">BDC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {desgCerrados.map((f, i) => (
                            <tr key={i}>
                              <td className="py-0.5 text-gray-700">
                                {f.estado}
                              </td>
                              <td className="py-0.5 text-center">{f.bdc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Medios acumulado */}
                    <div>
                      <h5 className="text-sm font-bold text-blue-700 mb-2">
                        Leads gen/rec (acumulado)
                      </h5>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">Medio</th>
                            <th className="text-center py-1 w-14">BDC</th>
                            <th className="text-center py-1 w-14">MKT</th>
                            <th className="text-center py-1 w-14">Dif.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {desgMedios.map((f, i) => (
                            <tr key={i}>
                              <td className="py-0.5 text-gray-700">
                                {f.medio}
                              </td>
                              <td className="py-0.5 text-center">{f.bdc}</td>
                              <td className="py-0.5 text-center">{f.mkt}</td>
                              <td className="py-0.5 text-center">
                                <DifSpan a={f.bdc} b={f.mkt} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Semanas accordion */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Semanas
                </h3>
                <div className="space-y-3">
                  {registrosMes.map((r) => {
                    const totBDC = sumM(r.comparacion_medios, "bdc");
                    const totMKT = sumM(r.comparacion_medios, "mkt");
                    const open = expandedWeeks.has(r.id);
                    return (
                      <div
                        key={r.id}
                        className="border rounded-xl overflow-hidden"
                      >
                        {/* Header semana */}
                        <button
                          onClick={() => toggleWeek(r.id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            {open ? (
                              <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-semibold text-gray-800">
                              Sem. {fmtSem(r.semana_inicio)} –{" "}
                              {fmtSem(r.semana_fin)}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                              {r.marca}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>
                              BDC:{" "}
                              <strong className="text-gray-800">
                                {totBDC}
                              </strong>
                            </span>
                            <span>
                              MKT:{" "}
                              <strong className="text-gray-800">
                                {totMKT}
                              </strong>
                            </span>
                            <DifSpan a={totBDC} b={totMKT} />
                          </div>
                        </button>

                        {/* Detalle semana */}
                        {open && (
                          <div className="p-4 border-t bg-white">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-4">
                                <TablaLeads
                                  titulo="Leads Activos"
                                  filas={r.leads_activos}
                                  showVentas
                                />
                                <TablaLeads
                                  titulo="Leads Cerrados"
                                  filas={r.leads_cerrados}
                                />
                              </div>
                              <TablaMedios filas={r.comparacion_medios} />
                            </div>
                            {r.notas_generales && (
                              <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-xs font-semibold text-yellow-700 mb-1">
                                  Notas
                                </p>
                                <p className="text-sm text-gray-700">
                                  {r.notas_generales}
                                </p>
                              </div>
                            )}
                            <div className="flex gap-2 mt-4 justify-end">
                              <button
                                onClick={() => abrirEditar(r)}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg"
                              >
                                <PencilIcon className="w-4 h-4" /> Editar
                              </button>
                              <button
                                onClick={() => eliminar(r.id)}
                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg"
                              >
                                <TrashIcon className="w-4 h-4" /> Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ Modal formulario ═══════════ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {editandoId
                  ? "Editar conciliación"
                  : "Nueva conciliación semanal"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Marca + Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                    Inicio semana
                  </label>
                  <input
                    type="date"
                    value={fInicio}
                    onChange={(e) => setFInicio(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fin semana
                  </label>
                  <input
                    type="date"
                    value={fFin}
                    onChange={(e) => setFFin(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                {(
                  [
                    ["activos", "Leads Activos"],
                    ["cerrados", "Leads Cerrados"],
                    ["medios", "Leads gen/rec"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFormTab(key)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      formTab === key
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Activos */}
              {formTab === "activos" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-50 text-green-800">
                        <th className="text-left px-3 py-2">Estado</th>
                        <th className="px-3 py-2 text-center w-24">BDC</th>
                        <th className="px-3 py-2 text-center w-24">Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fActivos.map((f, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-3 py-1.5 text-gray-700">
                            {f.estado}
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={f.bdc || ""}
                              onChange={(e) =>
                                updActivo(
                                  i,
                                  "bdc",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-center text-gray-900"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={f.ventas ?? ""}
                              onChange={(e) =>
                                updActivo(
                                  i,
                                  "ventas",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-center text-gray-900"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-100 font-bold">
                        <td className="px-3 py-1.5">TOTAL</td>
                        <td className="px-3 py-1.5 text-center">
                          {sumL(fActivos, "bdc")}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {fActivos.reduce((s, r) => s + (r.ventas || 0), 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab: Cerrados */}
              {formTab === "cerrados" && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-orange-50 text-orange-800">
                          <th className="text-left px-3 py-2">Razón</th>
                          <th className="px-3 py-2 text-center w-24">BDC</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {fCerrados.map((f, i) => {
                          const isCustom = !CERRADOS_DEF.includes(f.estado);
                          return (
                            <tr
                              key={i}
                              className={
                                i % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-3 py-1.5">
                                {isCustom ? (
                                  <input
                                    type="text"
                                    value={f.estado}
                                    onChange={(e) =>
                                      updCerrado(i, "estado", e.target.value)
                                    }
                                    placeholder="Razón personalizada"
                                    className="w-full border rounded px-2 py-1 text-sm text-gray-900"
                                  />
                                ) : (
                                  <span className="text-gray-700">
                                    {f.estado}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={f.bdc || ""}
                                  onChange={(e) =>
                                    updCerrado(
                                      i,
                                      "bdc",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-full border rounded px-2 py-1 text-center text-gray-900"
                                />
                              </td>
                              <td className="px-1">
                                {isCustom && (
                                  <button
                                    onClick={() =>
                                      setFCerrados((p) =>
                                        p.filter((_, j) => j !== i),
                                      )
                                    }
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-orange-100 font-bold">
                          <td className="px-3 py-1.5">TOTAL</td>
                          <td className="px-3 py-1.5 text-center">
                            {sumL(fCerrados, "bdc")}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() =>
                      setFCerrados((p) => [
                        ...p,
                        { estado: "", bdc: 0, mkt: 0 },
                      ])
                    }
                    className="mt-3 inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    <PlusIcon className="w-4 h-4" /> Agregar razón de cierre
                  </button>
                </div>
              )}

              {/* Tab: Por Medio */}
              {formTab === "medios" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-50 text-blue-800">
                        <th className="text-left px-3 py-2">Medio</th>
                        <th className="px-3 py-2 text-center w-24">BDC</th>
                        <th className="px-3 py-2 text-center w-24">MKT</th>
                        <th className="px-3 py-2 text-center w-20">Dif.</th>
                        <th className="text-left px-3 py-2">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fMedios.map((f, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-3 py-1.5 text-gray-700 font-medium">
                            {f.medio}
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={f.bdc || ""}
                              onChange={(e) =>
                                updMedio(
                                  i,
                                  "bdc",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-center text-gray-900"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={f.mkt || ""}
                              onChange={(e) =>
                                updMedio(
                                  i,
                                  "mkt",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-center text-gray-900"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <DifSpan a={f.bdc} b={f.mkt} />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={f.notas}
                              onChange={(e) =>
                                updMedio(i, "notas", e.target.value)
                              }
                              placeholder="Notas..."
                              className="w-full border rounded px-2 py-1 text-sm text-gray-900"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-100 font-bold">
                        <td className="px-3 py-1.5">TOTAL</td>
                        <td className="px-3 py-1.5 text-center">
                          {sumM(fMedios, "bdc")}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {sumM(fMedios, "mkt")}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <DifSpan
                            a={sumM(fMedios, "bdc")}
                            b={sumM(fMedios, "mkt")}
                          />
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notas generales */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas generales
                </label>
                <textarea
                  value={fNotas}
                  onChange={(e) => setFNotas(e.target.value)}
                  rows={3}
                  placeholder="Observaciones de la junta semanal..."
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 resize-none"
                />
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !fMarca || !fInicio || !fFin}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
