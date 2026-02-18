"use client";

import { useState } from "react";
import { Proveedor } from "@/types";

interface FormularioProveedorProps {
  proveedor?: Proveedor;
  onSubmit: (datos: Omit<Proveedor, "id" | "fechaCreacion">) => Promise<void>;
  onCancelar: () => void;
  loading?: boolean;
}

export default function FormularioProveedor({
  proveedor,
  onSubmit,
  onCancelar,
  loading = false,
}: FormularioProveedorProps) {
  const [datos, setDatos] = useState(() => {
    if (proveedor) {
      return {
        nombre: proveedor.nombre,
        razonSocial: proveedor.razonSocial || "",
        contacto: proveedor.contacto,
        email: proveedor.email,
        rfc: proveedor.rfc || "",
        telefono: proveedor.telefono || "",
        direccion: proveedor.direccion || "",
        calle: proveedor.calle || "",
        numeroExterior: proveedor.numeroExterior || "",
        numeroInterior: proveedor.numeroInterior || "",
        colonia: proveedor.colonia || "",
        ciudad: proveedor.ciudad || "",
        estado: proveedor.estado || "",
        codigoPostal: proveedor.codigoPostal || "",
        categoria: proveedor.categoria,
        activo: proveedor.activo,
      };
    }
    return {
      nombre: "",
      razonSocial: "",
      contacto: "",
      email: "",
      rfc: "",
      telefono: "",
      direccion: "",
      calle: "",
      numeroExterior: "",
      numeroInterior: "",
      colonia: "",
      ciudad: "",
      estado: "",
      codigoPostal: "",
      categoria: "",
      activo: true,
    };
  });

  const [errores, setErrores] = useState<Record<string, string>>({});

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!datos.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es requerido";
    }

    if (!datos.contacto.trim()) {
      nuevosErrores.contacto = "El contacto es requerido";
    }

    if (!datos.email.trim()) {
      nuevosErrores.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
      nuevosErrores.email = "El formato del email no es válido";
    }

    if (!datos.rfc.trim()) {
      nuevosErrores.rfc = "El RFC es requerido";
    } else if (datos.rfc.length < 12 || datos.rfc.length > 13) {
      nuevosErrores.rfc = "El RFC debe tener entre 12 y 13 caracteres";
    }

    if (!datos.categoria.trim()) {
      nuevosErrores.categoria = "La categoría es requerida";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      const datosParaEnviar = {
        nombre: datos.nombre,
        razonSocial: datos.razonSocial,
        contacto: datos.contacto,
        email: datos.email,
        rfc: datos.rfc,
        telefono: datos.telefono,
        direccion: datos.direccion,
        calle: datos.calle,
        numeroExterior: datos.numeroExterior,
        numeroInterior: datos.numeroInterior,
        colonia: datos.colonia,
        ciudad: datos.ciudad,
        estado: datos.estado,
        codigoPostal: datos.codigoPostal,
        categoria: datos.categoria,
        activo: datos.activo,
      };
      await onSubmit(datosParaEnviar);
    } catch (error) {
      console.error("Error al procesar formulario:", error);
    }
  };

  const handleChange =
    (field: keyof typeof datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setDatos((prev) => ({ ...prev, [field]: value }));

      if (errores[field]) {
        setErrores((prev) => ({ ...prev, [field]: "" }));
      }
    };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        {proveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la empresa *
          </label>
          <input
            type="text"
            value={datos.nombre}
            onChange={handleChange("nombre")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
              errores.nombre ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ej: Publicidad Digital SA"
            disabled={loading}
          />
          {errores.nombre && (
            <p className="text-red-500 text-sm mt-1">{errores.nombre}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Razón Social
          </label>
          <input
            type="text"
            value={datos.razonSocial || ""}
            onChange={handleChange("razonSocial")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="Ej: Publicidad Digital S.A. de C.V."
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Persona de contacto *
          </label>
          <input
            type="text"
            value={datos.contacto}
            onChange={handleChange("contacto")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
              errores.contacto ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Juan Pérez"
            disabled={loading}
          />
          {errores.contacto && (
            <p className="text-red-500 text-sm mt-1">{errores.contacto}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={datos.email}
            onChange={handleChange("email")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
              errores.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="contacto@empresa.com"
            disabled={loading}
          />
          {errores.email && (
            <p className="text-red-500 text-sm mt-1">{errores.email}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RFC *
          </label>
          <input
            type="text"
            value={datos.rfc}
            onChange={handleChange("rfc")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
              errores.rfc ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="ABC123456XYZ"
            maxLength={13}
            disabled={loading}
          />
          {errores.rfc && (
            <p className="text-red-500 text-sm mt-1">{errores.rfc}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            RFC del proveedor para facturas fiscales
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            value={datos.telefono}
            onChange={handleChange("telefono")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="+52 55 1234 5678"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría *
          </label>
          <input
            type="text"
            value={datos.categoria}
            onChange={handleChange("categoria")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
              errores.categoria ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ej: Publicidad Digital, Eventos, Imprenta"
            disabled={loading}
          />
          {errores.categoria && (
            <p className="text-red-500 text-sm mt-1">{errores.categoria}</p>
          )}
        </div>

        {/* Sección de Dirección */}
        <div className="col-span-2">
          <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
            Dirección
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calle
            </label>
            <input
              type="text"
              value={datos.calle}
              onChange={handleChange("calle")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Av. Reforma"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número Ext.
              </label>
              <input
                type="text"
                value={datos.numeroExterior}
                onChange={handleChange("numeroExterior")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="123"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número Int.
              </label>
              <input
                type="text"
                value={datos.numeroInterior}
                onChange={handleChange("numeroInterior")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="4B"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colonia
            </label>
            <input
              type="text"
              value={datos.colonia}
              onChange={handleChange("colonia")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Centro"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              value={datos.ciudad}
              onChange={handleChange("ciudad")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ciudad de México"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <input
              type="text"
              value={datos.estado}
              onChange={handleChange("estado")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="CDMX"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal
            </label>
            <input
              type="text"
              value={datos.codigoPostal}
              onChange={handleChange("codigoPostal")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="06000"
              maxLength={5}
              disabled={loading}
            />
          </div>
        </div>

        {proveedor && (
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={datos.activo}
                onChange={handleChange("activo")}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700">
                Proveedor activo
              </span>
            </label>
          </div>
        )}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : proveedor ? (
              "Actualizar"
            ) : (
              "Crear"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
