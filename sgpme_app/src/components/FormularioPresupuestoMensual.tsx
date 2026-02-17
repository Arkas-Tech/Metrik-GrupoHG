"use client";

import { useState } from "react";
import { fetchConToken } from "@/lib/auth-utils";

interface Marca {
  id: number;
  cuenta: string;
}

interface FormularioPresupuestoMensualProps {
  marcas: Marca[];
  categorias: string[];
  onPresupuestoCreado: () => void;
  onCancelar: () => void;
  presupuestoInicial?: {
    id?: number;
    mes: number;
    anio: number;
    categoria: string;
    marca_id: number;
    monto: number;
  } | null;
}

const MESES = [
  { numero: 1, nombre: "Enero" },
  { numero: 2, nombre: "Febrero" },
  { numero: 3, nombre: "Marzo" },
  { numero: 4, nombre: "Abril" },
  { numero: 5, nombre: "Mayo" },
  { numero: 6, nombre: "Junio" },
  { numero: 7, nombre: "Julio" },
  { numero: 8, nombre: "Agosto" },
  { numero: 9, nombre: "Septiembre" },
  { numero: 10, nombre: "Octubre" },
  { numero: 11, nombre: "Noviembre" },
  { numero: 12, nombre: "Diciembre" },
];

const AÑOS_DISPONIBLES = Array.from(
  { length: 10 },
  (_, i) => new Date().getFullYear() - 2 + i,
);

export default function FormularioPresupuestoMensual({
  marcas,
  categorias,
  onPresupuestoCreado,
  onCancelar,
  presupuestoInicial = null,
}: FormularioPresupuestoMensualProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  const [formData, setFormData] = useState({
    mes: presupuestoInicial?.mes || new Date().getMonth() + 1,
    anio: presupuestoInicial?.anio || new Date().getFullYear(),
    categoria: presupuestoInicial?.categoria || "",
    marca_id: presupuestoInicial?.marca_id || "",
    monto: presupuestoInicial?.monto || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "monto") {
      // Solo permitir números y punto decimal
      const numericValue = value.replace(/[^0-9.]/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (name === "mes" || name === "anio" || name === "marca_id") {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value) : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validarFormulario = () => {
    const errores = [];

    if (!formData.mes || formData.mes < 1 || formData.mes > 12) {
      errores.push("Debe seleccionar un mes válido");
    }

    if (!formData.anio || formData.anio < 2020 || formData.anio > 2050) {
      errores.push("Debe seleccionar un año válido");
    }

    if (!formData.categoria) {
      errores.push("Debe seleccionar una categoría");
    }

    if (!formData.marca_id) {
      errores.push("Debe seleccionar una agencia");
    }

    if (!formData.monto || parseFloat(formData.monto.toString()) <= 0) {
      errores.push("El monto debe ser mayor a 0");
    }

    return errores;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errores = validarFormulario();
    if (errores.length > 0) {
      setError(errores.join(", "));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Verificar si ya existe un presupuesto con los mismos datos (solo si es creación nueva)
      if (!presupuestoInicial) {
        const verificarResponse = await fetchConToken(
          `${API_URL}/presupuesto/?mes=${formData.mes}&anio=${
            formData.anio
          }&categoria=${encodeURIComponent(formData.categoria)}&marca_id=${
            formData.marca_id
          }`,
        );

        if (verificarResponse.ok) {
          const presupuestosExistentes = await verificarResponse.json();
          if (presupuestosExistentes.length > 0) {
            const marcaNombre =
              marcas.find(
                (m) => m.id === parseInt(formData.marca_id.toString()),
              )?.cuenta || "esta agencia";
            const mesNombre =
              MESES.find((m) => m.numero === parseInt(formData.mes.toString()))
                ?.nombre || formData.mes;
            alert(
              `Ya existe un presupuesto para ${marcaNombre}, categoría "${formData.categoria}", ${mesNombre} ${formData.anio}. No se permiten presupuestos duplicados.`,
            );
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        mes: parseInt(formData.mes.toString()),
        anio: parseInt(formData.anio.toString()),
        categoria: formData.categoria,
        marca_id: parseInt(formData.marca_id.toString()),
        monto: parseFloat(formData.monto.toString()),
      };

      // Si estamos editando, usar PUT; si es nuevo, usar POST
      const url = presupuestoInicial
        ? `${API_URL}/presupuesto/${presupuestoInicial.id}`
        : `${API_URL}/presupuesto/`;
      const method = presupuestoInicial ? "PUT" : "POST";

      const response = await fetchConToken(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Presupuesto creado/actualizado:", data);
        onPresupuestoCreado();

        // Limpiar formulario si es creación nueva
        if (!presupuestoInicial) {
          setFormData({
            mes: new Date().getMonth() + 1,
            anio: new Date().getFullYear(),
            categoria: "",
            marca_id: "",
            monto: "",
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Error al guardar el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión al guardar el presupuesto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Pop-up de error */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-start space-x-3">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Presupuesto duplicado
                </h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowErrorPopup(false);
                  setError("");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && !showErrorPopup && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mes */}
          <div>
            <label
              htmlFor="mes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mes *
            </label>
            <select
              id="mes"
              name="mes"
              value={formData.mes}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar mes</option>
              {MESES.map((mes) => (
                <option key={mes.numero} value={mes.numero}>
                  {mes.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label
              htmlFor="anio"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Año *
            </label>
            <select
              id="anio"
              name="anio"
              value={formData.anio}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar año</option>
              {AÑOS_DISPONIBLES.map((año) => (
                <option key={año} value={año}>
                  {año}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label
              htmlFor="categoria"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Categoría *
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          {/* Agencia */}
          <div>
            <label
              htmlFor="marca_id"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Agencia *
            </label>
            <select
              id="marca_id"
              name="marca_id"
              value={formData.marca_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar agencia</option>
              {marcas.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.cuenta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monto */}
        <div>
          <label
            htmlFor="monto"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Monto *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">
              $
            </span>
            <input
              type="text"
              id="monto"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
              required
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ingrese el monto del presupuesto mensual
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancelar}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Guardando...
              </>
            ) : presupuestoInicial ? (
              "Actualizar Presupuesto"
            ) : (
              "Crear Presupuesto"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
