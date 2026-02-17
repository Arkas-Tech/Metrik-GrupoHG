"use client";

import { FiltrosProyeccion, MESES, AÑOS } from "@/types";

interface FiltrosPanelProps {
  filtros: FiltrosProyeccion;
  onFiltrosChange: (filtros: FiltrosProyeccion) => void;
}

const TRIMESTRES = {
  Q1: ["Enero", "Febrero", "Marzo"],
  Q2: ["Abril", "Mayo", "Junio"],
  Q3: ["Julio", "Agosto", "Septiembre"],
  Q4: ["Octubre", "Noviembre", "Diciembre"],
};

export default function FiltrosPanel({
  filtros,
  onFiltrosChange,
}: FiltrosPanelProps) {
  const mesesSeleccionados = filtros.meses || [];

  const toggleMes = (mes: string) => {
    const nuevosMeses = mesesSeleccionados.includes(mes)
      ? mesesSeleccionados.filter((m) => m !== mes)
      : [...mesesSeleccionados, mes];

    onFiltrosChange({
      ...filtros,
      meses: nuevosMeses.length > 0 ? nuevosMeses : undefined,
    });
  };

  const toggleTrimestre = (trimestre: keyof typeof TRIMESTRES) => {
    const mesesTrimestre = TRIMESTRES[trimestre];

    // Verificar si todos los meses del trimestre ya están seleccionados
    const todoSeleccionado = mesesTrimestre.every((mes) =>
      mesesSeleccionados.includes(mes),
    );

    let nuevosMeses: string[];
    if (todoSeleccionado) {
      // Si todos están seleccionados, deseleccionarlos
      nuevosMeses = mesesSeleccionados.filter(
        (mes) => !mesesTrimestre.includes(mes),
      );
    } else {
      // Si no todos están seleccionados, agregarlos (sin duplicar)
      const mesesSet = new Set([...mesesSeleccionados, ...mesesTrimestre]);
      nuevosMeses = Array.from(mesesSet);
    }

    onFiltrosChange({
      ...filtros,
      meses: nuevosMeses.length > 0 ? nuevosMeses : undefined,
    });
  };

  const seleccionarTodosPeriodos = () => {
    onFiltrosChange({
      ...filtros,
      meses: MESES,
    });
  };

  const actualizarAño = (año: number | undefined) => {
    onFiltrosChange({
      ...filtros,
      año,
    });
  };

  const limpiarFiltros = () => {
    const fechaActual = new Date();
    const mesActual = MESES[fechaActual.getMonth()];
    const añoActual = fechaActual.getFullYear();

    onFiltrosChange({
      meses: [mesActual],
      año: añoActual,
    });
  };

  const tieneFiltrosActivos =
    (filtros.meses && filtros.meses.length > 0) || filtros.año !== undefined;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        {tieneFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Año
          </label>
          <select
            value={filtros.año || ""}
            onChange={(e) =>
              actualizarAño(
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
          >
            <option value="">Todos los años</option>
            {AÑOS.map((año) => (
              <option key={año} value={año}>
                {año}
              </option>
            ))}
          </select>
        </div>

        {/* Periodo (Meses) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Periodo
          </label>

          {/* Botones de Trimestre y Todos los Periodos */}
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TRIMESTRES) as Array<keyof typeof TRIMESTRES>).map(
                (trimestre) => {
                  const mesesTrimestre = TRIMESTRES[trimestre];
                  const todoSeleccionado = mesesTrimestre.every((mes) =>
                    mesesSeleccionados.includes(mes),
                  );

                  return (
                    <button
                      key={trimestre}
                      onClick={() => toggleTrimestre(trimestre)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        todoSeleccionado
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {trimestre}
                    </button>
                  );
                },
              )}
            </div>
            <button
              onClick={seleccionarTodosPeriodos}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mesesSeleccionados.length === MESES.length
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos los periodos
            </button>
          </div>

          {/* Checkboxes de Meses */}
          <div className="grid grid-cols-3 gap-2">
            {MESES.map((mes) => {
              const estaSeleccionado = mesesSeleccionados.includes(mes);

              return (
                <label
                  key={mes}
                  className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    estaSeleccionado
                      ? "bg-green-50 border-2 border-green-500"
                      : "bg-gray-50 border-2 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={estaSeleccionado}
                    onChange={() => toggleMes(mes)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span
                    className={`ml-2 text-sm ${
                      estaSeleccionado
                        ? "font-medium text-green-900"
                        : "text-gray-700"
                    }`}
                  >
                    {mes}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
