"use client";

import { useState } from "react";
import Image from "next/image";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import ImageUpload from "./ImageUpload";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Proveedor } from "@/types";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import DateInput from "./DateInput";

const libraries: ("places" | "geometry")[] = ["places"];

interface PresenciaFormData {
  tipo: string;
  nombre: string;
  agencia: string;
  marca: string;
  ciudad: string;
  campana: string;
  ubicacion: string;
  contenido: string;
  notas: string;
  fecha_instalacion: string;
  duracion: string;
  cambio_lona: string;
  vista: string;
  iluminacion: string;
  dimensiones: string;
  proveedor: string;
  codigo_proveedor: string;
  costo_mensual: number;
  duracion_contrato: string;
  inicio_contrato: string;
  termino_contrato: string;
  impresion: string;
  costo_impresion: number;
  instalacion: string;
  observaciones: string;
  imagenes: Array<{
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
  }>;
}

interface FormularioPresenciaProps {
  onSubmit: (data: PresenciaFormData) => void;
  onCancel: () => void;
  marcaActual: string;
  proveedores?: Proveedor[];
  onNavigateToProveedores?: () => void;
  presenciaInicial?: {
    id: number;
    tipo: string;
    nombre: string;
    agencia: string | null;
    marca: string;
    ciudad: string | null;
    campana: string | null;
    ubicacion: string | null;
    contenido: string | null;
    notas: string | null;
    fecha_instalacion: string;
    duracion: string | null;
    cambio_lona: string | null;
    vista: string | null;
    iluminacion: string | null;
    dimensiones: string | null;
    proveedor: string | null;
    codigo_proveedor: string | null;
    costo_mensual: number | null;
    duracion_contrato: string | null;
    inicio_contrato: string | null;
    termino_contrato: string | null;
    impresion: string | null;
    costo_impresion: number | null;
    instalacion: string | null;
    imagenes_json: string | null;
    observaciones: string | null;
  } | null;
}

