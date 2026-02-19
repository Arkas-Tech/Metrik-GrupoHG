"use client";

import React, { useState } from "react";
import Image from "next/image";
import ImageUpload from "./ImageUpload";
import { Proveedor } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import DateInput from "./DateInput";

interface FormularioPresenciaTradicionalProps {
  onSubmit: (data: PresenciaFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<PresenciaFormData>;
  loading?: boolean;
  proveedores?: Proveedor[];
}

export interface PresenciaFormData {
  tipo: string;
  nombre: string;
  agencia: string;
  proveedor_id?: number;
  proveedor_nombre?: string;
  proveedor_direccion?: string;
  ubicacion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion?: string;
  costo_mensual?: number;
  costo_total: number;
  circulacion?: number;
  dimensiones?: string;
  observaciones?: string;
  imagenes: Array<{
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
  }>;
}

export default function FormularioPresenciaTradicional({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  proveedores = [],
}: FormularioPresenciaTradicionalProps) {
  const { marcasPermitidas } = useMarcaGlobal();
  const [formData, setFormData] = useState<PresenciaFormData>({
    tipo: initialData?.tipo || "Espectacular",
    nombre: initialData?.nombre || "",
    agencia: initialData?.agencia || "",
    proveedor_id: initialData?.proveedor_id,
    proveedor_nombre: initialData?.proveedor_nombre || "",
    proveedor_direccion: initialData?.proveedor_direccion || "",
    ubicacion: initialData?.ubicacion || "",
    fecha_inicio: initialData?.fecha_inicio || "",
    fecha_fin: initialData?.fecha_fin || "",
    duracion: initialData?.duracion || "",
    costo_mensual: initialData?.costo_mensual || 0,
    costo_total: initialData?.costo_total || 0,
    circulacion: initialData?.circulacion || 0,
    dimensiones: initialData?.dimensiones || "",
    observaciones: initialData?.observaciones || "",
    imagenes: initialData?.imagenes || [],
  });

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const proveedorId = e.target.value;
    if (proveedorId) {
      const proveedor = proveedores.find((p) => p.id === proveedorId);
      if (proveedor) {
        setFormData((prev) => ({
          ...prev,
          proveedor_id: parseInt(proveedorId),
          proveedor_nombre: proveedor.nombre,
          proveedor_direccion: proveedor.direccion || "",
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        proveedor_id: undefined,
        proveedor_nombre: "",
        proveedor_direccion: "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const agregarImagen = (imageData: {
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: [...prev.imagenes, imageData],
    }));
  };

  const eliminarImagen = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((img) => img.id !== id),
    }));
  };

  const mostrarCamposPorTipo = () => {
    return {
      ubicacion: formData.tipo === "Espectacular",
      dimensiones: formData.tipo === "Espectacular",
      circulacion: formData.tipo === "Revista" || formData.tipo === "Periódico",
    };
  };

  const campos = mostrarCamposPorTipo();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="Espectacular">Espectacular</option>
            <option value="Revista">Revista</option>
            <option value="Periódico">Periódico</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            placeholder="Ej: Espectacular Periférico Sur"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agencia *
          </label>
          <select
            name="agencia"
            value={formData.agencia}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Seleccionar agencia</option>
            {marcasPermitidas.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sección de Información del Proveedor */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información del Proveedor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor
            </label>
            <select
              value={formData.proveedor_id || ""}
              onChange={handleProveedorChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores
                .filter((p) => p.activo === true)
                .map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              name="proveedor_direccion"
              value={formData.proveedor_direccion || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Dirección del proveedor"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campos.ubicacion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: Periférico Sur, CDMX"
            />
          </div>
        )}

        {campos.dimensiones && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensiones
            </label>
            <input
              type="text"
              name="dimensiones"
              value={formData.dimensiones}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: 12m x 6m"
            />
          </div>
        )}

        {campos.circulacion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Circulación
            </label>
            <input
              type="number"
              name="circulacion"
              value={formData.circulacion}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: 50000"
            />
          </div>
        )}
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Fechas y Duración
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio *
            </label>
            <DateInput
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fecha_inicio: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin *
            </label>
            <DateInput
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fecha_fin: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración
            </label>
            <input
              type="text"
              name="duracion"
              value={formData.duracion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ej: 6 meses"
            />
          </div>
        </div>
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Costos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo Mensual
            </label>
            <input
              type="number"
              name="costo_mensual"
              value={formData.costo_mensual}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="15000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo Total *
            </label>
            <input
              type="number"
              name="costo_total"
              value={formData.costo_total}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="90000"
            />
          </div>
        </div>
      </div>
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones
        </label>
        <textarea
          name="observaciones"
          value={formData.observaciones}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Notas adicionales..."
        />
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Imágenes (la primera será la vista previa)
        </h3>
        <ImageUpload onImageAdd={agregarImagen} disabled={loading} />

        {formData.imagenes.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.imagenes.map((imagen, index) => (
              <div key={imagen.id} className="relative group">
                <Image
                  src={imagen.url}
                  alt={imagen.nombre}
                  width={200}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                />
                {index === 0 && (
                  <span className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                    Vista Previa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => eliminarImagen(imagen.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {imagen.nombre}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}{" "}
          Presencia
        </button>
      </div>
    </form>
  );
}
