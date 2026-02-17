"use client";

import { useState, useEffect } from "react";
import { Factura, FiltrosFactura, MESES, AÑOS } from "@/types";
import { useCategorias } from "@/hooks/useCategorias";
import DateInput from "./DateInput";

interface FiltrosFacturasProps {
  onFiltrosChange: (filtros: FiltrosFactura) => void;
  facturas: Factura[];
  filtros?: FiltrosFactura;
}

export default function FiltrosFacturas({
  onFiltrosChange,
  facturas,
  filtros: filtrosExternos,
}: FiltrosFacturasProps) {
  const { nombresCategorias, loading: loadingCategorias } = useCategorias();

  // Obtener mes y año actual
  const mesActual = MESES[new Date().getMonth()];
  const añoActual = new Date().getFullYear();

  const [filtros, setFiltros] = useState<FiltrosFactura>(
    filtrosExternos || {
      estado: "Todas",
      busqueda: "",
      mes: mesActual,
      año: añoActual,
    },
  );

  // Aplicar filtros predeterminados al montar el componente
  useEffect(() => {
    if (!filtrosExternos) {
      onFiltrosChange({
        estado: "Todas",
        busqueda: "",
        mes: mesActual,
        año: añoActual,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  const handleFiltroChange = (
    campo: keyof FiltrosFactura,
    valor: string | number | undefined,
  ) => {
    const nuevosFiltros = { ...filtros, [campo]: valor };
    setFiltros(nuevosFiltros);
    onFiltrosChange(nuevosFiltros);
  };

  const toggleEstadoSeleccionado = (estado: Factura["estado"]) => {
    const estadosActuales = filtros.estadosMultiples || [];
    // Si el estado ya está activo, desactivarlo; si no, activar solo ese estado
    const nuevosEstados = estadosActuales.includes(estado) ? [] : [estado];

    // Actualizar filtros
    const nuevosFiltros = {
      ...filtros,
      estadosMultiples: nuevosEstados,
      estado: nuevosEstados.length === 0 ? "Todas" : filtros.estado,
    };
    setFiltros(nuevosFiltros);
    onFiltrosChange(nuevosFiltros);
  };

  const limpiarFiltrosEstados = () => {
    const nuevosFiltros = {
      ...filtros,
      estadosMultiples: [],
      estado: "Todas" as const,
    };
    setFiltros(nuevosFiltros);
    onFiltrosChange(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosFactura = {
      estado: "Todas",
      busqueda: "",
      estadosMultiples: [],
    };
    setFiltros(filtrosLimpios);
    onFiltrosChange(filtrosLimpios);
    setMostrarFiltrosAvanzados(false);
  };

  // Filtrar facturas por mes, año y categoría para las estadísticas
  const facturasParaEstadisticas = facturas.filter((factura) => {
    // Filtrar por año
    if (filtros.año) {
      const añoFactura = factura.fechaIngresada
        ? new Date(factura.fechaIngresada).getFullYear()
        : factura.añoAsignado;
      if (añoFactura !== filtros.año) return false;
    }

    // Filtrar por mes
    if (filtros.mes) {
      const mesFactura = factura.fechaIngresada
        ? new Date(factura.fechaIngresada).toLocaleString("es-MX", {
            month: "long",
          })
        : factura.mesAsignado;
      if (mesFactura?.toLowerCase() !== filtros.mes.toLowerCase()) return false;
    }

    // Filtrar por categoría
    if (filtros.categoria) {
      if (factura.categoria !== filtros.categoria) return false;
    }

    return true;
  });

  const estadisticas = {
    total: facturasParaEstadisticas.length,
    pendientes: facturasParaEstadisticas.filter((f) => f.estado === "Pendiente")
      .length,
    autorizadas: facturasParaEstadisticas.filter(
      (f) => f.estado === "Autorizada",
    ).length,
    pagadas: facturasParaEstadisticas.filter((f) => f.estado === "Pagada")
      .length,
    ingresadas: facturasParaEstadisticas.filter((f) => f.estado === "Ingresada")
      .length,
  };

  return (
    <>
      {/* Sección de Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Filtros y Búsqueda
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)
              }
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              {mostrarFiltrosAvanzados
                ? "▲ Filtros avanzados"
                : "▼ Filtros avanzados"}
            </button>
            <button
              onClick={limpiarFiltros}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
            >
              🗑 Limpiar filtros
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-4">
          <div>
            <label
              htmlFor="busqueda"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Buscar
            </label>
            <input
              type="text"
              id="busqueda"
              placeholder="Folio, proveedor, RFC..."
              value={filtros.busqueda || ""}
              onChange={(e) => handleFiltroChange("busqueda", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label
              htmlFor="categoria"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Categoría
            </label>
            <select
              id="categoria"
              value={filtros.categoria || ""}
              onChange={(e) => handleFiltroChange("categoria", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Todas las categorías</option>
              {nombresCategorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="mes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mes
            </label>
            <select
              id="mes"
              value={filtros.mes || ""}
              onChange={(e) => handleFiltroChange("mes", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Todos los meses</option>
              {MESES.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="año"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Año
            </label>
            <select
              id="año"
              value={filtros.año || ""}
              onChange={(e) =>
                handleFiltroChange(
                  "año",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Todos los años</option>
              {AÑOS.map((año) => (
                <option key={año} value={año}>
                  {año}
                </option>
              ))}
            </select>
          </div>
        </div>
        {mostrarFiltrosAvanzados && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Filtros Avanzados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              <div>
                <label
                  htmlFor="fechaInicio"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Fecha desde
                </label>
                <DateInput
                  name="fechaInicio"
                  value={filtros.fechaInicio || ""}
                  onChange={(value) => handleFiltroChange("fechaInicio", value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label
                  htmlFor="fechaFin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Fecha hasta
                </label>
                <DateInput
                  name="fechaFin"
                  value={filtros.fechaFin || ""}
                  onChange={(value) => handleFiltroChange("fechaFin", value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label
                  htmlFor="montoMin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Monto mínimo
                </label>
                <input
                  type="number"
                  id="montoMin"
                  placeholder="$0"
                  value={filtros.montoMin || ""}
                  onChange={(e) =>
                    handleFiltroChange(
                      "montoMin",
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label
                  htmlFor="montoMax"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Monto máximo
                </label>
                <input
                  type="number"
                  id="montoMax"
                  placeholder="$999,999"
                  value={filtros.montoMax || ""}
                  onChange={(e) =>
                    handleFiltroChange(
                      "montoMax",
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>
          </div>
        )}
        {(filtros.mes ||
          filtros.año ||
          filtros.busqueda ||
          filtros.fechaInicio ||
          filtros.fechaFin ||
          filtros.montoMin ||
          filtros.montoMax) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-blue-800 font-medium">
                Filtros aplicados:
              </span>
              {filtros.mes && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Mes: {filtros.mes}
                  <button
                    onClick={() => handleFiltroChange("mes", "")}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtros.año && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Año: {filtros.año}
                  <button
                    onClick={() => handleFiltroChange("año", undefined)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtros.busqueda && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Búsqueda: {filtros.busqueda}
                  <button
                    onClick={() => handleFiltroChange("busqueda", "")}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {(filtros.fechaInicio || filtros.fechaFin) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Fechas: {filtros.fechaInicio || "..."} -{" "}
                  {filtros.fechaFin || "..."}
                  <button
                    onClick={() => {
                      handleFiltroChange("fechaInicio", "");
                      handleFiltroChange("fechaFin", "");
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sección de Métricas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estadísticas{" "}
          {(filtros.estadosMultiples?.length || 0) > 0 && "(Filtros activos)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
          <button
            onClick={limpiarFiltrosEstados}
            className="bg-gray-50 p-3 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-2xl font-bold text-gray-900">
              {estadisticas.total}
            </div>
            <div className="text-sm text-gray-700 font-medium">Total</div>
          </button>
          <button
            onClick={() => toggleEstadoSeleccionado("Pendiente")}
            className={`p-3 rounded-lg text-center transition-all transform cursor-pointer ${
              filtros.estadosMultiples?.includes("Pendiente")
                ? "bg-yellow-100 shadow-inner scale-95"
                : "bg-yellow-50 shadow-sm hover:shadow-md active:shadow-inner active:scale-95"
            }`}
          >
            <div className="text-2xl font-bold text-yellow-800">
              {estadisticas.pendientes}
            </div>
            <div className="text-xs text-yellow-600">Pendientes</div>
          </button>
          <button
            onClick={() => toggleEstadoSeleccionado("Autorizada")}
            className={`p-3 rounded-lg text-center transition-all transform cursor-pointer ${
              filtros.estadosMultiples?.includes("Autorizada")
                ? "bg-orange-100 shadow-inner scale-95"
                : "bg-orange-50 shadow-sm hover:shadow-md active:shadow-inner active:scale-95"
            }`}
          >
            <div className="text-2xl font-bold text-orange-800">
              {estadisticas.autorizadas}
            </div>
            <div className="text-xs text-orange-600">Autorizadas</div>
          </button>
          <button
            onClick={() => toggleEstadoSeleccionado("Ingresada")}
            className={`p-3 rounded-lg text-center transition-all transform cursor-pointer ${
              filtros.estadosMultiples?.includes("Ingresada")
                ? "bg-purple-100 shadow-inner scale-95"
                : "bg-purple-50 shadow-sm hover:shadow-md active:shadow-inner active:scale-95"
            }`}
          >
            <div className="text-2xl font-bold text-purple-800">
              {estadisticas.ingresadas}
            </div>
            <div className="text-xs text-purple-600">Ingresadas</div>
          </button>
          <button
            onClick={() => toggleEstadoSeleccionado("Pagada")}
            className={`p-3 rounded-lg text-center transition-all transform cursor-pointer ${
              filtros.estadosMultiples?.includes("Pagada")
                ? "bg-green-100 shadow-inner scale-95"
                : "bg-green-50 shadow-sm hover:shadow-md active:shadow-inner active:scale-95"
            }`}
          >
            <div className="text-2xl font-bold text-green-800">
              {estadisticas.pagadas}
            </div>
            <div className="text-xs text-green-600">Pagadas</div>
          </button>
        </div>
      </div>
    </>
  );
}
