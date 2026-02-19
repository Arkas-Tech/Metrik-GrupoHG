"use client";

import { useMarcaGlobal } from "@/contexts/MarcaContext";

export default function FiltroMarcaGlobal() {
  const { marcaSeleccionada, setMarcaSeleccionada, marcasPermitidas } =
    useMarcaGlobal();

  // Si no hay marcas permitidas, no mostrar el filtro
  if (marcasPermitidas.length === 0) return null;

  // Si solo hay una marca, mostrar como texto fijo (no selector)
  if (marcasPermitidas.length === 1) {
    return (
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Agencia:
        </label>
        <span className="px-3 py-1.5 text-sm text-gray-900 font-medium">
          {marcasPermitidas[0]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="marca-global"
        className="text-sm font-medium text-gray-700 whitespace-nowrap"
      >
        Filtrar por:
      </label>
      <select
        id="marca-global"
        value={marcaSeleccionada || ""}
        onChange={(e) => setMarcaSeleccionada(e.target.value || null)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[120px]"
      >
        <option value="">Todas las agencias</option>
        {marcasPermitidas.map((marca) => (
          <option key={marca} value={marca}>
            {marca}
          </option>
        ))}
      </select>
    </div>
  );
}
