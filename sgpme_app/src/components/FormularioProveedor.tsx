"use client";

import { useState } from "react";
import { Proveedor, ContactoProveedor } from "@/types";

interface FormularioProveedorProps {
  proveedor?: Proveedor;
  onSubmit: (datos: Omit<Proveedor, "id" | "fechaCreacion">) => Promise<void>;
  onCancelar: () => void;
  loading?: boolean;
}

const contactoVacio = (): ContactoProveedor => ({
  nombre: "",
  email: "",
  telefono: "",
});

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
        rfc: proveedor.rfc || "",
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
      rfc: "",
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

  const [contactos, setContactos] = useState<ContactoProveedor[]>(() => {
    if (proveedor?.contactos && proveedor.contactos.length > 0) {
      return proveedor.contactos;
    }
    if (proveedor?.contacto || proveedor?.email) {
      return [
        {
          nombre: proveedor.contacto || "",
          email: proveedor.email || "",
          telefono: proveedor.telefono || "",
        },
      ];
    }
    return [contactoVacio()];
  });

  const [errores, setErrores] = useState<Record<string, string>>({});

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!datos.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es requerido";
    }
    if (!datos.rfc.trim()) {
      nuevosErrores.rfc = "El RFC es requerido";
    } else if (datos.rfc.length < 12 || datos.rfc.length > 13) {
      nuevosErrores.rfc = "El RFC debe tener entre 12 y 13 caracteres";
    }
    if (!datos.categoria.trim()) {
      nuevosErrores.categoria = "La categoría es requerida";
    }

    if (!contactos[0]?.nombre.trim()) {
      nuevosErrores["contacto_0_nombre"] =
        "El nombre del contacto es requerido";
    }
    if (!contactos[0]?.email.trim()) {
      nuevosErrores["contacto_0_email"] = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactos[0].email)) {
      nuevosErrores["contacto_0_email"] = "Formato de email inválido";
    }

    contactos.slice(1).forEach((c, i) => {
      const idx = i + 1;
      if (c.nombre.trim() && !c.email.trim()) {
        nuevosErrores[`contacto_${idx}_email`] = "El email es requerido";
      }
      if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
        nuevosErrores[`contacto_${idx}_email`] = "Formato de email inválido";
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    try {
      const contactosFiltrados = contactos.filter(
        (c) => c.nombre.trim() || c.email.trim(),
      );

      await onSubmit({
        nombre: datos.nombre,
        razonSocial: datos.razonSocial,
        contacto: contactosFiltrados[0]?.nombre || "",
        email: contactosFiltrados[0]?.email || "",
        telefono: contactosFiltrados[0]?.telefono || "",
        rfc: datos.rfc,
        direccion: datos.direccion,
        calle: datos.calle,
        numeroExterior: datos.numeroExterior,
        numeroInterior: datos.numeroInterior,
        colonia: datos.colonia,
        ciudad: datos.ciudad,
        estado: datos.estado,
        codigoPostal: datos.codigoPostal,
        contactos: contactosFiltrados,
        categoria: datos.categoria,
        activo: datos.activo,
      });
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
      if (errores[field]) setErrores((prev) => ({ ...prev, [field]: "" }));
    };

  const handleContactoChange = (
    idx: number,
    field: keyof ContactoProveedor,
    value: string,
  ) => {
    setContactos((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    const key = `contacto_${idx}_${field}`;
    if (errores[key]) setErrores((prev) => ({ ...prev, [key]: "" }));
  };

  const agregarContacto = () => {
    setContactos((prev) => [...prev, contactoVacio()]);
  };

  const eliminarContacto = (idx: number) => {
    setContactos((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputBase =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900";
  const inputErr =
    "w-full px-3 py-2 border border-red-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900";

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        {proveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la empresa *
          </label>
          <input
            type="text"
            value={datos.nombre}
            onChange={handleChange("nombre")}
            className={errores.nombre ? inputErr : inputBase}
            placeholder="Ej: Publicidad Digital SA"
            disabled={loading}
          />
          {errores.nombre && (
            <p className="text-red-500 text-sm mt-1">{errores.nombre}</p>
          )}
        </div>

        {/* Razón social */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Razón Social
          </label>
          <input
            type="text"
            value={datos.razonSocial || ""}
            onChange={handleChange("razonSocial")}
            className={inputBase}
            placeholder="Ej: Publicidad Digital S.A. de C.V."
            disabled={loading}
          />
        </div>

        {/* RFC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RFC *
          </label>
          <input
            type="text"
            value={datos.rfc}
            onChange={handleChange("rfc")}
            className={errores.rfc ? inputErr : inputBase}
            placeholder="ABC123456XYZ"
            maxLength={13}
            disabled={loading}
          />
          {errores.rfc && (
            <p className="text-red-500 text-sm mt-1">{errores.rfc}</p>
          )}
        </div>

        {/* Contactos */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">
            Contactos
          </h4>

          <div className="space-y-4">
            {contactos.map((contacto, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg p-4 space-y-3 relative"
              >
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => eliminarContacto(idx)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors text-xl leading-none"
                    disabled={loading}
                    title="Eliminar contacto"
                  >
                    ×
                  </button>
                )}

                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {idx === 0 ? "Contacto principal *" : `Contacto ${idx + 1}`}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={contacto.nombre}
                      onChange={(e) =>
                        handleContactoChange(idx, "nombre", e.target.value)
                      }
                      className={
                        errores[`contacto_${idx}_nombre`] ? inputErr : inputBase
                      }
                      placeholder="Juan Pérez"
                      disabled={loading}
                    />
                    {errores[`contacto_${idx}_nombre`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errores[`contacto_${idx}_nombre`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={contacto.email}
                      onChange={(e) =>
                        handleContactoChange(idx, "email", e.target.value)
                      }
                      className={
                        errores[`contacto_${idx}_email`] ? inputErr : inputBase
                      }
                      placeholder="contacto@empresa.com"
                      disabled={loading}
                    />
                    {errores[`contacto_${idx}_email`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errores[`contacto_${idx}_email`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={contacto.telefono || ""}
                      onChange={(e) =>
                        handleContactoChange(idx, "telefono", e.target.value)
                      }
                      className={inputBase}
                      placeholder="+52 55 1234 5678"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={agregarContacto}
            disabled={loading}
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            <span className="text-lg leading-none font-bold">+</span> Agregar
            otro contacto
          </button>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría *
          </label>
          <input
            type="text"
            value={datos.categoria}
            onChange={handleChange("categoria")}
            className={errores.categoria ? inputErr : inputBase}
            placeholder="Ej: Publicidad Digital, Eventos, Imprenta"
            disabled={loading}
          />
          {errores.categoria && (
            <p className="text-red-500 text-sm mt-1">{errores.categoria}</p>
          )}
        </div>

        {/* Dirección */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">
            Dirección
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calle
            </label>
            <input
              type="text"
              value={datos.calle}
              onChange={handleChange("calle")}
              className={inputBase}
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
                className={inputBase}
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
                className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
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
              className={inputBase}
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