export default function FormularioPresencia({
  onSubmit,
  onCancel,
  marcaActual,
  proveedores = [],
  onNavigateToProveedores,
  presenciaInicial,
}: FormularioPresenciaProps) {
  const { marcasPermitidas } = useMarcaGlobal();
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const imagenesIniciales = presenciaInicial?.imagenes_json
    ? (() => {
        try {
          const urls = JSON.parse(presenciaInicial.imagenes_json);
          return Array.isArray(urls)
            ? urls.map((url: string, index: number) => ({
                id: `${Date.now()}-${index}`,
                nombre: `Imagen ${index + 1}`,
                url,
                descripcion: "",
              }))
            : [];
        } catch {
          return [];
        }
      })()
    : [];

  const [formData, setFormData] = useState<PresenciaFormData>({
    tipo: presenciaInicial?.tipo || "",
    nombre: presenciaInicial?.nombre || "",
    agencia: presenciaInicial?.agencia || "",
    marca: presenciaInicial?.marca || marcaActual,
    ciudad: presenciaInicial?.ciudad || "",
    campana: presenciaInicial?.campana || "",
    ubicacion: presenciaInicial?.ubicacion || "",
    contenido: presenciaInicial?.contenido || "",
    notas: presenciaInicial?.notas || "",
    fecha_instalacion: presenciaInicial?.fecha_instalacion || "",
    duracion: presenciaInicial?.duracion || "",
    cambio_lona: presenciaInicial?.cambio_lona || "",
    vista: presenciaInicial?.vista || "",
    iluminacion: presenciaInicial?.iluminacion || "",
    dimensiones: presenciaInicial?.dimensiones || "",
    proveedor: presenciaInicial?.proveedor || "",
    codigo_proveedor: presenciaInicial?.codigo_proveedor || "",
    costo_mensual: presenciaInicial?.costo_mensual || 0,
    duracion_contrato: presenciaInicial?.duracion_contrato || "",
    inicio_contrato: presenciaInicial?.inicio_contrato || "",
    termino_contrato: presenciaInicial?.termino_contrato || "",
    impresion: presenciaInicial?.impresion || "",
    costo_impresion: presenciaInicial?.costo_impresion || 0,
    instalacion: presenciaInicial?.instalacion || "",
    observaciones: presenciaInicial?.observaciones || "",
    imagenes: imagenesIniciales,
  });

  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<
    string | null
  >(null);
  const [direccionProveedor, setDireccionProveedor] = useState(
    presenciaInicial?.codigo_proveedor || "",
  );

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const proveedorId = e.target.value;
    if (proveedorId) {
      const proveedor = proveedores.find((p) => p.id === proveedorId);
      if (proveedor) {
        setProveedorSeleccionado(proveedorId);
        setFormData((prev) => ({
          ...prev,
          proveedor: proveedor.nombre,
        }));
        setDireccionProveedor(proveedor.direccion || "");
      }
    } else {
      setProveedorSeleccionado(null);
      setFormData((prev) => ({
        ...prev,
        proveedor: "",
      }));
      setDireccionProveedor("");
    }
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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "es",
    region: "MX",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "agencia") {
      setFormData((prev) => ({
        ...prev,
        agencia: value,
        marca: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setFormData((prev) => ({
          ...prev,
          ubicacion: place.formatted_address || "",
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.marca || formData.marca.trim() === "") {
      alert("Por favor selecciona una marca antes de crear la presencia");
      return;
    }

    if (!formData.tipo || formData.tipo.trim() === "") {
      alert("Por favor selecciona un tipo de presencia");
      return;
    }

    if (!formData.nombre || formData.nombre.trim() === "") {
      alert("Por favor ingresa un nombre para la presencia");
      return;
    }

    if (!formData.fecha_instalacion) {
      alert("Por favor ingresa la fecha de instalación");
      return;
    }

    // Guardar la dirección del proveedor en codigo_proveedor
    const dataToSubmit = {
      ...formData,
      codigo_proveedor: direccionProveedor,
    };

    onSubmit(dataToSubmit);
  };

  if (loadError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-2">Error al cargar Google Maps</p>
        <p className="text-sm text-gray-600">
          Verifica que la API key esté configurada correctamente
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="p-4 text-center">Cargando Google Maps...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Información General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Tipo *
            </label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            >
              <option value="">Seleccionar tipo</option>
              <option value="espectacular">Espectacular</option>
              <option value="revista">Revista</option>
              <option value="periodico">Periódico</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: PUENTE DE LA SALLE VISTA SUR A NORTE"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Agencia *
            </label>
            <select
              name="agencia"
              value={formData.agencia}
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
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: Chihuahua"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Campaña
            </label>
            <input
              type="text"
              name="campana"
              value={formData.campana}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: Cuatro Marcas"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Ubicación
            </label>
            <Autocomplete
              onLoad={onLoad}
              onPlaceChanged={onPlaceChanged}
              options={{
                componentRestrictions: { country: "mx" },
                fields: ["formatted_address", "geometry", "name"],
              }}
            >
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
                placeholder="Buscar ubicación en México..."
              />
            </Autocomplete>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Contenido
            </label>
            <input
              type="text"
              name="contenido"
              value={formData.contenido}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: Confianza"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Notas
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Fechas y Duración
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Fecha de Instalación *
            </label>
            <DateInput
              name="fecha_instalacion"
              value={formData.fecha_instalacion}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fecha_instalacion: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Duración
            </label>
            <input
              type="text"
              name="duracion"
              value={formData.duracion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: 12 meses"
            />
          </div>
          {formData.tipo === "espectacular" && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
                Cambio de Lona
              </label>
              <DateInput
                name="cambio_lona"
                value={formData.cambio_lona}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, cambio_lona: value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              />
            </div>
          )}
        </div>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Características Físicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Vista
            </label>
            <select
              name="vista"
              value={formData.vista}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            >
              <option value="">Seleccionar</option>
              <option value="Frontal">Frontal</option>
              <option value="Bilateral">Bilateral</option>
              <option value="Página completa">Página completa</option>
              <option value="Media página">Media página</option>
              <option value="Doble página">Doble página</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Iluminación
            </label>
            <select
              name="iluminacion"
              value={formData.iluminacion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            >
              <option value="">Seleccionar</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Dimensiones
            </label>
            <input
              type="text"
              name="dimensiones"
              value={formData.dimensiones}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: 15X5.6m o 21x28cm"
            />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Información del Proveedor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Proveedor
            </label>
            <select
              value={proveedorSeleccionado || ""}
              onChange={handleProveedorChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
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
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Dirección
            </label>
            <input
              type="text"
              value={direccionProveedor}
              onChange={(e) => setDireccionProveedor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Dirección del proveedor"
            />
          </div>
        </div>{" "}
        {onNavigateToProveedores && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onNavigateToProveedores}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              Agregar Proveedor
            </button>
          </div>
        )}{" "}
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Costos y Contrato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Costo Mensual
            </label>
            <input
              type="number"
              name="costo_mensual"
              value={formData.costo_mensual || ""}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Duración del Contrato
            </label>
            <input
              type="text"
              name="duracion_contrato"
              value={formData.duracion_contrato}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Ej: Anual, Semestral"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Inicio de Contrato
            </label>
            <DateInput
              name="inicio_contrato"
              value={formData.inicio_contrato}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, inicio_contrato: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Término de Contrato
            </label>
            <DateInput
              name="termino_contrato"
              value={formData.termino_contrato}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, termino_contrato: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Impresión e Instalación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Impresión
            </label>
            <input
              type="text"
              name="impresion"
              value={formData.impresion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Empresa de impresión"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Costo
            </label>
            <input
              type="number"
              name="costo_impresion"
              value={formData.costo_impresion || ""}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Instalación
            </label>
            <input
              type="text"
              name="instalacion"
              value={formData.instalacion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
              placeholder="Empresa de instalación"
            />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">
          Ubicación e Imágenes
        </h3>
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
            Observaciones
          </label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
            placeholder="Observaciones adicionales..."
          />
        </div>
        {formData.imagenes.length > 0 && (
          <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-bold text-gray-800 mb-3">
              Vista Previa (Primera Imagen - Se mostrará en /métricas)
            </h4>
            <div className="flex justify-center">
              <Image
                src={formData.imagenes[0].url}
                alt={formData.imagenes[0].nombre}
                width={600}
                height={256}
                className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        )}
        {formData.imagenes.length > 0 && (
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
              Imágenes Subidas ({formData.imagenes.length})
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.imagenes.map((imagen, index) => (
                <div
                  key={imagen.id}
                  className="relative border border-gray-300 rounded-lg overflow-hidden group"
                >
                  <Image
                    src={imagen.url}
                    alt={imagen.nombre}
                    width={200}
                    height={128}
                    className="w-full h-32 object-cover"
                  />
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminarImagen(imagen.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
            Agregar Imágenes
          </label>
          <p className="text-xs text-gray-600 mb-2">
            La primera imagen será la vista previa principal en /métricas
          </p>
          <ImageUpload onImageAdd={agregarImagen} disabled={false} />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-300">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
        >
          Guardar Presencia
        </button>
      </div>
    </form>
  );
}
