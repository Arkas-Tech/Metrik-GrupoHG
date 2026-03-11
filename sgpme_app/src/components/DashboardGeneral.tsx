"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import { useCampanas } from "@/hooks/useCampanas";
import { usePresencias, Presencia } from "@/hooks/usePresencias";
import { useProveedoresAPI as useProveedores } from "@/hooks/useProveedoresAPI";
import { useEventos } from "@/hooks/useEventos";
import FormularioPresenciaDinamico from "@/components/FormularioPresenciaDinamico";
import PresenciaDetallesDinamico from "@/components/PresenciaDetallesDinamico";
import { AÑOS } from "@/types";
import {
  eventoPerteneceAMarca,
  eventoPerteneceAMarcas,
  formatearMarca,
} from "@/lib/evento-utils";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

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

interface DesplazamientoItem {
  unidad: string;
  porcentaje: string;
  oc: string;
  pdf?: string;
  pdfNombre?: string;
}

interface Partida {
  categoria: string;
  monto: number;
  esReembolso: boolean;
}

interface Proyeccion {
  año: number;
  mes: number;
  marca: string;
  partidas?: Partida[];
  partidas_json?: string;
}

interface Marca {
  id: number;
  cuenta: string;
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  XCircleIcon,
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
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
  const { filtraPorMarca, marcasPermitidas } = useMarcaGlobal();
  const { facturas } = useFacturas();
  const { campanas: campanasDb, cargarCampanas } = useCampanas();
  const {
    presencias,
    cargarPresencias,
    crearPresencia,
    actualizarPresencia,
    eliminarPresencia,
  } = usePresencias();
  const { proveedores } = useProveedores();
  const { eventos } = useEventos();

  const [añoSeleccionado, setAñoSeleccionado] = useState<number>(
    new Date().getFullYear(),
  );
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<
    "YTD" | "Mes" | "Q"
  >("YTD");
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [quarterSeleccionado, setQuarterSeleccionado] = useState<1 | 2 | 3 | 4>(
    1,
  );
  const [presenciaIndices, setPresenciaIndices] = useState<
    Record<string, number>
  >({});
  const [
    subcategoriasMediosTradicionales,
    setSubcategoriasMediosTradicionales,
  ] = useState<string[]>([]);
  const [marcaActual, setMarcaActual] = useState(agenciaSeleccionada);
  const [modalFormularioPresencia, setModalFormularioPresencia] =
    useState(false);
  const [subcategoriaPresenciaModal, setSubcategoriaPresenciaModal] =
    useState<string>("");
  const [presenciaEditando, setPresenciaEditando] = useState<Presencia | null>(
    null,
  );
  const [modalPresencia, setModalPresencia] = useState<Presencia | null>(null);
  const [presupuestos, setPresupuestos] = useState<PresupuestoMensual[]>([]);
  const [proyecciones, setProyecciones] = useState<Proyeccion[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  // Filtro global de mes — afecta Funnel, Desplazamiento, Eventos, Campañas, Embajadores, Presencia
  const [filtroMesGlobal, setFiltroMesGlobal] = useState<number>(
    new Date().getMonth() + 1,
  );
  // Caché de templates de presencias para filtrado por sección Temporalidad
  const [templatesCache, setTemplatesCache] = useState<
    Record<
      string,
      {
        secciones: Array<{
          nombre: string;
          activo: boolean;
          campos: Array<{ id: string; tipo: string }>;
        }>;
      }
    >
  >({});

  // Estado para la sección de Desplazamiento
  const [modoEdicionDesplazamiento, setModoEdicionDesplazamiento] =
    useState(false);
  const [guardandoDesplazamiento, setGuardandoDesplazamiento] = useState(false);
  const [mensajeGuardar, setMensajeGuardar] = useState<"ok" | "error" | null>(
    null,
  );

  // Estado para el visor de PDF
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string | null;
    nombre: string;
  }>({
    isOpen: false,
    url: null,
    nombre: "",
  });

  // Datos organizados por mes: { [mes: number]: Array<datos> }
  const [desplazamientoPorMes, setDesplazamientoPorMes] = useState<{
    [mes: number]: {
      mayorExistencia: Array<{
        unidad: string;
        porcentaje: string;
        oc: string;
        pdf?: string;
        pdfNombre?: string;
      }>;
      mas90Dias: Array<{
        unidad: string;
        porcentaje: string;
        oc: string;
        pdf?: string;
        pdfNombre?: string;
      }>;
      demos: Array<{
        unidad: string;
        porcentaje: string;
        oc: string;
        pdf?: string;
        pdfNombre?: string;
      }>;
      otros: Array<{
        unidad: string;
        porcentaje: string;
        oc: string;
        pdf?: string;
        pdfNombre?: string;
      }>;
    };
  }>({});

  // Obtener datos del mes actual
  const datosDesplazamientoActual = desplazamientoPorMes[filtroMesGlobal] || {
    mayorExistencia: [],
    mas90Dias: [],
    demos: [],
    otros: [],
  };

  // Funciones para actualizar datos del mes actual
  const actualizarDatosDesplazamiento = (
    categoria: "mayorExistencia" | "mas90Dias" | "demos" | "otros",
    nuevosDatos: Array<{
      unidad: string;
      porcentaje: string;
      oc: string;
      pdf?: string;
      pdfNombre?: string;
    }>,
  ) => {
    const nuevoDatosMes = {
      ...datosDesplazamientoActual,
      [categoria]: nuevosDatos,
    };

    setDesplazamientoPorMes((prev) => ({
      ...prev,
      [filtroMesGlobal]: nuevoDatosMes,
    }));
    // El guardado se hace únicamente al pulsar “Guardar Cambios”
  };

