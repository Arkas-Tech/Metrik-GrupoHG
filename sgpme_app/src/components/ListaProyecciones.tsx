"use client";

import { useState, useEffect } from "react";
import { Proyeccion, SUBCATEGORIAS_POR_CATEGORIA } from "@/types";
import { useCategorias } from "@/hooks/useCategorias";
// jsPDF is dynamically imported when generating PDF (~300KB saved from initial bundle)
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
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
  loading?: boolean;
  permisos?: {
    editar: boolean;
    eliminar: boolean;
    aprobar?: boolean;
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

  // Función auxiliar para obtener presupuesto de categoría
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

  // Función para formatear montos
  const formatearMonto = (monto: number): string => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);
  };

  let yPos = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Proyección Presupuestal", 105, yPos, { align: "center" });

  yPos += 15;

  // Información general
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

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Título de partidas
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Partidas", 20, yPos);
  yPos += 10;

  // Separar partidas normales de reembolsos
  const partidasNormales = proyeccion.partidas.filter((p) => !p.esReembolso);
  const partidasReembolso = proyeccion.partidas.filter((p) => p.esReembolso);

  // Agrupar partidas NORMALES por categoría
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

  // Iterar por todas las categorías predefinidas
  nombresCategorias.forEach((categoria) => {
    const presupuesto = obtenerPresupuesto(categoria);
    const subcategorias = partidasPorCategoria[categoria] || [];
    const montoTotalCategoria = subcategorias.reduce(
      (sum, sub) => sum + sub.monto,
      0,
    );
    const porcentaje =
      presupuesto > 0 ? (montoTotalCategoria / presupuesto) * 100 : 0;

    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Categoría
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(categoria, 20, yPos);
    yPos += 6;

    // Subcategorías
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

    // Resumen de categoría
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

  // Sección de Reembolsos en el PDF
  if (partidasReembolso.length > 0) {
    // Verificar espacio para título de reembolsos
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Título de Reembolsos
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9); // Color amber
    doc.text("Reembolsos", 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Agrupar reembolsos por categoría
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

    // Iterar solo por las categorías que tienen reembolsos
    Object.keys(reembolsosPorCategoria).forEach((categoria) => {
      const presupuesto = obtenerPresupuesto(categoria);
      const subcategorias = reembolsosPorCategoria[categoria];
      const montoTotalCategoria = subcategorias.reduce(
        (sum, sub) => sum + sub.monto,
        0,
      );
      const porcentaje =
        presupuesto > 0 ? (montoTotalCategoria / presupuesto) * 100 : 0;

      // Verificar espacio
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Categoría
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(categoria, 20, yPos);
      yPos += 6;

      // Subcategorías
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

      // Resumen
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

  // Guardar el PDF
  const nombreArchivo = `Proyeccion_${proyeccion.marca.replace(/\s+/g, "_")}_${proyeccion.mes}_${proyeccion.año}.pdf`;
  doc.save(nombreArchivo);
};

export default function ListaProyecciones({
  proyecciones,
  onEditar,
  onEliminar,
  onAprobar,
  loading = false,
  permisos = { editar: true, eliminar: true, aprobar: false },
}: ListaProyeccionesProps) {
  const { nombresCategorias, loading: loadingCategorias } = useCategorias();
  const [proyeccionExpandida, setProyeccionExpandida] = useState<string | null>(
    null,
  );
  const [presupuestosMensuales, setPresupuestosMensuales] = useState<
    PresupuestoMensual[]
  >([]);
  const [vistaAgrupacion, setVistaAgrupacion] = useState<"agencia" | "mes">(
    "agencia",
  );
  const [filtroEstado, setFiltroEstado] = useState<
    "todas" | "pendiente" | "aprobada"
  >("todas");

  // Estados para controlar acordeones de categorías y subcategorías en los detalles
  const [categoriasExpandidasDetalle, setCategoriasExpandidasDetalle] =
    useState<Record<string, string | null>>({});
  const [subcategoriasExpandidasDetalle, setSubcategoriasExpandidasDetalle] =
    useState<Record<string, string | null>>({});

  const toggleCategoriaDetalle = (proyeccionId: string, categoria: string) => {
    setCategoriasExpandidasDetalle((prev) => {
      const currentOpen = prev[proyeccionId];
      return {
        ...prev,
        [proyeccionId]: currentOpen === categoria ? null : categoria,
      };
    });

    // Limpiar subcategorías al cambiar de categoría
    setSubcategoriasExpandidasDetalle((prev) => ({
      ...prev,
      [proyeccionId]: null,
    }));
  };

  const toggleSubcategoriaDetalle = (proyeccionId: string, key: string) => {
    setSubcategoriasExpandidasDetalle((prev) => {
      const currentOpen = prev[proyeccionId];
      return {
        ...prev,
        [proyeccionId]: currentOpen === key ? null : key,
      };
    });
  };

  useEffect(() => {
    // Obtener presupuestos mensuales desde el backend
    const fetchPresupuestos = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/presupuesto/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Presupuestos obtenidos:", data);
          setPresupuestosMensuales(data);
        } else {
          console.error("Error en respuesta:", response.status);
        }
      } catch (error) {
        console.error("Error al obtener presupuestos:", error);
      }
    };
    fetchPresupuestos();
  }, []);

  const obtenerPresupuestoCategoria = (
    marca: string,
    mes: string,
    año: number,
    categoria: string,
  ): number => {
    // Convertir mes de nombre a número
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

    // Buscar en el array plano
    const presupuesto = presupuestosMensuales.find(
      (p: PresupuestoMensual) =>
        p.marca_nombre === marca &&
        p.mes === mesNumero &&
        p.anio === año &&
        p.categoria === categoria,
    );

    return presupuesto?.monto || 0;
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const toggleExpandir = (id: string) => {
    setProyeccionExpandida(proyeccionExpandida === id ? null : id);
  };

  // Filtrar proyecciones por estado
  const proyeccionesFiltradas =
    filtroEstado === "todas"
      ? proyecciones
      : proyecciones.filter((p) => p.estado === filtroEstado);

  // Función para agrupar proyecciones por agencia
  const agruparPorAgencia = () => {
    const grupos: { [key: string]: Proyeccion[] } = {};

    proyeccionesFiltradas.forEach((proyeccion) => {
      const agencia = proyeccion.marca;
      if (!grupos[agencia]) {
        grupos[agencia] = [];
      }
      grupos[agencia].push(proyeccion);
    });

    // Ordenar según ORDEN_AGENCIAS
    const agenciasOrdenadas = Object.keys(grupos).sort((a, b) => {
      const indexA = ORDEN_AGENCIAS.indexOf(a);
      const indexB = ORDEN_AGENCIAS.indexOf(b);

      // Si ambas están en el array, ordenar por su posición
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // Si solo una está en el array, esa va primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Si ninguna está en el array, ordenar alfabéticamente
      return a.localeCompare(b);
    });

    return agenciasOrdenadas.map((agencia) => ({
      agencia,
      proyecciones: grupos[agencia],
      total: grupos[agencia].reduce((sum, p) => sum + p.montoTotal, 0),
    }));
  };

  // Función para agrupar proyecciones por mes
  const agruparPorMes = () => {
    const grupos: { [key: string]: Proyeccion[] } = {};

    proyeccionesFiltradas.forEach((proyeccion) => {
      const mesPeriodo = `${proyeccion.mes} ${proyeccion.año}`;
      if (!grupos[mesPeriodo]) {
        grupos[mesPeriodo] = [];
      }
      grupos[mesPeriodo].push(proyeccion);
    });

    // Ordenar por mes y año
    const mesesOrdenados = Object.keys(grupos).sort((a, b) => {
      const [mesA, añoA] = a.split(" ");
      const [mesB, añoB] = b.split(" ");

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

      if (añoA !== añoB) return Number(añoA) - Number(añoB);
      return meses.indexOf(mesA) - meses.indexOf(mesB);
    });

    return mesesOrdenados.map((mesPeriodo) => {
      // Agrupar las proyecciones de este mes por agencia
      const proyeccionesPorAgencia: { [key: string]: Proyeccion[] } = {};

      grupos[mesPeriodo].forEach((proyeccion) => {
        const agencia = proyeccion.marca;
        if (!proyeccionesPorAgencia[agencia]) {
          proyeccionesPorAgencia[agencia] = [];
        }
        proyeccionesPorAgencia[agencia].push(proyeccion);
      });

      // Ordenar agencias según ORDEN_AGENCIAS
      const agenciasOrdenadas = Object.keys(proyeccionesPorAgencia).sort(
        (a, b) => {
          const indexA = ORDEN_AGENCIAS.indexOf(a);
          const indexB = ORDEN_AGENCIAS.indexOf(b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        },
      );

      return {
        mesPeriodo,
        agencias: agenciasOrdenadas.map((agencia) => ({
          agencia,
          proyecciones: proyeccionesPorAgencia[agencia],
          total: proyeccionesPorAgencia[agencia].reduce(
            (sum, p) => sum + p.montoTotal,
            0,
          ),
        })),
        total: grupos[mesPeriodo].reduce((sum, p) => sum + p.montoTotal, 0),
      };
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const proyeccionesAgrupadas = agruparPorAgencia();
  const proyeccionesPorMes = agruparPorMes();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Proyecciones por{" "}
              {vistaAgrupacion === "agencia" ? "Agencia" : "Mes"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {proyeccionesFiltradas.length} proyección
              {proyeccionesFiltradas.length !== 1 ? "es" : ""} en{" "}
              {vistaAgrupacion === "agencia"
                ? `${proyeccionesAgrupadas.length} agencia${proyeccionesAgrupadas.length !== 1 ? "s" : ""}`
                : `${proyeccionesPorMes.length} mes${proyeccionesPorMes.length !== 1 ? "es" : ""}`}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Filtro de estado */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Estado:
              </label>
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value as "todas" | "pendiente" | "aprobada",
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
              </select>
            </div>

            {/* Toggle de vista */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVistaAgrupacion("agencia")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  vistaAgrupacion === "agencia"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Por Agencia
              </button>
              <button
                onClick={() => setVistaAgrupacion("mes")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  vistaAgrupacion === "mes"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Por Mes
              </button>
            </div>
          </div>
        </div>

        {/* Monto Total General */}
        {proyecciones.length > 0 && (
          <div className="mt-3 flex justify-end">
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm text-gray-700 font-medium">
                Monto Total General:{" "}
              </span>
              <span className="text-lg font-bold text-blue-700">
                {formatearMonto(
                  proyecciones.reduce((total, p) => total + p.montoTotal, 0),
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {proyeccionesFiltradas.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-500 text-6xl mb-4">📊</div>
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
        ) : vistaAgrupacion === "agencia" ? (
          // Vista por Agencia (existente)
          proyeccionesAgrupadas.map((grupo) => {
            // Calcular presupuesto total del periodo para todas las proyecciones de esta agencia
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

            const presupuestoTotalPeriodo = grupo.proyecciones.reduce(
              (total, proyeccion) => {
                const mesNumero = meses.indexOf(proyeccion.mes) + 1;
                const presupuestoMes = presupuestosMensuales
                  .filter(
                    (p: PresupuestoMensual) =>
                      p.marca_nombre === grupo.agencia &&
                      p.mes === mesNumero &&
                      p.anio === proyeccion.año,
                  )
                  .reduce(
                    (sum: number, p: PresupuestoMensual) =>
                      sum + (p.monto || 0),
                    0,
                  );
                return total + presupuestoMes;
              },
              0,
            );

            const proyeccionTotalPeriodo = grupo.total;

            return (
              <div key={grupo.agencia} className="px-6 py-4">
                {/* Header de agencia */}
                <div className="mb-4 pb-3 border-b-2 border-blue-500">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-gray-900">
                      {grupo.agencia}
                    </h4>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {grupo.proyecciones.length} proyección
                        {grupo.proyecciones.length !== 1 ? "es" : ""}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          Presupuesto:
                        </span>
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                          {formatearMonto(presupuestoTotalPeriodo)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          Proyección:
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                            proyeccionTotalPeriodo > presupuestoTotalPeriodo
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {formatearMonto(proyeccionTotalPeriodo)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de proyecciones de la agencia */}
                <div className="space-y-3">
                  {grupo.proyecciones.map((proyeccion) => {
                    // Calcular el presupuesto mensual total de TODAS las categorías para ese mes
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

                    // Sumar TODOS los presupuestos de este mes, año y agencia (todas las categorías)
                    const presupuestoMensualTotal = presupuestosMensuales
                      .filter(
                        (p: PresupuestoMensual) =>
                          p.marca_nombre === grupo.agencia &&
                          p.mes === mesNumero &&
                          p.anio === proyeccion.año,
                      )
                      .reduce(
                        (sum: number, p: PresupuestoMensual) =>
                          sum + (p.monto || 0),
                        0,
                      );

                    return (
                      <div
                        key={proyeccion.id}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => toggleExpandir(proyeccion.id)}
                      >
                        <div className="space-y-2">
                          {/* Línea 1: Mes/Año, Estado y Acciones */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h5 className="text-base font-semibold text-gray-900">
                                {proyeccion.mes} {proyeccion.año}
                              </h5>
                              {/* Badge de estado */}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  proyeccion.estado === "aprobada"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {proyeccion.estado === "aprobada"
                                  ? "✓ Aprobada"
                                  : "⏳ Pendiente"}
                              </span>
                              {/* Advertencia si excede presupuesto */}
                              {proyeccion.excedePrespuesto && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  ⚠️ Excede presupuesto
                                </span>
                              )}
                            </div>
                            {/* Acciones a la derecha */}
                            <div
                              className="flex items-center space-x-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => toggleExpandir(proyeccion.id)}
                                className="p-2 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                                title={
                                  proyeccionExpandida === proyeccion.id
                                    ? "Ocultar detalles"
                                    : "Ver detalles"
                                }
                              >
                                {proyeccionExpandida === proyeccion.id ? (
                                  <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                  <EyeIcon className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  generarPDFProyeccion(
                                    proyeccion,
                                    presupuestosMensuales,
                                    nombresCategorias,
                                  )
                                }
                                className="p-2 rounded-md text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors cursor-pointer"
                                title="Descargar PDF"
                              >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>
                              {permisos.aprobar &&
                                proyeccion.estado === "pendiente" &&
                                onAprobar && (
                                  <button
                                    onClick={() => onAprobar(proyeccion.id)}
                                    className="p-2 rounded-md text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors cursor-pointer"
                                    title="Aprobar proyección"
                                  >
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </button>
                                )}
                              {permisos.editar && (
                                <button
                                  onClick={() => onEditar(proyeccion)}
                                  className="p-2 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                              )}
                              {permisos.eliminar && (
                                <button
                                  onClick={() => onEliminar(proyeccion.id)}
                                  className="p-2 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Línea 2: Montos (Presupuesto, Proyección, Reembolso) */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                Presupuesto:
                              </span>
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                                {formatearMonto(presupuestoMensualTotal)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                Proyección:
                              </span>
                              <span
                                className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                                  proyeccion.montoTotal >
                                  presupuestoMensualTotal
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {formatearMonto(proyeccion.montoTotal)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                Reembolso:
                              </span>
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formatearMonto(
                                  (proyeccion.partidas || [])
                                    .filter((p) => p.esReembolso)
                                    .reduce(
                                      (sum, p) => sum + (p.monto || 0),
                                      0,
                                    ),
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Línea 3: Info de creación y partidas */}
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Creado: {formatearFecha(proyeccion.fechaCreacion)}
                            </span>
                            {proyeccion.fechaModificacion && (
                              <span>
                                Modificado:{" "}
                                {formatearFecha(proyeccion.fechaModificacion)}
                              </span>
                            )}
                            <span>
                              {(proyeccion.partidas || []).length} partida
                              {(proyeccion.partidas || []).length !== 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                        </div>
                        {proyeccionExpandida === proyeccion.id && (
                          <div className="mt-4 border-t pt-4">
                            <h6 className="font-medium text-gray-900 mb-3">
                              Detalle de Partidas
                            </h6>
                            <div className="space-y-3">
                              {(() => {
                                // Separar partidas normales de reembolsos
                                const partidasNormales = (
                                  proyeccion.partidas || []
                                ).filter((p) => !p.esReembolso);

                                // Agrupar partidas por categoría (manteniendo partidas individuales)
                                const partidasPorCategoria: {
                                  [key: string]: Array<{
                                    id: string;
                                    categoria: string;
                                    subcategoria: string;
                                    monto: number;
                                    notas?: string;
                                  }>;
                                } = {};

                                partidasNormales.forEach((partida) => {
                                  if (
                                    !partidasPorCategoria[partida.categoria]
                                  ) {
                                    partidasPorCategoria[partida.categoria] =
                                      [];
                                  }
                                  partidasPorCategoria[partida.categoria].push(
                                    partida,
                                  );
                                });

                                return nombresCategorias.map((categoria) => {
                                  const partidasDeCategoria =
                                    partidasPorCategoria[categoria] || [];
                                  const montoTotal = partidasDeCategoria.reduce(
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

                                  const categoriaExpandida =
                                    categoriasExpandidasDetalle[
                                      proyeccion.id
                                    ] === categoria;

                                  // Agrupar partidas por subcategoría
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

                                  return (
                                    <div
                                      key={categoria}
                                      className="border border-gray-300 rounded-lg overflow-hidden"
                                    >
                                      {/* Nivel 1: Categoría */}
                                      <div
                                        className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleCategoriaDetalle(
                                            proyeccion.id,
                                            categoria,
                                          );
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">
                                            {categoriaExpandida ? "▼" : "▶"}
                                          </span>
                                          <h6 className="font-semibold text-gray-900">
                                            {categoria}
                                          </h6>
                                          <span className="text-sm text-gray-600">
                                            ({partidasDeCategoria.length}{" "}
                                            partida
                                            {partidasDeCategoria.length !== 1
                                              ? "s"
                                              : ""}
                                            )
                                          </span>
                                        </div>
                                        <span className="font-bold text-gray-900">
                                          {formatearMonto(montoTotal)}
                                        </span>
                                      </div>

                                      {/* Nivel 2: Subcategorías */}
                                      {categoriaExpandida && (
                                        <div className="bg-white">
                                          {partidasDeCategoria.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                              No hay partidas en esta categoría
                                            </div>
                                          ) : (
                                            Object.entries(porSubcategoria).map(
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
                                                const subcategoriaExpandida =
                                                  subcategoriasExpandidasDetalle[
                                                    proyeccion.id
                                                  ] === keySubcat;

                                                return (
                                                  <div
                                                    key={keySubcat}
                                                    className="border-t border-gray-200"
                                                  >
                                                    {/* Header de Subcategoría */}
                                                    <div
                                                      className="bg-gray-50 p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSubcategoriaDetalle(
                                                          proyeccion.id,
                                                          keySubcat,
                                                        );
                                                      }}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-sm">
                                                          {subcategoriaExpandida
                                                            ? "▼"
                                                            : "▶"}
                                                        </span>
                                                        <span className="font-medium text-gray-800">
                                                          {subcategoria}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                          (
                                                          {
                                                            partidasSubcat.length
                                                          }{" "}
                                                          partida
                                                          {partidasSubcat.length !==
                                                          1
                                                            ? "s"
                                                            : ""}
                                                          )
                                                        </span>
                                                      </div>
                                                      <span className="font-semibold text-gray-800">
                                                        {formatearMonto(
                                                          totalSubcategoria,
                                                        )}
                                                      </span>
                                                    </div>

                                                    {/* Nivel 3: Partidas individuales */}
                                                    {subcategoriaExpandida && (
                                                      <div className="bg-white">
                                                        {partidasSubcat.map(
                                                          (partida) => (
                                                            <div
                                                              key={partida.id}
                                                              className="p-4 pl-12 border-t border-gray-100 hover:bg-gray-50"
                                                            >
                                                              <div className="flex justify-between items-start">
                                                                <div className="flex-1 space-y-2">
                                                                  <div className="flex items-center gap-4">
                                                                    <span className="font-semibold text-gray-900">
                                                                      {formatearMonto(
                                                                        partida.monto,
                                                                      )}
                                                                    </span>
                                                                  </div>
                                                                  {partida.notas && (
                                                                    <div className="text-sm text-gray-600">
                                                                      <span className="font-medium">
                                                                        Notas:
                                                                      </span>{" "}
                                                                      {
                                                                        partida.notas
                                                                      }
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              },
                                            )
                                          )}
                                        </div>
                                      )}

                                      {/* Barra de presupuesto */}
                                      <div className="bg-white p-3 border-t border-gray-200">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                          <span>Proyección vs Presupuesto</span>
                                          <span
                                            className={
                                              porcentaje > 100
                                                ? "text-red-600 font-semibold"
                                                : "text-gray-900"
                                            }
                                          >
                                            {porcentaje.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                          <div
                                            className={`h-2.5 rounded-full transition-all ${
                                              porcentaje > 100
                                                ? "bg-red-500"
                                                : porcentaje > 80
                                                  ? "bg-yellow-500"
                                                  : "bg-green-500"
                                            }`}
                                            style={{
                                              width: `${Math.min(porcentaje, 100)}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                          <span>
                                            Proyectado:{" "}
                                            {formatearMonto(montoTotal)}
                                          </span>
                                          <span>
                                            Presupuesto:{" "}
                                            {formatearMonto(presupuesto)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            {/* Sección de Reembolsos */}
                            {(() => {
                              const partidasReembolso = (
                                proyeccion.partidas || []
                              ).filter((p) => p.esReembolso);

                              if (partidasReembolso.length === 0) return null;

                              // Agrupar reembolsos por categoría (manteniendo partidas individuales)
                              const reembolsosPorCategoria: {
                                [key: string]: Array<{
                                  id: string;
                                  categoria: string;
                                  subcategoria: string;
                                  monto: number;
                                  notas?: string;
                                }>;
                              } = {};

                              partidasReembolso.forEach((partida) => {
                                if (
                                  !reembolsosPorCategoria[partida.categoria]
                                ) {
                                  reembolsosPorCategoria[partida.categoria] =
                                    [];
                                }
                                reembolsosPorCategoria[partida.categoria].push(
                                  partida,
                                );
                              });

                              return (
                                <div className="mt-6">
                                  <h6 className="font-medium text-gray-900 mb-3 flex items-center">
                                    <span className="mr-2">💰</span>
                                    Reembolsos
                                  </h6>
                                  <div className="space-y-3">
                                    {nombresCategorias.map((categoria) => {
                                      const partidas =
                                        reembolsosPorCategoria[categoria] || [];
                                      if (partidas.length === 0) return null;

                                      const montoTotal = partidas.reduce(
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

                                      const keyCategoria = `reembolso-${categoria}`;
                                      const categoriaExpandida =
                                        categoriasExpandidasDetalle[
                                          proyeccion.id
                                        ] === keyCategoria;

                                      // Agrupar partidas por subcategoría
                                      const porSubcategoria: Record<
                                        string,
                                        typeof partidas
                                      > = {};
                                      const subcategoriasOrdenadas =
                                        SUBCATEGORIAS_POR_CATEGORIA[
                                          categoria as keyof typeof SUBCATEGORIAS_POR_CATEGORIA
                                        ] || [];

                                      subcategoriasOrdenadas.forEach(
                                        (subcategoria) => {
                                          const partidasSubcat =
                                            partidas.filter(
                                              (p) =>
                                                p.subcategoria === subcategoria,
                                            );
                                          if (partidasSubcat.length > 0) {
                                            porSubcategoria[subcategoria] =
                                              partidasSubcat;
                                          }
                                        },
                                      );

                                      return (
                                        <div
                                          key={keyCategoria}
                                          className="border border-amber-300 rounded-lg overflow-hidden bg-amber-50"
                                        >
                                          {/* Nivel 1: Categoría */}
                                          <div
                                            className="bg-amber-100 p-3 flex justify-between items-center cursor-pointer hover:bg-amber-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleCategoriaDetalle(
                                                proyeccion.id,
                                                keyCategoria,
                                              );
                                            }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg">
                                                {categoriaExpandida ? "▼" : "▶"}
                                              </span>
                                              <h6 className="font-semibold text-gray-900">
                                                {categoria}
                                              </h6>
                                              <span className="text-sm text-gray-600">
                                                ({partidas.length} partida
                                                {partidas.length !== 1
                                                  ? "s"
                                                  : ""}
                                                )
                                              </span>
                                            </div>
                                            <span className="font-bold text-gray-900">
                                              {formatearMonto(montoTotal)}
                                            </span>
                                          </div>

                                          {/* Nivel 2: Subcategorías */}
                                          {categoriaExpandida && (
                                            <div className="bg-amber-50">
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
                                                  const keySubcat = `reembolso-${categoria}-${subcategoria}`;
                                                  const subcategoriaExpandida =
                                                    subcategoriasExpandidasDetalle[
                                                      proyeccion.id
                                                    ] === keySubcat;

                                                  return (
                                                    <div
                                                      key={keySubcat}
                                                      className="border-t border-amber-200"
                                                    >
                                                      {/* Header de Subcategoría */}
                                                      <div
                                                        className="bg-amber-50 p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-amber-100"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleSubcategoriaDetalle(
                                                            proyeccion.id,
                                                            keySubcat,
                                                          );
                                                        }}
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-sm">
                                                            {subcategoriaExpandida
                                                              ? "▼"
                                                              : "▶"}
                                                          </span>
                                                          <span className="font-medium text-gray-800">
                                                            {subcategoria}
                                                          </span>
                                                          <span className="text-xs text-gray-500">
                                                            (
                                                            {
                                                              partidasSubcat.length
                                                            }{" "}
                                                            partida
                                                            {partidasSubcat.length !==
                                                            1
                                                              ? "s"
                                                              : ""}
                                                            )
                                                          </span>
                                                        </div>
                                                        <span className="font-semibold text-gray-800">
                                                          {formatearMonto(
                                                            totalSubcategoria,
                                                          )}
                                                        </span>
                                                      </div>

                                                      {/* Nivel 3: Partidas individuales */}
                                                      {subcategoriaExpandida && (
                                                        <div className="bg-white">
                                                          {partidasSubcat.map(
                                                            (partida) => (
                                                              <div
                                                                key={partida.id}
                                                                className="p-4 pl-12 border-t border-amber-100 hover:bg-amber-50"
                                                              >
                                                                <div className="flex justify-between items-start">
                                                                  <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center gap-4">
                                                                      <span className="font-semibold text-gray-900">
                                                                        {formatearMonto(
                                                                          partida.monto,
                                                                        )}
                                                                      </span>
                                                                    </div>
                                                                    {partida.notas && (
                                                                      <div className="text-sm text-gray-600">
                                                                        <span className="font-medium">
                                                                          Notas:
                                                                        </span>{" "}
                                                                        {
                                                                          partida.notas
                                                                        }
                                                                      </div>
                                                                    )}
                                                                  </div>
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
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // Vista por Mes (nueva)
          proyeccionesPorMes.map((grupoMes) => {
            // Calcular presupuesto total del mes para todas las agencias
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
            const [mesNombre, añoStr] = grupoMes.mesPeriodo.split(" ");
            const mesNumero = meses.indexOf(mesNombre) + 1;
            const año = parseInt(añoStr);

            const presupuestoTotalMes = presupuestosMensuales
              .filter(
                (p: PresupuestoMensual) =>
                  p.mes === mesNumero && p.anio === año,
              )
              .reduce(
                (sum: number, p: PresupuestoMensual) => sum + (p.monto || 0),
                0,
              );

            return (
              <div key={grupoMes.mesPeriodo} className="px-6 py-4">
                {/* Header del mes */}
                <div className="mb-4 pb-3 border-b-2 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-xl font-bold text-gray-900">
                        {grupoMes.mesPeriodo}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {grupoMes.agencias.length} agencia
                        {grupoMes.agencias.length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          Presupuesto:
                        </span>
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                          {formatearMonto(presupuestoTotalMes)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          Proyección:
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                            grupoMes.total > presupuestoTotalMes
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {formatearMonto(grupoMes.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de agencias del mes */}
                <div className="space-y-4">
                  {grupoMes.agencias.map((grupoAgencia) => {
                    // Calcular presupuesto de esta agencia para este mes
                    const presupuestoAgencia = presupuestosMensuales
                      .filter(
                        (p: PresupuestoMensual) =>
                          p.marca_nombre === grupoAgencia.agencia &&
                          p.mes === mesNumero &&
                          p.anio === año,
                      )
                      .reduce(
                        (sum: number, p: PresupuestoMensual) =>
                          sum + (p.monto || 0),
                        0,
                      );

                    return (
                      <div key={grupoAgencia.agencia} className="space-y-3">
                        {/* Partidas de la agencia */}
                        {grupoAgencia.proyecciones.map((proyeccion) => (
                          <div key={proyeccion.id} className="mt-3">
                            <div
                              className="space-y-2 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleExpandir(proyeccion.id)}
                            >
                              {/* Línea 1: Agencia, Estado y Acciones */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <h6 className="text-base font-semibold text-gray-900">
                                    {grupoAgencia.agencia}
                                  </h6>
                                  {/* Badge de estado */}
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      proyeccion.estado === "aprobada"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {proyeccion.estado === "aprobada"
                                      ? "✓ Aprobada"
                                      : "⏳ Pendiente"}
                                  </span>
                                  {/* Advertencia si excede presupuesto */}
                                  {proyeccion.excedePrespuesto && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      ⚠️ Excede presupuesto
                                    </span>
                                  )}
                                </div>
                                {/* Acciones a la derecha */}
                                <div
                                  className="flex items-center space-x-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() =>
                                      toggleExpandir(proyeccion.id)
                                    }
                                    className="p-2 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title={
                                      proyeccionExpandida === proyeccion.id
                                        ? "Ocultar partidas"
                                        : "Ver partidas"
                                    }
                                  >
                                    {proyeccionExpandida === proyeccion.id ? (
                                      <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                      <EyeIcon className="h-5 w-5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      generarPDFProyeccion(
                                        proyeccion,
                                        presupuestosMensuales,
                                        nombresCategorias,
                                      )
                                    }
                                    className="p-2 rounded-md text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors cursor-pointer"
                                    title="Descargar PDF"
                                  >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                  </button>
                                  {permisos.aprobar &&
                                    proyeccion.estado === "pendiente" &&
                                    onAprobar && (
                                      <button
                                        onClick={() => onAprobar(proyeccion.id)}
                                        className="p-2 rounded-md text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors cursor-pointer"
                                        title="Aprobar proyección"
                                      >
                                        <CheckCircleIcon className="h-5 w-5" />
                                      </button>
                                    )}
                                  {permisos.editar && (
                                    <button
                                      onClick={() => onEditar(proyeccion)}
                                      className="p-2 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <PencilIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  {permisos.eliminar && (
                                    <button
                                      onClick={() => onEliminar(proyeccion.id)}
                                      className="p-2 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Línea 2: Montos (Presupuesto, Proyección, Reembolso) */}
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500">
                                    Presupuesto:
                                  </span>
                                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                                    {formatearMonto(presupuestoAgencia)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500">
                                    Proyección:
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                                      proyeccion.montoTotal > presupuestoAgencia
                                        ? "bg-red-100 text-red-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {formatearMonto(proyeccion.montoTotal)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500">
                                    Reembolso:
                                  </span>
                                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {formatearMonto(
                                      (proyeccion.partidas || [])
                                        .filter((p) => p.esReembolso)
                                        .reduce(
                                          (sum, p) => sum + (p.monto || 0),
                                          0,
                                        ),
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Línea 3: Info de creación y partidas */}
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>
                                  Creado:{" "}
                                  {formatearFecha(proyeccion.fechaCreacion)}
                                </span>
                                {proyeccion.fechaModificacion && (
                                  <span>
                                    Modificado:{" "}
                                    {formatearFecha(
                                      proyeccion.fechaModificacion,
                                    )}
                                  </span>
                                )}
                                <span>
                                  {(proyeccion.partidas || []).length} partida
                                  {(proyeccion.partidas || []).length !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                            </div>

                            {proyeccionExpandida === proyeccion.id && (
                              <div className="mt-3 border-t pt-3">
                                <h6 className="font-medium text-gray-900 mb-3 text-sm">
                                  Detalle de Partidas
                                </h6>

                                <div className="space-y-2">
                                  {(() => {
                                    // Separar partidas normales de reembolsos
                                    const partidasNormales = (
                                      proyeccion.partidas || []
                                    ).filter((p) => !p.esReembolso);

                                    // Agrupar partidas NORMALES por categoría
                                    const partidasAgrupadas =
                                      partidasNormales.reduce(
                                        (acc, partida) => {
                                          const categoriaExistente = acc.find(
                                            (p) =>
                                              p.categoria === partida.categoria,
                                          );

                                          if (categoriaExistente) {
                                            categoriaExistente.subcategorias.push(
                                              partida.subcategoria,
                                            );
                                            categoriaExistente.monto +=
                                              partida.monto;
                                          } else {
                                            acc.push({
                                              id: partida.id,
                                              categoria: partida.categoria,
                                              subcategorias: [
                                                partida.subcategoria,
                                              ],
                                              monto: partida.monto,
                                            });
                                          }

                                          return acc;
                                        },
                                        [] as Array<{
                                          id: string;
                                          categoria: string;
                                          subcategorias: string[];
                                          monto: number;
                                        }>,
                                      );

                                    // Crear array con TODAS las categorías
                                    const todasLasCategorias =
                                      nombresCategorias.map((categoria) => {
                                        const partidaExistente =
                                          partidasAgrupadas.find(
                                            (p) => p.categoria === categoria,
                                          );
                                        return (
                                          partidaExistente || {
                                            id: `${categoria}-empty`,
                                            categoria,
                                            subcategorias: [],
                                            monto: 0,
                                          }
                                        );
                                      });

                                    return todasLasCategorias.map((partida) => {
                                      const presupuesto =
                                        obtenerPresupuestoCategoria(
                                          proyeccion.marca,
                                          proyeccion.mes,
                                          proyeccion.año,
                                          partida.categoria,
                                        );
                                      const porcentaje =
                                        presupuesto > 0
                                          ? (partida.monto / presupuesto) * 100
                                          : 0;

                                      return (
                                        <div
                                          key={partida.id}
                                          className="bg-white rounded-lg p-3 border border-gray-200"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                <div>
                                                  <span className="text-xs font-medium text-gray-600">
                                                    Categoría:
                                                  </span>
                                                  <p className="text-gray-900">
                                                    {partida.categoria}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-xs font-medium text-gray-600">
                                                    Subcategoría
                                                    {partida.subcategorias
                                                      .length > 1
                                                      ? "s"
                                                      : ""}
                                                    :
                                                  </span>
                                                  <p className="text-gray-900">
                                                    {partida.subcategorias
                                                      .length > 0
                                                      ? partida.subcategorias.join(
                                                          ", ",
                                                        )
                                                      : "Sin partidas"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-xs font-medium text-gray-600">
                                                    Monto:
                                                  </span>
                                                  <p className="text-gray-900 font-medium">
                                                    {formatearMonto(
                                                      partida.monto,
                                                    )}
                                                  </p>
                                                </div>
                                              </div>

                                              {/* Barra de progreso */}
                                              <div className="mt-2">
                                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                  <span>
                                                    Proyección vs Presupuesto
                                                  </span>
                                                  <span
                                                    className={
                                                      porcentaje > 100
                                                        ? "text-red-600 font-semibold"
                                                        : "text-gray-900"
                                                    }
                                                  >
                                                    {porcentaje.toFixed(1)}%
                                                  </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                  <div
                                                    className={`h-2 rounded-full transition-all ${
                                                      porcentaje > 100
                                                        ? "bg-red-500"
                                                        : porcentaje > 80
                                                          ? "bg-yellow-500"
                                                          : "bg-green-500"
                                                    }`}
                                                    style={{
                                                      width: `${Math.min(porcentaje, 100)}%`,
                                                    }}
                                                  ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                  <span>
                                                    Proyectado:{" "}
                                                    {formatearMonto(
                                                      partida.monto,
                                                    )}
                                                  </span>
                                                  <span>
                                                    Presupuesto:{" "}
                                                    {formatearMonto(
                                                      presupuesto,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                {/* Sección de Reembolsos - Vista Por Mes */}
                                {(() => {
                                  const partidasReembolso = (
                                    proyeccion.partidas || []
                                  ).filter((p) => p.esReembolso);

                                  if (partidasReembolso.length === 0)
                                    return null;

                                  // Agrupar reembolsos por categoría
                                  const reembolsosAgrupados =
                                    partidasReembolso.reduce(
                                      (acc, partida) => {
                                        const categoriaExistente = acc.find(
                                          (p) =>
                                            p.categoria === partida.categoria,
                                        );
                                        if (categoriaExistente) {
                                          categoriaExistente.subcategorias.push(
                                            partida.subcategoria,
                                          );
                                          categoriaExistente.monto +=
                                            partida.monto;
                                        } else {
                                          acc.push({
                                            id: partida.id,
                                            categoria: partida.categoria,
                                            subcategorias: [
                                              partida.subcategoria,
                                            ],
                                            monto: partida.monto,
                                          });
                                        }
                                        return acc;
                                      },
                                      [] as Array<{
                                        id: string;
                                        categoria: string;
                                        subcategorias: string[];
                                        monto: number;
                                      }>,
                                    );

                                  return (
                                    <div className="mt-4">
                                      <h6 className="font-medium text-gray-900 mb-2 text-sm flex items-center">
                                        <span className="mr-2">💰</span>
                                        Reembolsos
                                      </h6>
                                      <div className="space-y-2">
                                        {reembolsosAgrupados.map((partida) => {
                                          const presupuesto =
                                            obtenerPresupuestoCategoria(
                                              proyeccion.marca,
                                              proyeccion.mes,
                                              proyeccion.año,
                                              partida.categoria,
                                            );
                                          const porcentaje =
                                            presupuesto > 0
                                              ? (partida.monto / presupuesto) *
                                                100
                                              : 0;

                                          return (
                                            <div
                                              key={partida.id}
                                              className="bg-amber-50 rounded-lg p-3 border border-amber-200"
                                            >
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                      <span className="text-xs font-medium text-gray-600">
                                                        Categoría:
                                                      </span>
                                                      <p className="text-gray-900">
                                                        {partida.categoria}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <span className="text-xs font-medium text-gray-600">
                                                        Subcategoría
                                                        {partida.subcategorias
                                                          .length > 1
                                                          ? "s"
                                                          : ""}
                                                        :
                                                      </span>
                                                      <p className="text-gray-900">
                                                        {partida.subcategorias.join(
                                                          ", ",
                                                        )}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <span className="text-xs font-medium text-gray-600">
                                                        Monto:
                                                      </span>
                                                      <p className="text-gray-900 font-medium">
                                                        {formatearMonto(
                                                          partida.monto,
                                                        )}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {/* Barra de progreso */}
                                                  <div className="mt-2">
                                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                      <span>
                                                        Proyección vs
                                                        Presupuesto
                                                      </span>
                                                      <span
                                                        className={
                                                          porcentaje > 100
                                                            ? "text-red-600 font-semibold"
                                                            : "text-gray-900"
                                                        }
                                                      >
                                                        {porcentaje.toFixed(1)}%
                                                      </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                      <div
                                                        className={`h-2 rounded-full transition-all ${
                                                          porcentaje > 100
                                                            ? "bg-red-500"
                                                            : porcentaje > 80
                                                              ? "bg-yellow-500"
                                                              : "bg-green-500"
                                                        }`}
                                                        style={{
                                                          width: `${Math.min(porcentaje, 100)}%`,
                                                        }}
                                                      ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                      <span>
                                                        Proyectado:{" "}
                                                        {formatearMonto(
                                                          partida.monto,
                                                        )}
                                                      </span>
                                                      <span>
                                                        Presupuesto:{" "}
                                                        {formatearMonto(
                                                          presupuesto,
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
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
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
