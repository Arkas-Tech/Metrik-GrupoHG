"use client";

import { useState, useEffect } from "react";
import { useProveedoresAPI } from "@/hooks/useProveedoresAPI";
import { Proveedor } from "@/types";
import ListaProveedores from "@/components/ListaProveedores";
import FormularioProveedor from "@/components/FormularioProveedor";

export default function ProveedoresPage() {
  const [errorVisible, setErrorVisible] = useState<string | null>(null);

  const {
    proveedores,
    loading,
    error,
    cargarProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
  } = useProveedoresAPI();

  // Auto-dismiss error banner after 6 seconds
  useEffect(() => {
    if (error) {
      setErrorVisible(error);
      const t = setTimeout(() => setErrorVisible(null), 6000);
      return () => clearTimeout(t);
    } else {
      setErrorVisible(null);
    }
  }, [error]);

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [proveedorEdicion, setProveedorEdicion] = useState<
    Proveedor | undefined
  >(undefined);
  const [procesando, setProcesando] = useState(false);

  const handleSubmitProveedor = async (
    datos: Omit<Proveedor, "id" | "fechaCreacion">,
  ) => {
    setProcesando(true);
    try {
      if (proveedorEdicion) {
        await actualizarProveedor(proveedorEdicion.id, datos);
      } else {
        await crearProveedor(datos);
      }
      await cargarProveedores();
      setMostrandoFormulario(false);
      setProveedorEdicion(undefined);
    } catch (error) {
      console.error("Error al guardar proveedor:", error);
    } finally {
      setProcesando(false);
    }
  };

  const handleEditar = (proveedor: Proveedor) => {
    setProveedorEdicion(proveedor);
    setMostrandoFormulario(true);
  };

  const handleEliminar = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este proveedor?")) {
      await eliminarProveedor(id);
      await cargarProveedores();
    }
  };

  const handleReactivar = async (id: string) => {
    if (confirm("¿Está seguro de reactivar este proveedor?")) {
      const proveedor = proveedores.find((p) => p.id === id);
      if (proveedor) {
        await actualizarProveedor(id, { ...proveedor, activo: true });
        await cargarProveedores();
      }
    }
  };

  const handleCancelarFormulario = () => {
    setMostrandoFormulario(false);
    setProveedorEdicion(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Gestión de Proveedores
          </h2>
          <p className="text-gray-600 mt-1">
            Administra los proveedores compartidos entre todos los perfiles
          </p>
        </div>
        <button
          onClick={() => setMostrandoFormulario(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Proveedor
        </button>
      </div>

      {/* eslint-disable-next-line react-hooks/exhaustive-deps */
      /* Auto-dismiss error after 6s */}
      {errorVisible && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
          <span>{errorVisible}</span>
          <button
            onClick={() => setErrorVisible(null)}
            className="ml-3 text-red-500 hover:text-red-700 font-bold text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {mostrandoFormulario ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {proveedorEdicion ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h3>
          <FormularioProveedor
            proveedor={proveedorEdicion}
            onSubmit={handleSubmitProveedor}
            onCancelar={handleCancelarFormulario}
            loading={procesando}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <ListaProveedores
            proveedores={proveedores}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
            onReactivar={handleReactivar}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
