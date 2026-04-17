"use client";

import { useState, useEffect } from "react";
import { Proyeccion, SUBCATEGORIAS_POR_CATEGORIA } from "@/types";
import { useCategorias } from "@/hooks/useCategorias";
import {
  EyeIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleStackIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

const ORDEN_AGENCIAS = [
  "Toyota Chihuahua",
  "Toyota Delicias",
  "Toyota Cuauhtemoc",
  "Toyota Monclova",
  "Toyota Piedras Negras",
  "Kia Juventud",
  "Kia Juarez",
  "Subaru Chihuahua",
  "Subaru Juárez",
  "GWM Chihuahua",
  "GWM Juárez",
  "Seminuevos Chihuahua",
  "Seminuevos Juárez",
  "Seminuevos Monclova",
];

interface PresupuestoMensual {
  id: string;
  mes: number;
  anio: number;
  categoria: string;
  marca_id: number;
  marca_nombre: string;
  monto: number;
}

interface ListaProyeccionesProps {
  proyecciones: Proyeccion[];
  onEditar: (proyeccion: Proyeccion) => void;
  onEliminar: (id: string) => void;
  onAprobar?: (id: string) => void;
  onNuevaProyeccion?: () => void;
  onGestionarPresupuestos?: () => void;
  loading?: boolean;
  permisos?: {
    editar: boolean;
    eliminar: boolean;
    aprobar?: boolean;
    crear?: boolean;
  };
}

// Función para generar PDF de una proyección
const generarPDFProyeccion = async (
  proyeccion: Proyeccion,
  presupuestosMensuales: PresupuestoMensual[],
  nombresCategorias: string[],
) => {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const obtenerPresupuesto = (categoria: string): number => {
    const meses = [
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
    const mesNumero = meses.indexOf(proyeccion.mes) + 1;
    return presupuestosMensuales
      .filter(
        (p) =>
          p.marca_nombre === proyeccion.marca &&
          p.mes === mesNumero &&
          p.anio === proyeccion.año &&
          p.categoria === categoria,
      )
      .reduce((sum, p) => sum + (p.monto || 0), 0);
  };

  const formatearMonto = (monto: number): string => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  let yPos = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Proyección Presupuestal", 105, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Agencia: ${proyeccion.marca}`, 20, yPos);
  yPos += 8;
  doc.text(`Periodo: ${proyeccion.mes} ${proyeccion.año}`, 20, yPos);
  yPos += 8;
  doc.text(
    `Monto Total Proyectado: ${formatearMonto(proyeccion.montoTotal)}`,
    20,
    yPos,
  );
  yPos += 8;
  doc.text(
    `Fecha de Creación: ${new Date(proyeccion.fechaCreacion).toLocaleDateString("es-MX")}`,
    20,
    yPos,
  );

  if (proyeccion.fechaModificacion) {
    yPos += 8;
    doc.text(
      `Última Modificación: ${new Date(proyeccion.fechaModificacion).toLocaleDateString("es-MX")}`,
      20,
      yPos,
    );
  }

  yPos += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Partidas", 20, yPos);
  yPos += 10;

  const partidasNormales = proyeccion.partidas.filter((p) => !p.esReembolso);
  const partidasReembolso = proyeccion.partidas.filter((p) => p.esReembolso);

  const partidasPorCategoria: {
    [key: string]: { subcategoria: string; monto: number }[];
  } = {};
  partidasNormales.forEach((partida) => {
    if (!partidasPorCategoria[partida.categoria]) {
      partidasPorCategoria[partida.categoria] = [];
    }
    partidasPorCategoria[partida.categoria].push({
      subcategoria: partida.subcategoria,
      monto: partida.monto,
    });
  });

  Object.keys(partidasPorCategoria).forEach((categoria) => {
    const presupuesto = obtenerPresupuesto(categoria);
    const subcategorias = partidasPorCategoria[categoria] || [];
    const montoTotalCategoria = subcategorias.reduce(
      (sum, sub) => sum + sub.monto,
      0,
    );
    const porcentaje =
      presupuesto > 0 ? (montoTotalCategoria / presupuesto) * 100 : 0;

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(categoria, 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (subcategorias.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text("  Sin partidas asignadas", 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    } else {
      subcategorias.forEach((sub) => {
        doc.text(
          `  • ${sub.subcategoria}: ${formatearMonto(sub.monto)}`,
          20,
          yPos,
        );
        yPos += 6;
      });
    }

    doc.setFont("helvetica", "bold");
    doc.text(`  Total: ${formatearMonto(montoTotalCategoria)}`, 20, yPos);
    doc.text(`Presupuesto: ${formatearMonto(presupuesto)}`, 110, yPos);

    if (presupuesto > 0) {
      const color =
        porcentaje > 100
          ? [220, 38, 38]
          : porcentaje > 80
            ? [234, 179, 8]
            : [34, 197, 94];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`${porcentaje.toFixed(1)}%`, 170, yPos);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 10;
  });

  if (partidasReembolso.length > 0) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text("Reembolsos", 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    const reembolsosPorCategoria: {
      [key: string]: { subcategoria: string; monto: number }[];
    } = {};
    partidasReembolso.forEach((partida) => {
      if (!reembolsosPorCategoria[partida.categoria]) {
        reembolsosPorCategoria[partida.categoria] = [];
      }
      reembolsosPorCategoria[partida.categoria].push({
        subcategoria: partida.subcategoria,
        monto: partida.monto,
      });
    });

    Object.keys(reembolsosPorCategoria).forEach((categoria) => {
      const presupuesto = obtenerPresupuesto(categoria);
      const subcategorias = reembolsosPorCategoria[categoria];
      const montoTotalCategoria = subcategorias.reduce(
        (sum, sub) => sum + sub.monto,
        0,
      );
      const porcentaje =
        presupuesto > 0 ? (montoTotalCategoria / presupuesto) * 100 : 0;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(categoria, 20, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      subcategorias.forEach((sub) => {
        doc.text(
          `  • ${sub.subcategoria}: ${formatearMonto(sub.monto)}`,
          20,
          yPos,
        );
        yPos += 6;
      });

      doc.setFont("helvetica", "bold");
      doc.text(`  Total: ${formatearMonto(montoTotalCategoria)}`, 20, yPos);
      doc.text(`Presupuesto: ${formatearMonto(presupuesto)}`, 110, yPos);

      if (presupuesto > 0) {
        const color =
          porcentaje > 100
            ? [220, 38, 38]
            : porcentaje > 80
              ? [234, 179, 8]
              : [34, 197, 94];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`${porcentaje.toFixed(1)}%`, 170, yPos);
        doc.setTextColor(0, 0, 0);
      }
      yPos += 10;
    });
  }

  const nombreArchivo = `Proyeccion_${proyeccion.marca.replace(/\s+/g, "_")}_${proyeccion.mes}_${proyeccion.año}.pdf`;
  doc.save(nombreArchivo);
};

export default function ListaProyecciones({
  proyecciones,
  onEditar,
  onEliminar,
  onAprobar,
  onNuevaProyeccion,
  onGestionarPresupuestos,
  loading = false,
  permisos = { editar: true, eliminar: true, aprobar: false, crear: false },
}: ListaProyeccionesProps) {
  const { nombresCategorias } = useCategorias();
  const [presupuestosMensuales, setPresupuestosMensuales] = useState<
    PresupuestoMensual[]
  >([]);
  const [vistaAgrupacion, setVistaAgrupacion] = useState<"agencia" | "mes">(
    "agencia",
  );
  const [filtroEstado, setFiltroEstado] = useState<
    "todas" | "pendiente" | "aprobada"
  >("todas");

  // Estados para expandir agencias y proyecciones
  const [agenciasExpandidas, setAgenciasExpandidas] = useState<Set<string>>(
    new Set(),
  );
  const [proyeccionesExpandidas, setProyeccionesExpandidas] = useState<
    Set<string>
  >(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<
    Record<string, string | null>
  >({});
  const [subcategoriasExpandidas, setSubcategoriasExpandidas] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    const fetchPresupuestos = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/presupuesto/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setPresupuestosMensuales(data);
        }
      } catch (error) {
        console.error("Error al obtener presupuestos:", error);
      }
    };
    fetchPresupuestos();
  }, []);

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const toggleAgencia = (agencia: string) => {
    setAgenciasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(agencia)) {
        next.delete(agencia);
      } else {
        next.add(agencia);
      }
      return next;
    });
  };

  const toggleProyeccion = (id: string) => {
    setProyeccionesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCategoria = (proyeccionId: string, categoria: string) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [proyeccionId]: prev[proyeccionId] === categoria ? null : categoria,
    }));
    setSubcategoriasExpandidas((prev) => ({ ...prev, [proyeccionId]: null }));
  };

  const toggleSubcategoria = (proyeccionId: string, key: string) => {
    setSubcategoriasExpandidas((prev) => ({
      ...prev,
      [proyeccionId]: prev[proyeccionId] === key ? null : key,
    }));
  };

  const obtenerPresupuestoCategoria = (
    marca: string,
    mes: string,
    año: number,
    categoria: string,
  ): number => {
    const meses = [
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
    const mesNumero = meses.indexOf(mes) + 1;
    const presupuesto = presupuestosMensuales.find(
      (p) =>
        p.marca_nombre === marca &&
        p.mes === mesNumero &&
        p.anio === año &&
        p.categoria === categoria,
    );
    return presupuesto?.monto || 0;
  };

  const proyeccionesFiltradas =
    filtroEstado === "todas"
      ? proyecciones
      : proyecciones.filter((p) => p.estado === filtroEstado);

  const agruparPorAgencia = () => {
    const grupos: { [key: string]: Proyeccion[] } = {};
    proyeccionesFiltradas.forEach((proyeccion) => {
      const agencia = proyeccion.marca;
      if (!grupos[agencia]) grupos[agencia] = [];
      grupos[agencia].push(proyeccion);
    });

    const agenciasOrdenadas = Object.keys(grupos).sort((a, b) => {
      const indexA = ORDEN_AGENCIAS.indexOf(a);
      const indexB = ORDEN_AGENCIAS.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return agenciasOrdenadas.map((agencia) => ({
      agencia,
      proyecciones: grupos[agencia],
      total: grupos[agencia].reduce((sum, p) => sum + p.montoTotal, 0),
    }));
  };

  const proyeccionesAgrupadas = agruparPorAgencia();
  const montoTotalGeneral = proyecciones.reduce(
    (total, p) => total + p.montoTotal,
    0,
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left side - Title and filters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Proyecciones por {vistaAgrupacion === "agencia" ? "agencia" : "mes"}
            :{" "}
            <span className="text-gray-600 font-normal">
              {proyeccionesFiltradas.length} en {proyeccionesAgrupadas.length}{" "}
              agencia
              {proyeccionesAgrupadas.length !== 1 ? "s" : ""}
            </span>
          </h3>

          <div className="flex items-center gap-4 mt-4">
            {/* Toggle agencia/mes */}
            <div className="flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setVistaAgrupacion("agencia")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  vistaAgrupacion === "agencia"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Por agencia
              </button>
              <button
                onClick={() => setVistaAgrupacion("mes")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  vistaAgrupacion === "mes"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Por mes
              </button>
            </div>

            {/* Filtro de estado */}
            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value as "todas" | "pendiente" | "aprobada",
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="aprobada">Aprobadas</option>
            </select>
          </div>
        </div>

        {/* Right side - Monto total and buttons */}
        <div className="flex flex-col items-end gap-3">
          {/* Monto total general */}
          <div className="bg-green-50 border border-green-200 rounded-2xl px-8 py-4 text-center">
            <p className="text-sm text-green-700 font-medium">
              Monto total general:
            </p>
            <p className="text-3xl font-bold text-green-700">
              {formatearMonto(montoTotalGeneral)}
            </p>
          </div>

          {/* Gestionar presupuesto button */}
          {onGestionarPresupuestos && (
            <button
              onClick={onGestionarPresupuestos}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-6 py-2.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>Gestionar presupuesto</span>
              <CircleStackIcon className="h-5 w-5" />
            </button>
          )}

          {/* Nueva proyección button */}
          {permisos.crear && onNuevaProyeccion && (
            <button
              onClick={onNuevaProyeccion}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-6 py-2.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>Nueva proyección</span>
              <PlusCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Proyecciones List */}
      <div className="space-y-4">
        {proyeccionesFiltradas.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay proyecciones{" "}
              {filtroEstado !== "todas" && `${filtroEstado}s`}
            </h3>
            <p className="text-gray-600">
              {filtroEstado === "todas"
                ? "Crea tu primera proyección presupuestal para comenzar."
                : `No hay proyecciones ${filtroEstado}s en este momento.`}
            </p>
          </div>
        ) : (
          proyeccionesAgrupadas.map((grupo) => {
            const meses = [
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

            const presupuestoTotalAgencia = grupo.proyecciones.reduce(
              (total, proyeccion) => {
                const mesNumero = meses.indexOf(proyeccion.mes) + 1;
                return (
                  total +
                  presupuestosMensuales
                    .filter(
                      (p) =>
                        p.marca_nombre === grupo.agencia &&
                        p.mes === mesNumero &&
                        p.anio === proyeccion.año,
                    )
                    .reduce((sum, p) => sum + (p.monto || 0), 0)
                );
              },
              0,
            );

            const isAgenciaExpandida = agenciasExpandidas.has(grupo.agencia);

            return (
              <div key={grupo.agencia}>
                {/* Agency Row */}
                <div
                  className="flex items-center py-2.5 cursor-pointer hover:bg-gray-50 transition-colors pl-4"
                  onClick={() => toggleAgencia(grupo.agencia)}
                >
                  {/* Agencia + Flecha - alineada con columna Mes */}
                  <div className="flex-1 flex items-center gap-2">
                    <h4
                      className="text-2xl font-semibold"
                      style={{ color: "#202429" }}
                    >
                      {grupo.agencia}
                    </h4>
                    {isAgenciaExpandida ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </div>

                  {/* Espacio columna 2 (Presupuesto dentro) */}
                  <div className="flex-1"></div>

                  {/* Num proyecciones - alineado con columna Proyección */}
                  <div className="flex-1 text-center">
                    <span className="text-sm text-gray-600">
                      {grupo.proyecciones.length} proyección
                      {grupo.proyecciones.length !== 1 ? "es" : ""}
                    </span>
                  </div>

                  {/* Presupuesto - alineado con columna Reembolso */}
                  <div className="flex-1 text-center">
                    <span className="text-sm text-gray-600">
                      Presupuesto:{" "}
                      <span
                        className="text-lg font-semibold"
                        style={{ color: "#005117" }}
                      >
                        {formatearMonto(presupuestoTotalAgencia)}
                      </span>
                    </span>
                  </div>

                  {/* Proyección - alineada con columna Estado */}
                  <div className="flex-1 text-center">
                    <span className="text-sm text-gray-600">
                      Proyección:{" "}
                      <span
                        className="text-lg font-semibold"
                        style={{
                          color:
                            grupo.total > presupuestoTotalAgencia
                              ? "#9c0e11"
                              : "#005117",
                        }}
                      >
                        {formatearMonto(grupo.total)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Expanded Agency - Projections */}
                {isAgenciaExpandida && (
                  <div className="mt-2 space-y-3 pl-4">
                    {grupo.proyecciones.map((proyeccion) => {
                      const mesNumero = meses.indexOf(proyeccion.mes) + 1;
                      const presupuestoMensual = presupuestosMensuales
                        .filter(
                          (p) =>
                            p.marca_nombre === grupo.agencia &&
                            p.mes === mesNumero &&
                            p.anio === proyeccion.año,
                        )
                        .reduce((sum, p) => sum + (p.monto || 0), 0);

                      const reembolsoTotal = (proyeccion.partidas || [])
                        .filter((p) => p.esReembolso)
                        .reduce((sum, p) => sum + (p.monto || 0), 0);

                      const isProyeccionExpandida = proyeccionesExpandidas.has(
                        proyeccion.id,
                      );

                      return (
                        <div key={proyeccion.id} className="relative">
                          {/* Action buttons - positioned absolutely above the card */}
                          <div className="flex justify-end gap-1.5 mb-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProyeccion(proyeccion.id);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Ver detalles"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generarPDFProyeccion(
                                  proyeccion,
                                  presupuestosMensuales,
                                  nombresCategorias,
                                );
                              }}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Descargar PDF"
                            >
                              <ArrowDownTrayIcon className="h-5 w-5" />
                            </button>
                            {permisos.aprobar &&
                              proyeccion.estado === "pendiente" &&
                              onAprobar && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAprobar(proyeccion.id);
                                  }}
                                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                  title="Aprobar"
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                            {permisos.editar && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditar(proyeccion);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Editar"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                            )}
                            {permisos.eliminar && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEliminar(proyeccion.id);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Eliminar"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>

                          {/* Projection Card */}
                          <div className="border-2 border-black rounded-2xl overflow-hidden">
                            {/* Main projection row */}
                            <div
                              className="flex items-center cursor-pointer bg-white py-2"
                              onClick={() => toggleProyeccion(proyeccion.id)}
                            >
                              {/* Month and partidas */}
                              <div className="flex-1 px-6 border-r-2 border-black text-center">
                                <p className="text-lg font-semibold text-gray-900">
                                  {proyeccion.mes} {proyeccion.año}
                                </p>
                                <p className="text-sm font-light text-gray-500">
                                  {(proyeccion.partidas || []).length} partidas
                                </p>
                              </div>

                              {/* Presupuesto */}
                              <div className="flex-1 px-6 border-r-2 border-black text-center">
                                <p className="text-lg font-semibold text-gray-900 mb-0.5">
                                  Presupuesto
                                </p>
                                <p
                                  className="text-lg font-semibold"
                                  style={{ color: "#005117" }}
                                >
                                  {formatearMonto(presupuestoMensual)}
                                </p>
                              </div>

                              {/* Proyección */}
                              <div className="flex-1 px-6 border-r-2 border-black text-center">
                                <p className="text-lg font-semibold text-gray-900 mb-0.5">
                                  Proyección
                                </p>
                                <p
                                  className="text-lg font-semibold"
                                  style={{
                                    color:
                                      proyeccion.montoTotal > presupuestoMensual
                                        ? "#9c0e11"
                                        : "#005117",
                                  }}
                                >
                                  {formatearMonto(proyeccion.montoTotal)}
                                </p>
                              </div>

                              {/* Reembolso */}
                              <div className="flex-1 px-6 border-r-2 border-black text-center">
                                <p className="text-lg font-semibold text-gray-900 mb-0.5">
                                  Reembolso
                                </p>
                                <p className="text-lg font-light text-gray-900">
                                  {formatearMonto(reembolsoTotal)}
                                </p>
                              </div>

                              {/* Estado */}
                              <div className="flex-1 px-6 text-center">
                                <span
                                  className={`inline-flex items-center px-6 py-1.5 rounded-full text-sm font-semibold ${
                                    proyeccion.estado === "aprobada"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {proyeccion.estado === "aprobada"
                                    ? "Aprobada"
                                    : "Pendiente"}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Projection - Partidas */}
                            {isProyeccionExpandida && (
                              <div className="border-t-2 border-black bg-gray-50 px-6 py-4">
                                <h6 className="font-medium text-gray-900 mb-4 text-sm">
                                  Detalles de Partidas
                                </h6>
                                <div className="space-y-2">
                                  {(() => {
                                    const partidasNormales = (
                                      proyeccion.partidas || []
                                    ).filter((p) => !p.esReembolso);
                                    const partidasPorCategoria: {
                                      [key: string]: typeof partidasNormales;
                                    } = {};

                                    partidasNormales.forEach((partida) => {
                                      if (
                                        !partidasPorCategoria[partida.categoria]
                                      ) {
                                        partidasPorCategoria[
                                          partida.categoria
                                        ] = [];
                                      }
                                      partidasPorCategoria[
                                        partida.categoria
                                      ].push(partida);
                                    });

                                    return Object.keys(
                                      partidasPorCategoria,
                                    ).map((categoria) => {
                                      const partidasDeCategoria =
                                        partidasPorCategoria[categoria];
                                      const montoTotal =
                                        partidasDeCategoria.reduce(
                                          (sum, p) => sum + p.monto,
                                          0,
                                        );
                                      const presupuesto =
                                        obtenerPresupuestoCategoria(
                                          proyeccion.marca,
                                          proyeccion.mes,
                                          proyeccion.año,
                                          categoria,
                                        );
                                      const porcentaje =
                                        presupuesto > 0
                                          ? (montoTotal / presupuesto) * 100
                                          : 0;
                                      const isCategoriaExpandida =
                                        categoriasExpandidas[proyeccion.id] ===
                                        categoria;

                                      // Group by subcategory
                                      const porSubcategoria: Record<
                                        string,
                                        typeof partidasDeCategoria
                                      > = {};
                                      const subcategoriasOrdenadas =
                                        SUBCATEGORIAS_POR_CATEGORIA[
                                          categoria as keyof typeof SUBCATEGORIAS_POR_CATEGORIA
                                        ] || [];

                                      subcategoriasOrdenadas.forEach(
                                        (subcategoria) => {
                                          const partidasSubcat =
                                            partidasDeCategoria.filter(
                                              (p) =>
                                                p.subcategoria === subcategoria,
                                            );
                                          if (partidasSubcat.length > 0) {
                                            porSubcategoria[subcategoria] =
                                              partidasSubcat;
                                          }
                                        },
                                      );

                                      partidasDeCategoria.forEach((partida) => {
                                        if (
                                          partida.subcategoria &&
                                          !(
                                            partida.subcategoria in
                                            porSubcategoria
                                          )
                                        ) {
                                          porSubcategoria[
                                            partida.subcategoria
                                          ] = partidasDeCategoria.filter(
                                            (p) =>
                                              p.subcategoria ===
                                              partida.subcategoria,
                                          );
                                        }
                                      });

                                      return (
                                        <div
                                          key={categoria}
                                          className="bg-white border-2 border-black rounded-2xl mb-2"
                                        >
                                          {/* Category Row */}
                                          <div
                                            className="flex items-center cursor-pointer hover:bg-gray-50 px-4 py-3 gap-4"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleCategoria(
                                                proyeccion.id,
                                                categoria,
                                              );
                                            }}
                                          >
                                            {/* Category name and count */}
                                            <div className="flex-shrink-0 w-48">
                                              <p className="font-medium text-gray-900 text-sm">
                                                {categoria}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {partidasDeCategoria.length}{" "}
                                                partidas
                                              </p>
                                            </div>

                                            {/* Presupuesto */}
                                            <div className="w-32">
                                              <p className="text-xs text-gray-500">
                                                Presupuesto
                                              </p>
                                              <p className="font-medium text-gray-900 text-sm">
                                                {formatearMonto(presupuesto)}
                                              </p>
                                            </div>

                                            {/* Proyección */}
                                            <div className="w-32">
                                              <p className="text-xs text-gray-500">
                                                Proyección
                                              </p>
                                              <p
                                                className={`font-medium text-sm ${montoTotal > presupuesto ? "text-red-600" : "text-green-600"}`}
                                              >
                                                {formatearMonto(montoTotal)}
                                              </p>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="flex-1 flex items-center gap-3">
                                              <div className="flex-1">
                                                <div className="text-xs text-gray-500 mb-1">
                                                  Proyección vs Presupuesto
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                  <div
                                                    className={`h-2 rounded-full transition-all ${
                                                      porcentaje === 100
                                                        ? "bg-yellow-500"
                                                        : porcentaje > 100
                                                          ? "bg-red-500"
                                                          : "bg-green-500"
                                                    }`}
                                                    style={{
                                                      width: `${Math.min(porcentaje, 100)}%`,
                                                    }}
                                                  ></div>
                                                </div>
                                              </div>
                                              <span
                                                className={`text-sm font-medium w-16 text-right ${
                                                  porcentaje === 100
                                                    ? "text-yellow-700"
                                                    : porcentaje > 100
                                                      ? "text-red-600"
                                                      : "text-gray-700"
                                                }`}
                                              >
                                                {porcentaje.toFixed(1)}%
                                              </span>
                                            </div>
                                          </div>

                                          {/* Expanded Category - Subcategories */}
                                          {isCategoriaExpandida && (
                                            <div className="border-t-2 border-black">
                                              {Object.entries(
                                                porSubcategoria,
                                              ).map(
                                                ([
                                                  subcategoria,
                                                  partidasSubcat,
                                                ]) => {
                                                  const totalSubcategoria =
                                                    partidasSubcat.reduce(
                                                      (sum, p) => sum + p.monto,
                                                      0,
                                                    );
                                                  const keySubcat = `${categoria}-${subcategoria}`;
                                                  const isSubcategoriaExpandida =
                                                    subcategoriasExpandidas[
                                                      proyeccion.id
                                                    ] === keySubcat;

                                                  return (
                                                    <div
                                                      key={keySubcat}
                                                      className="border-t-2 border-black"
                                                    >
                                                      {/* Subcategory Row */}
                                                      <div
                                                        className="flex items-center cursor-pointer hover:bg-gray-50 px-4 py-2 pl-10"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleSubcategoria(
                                                            proyeccion.id,
                                                            keySubcat,
                                                          );
                                                        }}
                                                      >
                                                        <div className="flex-shrink-0 pr-4 border-r-2 border-black flex items-center gap-2">
                                                          <span className="text-xs">
                                                            {isSubcategoriaExpandida
                                                              ? "▼"
                                                              : "▶"}
                                                          </span>
                                                          <div>
                                                            <p className="text-sm text-gray-800">
                                                              {subcategoria}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                              {
                                                                partidasSubcat.length
                                                              }{" "}
                                                              partidas
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <div className="flex-1 text-right pr-4">
                                                          <p className="font-medium text-gray-900">
                                                            {formatearMonto(
                                                              totalSubcategoria,
                                                            )}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      {/* Expanded Subcategory - Individual items */}
                                                      {isSubcategoriaExpandida && (
                                                        <div className="bg-gray-50">
                                                          {partidasSubcat.map(
                                                            (partida) => (
                                                              <div
                                                                key={partida.id}
                                                                className="px-4 py-2 pl-16 border-t-2 border-black"
                                                              >
                                                                <div className="flex justify-between items-center">
                                                                  <span className="text-sm text-gray-600">
                                                                    {partida.notas ||
                                                                      "Sin notas"}
                                                                  </span>
                                                                  <span className="font-medium text-gray-900">
                                                                    {formatearMonto(
                                                                      partida.monto,
                                                                    )}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            ),
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                {/* Reembolsos section */}
                                {(() => {
                                  const partidasReembolso = (
                                    proyeccion.partidas || []
                                  ).filter((p) => p.esReembolso);
                                  if (partidasReembolso.length === 0)
                                    return null;

                                  const reembolsosPorCategoria: {
                                    [key: string]: typeof partidasReembolso;
                                  } = {};
                                  partidasReembolso.forEach((partida) => {
                                    if (
                                      !reembolsosPorCategoria[partida.categoria]
                                    ) {
                                      reembolsosPorCategoria[
                                        partida.categoria
                                      ] = [];
                                    }
                                    reembolsosPorCategoria[
                                      partida.categoria
                                    ].push(partida);
                                  });

                                  return (
                                    <div className="mt-4">
                                      <h6 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                        <span>💰</span> Reembolsos
                                      </h6>
                                      <div className="space-y-2">
                                        {Object.keys(
                                          reembolsosPorCategoria,
                                        ).map((categoria) => {
                                          const partidas =
                                            reembolsosPorCategoria[categoria];
                                          const montoTotal = partidas.reduce(
                                            (sum, p) => sum + p.monto,
                                            0,
                                          );
                                          const keyCategoria = `reembolso-${categoria}`;
                                          const isCategoriaExpandida =
                                            categoriasExpandidas[
                                              proyeccion.id
                                            ] === keyCategoria;

                                          return (
                                            <div
                                              key={keyCategoria}
                                              className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden"
                                            >
                                              <div
                                                className="flex items-center justify-between cursor-pointer hover:bg-amber-100 px-4 py-3"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleCategoria(
                                                    proyeccion.id,
                                                    keyCategoria,
                                                  );
                                                }}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm">
                                                    {isCategoriaExpandida
                                                      ? "▼"
                                                      : "▶"}
                                                  </span>
                                                  <div>
                                                    <p className="font-medium text-gray-900">
                                                      {categoria}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                      {partidas.length} partidas
                                                    </p>
                                                  </div>
                                                </div>
                                                <p className="font-semibold text-gray-900">
                                                  {formatearMonto(montoTotal)}
                                                </p>
                                              </div>

                                              {isCategoriaExpandida && (
                                                <div className="border-t border-amber-200 bg-white">
                                                  {partidas.map((partida) => (
                                                    <div
                                                      key={partida.id}
                                                      className="px-4 py-2 pl-10 border-t border-amber-100 first:border-t-0"
                                                    >
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                          {partida.subcategoria}
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                          {formatearMonto(
                                                            partida.monto,
                                                          )}
                                                        </span>
                                                      </div>
                                                      {partida.notas && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                          {partida.notas}
                                                        </p>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
