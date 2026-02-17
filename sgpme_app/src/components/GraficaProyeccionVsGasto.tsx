"use client";

import { useEffect, useState } from "react";
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
  monto: number;
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
  const { nombresCategorias, loading: loadingCategorias } = useCategorias();
  const [datos, setDatos] = useState<DatosCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<
    string[]
  >([]);
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
            categorias[cat].gasto += factura.monto || 0;
          }
        });

        // Asignar presupuesto sumado por categoría
        for (const cat of Object.keys(categorias)) {
          categorias[cat].presupuesto = sumaPresupuestosPorCategoria[cat] || 0;
        }

        setDatos(Object.values(categorias));
        setDatos(Object.values(categorias));
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [marcaSeleccionada, año, mes, refreshTrigger]);

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
      const dataExistente = datos.find((d) => d.categoria === categoria);

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
            const gastoSobrepasaPresupuesto =
              gasto > presupuesto && presupuesto > 0;

            // Determinar la base del 100%: proyección si gasto sobrepasa presupuesto, sino presupuesto
            const base100 = gastoSobrepasaPresupuesto
              ? proyeccion
              : presupuesto;

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

                    {/* Línea vertical negra (presupuesto) - solo si gasto sobrepasa presupuesto */}
                    {gastoSobrepasaPresupuesto && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-black transition-all duration-500 z-10"
                        style={{
                          left: `${Math.min(porcentajePresupuesto, 100)}%`,
                        }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Indicador de porcentaje de gasto respecto a proyección */}
                <div className="mt-1 text-right">
                  <span
                    className={`text-xs font-medium ${
                      gasto > proyeccion ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    Gasto: {porcentajeGastoRespProyeccion.toFixed(1)}% de
                    proyección
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