  // Función para guardar datos en la base de datos
  const guardarDesplazamientoEnDB = async (datos: {
    mayorExistencia: DesplazamientoItem[];
    mas90Dias: DesplazamientoItem[];
    demos: DesplazamientoItem[];
    otros: DesplazamientoItem[];
  }) => {
    try {
      console.log("[DEBUG-GUARDAR] Iniciando guardado...");
      console.log("[DEBUG-GUARDAR] Datos a guardar:", datos);

      if (!agenciaSeleccionada) {
        console.log(
          "[DEBUG-GUARDAR] ❌ No hay agencia seleccionada en el header",
        );
        return;
      }

      // Obtener marca_id de la agencia seleccionada
      const marca = marcas.find((m) => m.cuenta === agenciaSeleccionada);
      if (!marca) {
        console.log(
          "[DEBUG-GUARDAR] ❌ No se encontró marca para:",
          agenciaSeleccionada,
        );
        console.log(
          "[DEBUG-GUARDAR] Marcas disponibles:",
          marcas.map((m) => m.cuenta),
        );
        return;
      }

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const payload = {
        mes: filtroMesGlobal,
        anio: añoSeleccionado,
        marca_id: marca.id,
        mayorExistencia: datos.mayorExistencia,
        mas90Dias: datos.mas90Dias,
        demos: datos.demos,
        otros: datos.otros,
      };

      console.log("[DEBUG-GUARDAR] 📤 Enviando payload:", payload);
      console.log(
        "[DEBUG-GUARDAR] 📡 URL:",
        `${API_URL}/desplazamiento/guardar`,
      );

      const response = await fetchConToken(
        `${API_URL}/desplazamiento/guardar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log(
          "[DEBUG-GUARDAR] ✅ Desplazamiento guardado exitosamente:",
          result,
        );
      } else {
        const errorData = await response.text();
        console.error(
          "[DEBUG-GUARDAR] ❌ Error guardando desplazamiento:",
          response.status,
          errorData,
        );
        throw new Error(`Error ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error(
        "[DEBUG-GUARDAR] ❌ Exception guardando desplazamiento:",
        error,
      );
      throw error;
    }
  };

  // Función para cargar datos de desplazamiento desde la base de datos
  const cargarDesplazamientoDesdeDB = useCallback(async () => {
    try {
      console.log("[DEBUG-CARGAR] Iniciando carga de desplazamiento...");
      console.log(
        "[DEBUG-CARGAR] agenciaSeleccionada (header):",
        agenciaSeleccionada,
      );
      console.log("[DEBUG-CARGAR] marcas.length:", marcas.length);
      console.log("[DEBUG-CARGAR] mes:", filtroMesGlobal);
      console.log("[DEBUG-CARGAR] año:", añoSeleccionado);

      if (!agenciaSeleccionada) {
        console.log(
          "[DEBUG-CARGAR] ℹ️ No hay agencia seleccionada en el header, mostrando vacío",
        );
        setDesplazamientoPorMes((prev) => ({
          ...prev,
          [filtroMesGlobal]: {
            mayorExistencia: [],
            mas90Dias: [],
            demos: [],
            otros: [],
          },
        }));
        return;
      }

      // Obtener marca_id de la agencia seleccionada
      const marca = marcas.find((m) => m.cuenta === agenciaSeleccionada);
      if (!marca) {
        console.log(
          "[DEBUG-CARGAR] ❌ No se encontró marca para cargar:",
          agenciaSeleccionada,
        );
        console.log(
          "[DEBUG-CARGAR] Marcas disponibles:",
          marcas.map((m) => m.cuenta),
        );
        return;
      }

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = `${API_URL}/desplazamiento/obtener/${filtroMesGlobal}/${añoSeleccionado}/${marca.id}`;
      console.log("[DEBUG-CARGAR] 📡 Cargando desplazamiento desde:", url);

      const response = await fetchConToken(url);

      if (response.ok) {
        const data = await response.json();
        console.log("[DEBUG-CARGAR] ✅ Datos cargados exitosamente:", data);
        setDesplazamientoPorMes((prev) => ({
          ...prev,
          [filtroMesGlobal]: {
            mayorExistencia: data.mayorExistencia || [],
            mas90Dias: data.mas90Dias || [],
            demos: data.demos || [],
            otros: data.otros || [],
          },
        }));
      } else {
        console.log(
          "[DEBUG-CARGAR] ℹ️ No se encontraron datos (404 es normal si es la primera vez)",
        );
      }
    } catch (error) {
      console.error("[DEBUG-CARGAR] ❌ Error cargando desplazamiento:", error);
    }
  }, [agenciaSeleccionada, marcas, filtroMesGlobal, añoSeleccionado]);

  // Función para manejar la carga de PDF
  const handlePdfUpload = (
    file: File,
    categoria: "mayorExistencia" | "mas90Dias" | "demos" | "otros",
    index: number,
  ) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const datos = [...datosDesplazamientoActual[categoria]];
      datos[index] = {
        ...datos[index],
        pdf: base64String,
        pdfNombre: file.name,
      };
      actualizarDatosDesplazamiento(categoria, datos);
    };
    reader.readAsDataURL(file);
  };

  // Función para descargar PDF
  const handlePdfDownload = (pdfBase64: string, nombreArchivo: string) => {
    const link = document.createElement("a");
    link.href = pdfBase64;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para ver PDF en modal
  const verPDF = async (pdfBase64: string, nombreArchivo: string) => {
    try {
      // Si es una URL base64, usarla directamente
      if (pdfBase64.startsWith("data:")) {
        setPdfViewer({
          isOpen: true,
          url: pdfBase64,
          nombre: nombreArchivo,
        });
      } else {
        // Si es una ruta de archivo, intentar cargarla
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetchConToken(`${API_URL}${pdfBase64}`);

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfViewer({
            isOpen: true,
            url: url,
            nombre: nombreArchivo,
          });
        } else {
          console.error("Error al cargar el PDF");
        }
      }
    } catch (error) {
      console.error("Error al abrir el PDF:", error);
    }
  };

  // Función para cerrar el visor de PDF
  const cerrarPdfViewer = () => {
    if (pdfViewer.url && !pdfViewer.url.startsWith("data:")) {
      URL.revokeObjectURL(pdfViewer.url);
    }
    setPdfViewer({ isOpen: false, url: null, nombre: "" });
  };

  // Cargar proyecciones
  useEffect(() => {
    const cargarProyecciones = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const params = new URLSearchParams();
        if (agenciaSeleccionada) params.append("marca", agenciaSeleccionada);

        const response = await fetchConToken(
          `${API_URL}/proyecciones?${params.toString()}`,
        );

        if (response.ok) {
          const data = await response.json();
          setProyecciones(Array.isArray(data) ? data : []);
        } else {
          setProyecciones([]);
        }
      } catch (error) {
        console.error("Error cargando proyecciones:", error);
        setProyecciones([]);
      }
    };

    cargarProyecciones();
  }, [agenciaSeleccionada]);

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

  // Cargar marcas al inicio
  useEffect(() => {
    const cargarMarcas = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log(
          "[DEBUG-MARCAS] 📡 Cargando marcas desde:",
          `${API_URL}/marcas`,
        );
        const response = await fetchConToken(`${API_URL}/marcas`);

        if (response.ok) {
          const data = await response.json();
          console.log(
            "[DEBUG-MARCAS] ✅ Marcas cargadas:",
            data.length,
            "marcas",
          );
          console.log(
            "[DEBUG-MARCAS] Lista:",
            data.map((m: Marca) => m.cuenta),
          );
          setMarcas(data);
        } else {
          console.error(
            "[DEBUG-MARCAS] ❌ Error cargando marcas:",
            response.status,
          );
        }
      } catch (error) {
        console.error("[DEBUG-MARCAS] ❌ Exception cargando marcas:", error);
      }
    };

    cargarMarcas();
  }, []);

  // Cargar subcategorías de Medios Tradicionales (categoría id=3)
  useEffect(() => {
    const cargarSubcategorias = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetchConToken(`${API_URL}/categorias/`);
        if (response.ok) {
          const data: {
            id: number;
            nombre: string;
            subcategorias: string[];
          }[] = await response.json();
          const mediosTradicionales = data.find((c) => c.id === 3);
          if (mediosTradicionales) {
            setSubcategoriasMediosTradicionales(
              mediosTradicionales.subcategorias,
            );
          }
        }
      } catch (error) {
        console.error(
          "Error cargando subcategorías de medios tradicionales:",
          error,
        );
      }
    };
    cargarSubcategorias();
  }, []);

  // Cargar templates de presencias para filtrado por sección Temporalidad
  useEffect(() => {
    const subcats = [...new Set(presencias.map((p) => p.tipo).filter(Boolean))];
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    subcats.forEach(async (sub) => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : "";
        const res = await fetch(
          `${API_URL}/form-templates/${encodeURIComponent(sub)}/`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setTemplatesCache((prev) =>
            prev[sub] ? prev : { ...prev, [sub]: data.template },
          );
        }
      } catch {
        /* ignore */
      }
    });
  }, [presencias]);

  // Cargar datos de desplazamiento cuando cambie el mes, año o agencia
  useEffect(() => {
    if (marcas.length === 0) return;
    const cargar = async () => {
      await cargarDesplazamientoDesdeDB();
    };
    void cargar();
  }, [
    filtroMesGlobal,
    añoSeleccionado,
    agenciaSeleccionada,
    marcas.length,
    cargarDesplazamientoDesdeDB,
  ]);

  // Resetear índices cuando cambia la marca
  if (marcaActual !== agenciaSeleccionada) {
    setPresenciaIndices({});
    setMarcaActual(agenciaSeleccionada);
  }

  const facturasFiltradas = useMemo(() => {
    return facturas.filter((factura) => {
      const fechaEmision = new Date(factura.fechaEmision);
      const añoFactura = fechaEmision.getFullYear();
      return añoFactura === añoSeleccionado && filtraPorMarca(factura.marca);
    });
  }, [facturas, filtraPorMarca, añoSeleccionado]);

  // Filtrar presupuestos por año y agencia
  const presupuestosFiltrados = useMemo(() => {
    return presupuestos.filter((presupuesto) => {
      return (
        presupuesto.anio === añoSeleccionado &&
        filtraPorMarca(presupuesto.marca_nombre)
      );
    });
  }, [presupuestos, filtraPorMarca, añoSeleccionado]);

  const metricas = useMemo(() => {
    // Calcular presupuesto anual desde presupuestos mensuales
    const presupuestoAnual = presupuestosFiltrados.reduce(
      (sum, p) => sum + p.monto,
      0,
    );
    const totalGastado = facturasFiltradas
      .filter((f) => f.estado === "Pagada")
      .reduce((sum, f) => sum + f.subtotal, 0);
    const totalPorPagar = facturasFiltradas
      .filter((f) => f.estado === "Pendiente" || f.estado === "Autorizada")
      .reduce((sum, f) => sum + f.subtotal, 0);

    return {
      presupuestoAnual,
      totalGastado,
      totalPorPagar,
    };
  }, [presupuestosFiltrados, facturasFiltradas]);

  const datosGrafica = useMemo(() => {
    const todosMeses = Array.from({ length: 12 }, (_, i) => i + 1);
    const datosPorMes: {
      [mes: string]: { presupuesto: number; gastoReal: number };
    } = {};

    // Inicializar los 12 meses del año
    todosMeses.forEach((numMes) => {
      const nombreMes = MESES_ORDEN[numMes - 1];
      datosPorMes[nombreMes] = { presupuesto: 0, gastoReal: 0 };
    });

    presupuestosFiltrados.forEach((presupuesto) => {
      const nombreMes = MESES_ORDEN[presupuesto.mes - 1];
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
          datosPorMes[mes].gastoReal += factura.subtotal;
        }
      });

    return todosMeses.map((numMes) => {
      const nombreMes = MESES_ORDEN[numMes - 1];
      return {
        mes: nombreMes.substring(0, 3),
        presupuesto: Math.round(datosPorMes[nombreMes].presupuesto / 1000),
        gastoReal: Math.round(datosPorMes[nombreMes].gastoReal / 1000),
      };
    });
  }, [presupuestosFiltrados, facturasFiltradas]);

  // Calcular meses permitidos según el período seleccionado
  const mesesPeriodo = useMemo(() => {
    if (periodoSeleccionado === "YTD") {
      const mesActual = new Date().getMonth() + 1;
      return Array.from({ length: mesActual }, (_, i) => i + 1);
    } else if (periodoSeleccionado === "Q") {
      const inicio = (quarterSeleccionado - 1) * 3 + 1;
      return [inicio, inicio + 1, inicio + 2];
    } else {
      return [mesSeleccionado];
    }
  }, [periodoSeleccionado, mesSeleccionado, quarterSeleccionado]);

  // Filtrar proyecciones según período
  const proyeccionesFiltradas = useMemo(() => {
    return proyecciones.filter((proy) => {
      return (
        proy.año === añoSeleccionado &&
        mesesPeriodo.includes(proy.mes) &&
        filtraPorMarca(proy.marca)
      );
    });
  }, [proyecciones, añoSeleccionado, mesesPeriodo, filtraPorMarca]);

  // Calcular datos para barra de progreso (proyección, presupuesto, gasto)
  const datosBarraProgreso = useMemo(() => {
    const presupuestoTotal = presupuestos
      .filter((p) => {
        return (
          p.anio === añoSeleccionado &&
          mesesPeriodo.includes(p.mes) &&
          filtraPorMarca(p.marca_nombre)
        );
      })
      .reduce((sum, p) => sum + p.monto, 0);

    const proyeccionTotal = proyeccionesFiltradas.reduce((sum, proy) => {
      let partidas = proy.partidas;
      if (!partidas && proy.partidas_json) {
        try {
          partidas = JSON.parse(proy.partidas_json);
        } catch (error) {
          console.error("Error parseando partidas_json:", error);
        }
      }
      if (partidas) {
        return (
          sum +
          partidas
            .filter((p: Partida) => !p.esReembolso)
            .reduce((s: number, p: Partida) => s + (p.monto || 0), 0)
        );
      }
      return sum;
    }, 0);

    const gastoTotal = facturas
      .filter((f) => {
        const fechaEmision = new Date(f.fechaEmision);
        const mesFactura = fechaEmision.getMonth() + 1;
        return (
          fechaEmision.getFullYear() === añoSeleccionado &&
          mesesPeriodo.includes(mesFactura) &&
          (f.estado === "Pagada" || f.estado === "Ingresada") &&
          filtraPorMarca(f.marca)
        );
      })
      .reduce((sum, f) => sum + f.total, 0);

    return {
      proyeccion: proyeccionTotal,
      presupuesto: presupuestoTotal,
      gasto: gastoTotal,
    };
  }, [
    presupuestos,
    proyeccionesFiltradas,
    facturas,
    añoSeleccionado,
    mesesPeriodo,
    filtraPorMarca,
  ]);

  // Calcular total de reembolsos
  const reembolsosData = useMemo(() => {
    const total = proyeccionesFiltradas.reduce((sum, proy) => {
      let partidas = proy.partidas;
      if (!partidas && proy.partidas_json) {
        try {
          partidas = JSON.parse(proy.partidas_json);
        } catch (error) {
          console.error("Error parseando partidas_json:", error);
        }
      }
      if (partidas) {
        return (
          sum +
          partidas
            .filter((p: Partida) => p.esReembolso)
            .reduce((s: number, p: Partida) => s + (p.monto || 0), 0)
        );
      }
      return sum;
    }, 0);

    return total;
  }, [proyeccionesFiltradas]);

  // Calcular datos para gráfica de pie (proyecciones por categoría)
  const datosGraficaPie = useMemo(() => {
    const categorias: { [key: string]: number } = {};

    proyeccionesFiltradas.forEach((proy) => {
      let partidas = proy.partidas;
      if (!partidas && proy.partidas_json) {
        try {
          partidas = JSON.parse(proy.partidas_json);
        } catch (error) {
          console.error("Error parseando partidas_json:", error);
        }
      }
      if (partidas) {
        partidas
          .filter((p: Partida) => !p.esReembolso)
          .forEach((partida: Partida) => {
            const cat = partida.categoria;
            if (!categorias[cat]) {
              categorias[cat] = 0;
            }
            categorias[cat] += partida.monto || 0;
          });
      }
    });

    return Object.entries(categorias)
      .map(([categoria, valor]) => ({
        nombre: categoria,
        valor,
      }))
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [proyeccionesFiltradas]);

  // Colores para la gráfica de pie
  const COLORES_PIE = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#ef4444", // red
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
  ];

  // Filtrar eventos por año + mes global y agencia seleccionada del header
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      // Filtrar por agencia (global o por marcas permitidas)
      if (agenciaSeleccionada) {
        if (!eventoPerteneceAMarca(evento.marca, agenciaSeleccionada))
          return false;
      } else {
        if (!eventoPerteneceAMarcas(evento.marca, marcasPermitidas))
          return false;
      }

      // Filtrar por año y mes
      const fechaEvento = new Date(evento.fechaInicio);
      return (
        fechaEvento.getFullYear() === añoSeleccionado &&
        fechaEvento.getMonth() + 1 === filtroMesGlobal
      );
    });
  }, [
    eventos,
    agenciaSeleccionada,
    marcasPermitidas,
    añoSeleccionado,
    filtroMesGlobal,
  ]);

  const formatearMiles = (valor: number) => {
    if (valor >= 1000000) {
      return `$${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `$${(valor / 1000).toFixed(0)}K`;
    }
    return `$${valor}`;
  };

  // Calcular métricas por plataforma
  const calcularMetricasPlataforma = (plataforma: string) => {
    const campanasActivas = campanasDb.filter((c) => {
      if (c.plataforma !== plataforma || c.estado !== "Activa") return false;
      if (!filtraPorMarca(c.marca)) return false;

      const fechaInicio = new Date(c.fecha_inicio);
      return (
        fechaInicio.getFullYear() === añoSeleccionado &&
        fechaInicio.getMonth() + 1 === filtroMesGlobal
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

  // Datos para Presencia Tradicional — filtra por año + mes global
  // El mes se extrae del primer campo fecha en sección Temporalidad (si existe),
  // con fallback a cualquier fecha en fieldValues, y último fallback a fecha_instalacion.
  const presenciaTradicionalData = presencias.filter((presencia) => {
    if (!presencia.agencia || !filtraPorMarca(presencia.agencia)) return false;
    if (new Date(presencia.fecha_instalacion).getFullYear() !== añoSeleccionado)
      return false;

    // Intentar extraer mes desde datos_extra_json
    if (presencia.datos_extra_json) {
      try {
        const extras = JSON.parse(presencia.datos_extra_json);
        const fv: Record<string, string | number> = extras.fieldValues ?? {};

        // Buscar sección Temporalidad en el template cacheado
        const tmpl = templatesCache[presencia.tipo];
        if (tmpl) {
          const sec = tmpl.secciones?.find(
            (s) => s.activo && s.nombre?.toLowerCase().includes("temporal"),
          );
          const campoDB = sec?.campos?.find((c) => c.tipo === "fecha");
          if (campoDB && fv[campoDB.id]) {
            const d = new Date(String(fv[campoDB.id]) + "T00:00:00");
            return d.getMonth() + 1 === filtroMesGlobal;
          }
        }

        // Fallback: cualquier valor con formato YYYY-MM-DD en fieldValues
        const anyDate = Object.values(fv).find(
          (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
        );
        if (anyDate) {
          const d = new Date(String(anyDate) + "T00:00:00");
          return d.getMonth() + 1 === filtroMesGlobal;
        }
      } catch {
        /* ignore */
      }
    }

    // Último fallback: mes de fecha_instalacion
    return (
      new Date(presencia.fecha_instalacion).getMonth() + 1 === filtroMesGlobal
    );
  });

  // Presencias por subcategoría (comparación case-insensitive)
  const presenciasPorSubcategoria = (subcategoria: string) =>
    presenciaTradicionalData.filter(
      (p) => p.tipo.toLowerCase() === subcategoria.toLowerCase(),
    );

  const navegarPresencia = (tipo: string, direccion: "prev" | "next") => {
    const total = presenciasPorSubcategoria(tipo).length;
    const current = presenciaIndices[tipo] ?? 0;
    if (direccion === "next" && current + 3 < total) {
      setPresenciaIndices((prev) => ({ ...prev, [tipo]: current + 1 }));
    } else if (direccion === "prev" && current > 0) {
      setPresenciaIndices((prev) => ({ ...prev, [tipo]: current - 1 }));
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
        </div>
      </div>
      {/* Métricas de presupuesto y gráfica ocultas temporalmente */}
      {false && (
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
                      Presupuesto Anual {añoSeleccionado}
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
              Presupuesto vs. Gasto Real — {añoSeleccionado}
            </h3>
            <div className="h-70">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosGrafica}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
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
      )}

      {/* Nueva sección: Filtro de período + Barras de progreso y gráfica de pie */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Análisis Detallado de Proyecciones
          </h3>
          <div className="flex gap-3">
            <div>
              <label
                htmlFor="periodo-selector"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Período:
              </label>
              <select
                id="periodo-selector"
                value={periodoSeleccionado}
                onChange={(e) =>
                  setPeriodoSeleccionado(e.target.value as "YTD" | "Mes" | "Q")
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="YTD">YTD (Year to Date)</option>
                <option value="Q">Trimestre (Q)</option>
                <option value="Mes">Mes</option>
              </select>
            </div>
            {periodoSeleccionado === "Q" && (
              <div>
                <label
                  htmlFor="quarter-selector"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Trimestre:
                </label>
                <select
                  id="quarter-selector"
                  value={quarterSeleccionado}
                  onChange={(e) =>
                    setQuarterSeleccionado(
                      parseInt(e.target.value) as 1 | 2 | 3 | 4,
                    )
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value={1}>Q1 (Ene – Mar)</option>
                  <option value={2}>Q2 (Abr – Jun)</option>
                  <option value={3}>Q3 (Jul – Sep)</option>
                  <option value={4}>Q4 (Oct – Dic)</option>
                </select>
              </div>
            )}
            {periodoSeleccionado === "Mes" && (
              <div>
                <label
                  htmlFor="mes-selector"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Mes:
                </label>
                <select
                  id="mes-selector"
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {MESES_ORDEN.map((mes, idx) => (
                    <option key={idx} value={idx + 1}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lado izquierdo: Barra de progreso y reembolsos */}
          <div className="space-y-6">
            {/* Barra de progreso */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Proyección vs Gasto
              </h4>

              <div className="space-y-6">
                {/* Valores */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      GASTO
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {formatearMiles(datosBarraProgreso.gasto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      PROYECCIÓN
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatearMiles(datosBarraProgreso.proyeccion)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      PRESUPUESTO
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatearMiles(datosBarraProgreso.presupuesto)}
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="relative">
                  <div className="h-8 bg-gray-200 rounded-lg relative overflow-hidden">
                    {(() => {
                      const { proyeccion, presupuesto, gasto } =
                        datosBarraProgreso;
                      const gastoSobrepasaPresupuesto =
                        gasto > presupuesto && presupuesto > 0;
                      const base100 = gastoSobrepasaPresupuesto
                        ? proyeccion
                        : presupuesto;

                      const porcentajeProyeccion =
                        base100 > 0 ? (proyeccion / base100) * 100 : 0;
                      const porcentajePresupuesto =
                        base100 > 0 ? (presupuesto / base100) * 100 : 0;
                      const gastoHastaPresupuesto = Math.min(
                        gasto,
                        presupuesto,
                      );
                      const gastoSobrante = Math.max(0, gasto - presupuesto);
                      const porcentajeGastoVerde =
                        base100 > 0
                          ? (gastoHastaPresupuesto / base100) * 100
                          : 0;
                      const porcentajeGastoRojo =
                        base100 > 0 ? (gastoSobrante / base100) * 100 : 0;

                      return (
                        <>
                          {/* Gasto verde (dentro del presupuesto) */}
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{
                              width: `${Math.min(porcentajeGastoVerde, 100)}%`,
                            }}
                          ></div>
                          {/* Gasto rojo (sobrepasa presupuesto) */}
                          {gastoSobrepasaPresupuesto && (
                            <div
                              className="absolute top-0 h-full bg-red-500 transition-all duration-500"
                              style={{
                                left: `${porcentajeGastoVerde}%`,
                                width: `${Math.min(porcentajeGastoRojo, 100 - porcentajeGastoVerde)}%`,
                              }}
                            ></div>
                          )}
                          {/* Línea azul (proyección) */}
                          {proyeccion > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-blue-600 transition-all duration-500 z-10"
                              style={{
                                left: `${Math.min(porcentajeProyeccion, 100)}%`,
                              }}
                            ></div>
                          )}
                          {/* Línea negra (presupuesto) solo si gasto sobrepasa */}
                          {gastoSobrepasaPresupuesto && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-black transition-all duration-500 z-10"
                              style={{
                                left: `${Math.min(porcentajePresupuesto, 100)}%`,
                              }}
                            ></div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Porcentaje de gasto */}
                <div className="text-right">
                  <span
                    className={`text-sm font-medium ${
                      datosBarraProgreso.gasto > datosBarraProgreso.proyeccion
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    Gasto:{" "}
                    {datosBarraProgreso.proyeccion > 0
                      ? (
                          (datosBarraProgreso.gasto /
                            datosBarraProgreso.proyeccion) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    % de proyección
                  </span>
                </div>
              </div>
            </div>

            {/* Recuadro de reembolsos */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    💰 Reembolsos
                  </h4>
                  <p className="text-sm text-gray-600">
                    Total a reembolsar en el período
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-600">
                    {formatearMiles(reembolsosData)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      proyeccionesFiltradas.filter((p) => {
                        let partidas = p.partidas;
                        if (!partidas && p.partidas_json) {
                          try {
                            partidas = JSON.parse(p.partidas_json) as Partida[];
                          } catch {
                            return false;
                          }
                        }
                        return (
                          partidas &&
                          partidas.some((p: Partida) => p.esReembolso)
                        );
                      }).length
                    }{" "}
                    proyección(es) con reembolsos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lado derecho: Gráfica de pie */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Proyección por Categoría
            </h4>
            {datosGraficaPie.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosGraficaPie}
                        dataKey="valor"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={0}
                      >
                        {datosGraficaPie.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORES_PIE[index % COLORES_PIE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          formatearMiles(value ?? 0)
                        }
                        contentStyle={{
                          backgroundColor: "transparent",
                          border: "none",
                          boxShadow: "none",
                        }}
                        labelStyle={{
                          color: "#111827",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                        itemStyle={{
                          color: "#374151",
                          fontSize: "13px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {datosGraficaPie.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            COLORES_PIE[idx % COLORES_PIE.length],
                        }}
                      ></div>
                      <span className="text-xs text-gray-700">
                        {item.nombre}:{" "}
                        <span className="font-medium">
                          {formatearMiles(item.valor)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No hay datos de proyecciones para el período seleccionado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtro global de mes */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-600 uppercase tracking-wide shrink-0">
            📅 Mes:
          </span>
          <div className="flex gap-2 flex-wrap">
            {MESES_ORDEN.map((mes, idx) => (
              <button
                key={idx}
                onClick={() => setFiltroMesGlobal(idx + 1)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filtroMesGlobal === idx + 1
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {mes.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sección Funnel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Funnel</h2>

        {/* Digital */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📱 Digital
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Leads */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Leads</span>
                <svg
                  className="w-5 h-5 text-blue-600"
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
              <p className="text-3xl font-bold text-blue-900">0</p>
            </div>

            {/* Citas */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Citas</span>
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-3xl font-bold text-green-900">0</p>
            </div>

            {/* Ventas */}
            <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Ventas
                </span>
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-3xl font-bold text-emerald-900">0</p>
            </div>
          </div>
        </div>

        {/* Eventos */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🎉 Eventos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pisos */}
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Pisos</span>
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <p className="text-3xl font-bold text-purple-900">0</p>
            </div>

            {/* Leads */}
            <div className="bg-pink-50 rounded-lg p-6 border border-pink-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Leads</span>
                <svg
                  className="w-5 h-5 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-3xl font-bold text-pink-900">0</p>
            </div>

            {/* Ventas */}
            <div className="bg-rose-50 rounded-lg p-6 border border-rose-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Ventas
                </span>
                <svg
                  className="w-5 h-5 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-3xl font-bold text-rose-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Desplazamiento */}
      <div className="bg-linear-to-br from-slate-50 to-gray-100 rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              📊 Desplazamiento
            </h2>
            <p className="text-sm text-gray-600">
              Gestiona información por mes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mensajeGuardar === "ok" && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                ✅ Guardado
              </span>
            )}
            {mensajeGuardar === "error" && (
              <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                ❌ Error al guardar
              </span>
            )}
            {agenciaSeleccionada && (
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                🏢 {agenciaSeleccionada}
              </span>
            )}
            {!agenciaSeleccionada && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                Selecciona una agencia en el filtro del header para editar
              </span>
            )}
            <button
              disabled={!agenciaSeleccionada || guardandoDesplazamiento}
              onClick={async () => {
                if (modoEdicionDesplazamiento) {
                  setGuardandoDesplazamiento(true);
                  setMensajeGuardar(null);
                  try {
                    await guardarDesplazamientoEnDB(datosDesplazamientoActual);
                    setMensajeGuardar("ok");
                    setModoEdicionDesplazamiento(false);
                    setTimeout(() => setMensajeGuardar(null), 3000);
                  } catch {
                    setMensajeGuardar("error");
                  } finally {
                    setGuardandoDesplazamiento(false);
                  }
                } else {
                  setMensajeGuardar(null);
                  setModoEdicionDesplazamiento(true);
                }
              }}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg ${
                !agenciaSeleccionada || guardandoDesplazamiento
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : modoEdicionDesplazamiento
                    ? "bg-linear-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
                    : "bg-linear-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
              }`}
            >
              {guardandoDesplazamiento
                ? "⏳ Guardando..."
                : modoEdicionDesplazamiento
                  ? "💾 Guardar Cambios"
                  : "✏️ Editar"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mayor Existencia */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <span className="text-xl">📦</span> Mayor Existencia
              </h3>
              {modoEdicionDesplazamiento && (
                <button
                  onClick={() =>
                    actualizarDatosDesplazamiento("mayorExistencia", [
                      ...datosDesplazamientoActual.mayorExistencia,
                      { unidad: "", porcentaje: "", oc: "" },
                    ])
                  }
                  className="text-xs bg-linear-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-sm"
                >
                  + Agregar
                </button>
              )}
            </div>
            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Unidad
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      %
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      OC
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-700 w-32">
                      PDF
                    </th>
                    {modoEdicionDesplazamiento && (
                      <th className="px-2 py-2 w-8"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datosDesplazamientoActual.mayorExistencia.length === 0 ? (
                    <tr>
                      <td
                        colSpan={modoEdicionDesplazamiento ? 5 : 4}
                        className="px-2 py-4 text-center text-gray-500 text-xs"
                      >
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    datosDesplazamientoActual.mayorExistencia.map(
                      (item, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-blue-100 hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-2 py-2">
                            {modoEdicionDesplazamiento ? (
                              <input
                                type="text"
                                value={item.unidad}
                                onChange={(e) => {
                                  const updated = [
                                    ...datosDesplazamientoActual.mayorExistencia,
                                  ];
                                  updated[idx].unidad = e.target.value;
                                  actualizarDatosDesplazamiento(
                                    "mayorExistencia",
                                    updated,
                                  );
                                }}
                                className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900 font-medium">
                                {item.unidad}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {modoEdicionDesplazamiento ? (
                              <input
                                type="text"
                                value={item.porcentaje}
                                onChange={(e) => {
                                  const updated = [
                                    ...datosDesplazamientoActual.mayorExistencia,
                                  ];
                                  updated[idx].porcentaje = e.target.value;
                                  actualizarDatosDesplazamiento(
                                    "mayorExistencia",
                                    updated,
                                  );
                                }}
                                className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900 font-medium">
                                {item.porcentaje}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {modoEdicionDesplazamiento ? (
                              <input
                                type="text"
                                value={item.oc}
                                onChange={(e) => {
                                  const updated = [
                                    ...datosDesplazamientoActual.mayorExistencia,
                                  ];
                                  updated[idx].oc = e.target.value;
                                  actualizarDatosDesplazamiento(
                                    "mayorExistencia",
                                    updated,
                                  );
                                }}
                                className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900 font-medium">
                                {item.oc}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              {modoEdicionDesplazamiento && !item.pdf && (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handlePdfUpload(
                                          file,
                                          "mayorExistencia",
                                          idx,
                                        );
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <span
                                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                                    title="Cargar PDF"
                                  >
                                    <CloudArrowUpIcon className="h-4 w-4" />
                                    Cargar PDF
                                  </span>
                                </label>
                              )}
                              {item.pdf && (
                                <>
                                  <button
                                    onClick={() =>
                                      verPDF(
                                        item.pdf!,
                                        item.pdfNombre || "documento.pdf",
                                      )
                                    }
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Ver PDF"
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handlePdfDownload(
                                        item.pdf!,
                                        item.pdfNombre || "documento.pdf",
                                      )
                                    }
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Descargar PDF"
                                  >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          {modoEdicionDesplazamiento && (
                            <td className="px-2 py-2">
                              <button
                                onClick={() => {
                                  const updated =
                                    datosDesplazamientoActual.mayorExistencia.filter(
                                      (_, i) => i !== idx,
                                    );
                                  actualizarDatosDesplazamiento(
                                    "mayorExistencia",
                                    updated,
                                  );
                                }}
                                className="text-red-600 hover:text-red-800 font-bold text-sm hover:bg-red-50 px-1 rounded"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Más de 90 días */}
          <div className="bg-linear-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <span className="text-xl">⏰</span> Más de 90 días
              </h3>
              {modoEdicionDesplazamiento && (
                <button
                  onClick={() =>
                    actualizarDatosDesplazamiento("mas90Dias", [
                      ...datosDesplazamientoActual.mas90Dias,
                      { unidad: "", porcentaje: "", oc: "" },
                    ])
                  }
                  className="text-xs bg-linear-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-sm"
                >
                  + Agregar
                </button>
              )}
            </div>
            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Unidad
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      %
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      OC
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-700 w-32">
                      PDF
                    </th>
                    {modoEdicionDesplazamiento && (
                      <th className="px-2 py-2 w-8"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datosDesplazamientoActual.mas90Dias.length === 0 ? (
                    <tr>
                      <td
                        colSpan={modoEdicionDesplazamiento ? 5 : 4}
                        className="px-2 py-4 text-center text-gray-500 text-xs"
                      >
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    datosDesplazamientoActual.mas90Dias.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-amber-100 hover:bg-amber-50 transition-colors"
                      >
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.unidad}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.mas90Dias,
                                ];
                                updated[idx].unidad = e.target.value;
                                actualizarDatosDesplazamiento(
                                  "mas90Dias",
                                  updated,
                                );
                              }}
                              className="w-full px-2 py-1.5 border border-amber-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.unidad}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.porcentaje}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.mas90Dias,
                                ];
                                updated[idx].porcentaje = e.target.value;
                                actualizarDatosDesplazamiento(
                                  "mas90Dias",
                                  updated,
                                );
                              }}
                              className="w-full px-2 py-1.5 border border-amber-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.porcentaje}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.oc}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.mas90Dias,
                                ];
                                updated[idx].oc = e.target.value;
                                actualizarDatosDesplazamiento(
                                  "mas90Dias",
                                  updated,
                                );
                              }}
                              className="w-full px-2 py-1.5 border border-amber-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.oc}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {modoEdicionDesplazamiento && !item.pdf && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePdfUpload(file, "mas90Dias", idx);
                                    }
                                  }}
                                />
                                <span
                                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                                  title="Cargar PDF"
                                >
                                  <CloudArrowUpIcon className="h-4 w-4" />
                                  Cargar PDF
                                </span>
                              </label>
                            )}
                            {item.pdf && (
                              <>
                                <button
                                  onClick={() =>
                                    verPDF(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Ver PDF"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handlePdfDownload(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title="Descargar PDF"
                                >
                                  <ArrowDownTrayIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        {modoEdicionDesplazamiento && (
                          <td className="px-2 py-2">
                            <button
                              onClick={() => {
                                const updated =
                                  datosDesplazamientoActual.mas90Dias.filter(
                                    (_, i) => i !== idx,
                                  );
                                actualizarDatosDesplazamiento(
                                  "mas90Dias",
                                  updated,
                                );
                              }}
                              className="text-red-600 hover:text-red-800 font-bold text-sm hover:bg-red-50 px-1 rounded"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demos */}
          <div className="bg-linear-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <span className="text-xl">🎮</span> Demos
              </h3>
              {modoEdicionDesplazamiento && (
                <button
                  onClick={() =>
                    actualizarDatosDesplazamiento("demos", [
                      ...datosDesplazamientoActual.demos,
                      { unidad: "", porcentaje: "", oc: "" },
                    ])
                  }
                  className="text-xs bg-linear-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-sm"
                >
                  + Agregar
                </button>
              )}
            </div>
            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Unidad
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      %
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      OC
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-700 w-32">
                      PDF
                    </th>
                    {modoEdicionDesplazamiento && (
                      <th className="px-2 py-2 w-8"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datosDesplazamientoActual.demos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={modoEdicionDesplazamiento ? 5 : 4}
                        className="px-2 py-4 text-center text-gray-500 text-xs"
                      >
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    datosDesplazamientoActual.demos.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-purple-100 hover:bg-purple-50 transition-colors"
                      >
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.unidad}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.demos,
                                ];
                                updated[idx].unidad = e.target.value;
                                actualizarDatosDesplazamiento("demos", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-purple-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.unidad}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.porcentaje}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.demos,
                                ];
                                updated[idx].porcentaje = e.target.value;
                                actualizarDatosDesplazamiento("demos", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-purple-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.porcentaje}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.oc}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.demos,
                                ];
                                updated[idx].oc = e.target.value;
                                actualizarDatosDesplazamiento("demos", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-purple-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.oc}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {modoEdicionDesplazamiento && !item.pdf && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePdfUpload(file, "demos", idx);
                                    }
                                  }}
                                />
                                <span
                                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                                  title="Cargar PDF"
                                >
                                  <CloudArrowUpIcon className="h-4 w-4" />
                                  Cargar PDF
                                </span>
                              </label>
                            )}
                            {item.pdf && (
                              <>
                                <button
                                  onClick={() =>
                                    verPDF(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Ver PDF"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handlePdfDownload(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title="Descargar PDF"
                                >
                                  <ArrowDownTrayIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        {modoEdicionDesplazamiento && (
                          <td className="px-2 py-2">
                            <button
                              onClick={() => {
                                const updated =
                                  datosDesplazamientoActual.demos.filter(
                                    (_, i) => i !== idx,
                                  );
                                actualizarDatosDesplazamiento("demos", updated);
                              }}
                              className="text-red-600 hover:text-red-800 font-bold text-sm hover:bg-red-50 px-1 rounded"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Otros */}
          <div className="bg-linear-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                <span className="text-xl">📋</span> Otros
              </h3>
              {modoEdicionDesplazamiento && (
                <button
                  onClick={() =>
                    actualizarDatosDesplazamiento("otros", [
                      ...datosDesplazamientoActual.otros,
                      { unidad: "", porcentaje: "", oc: "" },
                    ])
                  }
                  className="text-xs bg-linear-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-sm"
                >
                  + Agregar
                </button>
              )}
            </div>
            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Unidad
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      %
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      OC
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-700 w-32">
                      PDF
                    </th>
                    {modoEdicionDesplazamiento && (
                      <th className="px-2 py-2 w-8"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datosDesplazamientoActual.otros.length === 0 ? (
                    <tr>
                      <td
                        colSpan={modoEdicionDesplazamiento ? 5 : 4}
                        className="px-2 py-4 text-center text-gray-500 text-xs"
                      >
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    datosDesplazamientoActual.otros.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-emerald-100 hover:bg-emerald-50 transition-colors"
                      >
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.unidad}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.otros,
                                ];
                                updated[idx].unidad = e.target.value;
                                actualizarDatosDesplazamiento("otros", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-emerald-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.unidad}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.porcentaje}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.otros,
                                ];
                                updated[idx].porcentaje = e.target.value;
                                actualizarDatosDesplazamiento("otros", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-emerald-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.porcentaje}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {modoEdicionDesplazamiento ? (
                            <input
                              type="text"
                              value={item.oc}
                              onChange={(e) => {
                                const updated = [
                                  ...datosDesplazamientoActual.otros,
                                ];
                                updated[idx].oc = e.target.value;
                                actualizarDatosDesplazamiento("otros", updated);
                              }}
                              className="w-full px-2 py-1.5 border border-emerald-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {item.oc}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {modoEdicionDesplazamiento && !item.pdf && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handlePdfUpload(file, "otros", idx);
                                    }
                                  }}
                                />
                                <span
                                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                                  title="Cargar PDF"
                                >
                                  <CloudArrowUpIcon className="h-4 w-4" />
                                  Cargar PDF
                                </span>
                              </label>
                            )}
                            {item.pdf && (
                              <>
                                <button
                                  onClick={() =>
                                    verPDF(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Ver PDF"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handlePdfDownload(
                                      item.pdf!,
                                      item.pdfNombre || "documento.pdf",
                                    )
                                  }
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title="Descargar PDF"
                                >
                                  <ArrowDownTrayIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        {modoEdicionDesplazamiento && (
                          <td className="px-2 py-2">
                            <button
                              onClick={() => {
                                const updated =
                                  datosDesplazamientoActual.otros.filter(
                                    (_, i) => i !== idx,
                                  );
                                actualizarDatosDesplazamiento("otros", updated);
                              }}
                              className="text-red-600 hover:text-red-800 font-bold text-sm hover:bg-red-50 px-1 rounded"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Listado de Eventos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            📅 Eventos — {MESES_ORDEN[filtroMesGlobal - 1]}
          </h2>
        </div>

        <div className="overflow-x-auto">
          {eventosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">
                No hay eventos para este mes
                {agenciaSeleccionada && ` en ${agenciaSeleccionada}`}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventosFiltrados.map((evento) => {
                  const getEstadoColor = (estado: string) => {
                    const colors: Record<string, string> = {
                      Realizado: "bg-green-100 text-green-800",
                      Confirmado: "bg-blue-100 text-blue-800",
                      "Por Suceder": "bg-yellow-100 text-yellow-800",
                      Prospectado: "bg-purple-100 text-purple-800",
                      Cancelado: "bg-red-100 text-red-800",
                    };
                    return colors[estado] || "bg-gray-100 text-gray-800";
                  };

                  return (
                    <tr key={evento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {evento.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {evento.tipoEvento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearMarca(evento.marca)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(evento.fechaInicio).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(evento.estado)}`}
                        >
                          {evento.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sección Campañas Digitales */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Campañas Digitales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meta */}
          <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
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
          <div className="bg-linear-to-br from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
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
          <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300 hover:shadow-lg transition-shadow">
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
          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
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
          <div className="bg-linear-to-br from-pink-50 to-pink-100 rounded-lg p-6 border-2 border-pink-200 hover:shadow-lg transition-shadow">
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
          <div className="bg-linear-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border-2 border-indigo-200 hover:shadow-lg transition-shadow">
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
        </div>

        {subcategoriasMediosTradicionales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay subcategorías configuradas en Medios Tradicionales.</p>
          </div>
        ) : (
          subcategoriasMediosTradicionales.map((subcategoria, subIdx) => {
            const todas = presenciasPorSubcategoria(subcategoria);
            const idx = presenciaIndices[subcategoria] ?? 0;
            const visibles = todas.slice(idx, idx + 3);
            const isLast =
              subIdx === subcategoriasMediosTradicionales.length - 1;
            return (
              <div key={subcategoria} className={isLast ? "" : "mb-8"}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {subcategoria}
                    </h3>
                    <button
                      onClick={() => {
                        setPresenciaEditando(null);
                        setSubcategoriaPresenciaModal(subcategoria);
                        setModalFormularioPresencia(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title={`Nueva presencia: ${subcategoria}`}
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {todas.length} registro{todas.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navegarPresencia(subcategoria, "prev")}
                        disabled={idx === 0}
                        className={`p-2 rounded-lg ${
                          idx === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => navegarPresencia(subcategoria, "next")}
                        disabled={idx + 3 >= todas.length}
                        className={`p-2 rounded-lg ${
                          idx + 3 >= todas.length
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                {visibles.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">
                    Sin registros para este período.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {visibles.map((presencia) => {
                      // Extract first image (handles new ImageItem format and old base64 format)
                      const firstImage = (() => {
                        try {
                          // Try datos_extra_json.fieldImages first
                          if (presencia.datos_extra_json) {
                            const extras = JSON.parse(
                              presencia.datos_extra_json,
                            );
                            const allImgs: Array<{
                              url: string;
                              nombre: string;
                            }> = Object.values(
                              (extras.fieldImages ?? {}) as Record<
                                string,
                                Array<{ url: string; nombre: string }>
                              >,
                            ).flat();
                            if (allImgs.length > 0) return allImgs[0].url;
                          }
                          // Fallback to imagenes_json
                          if (presencia.imagenes_json) {
                            const parsed = JSON.parse(presencia.imagenes_json);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              const first = parsed[0];
                              return typeof first === "string"
                                ? first
                                : (first?.url ?? null);
                            }
                          }
                        } catch {
                          /* ignore */
                        }
                        return null;
                      })();

                      return (
                        <div
                          key={presencia.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="mb-3">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900 leading-tight">
                                {presencia.nombre}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => {
                                    setPresenciaEditando(presencia);
                                    setSubcategoriaPresenciaModal(
                                      presencia.tipo || subcategoria,
                                    );
                                    setModalFormularioPresencia(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `¿Eliminar "${presencia.nombre}"? Esta acción no se puede deshacer.`,
                                      )
                                    )
                                      return;
                                    await eliminarPresencia(presencia.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  title="Eliminar"
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                            {presencia.fecha_instalacion && (
                              <p className="text-xs text-gray-500 mb-1">
                                📅{" "}
                                {new Date(
                                  presencia.fecha_instalacion + "T00:00:00",
                                ).toLocaleDateString("es-MX", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                          {firstImage && (
                            <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                              <Image
                                src={firstImage}
                                alt={presencia.nombre}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => setModalPresencia(presencia)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <EyeIcon className="h-4 w-4" />
                            Ver detalles
                          </button>
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

      {/* Sección Asesores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">👥 Asesores</h2>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg
            className="h-16 w-16 mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm">Gestión de asesores en desarrollo</p>
        </div>
      </div>

      {/* Modal Formulario Presencia */}
      {modalFormularioPresencia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {presenciaEditando ? "Editar Presencia" : "Nueva Presencia"}
                {subcategoriaPresenciaModal && (
                  <span className="ml-2 text-blue-600 text-xl">
                    — {subcategoriaPresenciaModal}
                  </span>
                )}
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
              <FormularioPresenciaDinamico
                subcategoria={subcategoriaPresenciaModal || "Espectaculares"}
                marcaActual={agenciaSeleccionada || ""}
                proveedores={proveedores}
                presenciaInicial={
                  presenciaEditando as Record<string, unknown> | null
                }
                onNavigateToProveedores={() => {
                  router.push("/facturas?action=nuevo-proveedor");
                }}
                onCancel={() => {
                  setModalFormularioPresencia(false);
                  setPresenciaEditando(null);
                }}
                onSubmit={async (presencia) => {
                  const payload = presencia;
                  if (presenciaEditando) {
                    const success = await actualizarPresencia(
                      presenciaEditando.id,
                      payload,
                    );
                    if (success) {
                      alert("Presencia actualizada exitosamente");
                      await cargarPresencias();
                    } else {
                      alert("Error al actualizar la presencia");
                    }
                  } else {
                    const success = await crearPresencia(payload);
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

              <div className="p-6 max-h-[75vh] overflow-y-auto">
                <PresenciaDetallesDinamico presencia={modalPresencia} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de PDF */}
      {pdfViewer.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cerrarPdfViewer}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {pdfViewer.nombre}
              </h3>
              <button
                onClick={cerrarPdfViewer}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {pdfViewer.url && (
                <iframe
                  src={pdfViewer.url}
                  className="w-full h-full min-h-[90vh] border-0"
                  title={pdfViewer.nombre}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
