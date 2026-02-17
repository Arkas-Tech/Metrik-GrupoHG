"use client";

import { MARCAS } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";

export default function FiltroMarcaGlobal() {
  const { marcaSeleccionada, setMarcaSeleccionada } = useMarcaGlobal();

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
        {MARCAS.map((marca) => (
          <option key={marca} value={marca}>
            {marca}
          </option>
        ))}
      </select>
    </div>
  );
}
