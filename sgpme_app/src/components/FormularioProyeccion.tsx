"use client";

import { useState, useEffect } from "react";
import { usePartidas } from "@/hooks/useProyecciones";
import { useCategoriasAPI } from "@/hooks/useCategoriasAPI";
import { Proyeccion, Partida, MESES, AÑOS } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { showToast } from "@/lib/toast";

interface FormularioProyeccionProps {
  proyeccionInicial?: Proyeccion;
  onSubmit: (datos: Omit<Proyeccion, "id" | "fechaCreacion">) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  proyeccionesExistentes?: Proyeccion[];
}

export default function FormularioProyeccion({
  proyeccionInicial,
  onSubmit,
  onCancel,
  loading = false,
  proyeccionesExistentes = [],
}: FormularioProyeccionProps) {
  const { marcasPermitidas } = useMarcaGlobal();
  const [año, setAño] = useState(
    proyeccionInicial?.año || new Date().getFullYear(),
  );
  const [mes, setMes] = useState(proyeccionInicial?.mes || "");
  const [marca, setMarca] = useState(proyeccionInicial?.marca || "");

  // Cargar categorías desde API
  const { cargarCategorias } = useCategoriasAPI();
  const [categorias, setCategorias] = useState<
    Array<{ nombre: string; subcategorias: string[] }>
  >([]);

  useEffect(() => {
    const cargarCategoriasPresupuesto = async () => {
      try {
        const cats = await cargarCategorias(true);
        setCategorias(
          cats.map((c) => ({
            nombre: c.nombre,
            subcategorias: c.subcategorias,
          })),
        );
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      }
    };
    cargarCategoriasPresupuesto();
  }, [cargarCategorias]);

  // Obtener meses ocupados para la agencia y año seleccionados
  const mesesOcupados = proyeccionesExistentes
    .filter(
      (p) =>
        p.marca === marca && p.año === año && p.id !== proyeccionInicial?.id,
    )
    .map((p) => p.mes);

  const [nuevaPartida, setNuevaPartida] = useState({
    categoria: "",
    subcategoria: "",
    monto: "",
    esReembolso: false,
    notas: "",
  });

  const [partidaEditando, setPartidaEditando] = useState<string | null>(null);

  const {
    partidas,
    agregarPartida,
    eliminarPartida,
    limpiarPartidas,
    calcularTotal,
    setPartidas,
  } = usePartidas();

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  // Estados para controlar qué categorías y subcategorías están expandidas
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(
    new Set(),
  );
  const [subcategoriasExpandidas, setSubcategoriasExpandidas] = useState<
    Set<string>
  >(new Set());

  const toggleCategoria = (categoria: string) => {
    setCategoriasExpandidas((prev) => {
      const newSet = new Set<string>();

      // Si la categoría ya estaba abierta, la cerramos (dejamos el set vacío)
      // Si no estaba abierta, solo abrimos esta (acordeón - solo una a la vez)
      if (!prev.has(categoria)) {
        newSet.add(categoria);
      }

      return newSet;
    });

    // Al cambiar de categoría, limpiar todas las subcategorías expandidas
    if (!categoriasExpandidas.has(categoria)) {
      setSubcategoriasExpandidas(new Set());
    }
  };

  const toggleSubcategoria = (key: string) => {
    setSubcategoriasExpandidas((prev) => {
      const newSet = new Set<string>();

      // Si la subcategoría ya estaba abierta, la cerramos (dejamos el set vacío)
      // Si no estaba abierta, solo abrimos esta (acordeón - solo una a la vez)
      if (!prev.has(key)) {
        newSet.add(key);
      }

      return newSet;
    });
  };

  // Debug: verificar meses ocupados
  useEffect(() => {
    console.log("📊 Proyecciones existentes:", proyeccionesExistentes.length);
    console.log("🏢 Marca seleccionada:", marca);
    console.log("📅 Año seleccionado:", año);
    console.log("🚫 Meses ocupados:", mesesOcupados);
  }, [marca, año, proyeccionesExistentes, mesesOcupados]);

  useEffect(() => {
    if (proyeccionInicial?.partidas) {
      // Desagrupar partidas antiguas que tengan múltiples subcategorías separadas por comas
      const partidasDesagrupadas: Partida[] = [];

      proyeccionInicial.partidas.forEach((partida) => {
        // Detectar si la subcategoría contiene múltiples valores separados por comas
        if (partida.subcategoria.includes(",")) {
          const subcategorias = partida.subcategoria
            .split(",")
            .map((s) => s.trim());
          // Dividir el monto equitativamente (para proyecciones antiguas)
          const montoPorSubcategoria = partida.monto / subcategorias.length;

          subcategorias.forEach((subcategoria, index) => {
            partidasDesagrupadas.push({
              id: `${partida.id}-${index}`,
              categoria: partida.categoria,
              subcategoria: subcategoria,
              monto: montoPorSubcategoria,
            });
          });
        } else {
          // Partida normal, agregar tal cual
          partidasDesagrupadas.push(partida);
        }
      });

      setPartidas(partidasDesagrupadas);
    }
  }, [proyeccionInicial, setPartidas]);

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!año) nuevosErrores.año = "El año es requerido";
    if (!mes) nuevosErrores.mes = "El mes es requerido";
    if (!marca) nuevosErrores.marca = "La agencia es requerida";
    if (partidas.length === 0)
      nuevosErrores.partidas = "Debe agregar al menos una partida";

    const montoTotal = calcularTotal();
    if (montoTotal <= 0)
      nuevosErrores.montoTotal = "El monto total debe ser mayor a 0";
    if (montoTotal > 50000000)
      nuevosErrores.montoTotal = "El monto total no puede exceder $50,000,000";

    partidas.forEach((partida, index) => {
      if (!partida.categoria)
        nuevosErrores[`partida-${index}-categoria`] = "Categoría requerida";
      if (!partida.subcategoria)
        nuevosErrores[`partida-${index}-subcategoria`] =
          "Subcategoría requerida";
      if (partida.monto <= 0)
        nuevosErrores[`partida-${index}-monto`] = "Monto debe ser mayor a 0";
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarAgregarPartida = () => {
    if (
      !nuevaPartida.categoria ||
      !nuevaPartida.subcategoria ||
      !nuevaPartida.monto
    ) {
      showToast("Por favor completa todos los campos de la partida", "error");
      return;
    }

    const monto = parseFloat(nuevaPartida.monto);

    if (isNaN(monto) || monto <= 0) {
      showToast("El monto debe ser un número válido mayor a 0", "error");
      return;
    }

    // Si estamos editando, actualizar la partida existente
    if (partidaEditando) {
      setPartidas(
        partidas.map((p) =>
          p.id === partidaEditando
            ? {
                ...p,
                categoria: nuevaPartida.categoria,
                subcategoria: nuevaPartida.subcategoria,
                monto: monto,
                esReembolso: nuevaPartida.esReembolso,
                notas: nuevaPartida.notas,
              }
            : p,
        ),
      );

      setPartidaEditando(null);
    } else {
      // Agregar nueva partida
      agregarPartida({
        categoria: nuevaPartida.categoria,
        subcategoria: nuevaPartida.subcategoria,
        monto: monto,
        esReembolso: nuevaPartida.esReembolso,
        notas: nuevaPartida.notas,
      });
    }

    setNuevaPartida({
      categoria: "",
      subcategoria: "",
      monto: "",
      esReembolso: false,
      notas: "",
    });
  };

  const manejarEditarPartida = (partida: Partida) => {
    setNuevaPartida({
      categoria: partida.categoria,
      subcategoria: partida.subcategoria,
      monto: partida.monto.toString(),
      esReembolso: partida.esReembolso || false,
      notas: partida.notas || "",
    });
    setPartidaEditando(partida.id);
  };

  const cancelarEdicion = () => {
    setNuevaPartida({
      categoria: "",
      subcategoria: "",
      monto: "",
      esReembolso: false,
      notas: "",
    });
    setPartidaEditando(null);
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setEnviando(true);

    try {
      // No agrupar partidas - guardar cada subcategoría individualmente
      const datosProyeccion = {
        año,
        mes,
        marca,
        montoTotal: calcularTotal(),
        partidas: partidas, // Guardar partidas tal como están
        estado: "pendiente" as const,
        excedePrespuesto: false,
      };

      await onSubmit(datosProyeccion);

      if (!proyeccionInicial) {
        setAño(new Date().getFullYear());
        setMes("");
        setMarca("");
        limpiarPartidas();
      }
    } catch (error) {
      console.error("Error al enviar formulario:", error);
    } finally {
      setEnviando(false);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={manejarSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agencia *
            </label>
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando || !!proyeccionInicial}
            >
              <option value="">Seleccionar agencia</option>
              {marcasPermitidas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errores.marca && (
              <p className="text-red-500 text-xs mt-1">{errores.marca}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año *
              </label>
              <select
                value={año}
                onChange={(e) => setAño(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={enviando || !marca || !!proyeccionInicial}
              >
                <option value="">Año</option>
                {AÑOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {errores.año && (
                <p className="text-red-500 text-xs mt-1">{errores.año}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes *
              </label>
              <select
                value={mes}
                onChange={(e) => {
                  const mesSeleccionado = e.target.value;
                  if (!mesesOcupados.includes(mesSeleccionado)) {
                    setMes(mesSeleccionado);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={enviando || !marca || !!proyeccionInicial}
              >
                <option value="">Mes</option>
                {MESES.map((m) => {
                  const estaOcupado = mesesOcupados.includes(m);
                  return (
                    <option
                      key={m}
                      value={m}
                      disabled={estaOcupado}
                      className={
                        estaOcupado ? "line-through text-gray-400" : ""
                      }
                    >
                      {m}
                    </option>
                  );
                })}
              </select>
              {errores.mes && (
                <p className="text-red-500 text-xs mt-1">{errores.mes}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">
              Monto Total:
            </span>
            <span className="text-2xl font-bold text-green-600">
              {formatearMonto(calcularTotal())}
            </span>
          </div>
          {errores.montoTotal && (
            <p className="text-red-500 text-sm mt-1">{errores.montoTotal}</p>
          )}
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Detalle de Partidas
          </h3>

          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3">
              Agregar Nueva Partida
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={nuevaPartida.categoria}
                  onChange={(e) => {
                    const nuevaCategoria = e.target.value;
                    setNuevaPartida((prev) => ({
                      ...prev,
                      categoria: nuevaCategoria,
                      // Solo resetear subcategoría si no está en la nueva categoría
                      subcategoria:
                        nuevaCategoria &&
                        categorias
                          .find((c) => c.nombre === nuevaCategoria)
                          ?.subcategorias.includes(prev.subcategoria)
                          ? prev.subcategoria
                          : "",
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  disabled={enviando}
                >
                  <option value="">Seleccionar</option>
                  {categorias.map((cat) => (
                    <option key={cat.nombre} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría
                </label>
                <select
                  value={nuevaPartida.subcategoria}
                  onChange={(e) =>
                    setNuevaPartida((prev) => ({
                      ...prev,
                      subcategoria: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  disabled={enviando || !nuevaPartida.categoria}
                >
                  <option value="">Seleccionar subcategoría</option>
                  {nuevaPartida.categoria &&
                    categorias
                      .find((c) => c.nombre === nuevaPartida.categoria)
                      ?.subcategorias.map((subcat) => (
                        <option key={subcat} value={subcat}>
                          {subcat}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <input
                  type="text"
                  value={
                    nuevaPartida.monto
                      ? new Intl.NumberFormat("es-MX").format(
                          Number(nuevaPartida.monto.replace(/,/g, "")),
                        )
                      : ""
                  }
                  onChange={(e) => {
                    const valor = e.target.value.replace(/,/g, "");
                    if (valor === "" || /^\d+$/.test(valor)) {
                      setNuevaPartida((prev) => ({
                        ...prev,
                        monto: valor,
                      }));
                    }
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  disabled={enviando}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="esReembolso"
                  checked={nuevaPartida.esReembolso}
                  onChange={(e) =>
                    setNuevaPartida((prev) => ({
                      ...prev,
                      esReembolso: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={enviando}
                />
                <label
                  htmlFor="esReembolso"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Partida a Reembolsar
                </label>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={nuevaPartida.notas}
                  onChange={(e) =>
                    setNuevaPartida((prev) => ({
                      ...prev,
                      notas: e.target.value,
                    }))
                  }
                  placeholder="Notas adicionales sobre esta partida (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 resize-none"
                  disabled={enviando}
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={manejarAgregarPartida}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  disabled={enviando}
                >
                  {partidaEditando ? "Actualizar" : "+ Agregar"}
                </button>
                {partidaEditando && (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium"
                    disabled={enviando}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          {partidas.length > 0 && (
            <div className="space-y-3">
              {/* Partidas Normales */}
              {partidas.filter((p) => !p.esReembolso).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800">
                    Partidas Agregadas (
                    {partidas.filter((p) => !p.esReembolso).length})
                  </h4>
                  <div className="space-y-2 mt-2">
                    {(() => {
                      const partidasNormales = partidas.filter(
                        (p) => !p.esReembolso,
                      );

                      // Agrupar por categoría (desde las partidas, no desde el API)
                      const porCategoria = partidasNormales.reduce(
                        (acc, p) => {
                          if (!acc[p.categoria]) acc[p.categoria] = [];
                          acc[p.categoria].push(p);
                          return acc;
                        },
                        {} as Record<string, Partida[]>,
                      );

                      return Object.entries(porCategoria).map(
                        ([categoria, partidasDeCategoria]) => {
                          const totalCategoria = partidasDeCategoria.reduce(
                            (sum, p) => sum + p.monto,
                            0,
                          );
                          const estaExpandida =
                            categoriasExpandidas.has(categoria);

                          // Agrupar partidas de esta categoría por subcategoría (desde las partidas)
                          const porSubcategoria: Record<string, Partida[]> = {};

                          partidasDeCategoria.forEach((partida) => {
                            if (!porSubcategoria[partida.subcategoria]) {
                              porSubcategoria[partida.subcategoria] = [];
                            }
                            porSubcategoria[partida.subcategoria].push(partida);
                          });

                          return (
                            <div
                              key={categoria}
                              className="border border-gray-300 rounded-lg overflow-hidden"
                            >
                              {/* Nivel 1: Categoría */}
                              <div
                                className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                                onClick={() => toggleCategoria(categoria)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {estaExpandida ? "▼" : "▶"}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {categoria}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    ({partidasDeCategoria.length} partida
                                    {partidasDeCategoria.length !== 1
                                      ? "s"
                                      : ""}
                                    )
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900">
                                  {formatearMonto(totalCategoria)}
                                </span>
                              </div>

                              {/* Nivel 2: Subcategorías */}
                              {estaExpandida && (
                                <div className="bg-white">
                                  {Object.entries(porSubcategoria).map(
                                    ([subcategoria, partidasSubcat]) => {
                                      const totalSubcategoria =
                                        partidasSubcat.reduce(
                                          (sum, p) => sum + p.monto,
                                          0,
                                        );
                                      const keySubcat = `${categoria}-${subcategoria}`;
                                      const estaExpandidaSubcat =
                                        subcategoriasExpandidas.has(keySubcat);

                                      return (
                                        <div
                                          key={keySubcat}
                                          className="border-t border-gray-200"
                                        >
                                          {/* Header de Subcategoría */}
                                          <div
                                            className="bg-gray-50 p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                                            onClick={() =>
                                              toggleSubcategoria(keySubcat)
                                            }
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm">
                                                {estaExpandidaSubcat
                                                  ? "▼"
                                                  : "▶"}
                                              </span>
                                              <span className="font-medium text-gray-800">
                                                {subcategoria}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                ({partidasSubcat.length} partida
                                                {partidasSubcat.length !== 1
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
                                          {estaExpandidaSubcat && (
                                            <div className="bg-white">
                                              {partidasSubcat.map((partida) => (
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
                                                          {partida.notas}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="ml-4 flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          manejarEditarPartida(
                                                            partida,
                                                          )
                                                        }
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                        disabled={enviando}
                                                      >
                                                        Editar
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          eliminarPartida(
                                                            partida.id,
                                                          )
                                                        }
                                                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                        disabled={enviando}
                                                      >
                                                        Eliminar
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
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
                        },
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Partidas a Reembolsar */}
              {partidas.filter((p) => p.esReembolso).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-800 flex items-center">
                    💰 Partidas a Reembolsar (
                    {partidas.filter((p) => p.esReembolso).length})
                  </h4>
                  <div className="space-y-2 mt-2">
                    {(() => {
                      const partidasReembolso = partidas.filter(
                        (p) => p.esReembolso,
                      );

                      // Agrupar por categoría (desde las partidas, no desde el API)
                      const porCategoria = partidasReembolso.reduce(
                        (acc, p) => {
                          if (!acc[p.categoria]) acc[p.categoria] = [];
                          acc[p.categoria].push(p);
                          return acc;
                        },
                        {} as Record<string, Partida[]>,
                      );

                      return Object.entries(porCategoria).map(
                        ([categoria, partidasDeCategoria]) => {
                          const totalCategoria = partidasDeCategoria.reduce(
                            (sum, p) => sum + p.monto,
                            0,
                          );
                          const keyCategoria = `reembolso-${categoria}`;
                          const estaExpandida =
                            categoriasExpandidas.has(keyCategoria);

                          // Agrupar partidas de esta categoría por subcategoría (desde las partidas)
                          const porSubcategoria: Record<string, Partida[]> = {};

                          partidasDeCategoria.forEach((partida) => {
                            if (!porSubcategoria[partida.subcategoria]) {
                              porSubcategoria[partida.subcategoria] = [];
                            }
                            porSubcategoria[partida.subcategoria].push(partida);
                          });

                          return (
                            <div
                              key={keyCategoria}
                              className="border border-amber-300 rounded-lg overflow-hidden bg-amber-50"
                            >
                              {/* Nivel 1: Categoría */}
                              <div
                                className="bg-amber-100 p-3 flex justify-between items-center cursor-pointer hover:bg-amber-200"
                                onClick={() => toggleCategoria(keyCategoria)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {estaExpandida ? "▼" : "▶"}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {categoria}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    ({partidasDeCategoria.length} partida
                                    {partidasDeCategoria.length !== 1
                                      ? "s"
                                      : ""}
                                    )
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900">
                                  {formatearMonto(totalCategoria)}
                                </span>
                              </div>

                              {/* Nivel 2: Subcategorías */}
                              {estaExpandida && (
                                <div className="bg-amber-50">
                                  {Object.entries(porSubcategoria).map(
                                    ([subcategoria, partidasSubcat]) => {
                                      const totalSubcategoria =
                                        partidasSubcat.reduce(
                                          (sum, p) => sum + p.monto,
                                          0,
                                        );
                                      const keySubcat = `reembolso-${categoria}-${subcategoria}`;
                                      const estaExpandidaSubcat =
                                        subcategoriasExpandidas.has(keySubcat);

                                      return (
                                        <div
                                          key={keySubcat}
                                          className="border-t border-amber-200"
                                        >
                                          {/* Header de Subcategoría */}
                                          <div
                                            className="bg-amber-50 p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-amber-100"
                                            onClick={() =>
                                              toggleSubcategoria(keySubcat)
                                            }
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm">
                                                {estaExpandidaSubcat
                                                  ? "▼"
                                                  : "▶"}
                                              </span>
                                              <span className="font-medium text-gray-800">
                                                {subcategoria}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                ({partidasSubcat.length} partida
                                                {partidasSubcat.length !== 1
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
                                          {estaExpandidaSubcat && (
                                            <div className="bg-white">
                                              {partidasSubcat.map((partida) => (
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
                                                          {partida.notas}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="ml-4 flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          manejarEditarPartida(
                                                            partida,
                                                          )
                                                        }
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                        disabled={enviando}
                                                      >
                                                        Editar
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          eliminarPartida(
                                                            partida.id,
                                                          )
                                                        }
                                                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                        disabled={enviando}
                                                      >
                                                        Eliminar
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
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
                        },
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {errores.partidas && (
            <p className="text-red-500 text-sm mt-2">{errores.partidas}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={enviando || loading}
          >
            {enviando || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {proyeccionInicial ? "Actualizando..." : "Guardando..."}
              </>
            ) : proyeccionInicial ? (
              "Actualizar Proyección"
            ) : (
              "Guardar Proyección"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
