"use client";

import React, { useState, useEffect } from "react";
import { Evento, GastoEvento, MARCAS, TIPOS_EVENTO } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";
import DateInput from "./DateInput";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface FormularioEventoProps {
  eventoInicial?: Evento;
  onSubmit: (
    evento: Omit<Evento, "id" | "fechaCreacion" | "fechaModificacion">,
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function FormularioEvento({
  eventoInicial,
  onSubmit,
  onCancel,
  loading = false,
}: FormularioEventoProps) {
  const getFormularioInicial = () => {
    if (eventoInicial) {
      return {
        nombre: eventoInicial.nombre,
        marca: eventoInicial.marca,
        fechaInicio: eventoInicial.fechaInicio,
        fechaFin: eventoInicial.fechaFin || "",
        fechasTentativas: eventoInicial.fechasTentativas || [],
        estado: eventoInicial.estado,
        objetivo: eventoInicial.objetivo,
        audiencia: eventoInicial.audiencia,
        responsable: eventoInicial.responsable,
        presupuestoEstimado: eventoInicial.presupuestoEstimado,
        descripcion: eventoInicial.descripcion || "",
        ubicacion: eventoInicial.ubicacion || "",
        tipoEvento: eventoInicial.tipoEvento,
        gastosProyectados: eventoInicial.gastosProyectados || [],
        creadoPor: eventoInicial.creadoPor,
      };
    }
    return {
      nombre: "",
      marca: "",
      fechaInicio: "",
      fechaFin: "",
      fechasTentativas: [] as string[],
      estado: "Prospectado" as Evento["estado"],
      objetivo: "",
      audiencia: "",
      responsable: "",
      presupuestoEstimado: 0,
      descripcion: "",
      ubicacion: "",
      tipoEvento: "",
      gastosProyectados: [] as GastoEvento[],
      creadoPor: "usuario_actual",
    };
  };

  const [formData, setFormData] = useState(getFormularioInicial);

  const [fechaTentativa, setFechaTentativa] = useState("");
  const [errores, setErrores] = useState<{ [key: string]: string }>({});
  const [coordinadores, setCoordinadores] = useState<
    Array<{ id: number; full_name: string }>
  >([]);

  useEffect(() => {
    const cargarCoordinadores = async () => {
      try {
        const response = await fetchConToken(`${API_URL}/auth/coordinadores`);
        if (response.ok) {
          const data = await response.json();
          setCoordinadores(data);
        }
      } catch (error) {
        console.error("Error al cargar coordinadores:", error);
      }
    };
    cargarCoordinadores();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "presupuestoEstimado"
          ? value === ""
            ? ""
            : parseFloat(value.replace(/,/g, "")) || 0
          : value,
    }));

    if (errores[name]) {
      setErrores((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const agregarFechaTentativa = () => {
    if (fechaTentativa && !formData.fechasTentativas.includes(fechaTentativa)) {
      setFormData((prev) => ({
        ...prev,
        fechasTentativas: [...prev.fechasTentativas, fechaTentativa],
      }));
      setFechaTentativa("");
    }
  };

  const removerFechaTentativa = (fecha: string) => {
    setFormData((prev) => ({
      ...prev,
      fechasTentativas: prev.fechasTentativas.filter((f) => f !== fecha),
    }));
  };

  const validarFormulario = () => {
    const nuevosErrores: { [key: string]: string } = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = "El nombre del evento es requerido";
    }

    if (!formData.marca) {
      nuevosErrores.marca = "La agencia es requerida";
    }

    if (!formData.fechaInicio) {
      nuevosErrores.fechaInicio = "La fecha de inicio es requerida";
    }

    if (!formData.fechaFin) {
      nuevosErrores.fechaFin = "La fecha de fin es requerida";
    }

    if (!formData.objetivo.trim()) {
      nuevosErrores.objetivo = "El objetivo es requerido";
    }

    if (!formData.audiencia.trim()) {
      nuevosErrores.audiencia = "La audiencia es requerida";
    }

    if (!formData.responsable.trim()) {
      nuevosErrores.responsable = "El responsable es requerido";
    }

    if (!formData.tipoEvento) {
      nuevosErrores.tipoEvento = "El tipo de evento es requerido";
    }

    if (!formData.presupuestoEstimado || formData.presupuestoEstimado <= 0) {
      nuevosErrores.presupuestoEstimado = "El presupuesto debe ser mayor a 0";
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
      await onSubmit(formData);
    } catch (error) {
      console.error("Error al guardar evento:", error);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Evento *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.nombre ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Ej: Lanzamiento Nuevo Modelo Subaru"
              disabled={loading}
            />
            {errores.nombre && (
              <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agencia *
            </label>
            <select
              name="marca"
              value={formData.marca}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.marca ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Selecciona una agencia</option>
              {MARCAS.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
            {errores.marca && (
              <p className="mt-1 text-sm text-red-600">{errores.marca}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento *
            </label>
            <select
              name="tipoEvento"
              value={formData.tipoEvento}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.tipoEvento ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Selecciona un tipo</option>
              {TIPOS_EVENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            {errores.tipoEvento && (
              <p className="mt-1 text-sm text-red-600">{errores.tipoEvento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={loading}
            >
              <option value="Prospectado">Prospectado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Por Suceder">Por Suceder</option>
              <option value="Realizado">Realizado</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio *
            </label>
            <DateInput
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fechaInicio: value }));
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.fechaInicio ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errores.fechaInicio && (
              <p className="mt-1 text-sm text-red-600">{errores.fechaInicio}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Fin <span className="text-red-500">*</span>
            </label>
            <DateInput
              name="fechaFin"
              value={formData.fechaFin}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, fechaFin: value }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={loading}
            />
            {errores.fechaFin && (
              <p className="mt-1 text-sm text-red-600">{errores.fechaFin}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fechas Tentativas
            </label>
            <div className="flex space-x-2">
              <DateInput
                value={fechaTentativa}
                onChange={setFechaTentativa}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              />
              <button
                type="button"
                onClick={agregarFechaTentativa}
                disabled={!fechaTentativa || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
        {formData.fechasTentativas.length > 0 && (
          <div className="space-y-2">
            {formData.fechasTentativas.map((fecha, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
              >
                <span className="text-gray-900">{formatearFecha(fecha)}</span>
                <button
                  type="button"
                  onClick={() => removerFechaTentativa(fecha)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Objetivo del Evento *
          </label>
          <textarea
            name="objetivo"
            value={formData.objetivo}
            onChange={handleInputChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errores.objetivo ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Describe el objetivo principal del evento..."
            disabled={loading}
          />
          {errores.objetivo && (
            <p className="mt-1 text-sm text-red-600">{errores.objetivo}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audiencia Objetivo *
          </label>
          <textarea
            name="audiencia"
            value={formData.audiencia}
            onChange={handleInputChange}
            rows={2}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              errores.audiencia ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Ej: Medios especializados, clientes VIP, distribuidores..."
            disabled={loading}
          />
          {errores.audiencia && (
            <p className="mt-1 text-sm text-red-600">{errores.audiencia}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable *
            </label>
            <select
              name="responsable"
              value={formData.responsable}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.responsable ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Seleccione un coordinador</option>
              {coordinadores.map((coord) => (
                <option key={coord.id} value={coord.full_name}>
                  {coord.full_name}
                </option>
              ))}
            </select>
            {errores.responsable && (
              <p className="mt-1 text-sm text-red-600">{errores.responsable}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presupuesto Estimado *
            </label>
            <input
              type="text"
              name="presupuestoEstimado"
              value={
                formData.presupuestoEstimado
                  ? new Intl.NumberFormat("es-MX").format(
                      formData.presupuestoEstimado,
                    )
                  : ""
              }
              onChange={(e) => {
                const valor = e.target.value.replace(/,/g, "");
                if (valor === "" || /^\d+\.?\d{0,2}$/.test(valor)) {
                  handleInputChange({
                    target: {
                      name: "presupuestoEstimado",
                      value: valor,
                    },
                  } as React.ChangeEvent<HTMLInputElement>);
                }
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errores.presupuestoEstimado
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="0.00"
              disabled={loading}
            />
            {errores.presupuestoEstimado && (
              <p className="mt-1 text-sm text-red-600">
                {errores.presupuestoEstimado}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Descripción adicional del evento..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación
            </label>
            <textarea
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Lugar donde se realizará el evento..."
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>
              {loading
                ? "Guardando..."
                : eventoInicial
                  ? "Actualizar Evento"
                  : "Crear Evento"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
