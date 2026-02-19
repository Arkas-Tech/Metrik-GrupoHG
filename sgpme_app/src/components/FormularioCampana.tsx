"use client";

import React, { useState } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ImageUpload from "./ImageUpload";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import DateInput from "./DateInput";

interface FormularioCampanaProps {
  onSubmit: (data: CampanaFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CampanaFormData>;
  loading?: boolean;
}

export interface CampanaFormData {
  nombre: string;
  estado: string;
  plataforma: string;
  leads: number;
  alcance: number;
  interacciones: number;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: number;
  gasto_actual: number;
  auto_objetivo: string;
  conversion: number;
  cxc_porcentaje: number;
  marca: string;
  imagenes: Array<{
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
  }>;
}

export default function FormularioCampana({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}: FormularioCampanaProps) {
  const { marcasPermitidas } = useMarcaGlobal();
  const [formData, setFormData] = useState<CampanaFormData>({
    nombre: initialData?.nombre || "",
    estado: initialData?.estado || "Activa",
    plataforma: initialData?.plataforma || "Meta Ads",
    leads: initialData?.leads || 0,
    alcance: initialData?.alcance || 0,
    interacciones: initialData?.interacciones || 0,
    fecha_inicio: initialData?.fecha_inicio || "",
    fecha_fin: initialData?.fecha_fin || "",
    presupuesto: initialData?.presupuesto || 0,
    gasto_actual: initialData?.gasto_actual || 0,
    auto_objetivo: initialData?.auto_objetivo || "",
    conversion: initialData?.conversion || 0,
    cxc_porcentaje: initialData?.cxc_porcentaje || 0,
    marca: initialData?.marca || "",
    imagenes: initialData?.imagenes || [],
  });

  const [imagenPreview, setImagenPreview] = useState<{
    url: string;
    nombre: string;
    descripcion?: string;
  } | null>(null);

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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Nombre de la Campaña *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            placeholder="Ej: Campaña Black Friday 2024"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Agencia *
          </label>
          <select
            name="marca"
            value={formData.marca}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
          >
            <option value="">Seleccionar agencia</option>
            {marcasPermitidas.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Estado *
          </label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
          >
            <option value="Activa">Activa</option>
            <option value="Pausada">Pausada</option>
            <option value="Completada">Completada</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Plataforma *
          </label>
          <select
            name="plataforma"
            value={formData.plataforma}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
          >
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="TikTok Ads">TikTok Ads</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Auto Objetivo *
          </label>
          <input
            type="text"
            name="auto_objetivo"
            value={formData.auto_objetivo}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            placeholder="Ej: Toyota RAV4"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Presupuesto *
          </label>
          <input
            type="number"
            name="presupuesto"
            value={formData.presupuesto || ""}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Leads
            </label>
            <input
              type="number"
              name="leads"
              value={formData.leads || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Alcance
            </label>
            <input
              type="number"
              name="alcance"
              value={formData.alcance || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Interacciones
            </label>
            <input
              type="number"
              name="interacciones"
              value={formData.interacciones || ""}
              onChange={handleChange}
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Conversión (%)
            </label>
            <input
              type="number"
              name="conversion"
              value={formData.conversion || ""}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              CxC (%)
            </label>
            <input
              type="number"
              name="cxc_porcentaje"
              value={formData.cxc_porcentaje || ""}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>
        </div>
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Fecha Inicio *
            </label>
            <DateInput
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fecha_inicio: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Fecha Fin *
            </label>
            <DateInput
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fecha_fin: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>
        </div>
      </div>
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Anuncios</h3>
        <ImageUpload onImageAdd={agregarImagen} disabled={loading} />

        {formData.imagenes.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.imagenes.map((imagen) => (
              <div key={imagen.id} className="relative group">
                <Image
                  src={imagen.url}
                  alt={imagen.nombre}
                  width={200}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setImagenPreview(imagen)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarImagen(imagen.id);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  ✕
                </button>
                {imagen.nombre && (
                  <a
                    href={
                      imagen.nombre.startsWith("http")
                        ? imagen.nombre
                        : `https://${imagen.nombre}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 block truncate underline"
                    title={imagen.nombre}
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 Ver anuncio
                  </a>
                )}
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
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}{" "}
          Campaña
        </button>
      </div>

      {/* Modal de Preview de Imagen */}
      {imagenPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImagenPreview(null)}
        >
          <div className="relative max-w-[60%] max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImagenPreview(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <XMarkIcon className="h-6 w-6 text-gray-700" />
            </button>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="relative max-w-full max-h-[85vh]">
                <Image
                  src={imagenPreview.url}
                  alt={imagenPreview.nombre}
                  width={1200}
                  height={800}
                  className="object-contain max-h-[85vh] w-auto"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="mt-4 bg-white rounded-lg p-4 max-w-2xl">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {imagenPreview.nombre}
                </h3>
                {imagenPreview.descripcion && (
                  <p className="text-sm text-gray-600">
                    {imagenPreview.descripcion}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
