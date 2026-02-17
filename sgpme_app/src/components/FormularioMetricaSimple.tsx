"use client";

import React, { useState, useEffect } from "react";
import { MetricaFormData } from "@/hooks/useMetricas";
import { MARCAS } from "@/types";

interface FormularioMetricaSimpleProps {
  onSubmit: (data: MetricaFormData) => Promise<boolean>;
  onCancel: () => void;
  metricaInicial?: MetricaFormData & { id?: number };
  metricasExistentes?: Array<{ mes: number; anio: number; marca: string }>;
}

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function FormularioMetricaSimple({
  onSubmit,
  onCancel,
  metricaInicial,
  metricasExistentes = [],
}: FormularioMetricaSimpleProps) {
  const [formData, setFormData] = useState<MetricaFormData>({
    leads: 0,
    citas: 0,
    pisos: 0,
    utilidades: 0,
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    marca: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (metricaInicial) {
      setFormData({
        leads: metricaInicial.leads || 0,
        citas: metricaInicial.citas || 0,
        pisos: metricaInicial.pisos || 0,
        utilidades: metricaInicial.utilidades || 0,
        mes: metricaInicial.mes || new Date().getMonth() + 1,
        anio: metricaInicial.anio || new Date().getFullYear(),
        marca: metricaInicial.marca || "",
      });
    }
  }, [metricaInicial]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "leads" ||
        name === "citas" ||
        name === "pisos" ||
        name === "utilidades" ||
        name === "mes" ||
        name === "anio"
          ? parseInt(value) || 0
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validarFormulario = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.mes < 1 || formData.mes > 12) {
      newErrors.mes = "Mes inválido";
    }

    if (formData.anio < 2020 || formData.anio > 2030) {
      newErrors.anio = "Año inválido";
    }

    if (!formData.marca || formData.marca.trim() === "") {
      newErrors.marca = "La agencia es requerida";
    }

    // Validar si ya existe una métrica para este mes/año/marca (solo para nuevos registros)
    if (!metricaInicial?.id) {
      const mesYaRegistrado = metricasExistentes.some(
        (m) =>
          m.mes === formData.mes &&
          m.anio === formData.anio &&
          m.marca === formData.marca
      );

      if (mesYaRegistrado) {
        newErrors.mes = "Ya existe un registro para este mes, año y agencia";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const success = await onSubmit(formData);

      if (success) {
        setFormData({
          leads: 0,
          citas: 0,
          pisos: 0,
          utilidades: 0,
          mes: new Date().getMonth() + 1,
          anio: new Date().getFullYear(),
          marca: "",
        });
        setErrors({});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Leads
            </label>
            <input
              type="number"
              name="leads"
              value={formData.leads || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Citas
            </label>
            <input
              type="number"
              name="citas"
              value={formData.citas || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Pisos
            </label>
            <input
              type="number"
              name="pisos"
              value={formData.pisos || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Ventas
            </label>
            <input
              type="number"
              name="utilidades"
              value={formData.utilidades || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Periodo</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Mes <span className="text-red-500">*</span>
            </label>
            <select
              name="mes"
              value={formData.mes}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                errors.mes ? "border-red-500" : "border-gray-300"
              }`}
            >
              {MESES.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
            {errors.mes && (
              <p className="text-red-500 text-xs mt-1">{errors.mes}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Año <span className="text-red-500">*</span>
            </label>
            <select
              name="anio"
              value={formData.anio}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                errors.anio ? "border-red-500" : "border-gray-300"
              }`}
            >
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {errors.anio && (
              <p className="text-red-500 text-xs mt-1">{errors.anio}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Agencia <span className="text-red-500">*</span>
        </label>
        <select
          name="marca"
          value={formData.marca}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
            errors.marca ? "border-red-500" : "border-gray-300"
          }`}
          required
        >
          <option value="">Seleccionar agencia</option>
          {MARCAS.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
            </option>
          ))}
        </select>
        {errors.marca && (
          <p className="text-red-500 text-xs mt-1">{errors.marca}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading
            ? "Guardando..."
            : metricaInicial
            ? "Actualizar"
            : "Guardar Métricas"}
        </button>
      </div>
    </form>
  );
}
