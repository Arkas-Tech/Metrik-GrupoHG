"use client";

import { useState, useEffect } from "react";
import { useProveedoresAPI } from "@/hooks/useProveedoresAPI";
import { Proveedor } from "@/types";
import ListaProveedores from "@/components/ListaProveedores";
import FormularioProveedor from "@/components/FormularioProveedor";
import { showToast } from "@/lib/toast";

export default function ProveedoresPage() {
  const {
    proveedores,
    loading,
    cargarProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
  } = useProveedoresAPI();

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
      showToast(
        error instanceof Error ? error.message : "Error al guardar proveedor",
        "error",
      );
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
