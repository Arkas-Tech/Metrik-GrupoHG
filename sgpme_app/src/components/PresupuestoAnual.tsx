"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchConToken } from "@/lib/auth-utils";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface PresupuestoAnualProps {
  año: number;
  esAdmin: boolean;
}

interface PresupuestoData {
  id: number;
  año: number;
  marca_id: number;
  marca_nombre: string;
  monto: number;
  fecha_modificacion: string;
  modificado_por: string;
}

interface MarcaOption {
  id: number;
  cuenta: string;
}

export default function PresupuestoAnual({
  año,
  esAdmin,
}: PresupuestoAnualProps) {
  const { marcaSeleccionada } = useMarcaGlobal();
  const [presupuesto, setPresupuesto] = useState<number | null>(null);
  const [presupuestos, setPresupuestos] = useState<PresupuestoData[]>([]);
  const [marcasDisponibles, setMarcasDisponibles] = useState<MarcaOption[]>([]);
  const [editando, setEditando] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [marcaSeleccionadaEdicion, setMarcaSeleccionadaEdicion] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar marcas disponibles
  useEffect(() => {
    const cargarMarcas = async () => {
      try {
        const response = await fetchConToken(`${API_URL}/marcas/marca/`);
        if (response.ok) {
          const data = await response.json();
          setMarcasDisponibles(data);
        }
      } catch (error) {
        console.error("Error cargando marcas:", error);
      }
    };
    cargarMarcas();
  }, []);

  const cargarPresupuesto = useCallback(async () => {
    try {
      console.log(`🔄 Cargando presupuesto para año ${año}...`);

      // Si hay marca seleccionada, obtener presupuesto específico
      if (marcaSeleccionada) {
        const marca = marcasDisponibles.find(
          (m) => m.cuenta === marcaSeleccionada,
        );
        if (!marca) {
          setPresupuesto(null);
          return;
        }

        const response = await fetchConToken(
          `${API_URL}/presupuesto/${año}?marca_id=${marca.id}`,
        );

        if (response.ok) {
          const data = await response.json();
          console.log(
            `✅ Presupuesto cargado para ${marcaSeleccionada}:`,
            data,
          );
          if (data.length > 0) {
            setPresupuesto(data[0].monto);
            setPresupuestos(data);
          } else {
            setPresupuesto(null);
            setPresupuestos([]);
          }
        } else if (response.status === 404) {
          console.log(
            `⚠️ No existe presupuesto para ${marcaSeleccionada} en ${año}`,
          );
          setPresupuesto(null);
          setPresupuestos([]);
        }
      } else {
        // Sin filtro: obtener suma total
        const responseSuma = await fetchConToken(
          `${API_URL}/presupuesto/${año}/suma`,
        );

        if (responseSuma.ok) {
          const data = await responseSuma.json();
          console.log(`✅ Suma total cargada:`, data);

          // Si monto_total es 0, significa que no hay presupuestos
          if (data.monto_total === 0) {
            console.log(`⚠️ No hay presupuestos para ${año}`);
            setPresupuesto(null);
            setPresupuestos([]);
          } else {
            setPresupuesto(data.monto_total);

            // Solo admins pueden cargar todos los presupuestos para el desglose
            if (esAdmin) {
              const responseAll = await fetchConToken(
                `${API_URL}/presupuesto/${año}`,
              );
              if (responseAll.ok) {
                const allData = await responseAll.json();
                setPresupuestos(allData);
              }
            } else {
              // No-admins no ven el desglose
              setPresupuestos([]);
            }
          }
        } else {
          console.error(`❌ Error cargando suma: ${responseSuma.status}`);
          setPresupuesto(null);
          setPresupuestos([]);
        }
      }
    } catch (error) {
      console.error("❌ Error cargando presupuesto:", error);
    }
  }, [año, marcaSeleccionada, marcasDisponibles, esAdmin]);

  useEffect(() => {
    if (marcasDisponibles.length > 0) {
      cargarPresupuesto();
    }
  }, [cargarPresupuesto, marcasDisponibles]);

  const guardarPresupuesto = async () => {
    if (!nuevoMonto || parseFloat(nuevoMonto) <= 0) {
      setError("Ingresa un monto válido");
      return;
    }

    if (!marcaSeleccionadaEdicion) {
      setError("Selecciona una agencia");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchConToken(`${API_URL}/presupuesto/`, {
        method: "POST",
        body: JSON.stringify({
          año: año,
          marca_id: marcaSeleccionadaEdicion,
          monto: parseFloat(nuevoMonto),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Presupuesto guardado exitosamente:`, data);
        setEditando(false);
        setNuevoMonto("");
        setMarcaSeleccionadaEdicion(null);
        // Recargar presupuesto para asegurar que se muestra correctamente
        await cargarPresupuesto();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Error al guardar presupuesto");
      }
    } catch (error) {
      console.error("Error guardando presupuesto:", error);
      setError("Error al guardar presupuesto");
    } finally {
      setLoading(false);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const eliminarPresupuesto = async (
    presupuestoId: number,
    marcaNombre: string,
  ) => {
    if (
      !confirm(`¿Estás seguro de eliminar el presupuesto de ${marcaNombre}?`)
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchConToken(
        `${API_URL}/presupuesto/${presupuestoId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok || response.status === 204) {
        console.log(`✅ Presupuesto eliminado exitosamente`);
        await cargarPresupuesto();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Error al eliminar presupuesto");
      }
    } catch (error) {
      console.error("Error eliminando presupuesto:", error);
      setError("Error al eliminar presupuesto");
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = () => {
    // Si hay una marca seleccionada, pre-cargar sus datos
    if (marcaSeleccionada) {
      const marca = marcasDisponibles.find(
        (m) => m.cuenta === marcaSeleccionada,
      );
      if (marca) {
        setMarcaSeleccionadaEdicion(marca.id);
        const presupuestoMarca = presupuestos.find(
          (p) => p.marca_id === marca.id,
        );
        setNuevoMonto(presupuestoMarca?.monto.toString() || "");
      }
    }
    setEditando(true);
    setError("");
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setNuevoMonto("");
    setMarcaSeleccionadaEdicion(null);
    setError("");
  };

  const obtenerTextoPresupuesto = () => {
    if (marcaSeleccionada) {
      return `Presupuesto ${año} - ${marcaSeleccionada}`;
    }
    return `Presupuesto ${año} (Total)`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center gap-10">
        <h3 className="text-xl font-bold text-gray-800 flex-1">
          {obtenerTextoPresupuesto()}
        </h3>

        <div className="flex items-center gap-8">
          {!editando && (
            <span className="text-lg font-bold text-blue-600">
              {presupuesto !== null
                ? formatearMonto(presupuesto)
                : "No definido"}
            </span>
          )}

          {editando ? (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={marcaSeleccionadaEdicion || ""}
                onChange={(e) =>
                  setMarcaSeleccionadaEdicion(Number(e.target.value))
                }
                className="px-3 py-2 border border-gray-300 rounded-md w-56 text-gray-900"
                disabled={loading}
              >
                <option value="">Seleccionar agencia</option>
                {marcasDisponibles.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.cuenta}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                placeholder="Monto"
                className="px-3 py-2 border border-gray-300 rounded-md w-48 text-gray-900"
                disabled={loading}
              />
              <button
                onClick={guardarPresupuesto}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={cancelarEdicion}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          ) : (
            esAdmin && (
              <button
                onClick={iniciarEdicion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Editar
              </button>
            )
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {esAdmin && !marcaSeleccionada && presupuestos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Presupuestos por agencia ({presupuestos.length}):
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {presupuestos.map((p) => (
              <div
                key={p.id}
                className="bg-gray-50 p-2 rounded flex items-center justify-between group"
              >
                <div>
                  <span className="font-medium text-gray-700">
                    {p.marca_nombre}
                  </span>
                  <span className="text-blue-600 ml-2">
                    {formatearMonto(p.monto)}
                  </span>
                </div>
                <button
                  onClick={() => eliminarPresupuesto(p.id, p.marca_nombre)}
                  disabled={loading}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 font-bold ml-2 disabled:opacity-50"
                  title="Eliminar presupuesto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
