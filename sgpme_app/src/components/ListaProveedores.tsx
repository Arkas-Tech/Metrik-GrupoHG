"use client";

import { useState } from "react";
import { Proveedor } from "@/types";

interface ListaProveedoresProps {
  proveedores: Proveedor[];
  onEditar: (proveedor: Proveedor) => void;
  onEliminar: (id: string) => void;
  onReactivar: (id: string) => void;
  loading?: boolean;
}

export default function ListaProveedores({
  proveedores,
  onEditar,
  onEliminar,
  onReactivar,
  loading = false,
}: ListaProveedoresProps) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const proveedoresFiltrados = proveedores.filter((proveedor) => {
    const cumpleEstado = mostrarInactivos || proveedor.activo;

    if (!busqueda.trim()) {
      return cumpleEstado;
    }

    const terminoBusqueda = busqueda.toLowerCase().trim();

    const nombreCoincide =
      proveedor.nombre?.toLowerCase().includes(terminoBusqueda) || false;
    const emailCoincide =
      proveedor.email?.toLowerCase().includes(terminoBusqueda) || false;
    const rfcCoincide =
      proveedor.rfc?.toLowerCase().includes(terminoBusqueda) || false;
    const contactoCoincide =
      proveedor.contacto?.toLowerCase().includes(terminoBusqueda) || false;

    let categoriaCoincide = false;
    if (proveedor.categoria) {
      try {
        categoriaCoincide = proveedor.categoria
          .toLowerCase()
          .split(",")
          .some((cat) => cat.trim().includes(terminoBusqueda));
      } catch (error) {
        console.warn("Error procesando categorías:", error);
        categoriaCoincide = false;
      }
    }

    const cumpleBusqueda =
      nombreCoincide ||
      emailCoincide ||
      rfcCoincide ||
      contactoCoincide ||
      categoriaCoincide;

    return cumpleBusqueda && cumpleEstado;
  });

  const formatearFecha = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleDateString("es-MX");
    } catch (error) {
      console.warn("Error formateando fecha:", fecha, error);
      return "Fecha no válida";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email, RFC, categorías (palabras clave) o contacto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mostrar inactivos</span>
            </label>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-2">Cargando proveedores...</p>
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busqueda
              ? "No se encontraron proveedores que coincidan con la búsqueda"
              : "No hay proveedores registrados"}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {proveedoresFiltrados.map((proveedor) => (
              <div
                key={proveedor.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !proveedor.activo ? "bg-red-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {proveedor.nombre}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          proveedor.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {proveedor.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {proveedor.razonSocial && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Razón Social:</span>{" "}
                        {proveedor.razonSocial}
                      </p>
                    )}
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
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
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{proveedor.email}</span>
                        </span>
                        <span className="flex items-center space-x-1">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>RFC: {proveedor.rfc}</span>
                        </span>
                      </div>

                      {proveedor.categoria && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {proveedor.categoria
                              .split(",")
                              .map((categoria, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {categoria.trim()}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-2">
                        <span>
                          Creado: {formatearFecha(proveedor.fechaCreacion)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onEditar(proveedor)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar proveedor"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {proveedor.activo ? (
                      <button
                        onClick={() => onEliminar(proveedor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Desactivar proveedor"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => onReactivar(proveedor.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reactivar proveedor"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!loading && (
        <div className="text-sm text-gray-500 text-center">
          Mostrando {proveedoresFiltrados.length} de {proveedores.length}{" "}
          proveedores
          {busqueda && ` que coinciden con "${busqueda}"`}
        </div>
      )}
    </div>
  );
}
