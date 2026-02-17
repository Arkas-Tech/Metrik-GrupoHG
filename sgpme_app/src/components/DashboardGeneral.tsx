"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import { useCampanas } from "@/hooks/useCampanas";
import { usePresencias, Presencia } from "@/hooks/usePresencias";
import { useProveedoresAPI as useProveedores } from "@/hooks/useProveedoresAPI";
import FormularioPresencia from "@/components/FormularioPresencia";
import { AÑOS } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

const MESES_ORDEN = [
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

// Función para obtener el cuarto actual
const obtenerCuartoActual = () => {
  const mesActual = new Date().getMonth() + 1; // 1-12
  if (mesActual >= 1 && mesActual <= 3) return "Q1";
  if (mesActual >= 4 && mesActual <= 6) return "Q2";
  if (mesActual >= 7 && mesActual <= 9) return "Q3";
  return "Q4";
};

// Meses por cuarto
const MESES_POR_CUARTO: Record<string, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
  Todos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

interface PresupuestoMensual {
  id: number;
  mes: number;
  anio: number;
  categoria: string;
  marca_id: number;
  marca_nombre: string;
  monto: number;
  fecha_modificacion: string;
  modificado_por: string;
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface DashboardGeneralProps {
  agenciaSeleccionada: string | null;
}

interface TooltipPayload {
  dataKey: string;
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const presupuesto = payload.find((p) => p.dataKey === "presupuesto")?.value
      ? payload.find((p) => p.dataKey === "presupuesto")!.value * 1000
      : 0;
    const gastoReal = payload.find((p) => p.dataKey === "gastoReal")?.value
      ? payload.find((p) => p.dataKey === "gastoReal")!.value * 1000
      : 0;

    const formatearMoneda = (valor: number) => {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(valor);
    };

    return (
      <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium text-sm mb-2">{`${label}`}</p>
        <p className="text-xs mb-1">
          <span className="inline-block w-3 h-3 bg-blue-500 mr-2 rounded"></span>
          {`Presupuesto: ${formatearMoneda(presupuesto)}`}
        </p>
        <p className="text-xs">
          <span className="inline-block w-3 h-3 bg-green-500 mr-2 rounded"></span>
          {`Gasto Real: ${formatearMoneda(gastoReal)}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardGeneral({
  agenciaSeleccionada,
}: DashboardGeneralProps) {
  const router = useRouter();
  const { facturas } = useFacturas();
  const { campanas: campanasDb, cargarCampanas } = useCampanas();
  const { presencias, cargarPresencias, crearPresencia, actualizarPresencia } =
    usePresencias();
  const { proveedores } = useProveedores();

  const [añoSeleccionado, setAñoSeleccionado] = useState<number>(
    new Date().getFullYear(),
  );
  const [cuartoSeleccionado, setCuartoSeleccionado] = useState<string>(
    obtenerCuartoActual(),
  );
  const [espectacularIndex, setEspectacularIndex] = useState(0);
  const [revistaIndex, setRevistaIndex] = useState(0);
  const [periodicoIndex, setPeriodicoIndex] = useState(0);
  const [marcaActual, setMarcaActual] = useState(agenciaSeleccionada);
  const [modalFormularioPresencia, setModalFormularioPresencia] =
    useState(false);
  const [presenciaEditando, setPresenciaEditando] = useState<Presencia | null>(
    null,
  );
  const [modalPresencia, setModalPresencia] = useState<Presencia | null>(null);
  const [presupuestos, setPresupuestos] = useState<PresupuestoMensual[]>([]);

  // Cargar presupuestos mensuales
  useEffect(() => {
    const cargarPresupuestos = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const params = new URLSearchParams();
        params.append("anio", añoSeleccionado.toString());

        const response = await fetchConToken(
          `${API_URL}/presupuesto/?${params.toString()}`,
        );

        if (response.ok) {
          const data = await response.json();
          setPresupuestos(data);
        } else if (response.status === 404) {
          setPresupuestos([]);
        }
      } catch (error) {
        console.error("Error cargando presupuestos:", error);
        setPresupuestos([]);
      }
    };

    cargarPresupuestos();
  }, [añoSeleccionado]);

  // Cargar datos cuando el componente se monta
  useEffect(() => {
    cargarCampanas(agenciaSeleccionada || undefined);
    cargarPresencias();
  }, [agenciaSeleccionada, cargarCampanas, cargarPresencias]);

  // Resetear índices cuando cambia la marca
  if (marcaActual !== agenciaSeleccionada) {
    setEspectacularIndex(0);
    setRevistaIndex(0);
    setPeriodicoIndex(0);
    setMarcaActual(agenciaSeleccionada);
  }

  const facturasFiltradas = useMemo(() => {
    const mesesPermitidos = MESES_POR_CUARTO[cuartoSeleccionado];

    return facturas.filter((factura) => {
      const fechaEmision = new Date(factura.fechaEmision);
      const añoFactura = fechaEmision.getFullYear();
      const mesFactura = fechaEmision.getMonth() + 1;

      return (
        añoFactura === añoSeleccionado &&
        mesesPermitidos.includes(mesFactura) &&
        (!agenciaSeleccionada || factura.marca === agenciaSeleccionada)
      );
    });
  }, [facturas, agenciaSeleccionada, añoSeleccionado, cuartoSeleccionado]);

  // Filtrar presupuestos por año, cuarto y agencia
  const presupuestosFiltrados = useMemo(() => {
    const mesesPermitidos = MESES_POR_CUARTO[cuartoSeleccionado];

    return presupuestos.filter((presupuesto) => {
      return (
        presupuesto.anio === añoSeleccionado &&
        mesesPermitidos.includes(presupuesto.mes) &&
        (!agenciaSeleccionada ||
          presupuesto.marca_nombre === agenciaSeleccionada)
      );
    });
  }, [presupuestos, agenciaSeleccionada, añoSeleccionado, cuartoSeleccionado]);

  const metricas = useMemo(() => {
    // Calcular presupuesto anual desde presupuestos mensuales
    const presupuestoAnual = presupuestosFiltrados.reduce(
      (sum, p) => sum + p.monto,
      0,
    );
    const totalGastado = facturasFiltradas
      .filter((f) => f.estado === "Pagada")
      .reduce((sum, f) => sum + f.total, 0);
    const totalPorPagar = facturasFiltradas
      .filter((f) => f.estado === "Pendiente" || f.estado === "Autorizada")
      .reduce((sum, f) => sum + f.total, 0);

    return {
      presupuestoAnual,
      totalGastado,
      totalPorPagar,
    };
  }, [presupuestosFiltrados, facturasFiltradas]);

  const datosGrafica = useMemo(() => {
    const mesesPermitidos = MESES_POR_CUARTO[cuartoSeleccionado];
    const datosPorMes: {
      [mes: string]: { presupuesto: number; gastoReal: number };
    } = {};

    // Inicializar solo los meses del cuarto seleccionado
    mesesPermitidos.forEach((numMes) => {
      const nombreMes = MESES_ORDEN[numMes - 1];
      datosPorMes[nombreMes] = { presupuesto: 0, gastoReal: 0 };
    });

    // Usar presupuestos mensuales en lugar de proyecciones
    presupuestosFiltrados.forEach((presupuesto) => {
      const nombreMes = MESES_ORDEN[presupuesto.mes - 1]; // mes es 1-12, índice es 0-11
      if (datosPorMes[nombreMes]) {
        datosPorMes[nombreMes].presupuesto += presupuesto.monto;
      }
    });

    facturasFiltradas
      .filter((f) => f.estado === "Pagada")
      .forEach((factura) => {
        const fechaEmision = new Date(factura.fechaEmision);
        const mes = MESES_ORDEN[fechaEmision.getMonth()];
        if (datosPorMes[mes]) {
          datosPorMes[mes].gastoReal += factura.total;
        }
      });

    // Retornar solo los meses del cuarto seleccionado
    return mesesPermitidos.map((numMes) => {
      const nombreMes = MESES_ORDEN[numMes - 1];
      return {
        mes: nombreMes.substring(0, 3),
        presupuesto: Math.round(datosPorMes[nombreMes].presupuesto / 1000),
        gastoReal: Math.round(datosPorMes[nombreMes].gastoReal / 1000),
      };
    });
  }, [presupuestosFiltrados, facturasFiltradas, cuartoSeleccionado]);

  const formatearMiles = (valor: number) => {
    if (valor >= 1000000) {
      return `$${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `$${(valor / 1000).toFixed(0)}K`;
    }
    return `$${valor}`;
  };

  // Funciones helper
  const capitalize = (str: string | null | undefined) => {
    if (!str) return "N/A";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Calcular métricas por plataforma
  const calcularMetricasPlataforma = (plataforma: string) => {
    const mesesPermitidos = MESES_POR_CUARTO[cuartoSeleccionado];

    const campanasActivas = campanasDb.filter((c) => {
      if (c.plataforma !== plataforma || c.estado !== "Activa") return false;

      // Parsear fecha de inicio (formato "YYYY-MM-DD")
      const fechaInicio = new Date(c.fecha_inicio);
      const añoCampana = fechaInicio.getFullYear();
      const mesCampana = fechaInicio.getMonth() + 1;

      return (
        añoCampana === añoSeleccionado && mesesPermitidos.includes(mesCampana)
      );
    });

    const leadsTotal = campanasActivas.reduce(
      (sum, c) => sum + (c.leads || 0),
      0,
    );
    const inversionTotal = campanasActivas.reduce(
      (sum, c) => sum + (c.gasto_actual || c.presupuesto || 0),
      0,
    );
    const cxcPromedio =
      campanasActivas.length > 0
        ? campanasActivas.reduce((sum, c) => sum + (c.cxc_porcentaje || 0), 0) /
          campanasActivas.length
        : 0;

    return {
      leads: leadsTotal,
      inversion: inversionTotal,
      cxc: cxcPromedio,
    };
  };

  const metricasMeta = calcularMetricasPlataforma("Meta Ads");
  const metricasGoogle = calcularMetricasPlataforma("Google Ads");
  const metricasTikTok = calcularMetricasPlataforma("TikTok Ads");

  // Datos para Presencia Tradicional
  const mesesPermitidos = MESES_POR_CUARTO[cuartoSeleccionado];

  const presenciaTradicionalData = presencias.filter((presencia) => {
    // Filtro por agencia
    const cumpleAgencia =
      !agenciaSeleccionada ||
      agenciaSeleccionada === "" ||
      presencia.agencia?.toLowerCase() === agenciaSeleccionada.toLowerCase();

    if (!cumpleAgencia) return false;

    // Filtro por año y cuarto
    const fechaInstalacion = new Date(presencia.fecha_instalacion);
    const añoPresencia = fechaInstalacion.getFullYear();
    const mesPresencia = fechaInstalacion.getMonth() + 1;

    return (
      añoPresencia === añoSeleccionado && mesesPermitidos.includes(mesPresencia)
    );
  });

  const todosLosEspectaculares = presenciaTradicionalData.filter(
    (p) => p.tipo === "espectacular",
  );
  const todasLasRevistas = presenciaTradicionalData.filter(
    (p) => p.tipo === "revista",
  );
  const todosLosPeriodicos = presenciaTradicionalData.filter(
    (p) => p.tipo === "periodico",
  );

  const espectacularesFiltrados = todosLosEspectaculares.slice(
    espectacularIndex,
    espectacularIndex + 3,
  );
  const revistasFiltradas = todasLasRevistas.slice(
    revistaIndex,
    revistaIndex + 3,
  );
  const periodicosFiltrados = todosLosPeriodicos.slice(
    periodicoIndex,
    periodicoIndex + 3,
  );

  const navegarEspectacular = (direccion: "prev" | "next") => {
    if (
      direccion === "next" &&
      espectacularIndex + 3 < todosLosEspectaculares.length
    ) {
      setEspectacularIndex(espectacularIndex + 1);
    } else if (direccion === "prev" && espectacularIndex > 0) {
      setEspectacularIndex(espectacularIndex - 1);
    }
  };

  const navegarRevista = (direccion: "prev" | "next") => {
    if (direccion === "next" && revistaIndex + 3 < todasLasRevistas.length) {
      setRevistaIndex(revistaIndex + 1);
    } else if (direccion === "prev" && revistaIndex > 0) {
      setRevistaIndex(revistaIndex - 1);
    }
  };

  const navegarPeriodico = (direccion: "prev" | "next") => {
    if (
      direccion === "next" &&
      periodicoIndex + 3 < todosLosPeriodicos.length
    ) {
      setPeriodicoIndex(periodicoIndex + 1);
    } else if (direccion === "prev" && periodicoIndex > 0) {
      setPeriodicoIndex(periodicoIndex - 1);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard General
          </h2>
          <p className="text-gray-600">
            Resumen financiero y presupuestal -{" "}
            {agenciaSeleccionada || "Todas las agencias"}
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex gap-3">
          <div>
            <label
              htmlFor="año-selector"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Año:
            </label>
            <select
              id="año-selector"
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              {AÑOS.map((año) => (
                <option key={año} value={año}>
                  {año}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cuarto-selector"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Cuarto:
            </label>
            <select
              id="cuarto-selector"
              value={cuartoSeleccionado}
              onChange={(e) => setCuartoSeleccionado(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="Todos">Todos</option>
              <option value="Q1">Q1 (Ene-Mar)</option>
              <option value="Q2">Q2 (Abr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dic)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Métricas a la izquierda */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-700 truncate">
                    Presupuesto{" "}
                    {cuartoSeleccionado === "Todos"
                      ? "Anual"
                      : cuartoSeleccionado}{" "}
                    {añoSeleccionado}
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {formatearMiles(metricas.presupuestoAnual)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <CreditCardIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-700 truncate">
                    Total Gastado
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {formatearMiles(metricas.totalGastado)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-700 truncate">
                    Total por Pagar
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {formatearMiles(metricas.totalPorPagar)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfica a la derecha */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Presupuesto vs. Gasto Real -{" "}
            {cuartoSeleccionado === "Todos"
              ? añoSeleccionado
              : `${cuartoSeleccionado} ${añoSeleccionado}`}
          </h3>
          <div className="h-70">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosGrafica}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `$${value}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="presupuesto"
                  name="Presupuesto"
                  fill="#6366f1"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="gastoReal"
                  name="Gasto Real"
                  fill="#10b981"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sección Campañas Digitales */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Campañas Digitales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meta */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-900">Meta</h3>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads totales:
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {new Intl.NumberFormat("es-MX").format(metricasMeta.leads)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Inversión:
                </span>
                <span className="text-lg font-bold text-blue-900">
                  $
                  {new Intl.NumberFormat("es-MX").format(
                    metricasMeta.inversion,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">CxC:</span>
                <span className="text-lg font-bold text-blue-900">
                  {metricasMeta.cxc.toFixed(2)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/campanas?plataforma=meta")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Ver campañas
            </button>
          </div>

          {/* Google */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-900">Google</h3>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads totales:
                </span>
                <span className="text-lg font-bold text-red-900">
                  {new Intl.NumberFormat("es-MX").format(metricasGoogle.leads)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Inversión:
                </span>
                <span className="text-lg font-bold text-red-900">
                  $
                  {new Intl.NumberFormat("es-MX").format(
                    metricasGoogle.inversion,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">CxC:</span>
                <span className="text-lg font-bold text-red-900">
                  {metricasGoogle.cxc.toFixed(2)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/campanas?plataforma=google")}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Ver campañas
            </button>
          </div>

          {/* TikTok */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">TikTok</h3>
              <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads totales:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat("es-MX").format(metricasTikTok.leads)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Inversión:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  $
                  {new Intl.NumberFormat("es-MX").format(
                    metricasTikTok.inversion,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">CxC:</span>
                <span className="text-lg font-bold text-gray-900">
                  {metricasTikTok.cxc.toFixed(2)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/campanas?plataforma=tiktok")}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Ver campañas
            </button>
          </div>
        </div>
      </div>

      {/* Sección Embajadores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Embajadores</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Embajador 1 */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-900">
                @mariana_fitness
              </h3>
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Presupuesto:
                </span>
                <span className="text-lg font-bold text-purple-900">
                  $25,000
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads:
                </span>
                <span className="text-lg font-bold text-purple-900">342</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Audiencia:
                </span>
                <span className="text-lg font-bold text-purple-900">85.4K</span>
              </div>
            </div>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Ver detalles
            </button>
          </div>

          {/* Embajador 2 */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-6 border-2 border-pink-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-pink-900">@carlos_tech</h3>
              <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Presupuesto:
                </span>
                <span className="text-lg font-bold text-pink-900">$18,500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads:
                </span>
                <span className="text-lg font-bold text-pink-900">276</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Audiencia:
                </span>
                <span className="text-lg font-bold text-pink-900">62.1K</span>
              </div>
            </div>
            <button className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Ver detalles
            </button>
          </div>

          {/* Embajador 3 */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border-2 border-indigo-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-indigo-900">
                @sofia_lifestyle
              </h3>
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Presupuesto:
                </span>
                <span className="text-lg font-bold text-indigo-900">
                  $32,000
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Leads:
                </span>
                <span className="text-lg font-bold text-indigo-900">418</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Audiencia:
                </span>
                <span className="text-lg font-bold text-indigo-900">
                  127.8K
                </span>
              </div>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Ver detalles
            </button>
          </div>
        </div>
      </div>

      {/* Sección Presencia Tradicional */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Presencia Tradicional
          </h2>
          <button
            onClick={() => {
              setPresenciaEditando(null);
              setModalFormularioPresencia(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Presencia
          </button>
        </div>

        {/* Espectaculares */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Espectaculares
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navegarEspectacular("prev")}
                disabled={espectacularIndex === 0}
                className={`p-2 rounded-lg ${
                  espectacularIndex === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navegarEspectacular("next")}
                disabled={
                  espectacularIndex + 3 >= todosLosEspectaculares.length
                }
                className={`p-2 rounded-lg ${
                  espectacularIndex + 3 >= todosLosEspectaculares.length
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {espectacularesFiltrados.map((presencia) => (
              <div
                key={presencia.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {presencia.nombre}
                    </h4>
                    <button
                      onClick={() => {
                        setPresenciaEditando(presencia);
                        setModalFormularioPresencia(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Ubicación:</span>
                    <span className="text-gray-900">
                      {presencia.ubicacion || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dimensiones:</span>
                    <span className="text-gray-900">
                      {presencia.dimensiones || "N/A"}
                    </span>
                  </div>
                </div>
                {presencia.imagenes_json &&
                  (() => {
                    try {
                      const imagenes = JSON.parse(presencia.imagenes_json);
                      const primeraImagen =
                        Array.isArray(imagenes) && imagenes.length > 0
                          ? imagenes[0]
                          : null;
                      return primeraImagen ? (
                        <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                          <Image
                            src={primeraImagen}
                            alt={presencia.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                <button
                  onClick={() => setModalPresencia(presencia)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <EyeIcon className="h-4 w-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Revistas */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Revistas</h3>
            <div className="flex gap-2">
              <button
                onClick={() => navegarRevista("prev")}
                disabled={revistaIndex === 0}
                className={`p-2 rounded-lg ${
                  revistaIndex === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navegarRevista("next")}
                disabled={revistaIndex + 3 >= todasLasRevistas.length}
                className={`p-2 rounded-lg ${
                  revistaIndex + 3 >= todasLasRevistas.length
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revistasFiltradas.map((presencia) => (
              <div
                key={presencia.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {presencia.nombre}
                    </h4>
                    <button
                      onClick={() => {
                        setPresenciaEditando(presencia);
                        setModalFormularioPresencia(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Ubicación:</span>
                    <span className="text-gray-900">
                      {presencia.ubicacion || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dimensiones:</span>
                    <span className="text-gray-900">
                      {presencia.dimensiones || "N/A"}
                    </span>
                  </div>
                </div>
                {presencia.imagenes_json &&
                  (() => {
                    try {
                      const imagenes = JSON.parse(presencia.imagenes_json);
                      const primeraImagen =
                        Array.isArray(imagenes) && imagenes.length > 0
                          ? imagenes[0]
                          : null;
                      return primeraImagen ? (
                        <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                          <Image
                            src={primeraImagen}
                            alt={presencia.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                <button
                  onClick={() => setModalPresencia(presencia)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <EyeIcon className="h-4 w-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Periódicos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Periódicos</h3>
            <div className="flex gap-2">
              <button
                onClick={() => navegarPeriodico("prev")}
                disabled={periodicoIndex === 0}
                className={`p-2 rounded-lg ${
                  periodicoIndex === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navegarPeriodico("next")}
                disabled={periodicoIndex + 3 >= todosLosPeriodicos.length}
                className={`p-2 rounded-lg ${
                  periodicoIndex + 3 >= todosLosPeriodicos.length
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {periodicosFiltrados.map((presencia) => (
              <div
                key={presencia.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {presencia.nombre}
                    </h4>
                    <button
                      onClick={() => {
                        setPresenciaEditando(presencia);
                        setModalFormularioPresencia(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Ubicación:</span>
                    <span className="text-gray-900">
                      {presencia.ubicacion || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dimensiones:</span>
                    <span className="text-gray-900">
                      {presencia.dimensiones || "N/A"}
                    </span>
                  </div>
                </div>
                {presencia.imagenes_json &&
                  (() => {
                    try {
                      const imagenes = JSON.parse(presencia.imagenes_json);
                      const primeraImagen =
                        Array.isArray(imagenes) && imagenes.length > 0
                          ? imagenes[0]
                          : null;
                      return primeraImagen ? (
                        <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                          <Image
                            src={primeraImagen}
                            alt={presencia.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                <button
                  onClick={() => setModalPresencia(presencia)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <EyeIcon className="h-4 w-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección Eventos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Eventos</h2>
          <button
            onClick={() => router.push("/eventos")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver todos los eventos
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <ChartBarIcon className="h-16 w-16 mb-4 text-gray-400" />
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm">Estadísticas de eventos en desarrollo</p>
        </div>
      </div>

      {/* Modal Formulario Presencia */}
      {modalFormularioPresencia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {presenciaEditando ? "Editar Presencia" : "Nueva Presencia"}
              </h2>
              <button
                onClick={() => {
                  setModalFormularioPresencia(false);
                  setPresenciaEditando(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <FormularioPresencia
                marcaActual={agenciaSeleccionada || ""}
                presenciaInicial={presenciaEditando}
                proveedores={proveedores}
                onNavigateToProveedores={() => {
                  router.push("/facturas?action=nuevo-proveedor");
                }}
                onCancel={() => {
                  setModalFormularioPresencia(false);
                  setPresenciaEditando(null);
                }}
                onSubmit={async (presencia) => {
                  if (presenciaEditando) {
                    const success = await actualizarPresencia(
                      presenciaEditando.id,
                      presencia,
                    );
                    if (success) {
                      alert("Presencia actualizada exitosamente");
                      await cargarPresencias();
                    } else {
                      alert("Error al actualizar la presencia");
                    }
                  } else {
                    const success = await crearPresencia(presencia);
                    if (success) {
                      alert("Presencia creada exitosamente");
                      await cargarPresencias();
                    } else {
                      alert("Error al crear la presencia");
                    }
                  }
                  setModalFormularioPresencia(false);
                  setPresenciaEditando(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa Presencia */}
      {modalPresencia && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0"
              onClick={() => setModalPresencia(null)}
            ></div>

            <div className="relative w-full max-w-4xl bg-white shadow-xl rounded-lg z-10">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 uppercase">
                  {modalPresencia.nombre}
                </h2>
                <button
                  onClick={() => setModalPresencia(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                    INFORMACIÓN GENERAL
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        AGENCIA:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {capitalize(modalPresencia.agencia)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CIUDAD:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.ciudad || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CAMPAÑA:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.campana || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        UBICACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.ubicacion || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        CONTENIDO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.contenido || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        NOTAS:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.notas || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        FECHA DE INSTALACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.fecha_instalacion
                          ? new Date(
                              modalPresencia.fecha_instalacion,
                            ).toLocaleDateString("es-MX")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DURACIÓN:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.duracion || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DIMENSIONES:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.dimensiones || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        PROVEEDOR:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.proveedor || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        COSTO MENSUAL:
                      </label>
                      <p className="text-sm font-semibold text-green-600">
                        {modalPresencia.costo_mensual
                          ? `$${new Intl.NumberFormat("es-MX").format(modalPresencia.costo_mensual)}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        DURACIÓN DEL CONTRATO:
                      </label>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalPresencia.duracion_contrato || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {modalPresencia.imagenes_json &&
                  (() => {
                    try {
                      const imagenes = JSON.parse(modalPresencia.imagenes_json);
                      if (Array.isArray(imagenes) && imagenes.length > 0) {
                        return (
                          <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                              IMÁGENES
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              {imagenes.map((img: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="relative h-64 rounded-lg overflow-hidden"
                                >
                                  <Image
                                    src={img}
                                    alt={`${modalPresencia.nombre} ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    } catch {
                      return null;
                    }
                    return null;
                  })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
