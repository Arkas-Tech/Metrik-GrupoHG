"use client";

import { useEffect, useState } from "react";
import { Evento } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

interface GraficaPresupuestoVsGastoProps {
  eventos: Evento[];
  gastoReal?: number; // Recibir el gasto real ya calculado
  titulo?: string;
  tipoCalendario?: "mensual" | "trimestral" | "anual";
  año?: number;
  mes?: number;
  trimestre?: number;
}

interface Proyeccion {
  partidas?: Array<{ categoria: string; monto: number }>;
  partidas_json?: string;
  año?: number;
  mes?: number;
  trimestre?: number;
}

export default function GraficaPresupuestoVsGasto({
  eventos,
  gastoReal = 0,
  titulo = "Presupuesto vs Gasto",
  tipoCalendario = "mensual",
  año,
  mes,
  trimestre,
}: GraficaPresupuestoVsGastoProps) {
  const { marcaSeleccionada, filtraPorMarca } = useMarcaGlobal();
  const [presupuestoEventos, setPresupuestoEventos] = useState<number>(0);
  const [proyeccionEventos, setProyeccionEventos] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [categoriaEventos, setCategoriaEventos] = useState<string>("Eventos");

  // Obtener presupuesto y proyección de Eventos
  useEffect(() => {
    const cargarDatosEventos = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

        // Obtener la categoría de eventos dinámicamente (posición 5)
        try {
          const categoriasRes = await fetchConToken(
            `${API_URL}/categorias/?activo=true`,
          );
          const categorias = await categoriasRes.json();
          // Ordenar por orden y tomar la 5ta (índice 4)
          const categoriasOrdenadas = categorias.sort(
            (a: { orden: number }, b: { orden: number }) => a.orden - b.orden,
          );
          if (categoriasOrdenadas.length >= 5) {
            setCategoriaEventos(categoriasOrdenadas[4].nombre);
            console.log(
              `🎯 Categoría de Eventos detectada: ${categoriasOrdenadas[4].nombre}`,
            );
          }
        } catch (error) {
          console.error(
            "Error obteniendo categorías, usando 'Eventos' por defecto:",
            error,
          );
        }

        // Obtener marca_id si hay marca seleccionada
        let marcaId = null;
        if (marcaSeleccionada) {
          try {
            const marcasRes = await fetchConToken(`${API_URL}/marcas/marca/`);
            const marcas = await marcasRes.json();
            const marca = marcas.find(
              (m: { cuenta: string; id: number }) =>
                m.cuenta === marcaSeleccionada,
            );
            if (marca) {
              marcaId = marca.id;
              console.log(
                `🏢 Marca encontrada: ${marcaSeleccionada} (ID: ${marcaId})`,
              );
            }
          } catch (error) {
            console.error("Error obteniendo marcas:", error);
          }
        }

        // Construir parámetros para presupuesto
        const presupuestoParams = new URLSearchParams();
        if (marcaId) presupuestoParams.append("marca_id", marcaId.toString());
        if (año) presupuestoParams.append("anio", año.toString());
        presupuestoParams.append("categoria", categoriaEventos);

        if (tipoCalendario === "mensual" && mes !== undefined) {
          presupuestoParams.append("mes", mes.toString());
        }

        console.log(
          `🔍 Buscando presupuesto ${categoriaEventos} con parámetros:`,
          presupuestoParams.toString(),
        );

        // Obtener presupuesto de Eventos
        const presupuestoResponse = await fetchConToken(
          `${API_URL}/presupuesto?${presupuestoParams.toString()}`,
        );

        let presupuestoTotal = 0;
        if (presupuestoResponse && presupuestoResponse.ok) {
          const presupuestoDataRaw = await presupuestoResponse.json();
          // Filtrar por agencias permitidas del usuario
          const presupuestoData = Array.isArray(presupuestoDataRaw)
            ? presupuestoDataRaw.filter((p: any) =>
                filtraPorMarca(p.marca_nombre),
              )
            : presupuestoDataRaw;
          console.log(`📋 Datos de presupuesto recibidos:`, presupuestoData);

          if (tipoCalendario === "trimestral" && trimestre) {
            // Para trimestral, sumar todos los registros de los 3 meses del trimestre
            const mesesTrimestre = [
              (trimestre - 1) * 3 + 1,
              (trimestre - 1) * 3 + 2,
              (trimestre - 1) * 3 + 3,
            ];
            presupuestoTotal = presupuestoData
              .filter((p: { mes: number }) => mesesTrimestre.includes(p.mes))
              .reduce((sum: number, p: { monto: number }) => sum + (p.monto || 0), 0);
          } else if (tipoCalendario === "anual") {
            // Para anual, sumar todos los meses del año
            presupuestoTotal = presupuestoData.reduce(
              (sum: number, p: { monto: number }) => sum + (p.monto || 0),
              0,
            );
          } else {
            // Para mensual: sumar todos los registros del mes (una entrada por agencia cuando es "Todas")
            presupuestoTotal = Array.isArray(presupuestoData)
              ? presupuestoData.reduce(
                  (sum: number, p: { monto: number }) => sum + (p.monto || 0),
                  0,
                )
              : 0;
          }
        }

        console.log(
          `💰 Presupuesto ${categoriaEventos} total (${tipoCalendario}):`,
          presupuestoTotal,
        );

        // Construir parámetros para proyecciones
        const proyeccionParams = new URLSearchParams();
        if (marcaSeleccionada)
          proyeccionParams.append("marca", marcaSeleccionada);

        // Obtener proyecciones
        const proyeccionesResponse = await fetchConToken(
          `${API_URL}/proyecciones?${proyeccionParams.toString()}`,
        );

        let proyeccionTotal = 0;
        if (proyeccionesResponse && proyeccionesResponse.ok) {
          const proyeccionesData = await proyeccionesResponse.json();
          console.log(`📋 Datos de proyecciones recibidos:`, proyeccionesData);
          let proyecciones: Proyeccion[] = Array.isArray(proyeccionesData)
            ? proyeccionesData.filter((p: Proyeccion) =>
                filtraPorMarca(p.marca),
              )
            : [];

          // Filtrar proyecciones según el tipo de calendario
          proyecciones = proyecciones.filter((proyeccion) => {
            if (!año || proyeccion.año !== año) return false;

            if (tipoCalendario === "mensual") {
              return mes !== undefined ? proyeccion.mes === mes : true;
            } else if (tipoCalendario === "trimestral" && trimestre) {
              const mesesTrimestre = [
                (trimestre - 1) * 3 + 1,
                (trimestre - 1) * 3 + 2,
                (trimestre - 1) * 3 + 3,
              ];
              return proyeccion.mes
                ? mesesTrimestre.includes(proyeccion.mes)
                : false;
            }
            return true; // Para anual, incluir todas las proyecciones del año
          });

          // Calcular proyección total de Eventos
          console.log(
            `🔍 Proyecciones filtradas encontradas: ${proyecciones.length}`,
          );
          proyecciones.forEach((proyeccion, index) => {
            let partidas: Array<{ categoria: string; monto: number }> = [];

            if (proyeccion.partidas_json) {
              try {
                partidas = JSON.parse(proyeccion.partidas_json);
              } catch (error) {
                console.error("Error parsing partidas_json:", error);
                partidas = proyeccion.partidas || [];
              }
            } else {
              partidas = proyeccion.partidas || [];
            }

            console.log(`📊 Proyección ${index + 1} - Partidas:`, partidas);

            partidas.forEach((partida) => {
              console.log(
                `🏷️ Verificando partida: "${partida.categoria}" === "${categoriaEventos}"`,
              );
              if (partida.categoria === categoriaEventos) {
                proyeccionTotal += partida.monto || 0;
                console.log(
                  `✅ Partida de ${categoriaEventos} encontrada: $${partida.monto}`,
                );
              }
            });
          });
        }

        console.log(
          `📊 Proyección ${categoriaEventos} total (${tipoCalendario}):`,
          proyeccionTotal,
        );

        console.log(`📊 RESUMEN FINAL:`);
        console.log(`💰 Presupuesto ${categoriaEventos}: $${presupuestoTotal}`);
        console.log(`📈 Proyección ${categoriaEventos}: $${proyeccionTotal}`);
        console.log(`💸 Gasto Real (Eventos): $${gastoReal}`);
        console.log(`🏢 Marca seleccionada: ${marcaSeleccionada}`);
        console.log(
          `📅 Período: ${tipoCalendario} - Año: ${año}, Mes: ${mes}, Trimestre: ${trimestre}`,
        );

        setPresupuestoEventos(presupuestoTotal);
        setProyeccionEventos(proyeccionTotal);
      } catch (error) {
        console.error(`Error cargando datos de ${categoriaEventos}:`, error);
        setPresupuestoEventos(0);
        setProyeccionEventos(0);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosEventos();
  }, [
    marcaSeleccionada,
    filtraPorMarca,
    año,
    mes,
    trimestre,
    tipoCalendario,
    gastoReal,
    categoriaEventos,
  ]);

  // Usar gasto real recibido como prop
  const gastoTotal = gastoReal;

  // Debug final de cálculos
  console.log(`🧮 CÁLCULOS FINALES:`);
  console.log(`💰 Presupuesto ${categoriaEventos}: $${presupuestoEventos}`);
  console.log(`📊 Proyección ${categoriaEventos}: $${proyeccionEventos}`);
  console.log(`💸 Gasto Real (Facturas Ingresadas): $${gastoTotal}`);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{titulo}</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Cálculos para la barra única
  const presupuesto = presupuestoEventos;
  const proyeccion = proyeccionEventos;
  const gasto = gastoTotal;

  // Determinar si el gasto sobrepasa el presupuesto
  const gastoSobrepasaPresupuesto = gasto > presupuesto && presupuesto > 0;

  // Determinar la base del 100%
  const base100 = gastoSobrepasaPresupuesto
    ? Math.max(proyeccion, gasto)
    : presupuesto;

  // Calcular porcentajes
  const porcentajeProyeccionEnBarra =
    base100 > 0 ? (proyeccion / base100) * 100 : 0;
  const porcentajePresupuestoEnBarra =
    base100 > 0 ? (presupuesto / base100) * 100 : 0;
  const porcentajeGastoRespProyeccion =
    proyeccion > 0 ? (gasto / proyeccion) * 100 : 0;

  // Calcular gasto verde y rojo
  const gastoHastaPresupuesto = Math.min(gasto, presupuesto);
  const porcentajeGastoVerde =
    base100 > 0 ? (gastoHastaPresupuesto / base100) * 100 : 0;

  // Calcular si el gasto sobrepasa la proyección
  const gastoSobrepasaProyeccion = gasto > proyeccion;
  const gastoHastaProyeccion = Math.min(gasto, proyeccion);
  const porcentajeGastoHastaProyeccion =
    base100 > 0 ? (gastoHastaProyeccion / base100) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{titulo}</h3>

      <div className="space-y-6">
        {/* Valores encima de la barra */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {categoriaEventos}
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

        {/* Barra única con los componentes */}
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
                      width: `${Math.min(porcentajeGastoHastaProyeccion - porcentajeGastoVerde, 100 - porcentajeGastoVerde)}%`,
                    }}
                  ></div>
                )}
              </>
            ) : (
              // Caso cuando gasto sobrepasa proyección
              <>
                {/* Gasto verde/rojo hasta proyección */}
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
                    width: `${Math.min(Math.max(0, ((gasto - proyeccion) / base100) * 100), 100 - Math.min(porcentajeGastoHastaProyeccion, 100))}%`,
                  }}
                ></div>
              </>
            )}

            {/* Línea vertical azul (proyección) */}
            {proyeccion > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600 transition-all duration-500 z-10"
                style={{
                  left: `${Math.min(porcentajeProyeccionEnBarra, 100)}%`,
                }}
              ></div>
            )}

            {/* Línea vertical negra (presupuesto) - solo si gasto sobrepasa presupuesto */}
            {gastoSobrepasaPresupuesto && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black transition-all duration-500 z-10"
                style={{
                  left: `${Math.min(porcentajePresupuestoEnBarra, 100)}%`,
                }}
              ></div>
            )}
          </div>
        </div>

        {/* Indicador de porcentaje */}
        <div className="text-right">
          <span
            className={`text-xs font-medium ${
              gasto > proyeccion ? "text-red-600" : "text-green-600"
            }`}
          >
            Gasto: {porcentajeGastoRespProyeccion.toFixed(1)}% de proyección
          </span>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Disponible</p>
            <p
              className={`text-lg font-bold ${
                presupuesto - proyeccion >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {presupuesto - proyeccion < 0 && "-"}$
              {Math.abs(presupuesto - proyeccion).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">% Utilizado</p>
            <p
              className={`text-lg font-bold ${
                (presupuesto > 0 ? (gasto / presupuesto) * 100 : 0) > 100
                  ? "text-red-600"
                  : (presupuesto > 0 ? (gasto / presupuesto) * 100 : 0) > 80
                    ? "text-yellow-600"
                    : "text-green-600"
              }`}
            >
              {(presupuesto > 0 ? (gasto / presupuesto) * 100 : 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Eventos</p>
            <p className="text-lg font-bold text-gray-900">{eventos.length}</p>
          </div>
        </div>

        {/* Alerta si se excede el presupuesto */}
        {proyeccion > presupuesto && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ La proyección ha excedido el presupuesto por $
              {Math.abs(presupuesto - proyeccion).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
