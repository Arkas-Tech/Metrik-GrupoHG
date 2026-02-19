"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import FormularioPresupuestoMensual from "./FormularioPresupuestoMensual";
import { useCategorias } from "@/hooks/useCategorias";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

interface PresupuestoMensual {
  id: number;
  mes: number;
  anio: number;
  categoria: string;
  marca_id: number;
  marca_nombre: string;
  monto: number;
  monto_mensual_base?: number;
  fecha_modificacion: string;
  modificado_por: string;
}

interface PresupuestoAgrupado {
  marca_id: number;
  marca_nombre: string;
  monto_total: number;
  fecha_modificacion: string;
  presupuestos: PresupuestoMensual[];
}

interface Marca {
  id: number;
  cuenta: string;
}

interface Filtros {
  mes: number | null;
  anio: number;
  categoria: string;
  marca_id: number | null;
}

interface ListaPresupuestosMensualesProps {
  filtros: Filtros;
  refreshTrigger: number;
  esAdministrador: boolean;
  onPresupuestoEliminado: () => void;
}

const NOMBRES_MESES = [
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

// Orden personalizado de agencias (constante fuera del componente)
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

// Función para normalizar nombres (eliminar tildes)
const normalizarNombre = (nombre: string): string => {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function ListaPresupuestosMensuales({
  filtros,
  refreshTrigger,
  esAdministrador,
  onPresupuestoEliminado,
}: ListaPresupuestosMensualesProps) {
  const { nombresCategorias, loading: loadingCategorias } = useCategorias();
  const { filtraPorMarca } = useMarcaGlobal();
  const [presupuestos, setPresupuestos] = useState<PresupuestoMensual[]>([]);
  const [presupuestosAgrupados, setPresupuestosAgrupados] = useState<
    PresupuestoAgrupado[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);

  // Filtrar marcas por agencias permitidas del usuario
  const marcasFiltradas = useMemo(
    () => marcas.filter((m) => filtraPorMarca(m.cuenta)),
    [marcas, filtraPorMarca],
  );

  // Estados para el modal de detalle
  const [modalAgenciaAbierto, setModalAgenciaAbierto] = useState(false);
  const [agenciaSeleccionada, setAgenciaSeleccionada] =
    useState<PresupuestoAgrupado | null>(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(
    new Set(),
  );
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(
    null,
  );
  const [modoEdicion, setModoEdicion] = useState<"base" | "individual" | null>(
    null,
  );
  const [montosEditados, setMontosEditados] = useState<{
    [mes: number]: number;
  }>({});
  const [montoMensualBase, setMontoMensualBase] = useState<number>(0);
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [mesFiltroModal, setMesFiltroModal] = useState<number | null>(
    new Date().getMonth() + 1,
  );

  // Ref para evitar bucles infinitos en el useEffect
  const prevMarcaIdRef = useRef<number | null>(null);

  // Agrupar presupuestos por agencia
  const agruparPorAgencia = useCallback(
    (presupuestosData: PresupuestoMensual[]) => {
      const agrupados: { [key: number]: PresupuestoAgrupado } = {};

      // Primero inicializar solo las marcas permitidas con monto 0
      marcasFiltradas.forEach((marca) => {
        agrupados[marca.id] = {
          marca_id: marca.id,
          marca_nombre: marca.cuenta,
          monto_total: 0,
          fecha_modificacion: new Date().toISOString(),
          presupuestos: [],
        };
      });

      // Luego agregar los presupuestos existentes
      presupuestosData.forEach((presupuesto) => {
        if (!agrupados[presupuesto.marca_id]) {
          agrupados[presupuesto.marca_id] = {
            marca_id: presupuesto.marca_id,
            marca_nombre: presupuesto.marca_nombre,
            monto_total: 0,
            fecha_modificacion: presupuesto.fecha_modificacion,
            presupuestos: [],
          };
        }

        agrupados[presupuesto.marca_id].monto_total += presupuesto.monto;
        agrupados[presupuesto.marca_id].presupuestos.push(presupuesto);

        // Actualizar fecha de modificación si es más reciente
        if (
          new Date(presupuesto.fecha_modificacion) >
          new Date(agrupados[presupuesto.marca_id].fecha_modificacion)
        ) {
          agrupados[presupuesto.marca_id].fecha_modificacion =
            presupuesto.fecha_modificacion;
        }
      });

      return Object.values(agrupados).sort((a, b) => {
        const nombreA = normalizarNombre(a.marca_nombre);
        const nombreB = normalizarNombre(b.marca_nombre);
        const indexA = ORDEN_AGENCIAS.findIndex(
          (orden) => normalizarNombre(orden) === nombreA,
        );
        const indexB = ORDEN_AGENCIAS.findIndex(
          (orden) => normalizarNombre(orden) === nombreB,
        );

        // Si ambas están en el orden, usar ese orden
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        // Si solo A está en el orden, A va primero
        if (indexA !== -1) return -1;

        // Si solo B está en el orden, B va primero
        if (indexB !== -1) return 1;

        // Si ninguna está en el orden, ordenar alfabéticamente
        return a.marca_nombre.localeCompare(b.marca_nombre);
      });
    },
    [marcasFiltradas],
  );

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Construir parámetros de query
      const params = new URLSearchParams();
      if (filtros.mes !== null) params.append("mes", filtros.mes.toString());
      if (filtros.anio) params.append("anio", filtros.anio.toString());
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.marca_id !== null)
        params.append("marca_id", filtros.marca_id.toString());

      const response = await fetchConToken(
        `${API_URL}/presupuesto/?${params.toString()}`,
      );

      if (response.ok) {
        const data = await response.json();
        setPresupuestos(data);
      } else if (response.status === 404) {
        setPresupuestos([]);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Error al cargar presupuestos");
      }
    } catch (error) {
      console.error("Error cargando presupuestos:", error);
      setError("Error de conexión al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const cargarMarcasYCategorias = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const responseMarcas = await fetchConToken(`${API_URL}/marcas/marca/`);
      if (responseMarcas.ok) {
        const dataMarcas = await responseMarcas.json();
        setMarcas(dataMarcas);
      }

      const responseCategorias = await fetchConToken(
        `${API_URL}/presupuesto/categorias`,
      );
      if (responseCategorias.ok) {
        const dataCategorias = await responseCategorias.json();
        setCategorias(dataCategorias);
      }
    } catch (error) {
      console.error("Error cargando marcas y categorías:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos, refreshTrigger]);

  useEffect(() => {
    cargarMarcasYCategorias();
  }, []);

  // Reagrupar cuando cambien las marcas filtradas o presupuestos
  useEffect(() => {
    if (marcasFiltradas.length > 0) {
      setPresupuestosAgrupados(agruparPorAgencia(presupuestos));
    }
  }, [marcasFiltradas, presupuestos, agruparPorAgencia]);

  // Actualizar agenciaSeleccionada cuando presupuestosAgrupados cambie
  useEffect(() => {
    if (modalAgenciaAbierto && agenciaSeleccionada) {
      const marcaId = agenciaSeleccionada.marca_id;
      // Solo actualizar si los datos han cambiado (no en el primer render)
      if (prevMarcaIdRef.current === marcaId) {
        const agenciaActualizada = presupuestosAgrupados.find(
          (a) => a.marca_id === marcaId,
        );
        if (agenciaActualizada) {
          setAgenciaSeleccionada(agenciaActualizada);
        }
      }
      prevMarcaIdRef.current = marcaId;
    }
  }, [presupuestosAgrupados, modalAgenciaAbierto, agenciaSeleccionada]);

  const formatearMonto = (monto: number) => {
    // Manejar valores inválidos
    if (monto === null || monto === undefined || isNaN(monto)) {
      monto = 0;
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-MX");
  };

  const handlePresupuestoActualizado = () => {
    setEditandoId(null);
    cargarDatos();
  };

  const abrirModalAgencia = (agencia: PresupuestoAgrupado) => {
    setAgenciaSeleccionada(agencia);
    setModalAgenciaAbierto(true);
  };

  const cerrarModalAgencia = () => {
    setModalAgenciaAbierto(false);
    setAgenciaSeleccionada(null);
    setCategoriasExpandidas(new Set()); // Reset expanded categories when closing modal
    setCategoriaEditando(null);
    setModoEdicion(null);
    setMontosEditados({});
    setMontoMensualBase(0);
    setMesFiltroModal(new Date().getMonth() + 1);
  };

  const toggleCategoria = (categoria: string) => {
    setCategoriasExpandidas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  };

  const iniciarEdicionCategoria = (
    categoria: string,
    mesesReales: Map<number, number>,
    montoBaseGuardado: number = 0,
    modo: "base" | "individual" = "base",
  ) => {
    setCategoriaEditando(categoria);
    setModoEdicion(modo);
    // Inicializar cada mes con su monto real de la base de datos
    const montosIniciales: { [mes: number]: number } = {};
    for (let i = 1; i <= 12; i++) {
      const montoMes = mesesReales.get(i) || 0;
      montosIniciales[i] = montoMes;
    }
    setMontosEditados(montosIniciales);

    // Usar el monto_mensual_base guardado en la base de datos
    setMontoMensualBase(montoBaseGuardado || 0);

    // Expandir automáticamente la categoría si no está expandida
    if (!categoriasExpandidas.has(categoria)) {
      toggleCategoria(categoria);
    }
  };

  const actualizarMontoMensualBase = (valor: string) => {
    if (modoEdicion !== "base") return; // Solo permitir edición en modo base
    const monto = valor === "" ? 0 : parseFloat(valor);
    const montoValido = isNaN(monto) ? 0 : monto;
    setMontoMensualBase(montoValido);
    // Llenar automáticamente todos los meses con este valor
    const nuevosMontosEditados: { [mes: number]: number } = {};
    for (let i = 1; i <= 12; i++) {
      nuevosMontosEditados[i] = montoValido;
    }
    setMontosEditados(nuevosMontosEditados);
  };

  const actualizarMontoMes = (mes: number, valor: string) => {
    if (modoEdicion !== "individual") return; // Solo permitir edición en modo individual
    const monto = valor === "" ? 0 : parseFloat(valor);
    const montoValido = isNaN(monto) ? 0 : monto;
    setMontosEditados((prev) => {
      const nuevo = { ...prev, [mes]: montoValido };
      return nuevo;
    });
  };

  const guardarCambiosCategoria = async () => {
    if (!categoriaEditando || !agenciaSeleccionada) return;

    try {
      setGuardandoCambios(true);
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Obtener todos los presupuestos de la categoría
      const presupuestosCategoria = agenciaSeleccionada.presupuestos.filter(
        (p) => p.categoria === categoriaEditando,
      );

      // Actualizar o crear cada presupuesto mensual
      for (let mes = 1; mes <= 12; mes++) {
        const nuevoMonto = montosEditados[mes] ?? 0;
        const presupuestoExistente = presupuestosCategoria.find(
          (p) => p.mes === mes,
        );

        if (presupuestoExistente) {
          // Actualizar presupuesto existente
          const bodyData = {
            mes: presupuestoExistente.mes,
            anio: presupuestoExistente.anio,
            categoria: presupuestoExistente.categoria,
            marca_id: presupuestoExistente.marca_id,
            monto: nuevoMonto,
            // Solo actualizar monto_mensual_base si estamos en modo "base"
            monto_mensual_base:
              modoEdicion === "base"
                ? montoMensualBase
                : presupuestoExistente.monto_mensual_base,
          };
          console.log(`PUT /presupuesto/${presupuestoExistente.id}`, bodyData);

          const response = await fetchConToken(
            `${API_URL}/presupuesto/${presupuestoExistente.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(bodyData),
            },
          );

          console.log(`Response status: ${response.status}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Error response:`, errorData);
            throw new Error(
              `Error al actualizar presupuesto del mes ${mes}: ${JSON.stringify(errorData)}`,
            );
          }
        } else {
          // Crear nuevo presupuesto para este mes
          const response = await fetchConToken(`${API_URL}/presupuesto/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mes: mes,
              anio: new Date().getFullYear(),
              categoria: categoriaEditando,
              marca_id: agenciaSeleccionada.marca_id,
              monto: nuevoMonto,
              // Solo incluir monto_mensual_base si estamos en modo "base"
              monto_mensual_base: modoEdicion === "base" ? montoMensualBase : 0,
            }),
          });

          if (!response.ok) {
            throw new Error(`Error al crear presupuesto del mes ${mes}`);
          }
        }
      }

      // Recargar datos - el useEffect actualizará agenciaSeleccionada automáticamente
      await cargarDatos();

      // Salir del modo de edición
      setCategoriaEditando(null);
      setModoEdicion(null);
      setMontosEditados({});
      setMontoMensualBase(0);
    } catch (error) {
      console.error("Error guardando cambios:", error);
      alert("Error al guardar los cambios. Por favor, intente de nuevo.");
    } finally {
      setGuardandoCambios(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando presupuestos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4">
          {error}
        </div>
      </div>
    );
  }

  if (presupuestosAgrupados.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-lg font-medium">No se encontraron presupuestos</p>
          <p className="text-sm">
            Los presupuestos que coincidan con los filtros aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden">
        {/* Encabezado de la tabla */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Presupuestos por Agencia
          </h3>
        </div>

        {/* Tabla agrupada por agencia */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Anual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modificado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {presupuestosAgrupados.map((agencia) => (
                <tr key={agencia.marca_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">
                          {agencia.marca_nombre.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {agencia.marca_nombre}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      {formatearMonto(agencia.monto_total)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearFecha(agencia.fecha_modificacion)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => abrirModalAgencia(agencia)}
                      className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
                    >
                      Ver Detalle
                      <svg
                        className="ml-2 w-4 h-4"
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
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle de agencia */}
      {modalAgenciaAbierto && agenciaSeleccionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 transition-opacity"
              onClick={cerrarModalAgencia}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full relative z-10">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      {agenciaSeleccionada.marca_nombre}
                    </h2>

                    {/* Totales */}
                    <div className="flex gap-4 items-center">
                      <div className="bg-white/20 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-100 mb-1">
                          Total Anual
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {formatearMonto(agenciaSeleccionada.monto_total)}
                        </p>
                      </div>
                      <div className="bg-white/20 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-100 mb-1">
                          Total Mensual
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {mesFiltroModal
                            ? formatearMonto(
                                agenciaSeleccionada.presupuestos
                                  .filter((p) => p.mes === mesFiltroModal)
                                  .reduce((sum, p) => sum + p.monto, 0),
                              )
                            : "$0.00"}
                        </p>
                      </div>
                      <div className="ml-2">
                        <select
                          value={mesFiltroModal || ""}
                          onChange={(e) =>
                            setMesFiltroModal(
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="bg-white/30 text-white text-sm rounded px-3 py-2 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                        >
                          <option value="" className="text-gray-900">
                            Seleccionar mes
                          </option>
                          {NOMBRES_MESES.slice(1).map((mes, idx) => (
                            <option
                              key={idx + 1}
                              value={idx + 1}
                              className="text-gray-900"
                            >
                              {mes}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={cerrarModalAgencia}
                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-full"
                    title="Cerrar"
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
              </div>

              {/* Lista de presupuestos por categoría */}
              <div className="bg-gray-50 px-8 py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Presupuestos por Categoría
                </h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Monto Mensual
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Monto Anual
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Agrupar presupuestos por categoría
                        const categoriaMap = new Map<string, number>();
                        const categoriaPresupuestoId = new Map<
                          string,
                          number
                        >();
                        // Mapa para guardar los montos reales de cada mes por categoría
                        const categoriaMesesMap = new Map<
                          string,
                          Map<number, number>
                        >();
                        // Mapa para guardar el monto_mensual_base de cada categoría
                        const categoriaMontoBaseMap = new Map<string, number>();

                        agenciaSeleccionada.presupuestos.forEach((p) => {
                          const actual = categoriaMap.get(p.categoria) || 0;
                          categoriaMap.set(p.categoria, actual + p.monto);
                          // Guardar el ID del primer presupuesto de cada categoría para edición
                          if (!categoriaPresupuestoId.has(p.categoria)) {
                            categoriaPresupuestoId.set(p.categoria, p.id);
                          }
                          // Guardar monto real de cada mes
                          if (!categoriaMesesMap.has(p.categoria)) {
                            categoriaMesesMap.set(p.categoria, new Map());
                          }
                          categoriaMesesMap
                            .get(p.categoria)!
                            .set(p.mes, p.monto);
                          // Guardar el monto_mensual_base (usar el del primer presupuesto)
                          if (
                            !categoriaMontoBaseMap.has(p.categoria) &&
                            p.monto_mensual_base !== undefined
                          ) {
                            categoriaMontoBaseMap.set(
                              p.categoria,
                              p.monto_mensual_base,
                            );
                          }
                        });

                        // Asegurar que todas las categorías predefinidas estén presentes
                        nombresCategorias.forEach((cat) => {
                          if (!categoriaMap.has(cat)) {
                            categoriaMap.set(cat, 0);
                          }
                          if (!categoriaMesesMap.has(cat)) {
                            categoriaMesesMap.set(cat, new Map());
                          }
                        });

                        // Convertir a array y ordenar por nombresCategorias
                        const categorias = Array.from(
                          categoriaMap.entries(),
                        ).sort(([a], [b]) => {
                          const indexA = nombresCategorias.indexOf(a);
                          const indexB = nombresCategorias.indexOf(b);
                          if (indexA !== -1 && indexB !== -1)
                            return indexA - indexB;
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                          return a.localeCompare(b);
                        });

                        return categorias.flatMap(([categoria, montoTotal]) => {
                          const isExpanded =
                            categoriasExpandidas.has(categoria);
                          const isEditing = categoriaEditando === categoria;
                          const mesesReales = categoriaMesesMap.get(categoria)!;
                          const montoBaseGuardado =
                            categoriaMontoBaseMap.get(categoria) || 0;

                          // Calcular monto anual: suma de los 12 meses (editados o reales)
                          const montoAnual = isEditing
                            ? Object.values(montosEditados).reduce(
                                (sum, monto) => sum + monto,
                                0,
                              )
                            : montoTotal; // montoTotal ya es la suma de todos los meses

                          // Monto mensual promedio para referencia
                          const montoMensualPromedio =
                            montoTotal / mesesReales.size;

                          const mainRow = (
                            <tr
                              key={categoria}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                    {categoria}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {isEditing && modoEdicion === "base" ? (
                                  <div>
                                    <input
                                      type="number"
                                      value={montoMensualBase || ""}
                                      onChange={(e) =>
                                        actualizarMontoMensualBase(
                                          e.target.value,
                                        )
                                      }
                                      className="w-32 text-base font-bold text-gray-900 text-right border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      step="0.01"
                                      min="0"
                                      placeholder="0"
                                    />
                                    <div className="text-xs text-blue-600 mt-1">
                                      Auto-llenar meses
                                    </div>
                                  </div>
                                ) : isEditing &&
                                  modoEdicion === "individual" ? (
                                  <div className="text-base font-bold text-gray-500">
                                    {formatearMonto(montoMensualBase)}
                                    <div className="text-xs text-gray-500 mt-1">
                                      (Sin cambios)
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-base font-bold text-gray-900">
                                    {formatearMonto(
                                      montoBaseGuardado > 0
                                        ? montoBaseGuardado
                                        : montoMensualPromedio,
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-base font-bold text-green-600">
                                  {formatearMonto(montoAnual)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center space-x-2">
                                  <button
                                    onClick={() => toggleCategoria(categoria)}
                                    className="text-gray-600 hover:text-gray-800 transition-colors p-2 hover:bg-gray-100 rounded"
                                    title={
                                      isExpanded
                                        ? "Ocultar desglose"
                                        : "Ver desglose mensual"
                                    }
                                  >
                                    <svg
                                      className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </button>
                                  {esAdministrador &&
                                    (categoriaEditando === categoria ? (
                                      <button
                                        onClick={guardarCambiosCategoria}
                                        disabled={guardandoCambios}
                                        className="text-green-600 hover:text-green-800 transition-colors p-2 hover:bg-green-50 rounded disabled:opacity-50"
                                        title="Guardar cambios"
                                      >
                                        {guardandoCambios ? (
                                          <svg
                                            className="w-4 h-4 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            />
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                      </button>
                                    ) : (
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() =>
                                            iniciarEdicionCategoria(
                                              categoria,
                                              mesesReales,
                                              montoBaseGuardado,
                                              "base",
                                            )
                                          }
                                          disabled={categoriaEditando !== null}
                                          className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded disabled:opacity-50"
                                          title="Editar Monto Base"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() =>
                                            iniciarEdicionCategoria(
                                              categoria,
                                              mesesReales,
                                              montoBaseGuardado,
                                              "individual",
                                            )
                                          }
                                          disabled={categoriaEditando !== null}
                                          className="text-purple-600 hover:text-purple-800 transition-colors p-2 hover:bg-purple-50 rounded disabled:opacity-50"
                                          title="Editar Meses Individuales"
                                        >
                                          <svg
                                            className="w-4 h-4"
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
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );

                          // Fila expandida con desglose mensual
                          const expandedRow = isExpanded ? (
                            <tr key={`${categoria}-expanded`}>
                              <td colSpan={4} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-3 gap-4">
                                  {NOMBRES_MESES.slice(1).map((mes, idx) => {
                                    const mesNumero = idx + 1;
                                    const montoRealMes =
                                      mesesReales.get(mesNumero) || 0;
                                    const montoMes = isEditing
                                      ? mesNumero in montosEditados
                                        ? montosEditados[mesNumero]
                                        : montoRealMes
                                      : montoRealMes;

                                    return (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center px-4 py-2 bg-white rounded-lg border border-gray-200"
                                      >
                                        <span className="text-sm font-medium text-gray-700">
                                          {mes}
                                        </span>
                                        {isEditing &&
                                        modoEdicion === "individual" ? (
                                          <input
                                            type="number"
                                            value={montoMes || ""}
                                            onChange={(e) =>
                                              actualizarMontoMes(
                                                mesNumero,
                                                e.target.value,
                                              )
                                            }
                                            className="w-28 text-sm font-bold text-gray-900 text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            step="0.01"
                                            min="0"
                                            placeholder="0"
                                          />
                                        ) : isEditing &&
                                          modoEdicion === "base" ? (
                                          <input
                                            type="number"
                                            value={montoMes || ""}
                                            readOnly
                                            className="w-28 text-sm font-bold text-gray-900 text-right border border-gray-300 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                                            step="0.01"
                                            min="0"
                                            placeholder="0"
                                          />
                                        ) : (
                                          <span className="text-sm font-bold text-gray-900">
                                            {formatearMonto(montoRealMes)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ) : null;

                          return [mainRow, expandedRow].filter(Boolean);
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-white px-8 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={cerrarModalAgencia}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editandoId && esAdministrador && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay sin onClick - no se cierra al hacer click afuera */}
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>

            {/* Modal content con z-index superior */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
              <div className="bg-white px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Editar Presupuesto
                </h3>

                <FormularioPresupuestoMensual
                  marcas={marcasFiltradas}
                  categorias={categorias}
                  onPresupuestoCreado={handlePresupuestoActualizado}
                  onCancelar={() => setEditandoId(null)}
                  presupuestoInicial={
                    presupuestos.find((p) => p.id === editandoId) || null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
