"use client";

import { useEffect, useState, useMemo } from "react";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { fetchConToken } from "@/lib/auth-utils";
import { useCategorias } from "@/hooks/useCategorias";

interface DatosCategoria {
  categoria: string;
  proyeccion: number;
  gasto: number;
  presupuesto?: number;
}

interface Partida {
  categoria: string;
  monto: number;
}

interface Proyeccion {
  partidas?: Partida[];
  partidas_json?: string;
  año?: number;
  mes?: number;
  trimestre?: number;
}

interface FacturaBackend {
  categoria?: string;
  subcategoria?: string;
  monto: number;
  subtotal?: number;
  estado: string;
  fecha_ingresada?: string;
  mes_asignado?: string;
  año_asignado?: number;
}

interface GraficaProyeccionVsGastoProps {
  año?: number;
  mes?: string;
  refreshTrigger?: number;
}

// Mapeo de meses para filtrado
const MESES = [
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

export default function GraficaProyeccionVsGasto({
  año,
  mes,
  refreshTrigger,
}: GraficaProyeccionVsGastoProps) {
  const { marcaSeleccionada } = useMarcaGlobal();
  const {
    nombresCategorias,
    subcategoriasPorCategoria,
    loading: loadingCategorias,
  } = useCategorias();
  const [datos, setDatos] = useState<DatosCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<
    string[]
  >([]);
  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<
    Record<string, string[]>
  >({});
  // Guardar facturas y proyecciones originales para recalcular
  const [facturasOriginales, setFacturasOriginales] = useState<
    FacturaBackend[]
  >([]);
  const [presupuestosPorCategoria, setPresupuestosPorCategoria] = useState<
    Record<string, number>
  >({});
  const [proyeccionesPorCategoria, setProyeccionesPorCategoria] = useState<
    Record<string, number>
  >({});
  // const [presupuestoAnual, setPresupuestoAnual] = useState<number>(0);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

        // Construir parámetros de consulta para presupuestos
        const presupuestosParams = new URLSearchParams();
        if (año) presupuestosParams.append("anio", año.toString());
        if (mes) {
          // Convertir nombre de mes a número
          const mesNumero = MESES.indexOf(mes) + 1;
          presupuestosParams.append("mes", mesNumero.toString());
        }
        // No filtrar por marca para sumar todas las agencias

        // Obtener todos los presupuestos relevantes
        const presupuestosRes = await fetchConToken(
          `${API_URL}/presupuesto?${presupuestosParams.toString()}`,
        );
        const presupuestosData = await presupuestosRes.json();
        // Estructura: [{categoria, monto, mes, anio, marca_id, ...}]

        // Mapear y sumar presupuestos por categoría
        const sumaPresupuestosPorCategoria: Record<string, number> = {};
        for (const p of presupuestosData) {
          if (!sumaPresupuestosPorCategoria[p.categoria]) {
            sumaPresupuestosPorCategoria[p.categoria] = 0;
          }
          sumaPresupuestosPorCategoria[p.categoria] += p.monto || 0;
        }

        // Obtener proyecciones
        const params = new URLSearchParams();
        if (marcaSeleccionada) params.append("marca", marcaSeleccionada);
        const resProyecciones = await fetchConToken(
          `${API_URL}/proyecciones?${params.toString()}`,
        );
        const proyeccionesData = await resProyecciones.json();
        let proyecciones: Proyeccion[] = Array.isArray(proyeccionesData)
          ? proyeccionesData
          : [];

        // Filtrar proyecciones por mes/año
        if (mes || año) {
          proyecciones = proyecciones.filter((proyeccion) => {
            const cumpleMes = mes
              ? proyeccion.mes === MESES.indexOf(mes) + 1
              : true;
            const cumpleAño = año ? proyeccion.año === año : true;
            return cumpleMes && cumpleAño;
          });
        }

        // Obtener facturas
        const resFacturas = await fetchConToken(
          `${API_URL}/facturas?${params.toString()}`,
        );
        const facturasData = await resFacturas.json();
        let facturas: FacturaBackend[] = Array.isArray(facturasData)
          ? facturasData
          : [];

        // Filtrar facturas por mes/año usando mes_asignado y año_asignado
        if (mes || año) {
          facturas = facturas.filter((factura) => {
            const mesFactura = factura.mes_asignado;
            const añoFactura = factura.año_asignado;
            const cumpleMes = mes ? mesFactura === mes : true;
            const cumpleAño = año ? añoFactura === año : true;
            return cumpleMes && cumpleAño;
          });
        }

        // Agrupar por categoría
        // Agrupar por categoría
        const categorias: { [key: string]: DatosCategoria } = {};

        // Procesar proyecciones
        proyecciones.forEach((proy) => {
          let partidas = proy.partidas;
          if (!partidas && proy.partidas_json) {
            try {
              partidas = JSON.parse(proy.partidas_json);
            } catch (error) {
              console.error("Error parseando partidas_json:", error);
            }
          }
          if (partidas) {
            partidas.forEach((partida) => {
              const cat = partida.categoria;
              if (!categorias[cat]) {
                categorias[cat] = {
                  categoria: cat,
                  proyeccion: 0,
                  gasto: 0,
                  presupuesto: 0,
                };
              }
              categorias[cat].proyeccion += partida.monto || 0;
            });
          }
        });

        // Procesar facturas (gastos) - facturas ingresadas y pagadas
        facturas.forEach((factura) => {
          const cat = factura.categoria;
          if (
            cat &&
            (factura.estado === "Ingresada" || factura.estado === "Pagada")
          ) {
            if (!categorias[cat]) {
              categorias[cat] = {
                categoria: cat,
                proyeccion: 0,
                gasto: 0,
                presupuesto: 0,
              };
            }
            categorias[cat].gasto += factura.subtotal || 0;
          }
        });

        // Asignar presupuesto sumado por categoría
        for (const cat of Object.keys(categorias)) {
          categorias[cat].presupuesto = sumaPresupuestosPorCategoria[cat] || 0;
        }

        // Guardar datos originales para recalcular con filtros de subcategorías
        setFacturasOriginales(facturas);
        setPresupuestosPorCategoria(sumaPresupuestosPorCategoria);

        // Guardar proyecciones por categoría
        const proyeccionesPorCat: Record<string, number> = {};
        Object.values(categorias).forEach((cat) => {
          proyeccionesPorCat[cat.categoria] = cat.proyeccion;
        });
        setProyeccionesPorCategoria(proyeccionesPorCat);

        setDatos(Object.values(categorias));
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [marcaSeleccionada, año, mes, refreshTrigger]);

  // Inicializar subcategorías seleccionadas cuando cambien las categorías
  useEffect(() => {
    if (Object.keys(subcategoriasPorCategoria).length === 0) return;

    const inicializarSubcategorias: Record<string, string[]> = {};
    Object.keys(subcategoriasPorCategoria).forEach((categoria) => {
      inicializarSubcategorias[categoria] = [
        ...subcategoriasPorCategoria[categoria],
      ];
    });
    setSubcategoriasSeleccionadas(inicializarSubcategorias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombresCategorias.join(",")]); // Solo reinicializar cuando cambien las categorías

  const toggleCategoria = (categoria: string) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(categoria)
        ? prev.filter((c) => c !== categoria)
        : [...prev, categoria],
    );
  };

  const toggleTodas = () => {
    if (categoriasSeleccionadas.length === nombresCategorias.length) {
      setCategoriasSeleccionadas([]);
    } else {
      setCategoriasSeleccionadas([...nombresCategorias]);
    }
  };

  const toggleSubcategoria = (categoria: string, subcategoria: string) => {
    setSubcategoriasSeleccionadas((prev) => {
      const subcatsActuales = prev[categoria] || [];
      const nuevasSubcats = subcatsActuales.includes(subcategoria)
        ? subcatsActuales.filter((s) => s !== subcategoria)
        : [...subcatsActuales, subcategoria];
      return { ...prev, [categoria]: nuevasSubcats };
    });
  };

  const toggleTodasSubcategorias = (categoria: string) => {
    setSubcategoriasSeleccionadas((prev) => {
      const todasSubcats = subcategoriasPorCategoria[categoria] || [];
      const subcatsActuales = prev[categoria] || [];
      const nuevasSubcats =
        subcatsActuales.length === todasSubcats.length ? [] : [...todasSubcats];
      return { ...prev, [categoria]: nuevasSubcats };
    });
  };

  // Recalcular datos filtrando por subcategorías seleccionadas
  const datosConSubcategorias = useMemo(() => {
    if (!facturasOriginales.length) return datos;

    const categorias: { [key: string]: DatosCategoria } = {};

    // Inicializar categorías con proyecciones y presupuestos
    Object.keys(proyeccionesPorCategoria).forEach((cat) => {
      categorias[cat] = {
        categoria: cat,
        proyeccion: proyeccionesPorCategoria[cat] || 0,
        gasto: 0,
        presupuesto: presupuestosPorCategoria[cat] || 0,
      };
    });

    // Calcular gasto solo de facturas con subcategorías seleccionadas
    facturasOriginales.forEach((factura) => {
      const cat = factura.categoria;
      if (
        cat &&
        (factura.estado === "Ingresada" || factura.estado === "Pagada")
      ) {
        // Verificar si la subcategoría está seleccionada
        const subcatsSeleccionadas = subcategoriasSeleccionadas[cat] || [];
        const subcatFactura = factura.subcategoria || "";

        // Si no hay subcategorías seleccionadas para esta categoría, o la subcategoría de la factura está seleccionada
        if (
          subcatsSeleccionadas.length === 0 ||
          subcatsSeleccionadas.includes(subcatFactura)
        ) {
          if (!categorias[cat]) {
            categorias[cat] = {
              categoria: cat,
              proyeccion: 0,
              gasto: 0,
              presupuesto: 0,
            };
          }
          categorias[cat].gasto += factura.subtotal || 0;
        }
      }
    });

    return Object.values(categorias);
  }, [
    facturasOriginales,
    subcategoriasSeleccionadas,
    proyeccionesPorCategoria,
    presupuestosPorCategoria,
    datos,
  ]);

  if (loading || loadingCategorias) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Crear datos para todas las categorías seleccionadas (incluso si están en 0)
  const datosFiltrados: typeof datos = [];
  for (const categoria of nombresCategorias) {
    if (categoriasSeleccionadas.includes(categoria)) {
      // Buscar si existe data real para esta categoría
      const dataExistente = datosConSubcategorias.find(
        (d) => d.categoria === categoria,
      );

      if (dataExistente) {
        datosFiltrados.push(dataExistente);
      } else {
        // Si no existe, crear entrada con valores en 0
        datosFiltrados.push({
          categoria,
          proyeccion: 0,
          gasto: 0,
          presupuesto: 0,
        });
      }
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Proyección vs Gasto por Categoría
        </h3>
      </div>

      {/* Selector de categorías */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-700">
            Selecciona Categorías:
          </label>
          <button
            onClick={toggleTodas}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {categoriasSeleccionadas.length === nombresCategorias.length
              ? "Deseleccionar todas"
              : "Seleccionar todas"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {nombresCategorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => toggleCategoria(categoria)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoriasSeleccionadas.includes(categoria)
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      {/* Mostrar gráficas solo si hay categorías seleccionadas */}
      {categoriasSeleccionadas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Selecciona una o más categorías para ver las gráficas
        </div>
      ) : (
        <div className="space-y-6">
          {datosFiltrados.map((item) => {
            const presupuesto = item.presupuesto ?? 0;
            const proyeccion = item.proyeccion;
            const gasto = item.gasto;

            // Determinar si el gasto sobrepasa el presupuesto
            const gastoSobrepasaPresupuesto = gasto > presupuesto;
            // Determinar si la proyección sobrepasa el presupuesto
            const proyeccionSobrepasaPresupuesto = proyeccion > presupuesto;

            // Base del 100%: el mayor entre proyección y presupuesto
            // Cuando proyección > presupuesto, la barra al 100% = proyección
            // Cuando presupuesto >= proyección, la barra al 100% = presupuesto
            // Si ambos son 0, usar el gasto como base para que la barra se muestre
            const base100Calc = Math.max(proyeccion, presupuesto);
            const base100 =
              base100Calc > 0 ? base100Calc : gasto > 0 ? gasto : 1;

            // Calcular porcentajes
            const porcentajeProyeccion =
              base100 > 0 ? (proyeccion / base100) * 100 : 0;
            const porcentajePresupuesto =
              base100 > 0 ? (presupuesto / base100) * 100 : 0;
            const porcentajeGastoTotal =
              base100 > 0 ? (gasto / base100) * 100 : 0;
            const porcentajeGastoRespProyeccion =
              proyeccion > 0 ? (gasto / proyeccion) * 100 : 0;

            // Calcular qué parte del gasto está dentro del presupuesto y cuál sobrepasa
            const gastoHastaPresupuesto = Math.min(gasto, presupuesto);
            const gastoSobrante = Math.max(0, gasto - presupuesto);
            const porcentajeGastoVerde =
              base100 > 0 ? (gastoHastaPresupuesto / base100) * 100 : 0;
            const porcentajeGastoRojo =
              base100 > 0 ? (gastoSobrante / base100) * 100 : 0;

            // Calcular si el gasto sobrepasa la proyección (para hacer rojo después de la línea azul)
            const gastoSobrepasaProyeccion = gasto > proyeccion;
            const gastoHastaProyeccion = Math.min(gasto, proyeccion);
            const porcentajeGastoHastaProyeccion =
              base100 > 0 ? (gastoHastaProyeccion / base100) * 100 : 0;
            const porcentajeGastoDespuesProyeccion =
              base100 > 0 ? ((gasto - proyeccion) / base100) * 100 : 0;

            return (
              <div key={item.categoria}>
                {/* Nombre de categoría y valores */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {item.categoria}
                  </span>
                  <div className="text-xs flex gap-4">
                    <span className="text-red-600 font-medium">
                      G: ${gasto.toLocaleString("es-MX")}
                    </span>
                    <span className="text-blue-600 font-medium">
                      P: ${proyeccion.toLocaleString("es-MX")}
                    </span>
                    <span className="text-gray-900 font-medium">
                      Pres: ${presupuesto.toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>

                {/* Barra única con los 3 componentes */}
                <div className="relative">
                  <div className="h-6 bg-gray-200 rounded-lg relative overflow-hidden">
                    {/* Gasto: dividido en verde (dentro límites) y rojo (sobrepasa) */}
                    {!gastoSobrepasaProyeccion ? (
                      // Caso normal: gasto no sobrepasa proyección
                      <>
                        {/* Gasto verde hasta presupuesto */}
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(porcentajeGastoVerde, 100)}%`,
                          }}
                        ></div>
                        {/* Gasto rojo que sobrepasa presupuesto (si existe) */}
                        {gastoSobrepasaPresupuesto && (
                          <div
                            className="absolute top-0 h-full bg-red-500 transition-all duration-500"
                            style={{
                              left: `${porcentajeGastoVerde}%`,
                              width: `${Math.min(porcentajeGastoRojo, 100 - porcentajeGastoVerde)}%`,
                            }}
                          ></div>
                        )}
                      </>
                    ) : (
                      // Caso cuando gasto sobrepasa proyección
                      <>
                        {/* Gasto verde/rojo hasta proyección (verde si está dentro presupuesto, puede tener ambos) */}
                        {!gastoSobrepasaPresupuesto ? (
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{
                              width: `${Math.min(porcentajeGastoHastaProyeccion, 100)}%`,
                            }}
                          ></div>
                        ) : (
                          <>
                            {/* Parte verde hasta presupuesto */}
                            <div
                              className="h-full bg-green-500 transition-all duration-500"
                              style={{
                                width: `${Math.min(porcentajeGastoVerde, 100)}%`,
                              }}
                            ></div>
                            {/* Parte roja entre presupuesto y proyección */}
                            <div
                              className="absolute top-0 h-full bg-red-500 transition-all duration-500"
                              style={{
                                left: `${porcentajeGastoVerde}%`,
                                width: `${Math.min(porcentajeGastoHastaProyeccion - porcentajeGastoVerde, 100 - porcentajeGastoVerde)}%`,
                              }}
                            ></div>
                          </>
                        )}
                        {/* Gasto rojo que sobrepasa la proyección */}
                        <div
                          className="absolute top-0 h-full bg-red-500 transition-all duration-500"
                          style={{
                            left: `${Math.min(porcentajeGastoHastaProyeccion, 100)}%`,
                            width: `${Math.min(Math.max(0, porcentajeGastoDespuesProyeccion), 100 - Math.min(porcentajeGastoHastaProyeccion, 100))}%`,
                          }}
                        ></div>
                      </>
                    )}

                    {/* Línea vertical azul (proyección) */}
                    {proyeccion > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-600 transition-all duration-500 z-10"
                        style={{
                          left: `${Math.min(porcentajeProyeccion, 100)}%`,
                        }}
                      ></div>
                    )}

                    {/* Línea vertical negra (presupuesto) - marca el presupuesto cuando la proyección lo sobrepasa */}
                    {proyeccionSobrepasaPresupuesto && presupuesto > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-black transition-all duration-500 z-10"
                        style={{
                          left: `${Math.min(porcentajePresupuesto, 100)}%`,
                        }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Filtros de subcategorías y porcentaje de gasto */}
                <div className="mt-2 flex justify-between items-start gap-4">
                  {/* Selectores de subcategorías */}
                  <div className="flex-1">
                    {subcategoriasPorCategoria[item.categoria] &&
                      subcategoriasPorCategoria[item.categoria].length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600">
                              Subcategorías:
                            </span>
                            <button
                              onClick={() =>
                                toggleTodasSubcategorias(item.categoria)
                              }
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {(
                                subcategoriasSeleccionadas[item.categoria] || []
                              ).length ===
                              subcategoriasPorCategoria[item.categoria].length
                                ? "Deseleccionar todas"
                                : "Seleccionar todas"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {subcategoriasPorCategoria[item.categoria].map(
                              (subcat) => (
                                <button
                                  key={subcat}
                                  onClick={() =>
                                    toggleSubcategoria(item.categoria, subcat)
                                  }
                                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                    (
                                      subcategoriasSeleccionadas[
                                        item.categoria
                                      ] || []
                                    ).includes(subcat)
                                      ? "bg-blue-500 text-white hover:bg-blue-600"
                                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                  }`}
                                >
                                  {subcat}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Indicador de porcentaje de gasto respecto a proyección */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-medium ${
                        gasto > proyeccion ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {proyeccion > 0
                        ? `Gasto: ${porcentajeGastoRespProyeccion.toFixed(1)}% de proyección`
                        : gasto > 0
                          ? "Gasto sin proyección"
                          : "Sin datos"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
