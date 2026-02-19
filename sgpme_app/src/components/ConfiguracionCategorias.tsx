"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  useCategoriasAPI,
  Categoria,
  CategoriaFormData,
} from "@/hooks/useCategoriasAPI";
import { useToast } from "@/hooks/useToast";

interface ConfiguracionCategoriasProps {
  onRefresh?: () => void;
}

export default function ConfiguracionCategorias({
  onRefresh,
}: ConfiguracionCategoriasProps) {
  const { showToast, ToastContainer } = useToast();
  const {
    cargarCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    restaurarCategoria,
    loading,
  } = useCategoriasAPI();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState<CategoriaFormData>({
    nombre: "",
    subcategorias: [],
    activo: true,
    orden: 0,
  });
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");

  const cargarCategoriasList = async () => {
    try {
      const cats = await cargarCategorias(mostrarInactivas ? undefined : true);
      setCategorias(cats);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  useEffect(() => {
    cargarCategoriasList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivas]);

  const abrirFormularioNuevo = () => {
    setEditando(null);
    setFormData({
      nombre: "",
      subcategorias: [],
      activo: true,
      orden: categorias.length + 1,
    });
    setMostrandoFormulario(true);
  };

  const abrirFormularioEditar = (categoria: Categoria) => {
    setEditando(categoria);
    setFormData({
      nombre: categoria.nombre,
      subcategorias: [...categoria.subcategorias],
      activo: categoria.activo,
      orden: categoria.orden,
    });
    setMostrandoFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrandoFormulario(false);
    setEditando(null);
    setFormData({
      nombre: "",
      subcategorias: [],
      activo: true,
      orden: 0,
    });
    setNuevaSubcategoria("");
  };

  const handleAgregarSubcategoria = () => {
    if (nuevaSubcategoria.trim()) {
      setFormData({
        ...formData,
        subcategorias: [...formData.subcategorias, nuevaSubcategoria.trim()],
      });
      setNuevaSubcategoria("");
    }
  };

  const handleEliminarSubcategoria = (index: number) => {
    setFormData({
      ...formData,
      subcategorias: formData.subcategorias.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editando) {
        await actualizarCategoria(editando.id, formData);
        showToast("Categoría actualizada exitosamente", "success");
      } else {
        await crearCategoria(formData);
        showToast("Categoría creada exitosamente", "success");
      }

      cerrarFormulario();
      await cargarCategoriasList();

      // Trigger refresh del sistema
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      showToast("Error al guardar la categoría", "error");
    }
  };

  const handleEliminar = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar esta categoría?")) {
      try {
        await eliminarCategoria(id);
        await cargarCategoriasList();
        showToast("Categoría desactivada exitosamente", "success");

        // Trigger refresh del sistema
        if (onRefresh) {
          setTimeout(() => onRefresh(), 500);
        }
      } catch (error) {
        console.error("Error al eliminar categoría:", error);
        showToast("Error al eliminar la categoría", "error");
      }
    }
  };

  const handleRestaurar = async (id: number) => {
    try {
      await restaurarCategoria(id);
      await cargarCategoriasList();
      showToast("Categoría restaurada exitosamente", "success");

      // Trigger refresh del sistema
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (error) {
      console.error("Error al restaurar categoría:", error);
      showToast("Error al restaurar la categoría", "error");
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Configuración de Categorías
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona las categorías y subcategorías del sistema
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Controles */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={abrirFormularioNuevo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nueva Categoría
            </button>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarInactivas}
                onChange={(e) => setMostrarInactivas(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Mostrar categorías inactivas
              </span>
            </label>
          </div>

          {/* Lista de categorías */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando categorías...</p>
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay categorías disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className={`border rounded-lg p-4 ${
                    categoria.activo
                      ? "border-gray-200 bg-white"
                      : "border-gray-300 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {categoria.nombre}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Orden: {categoria.orden}
                        </span>
                        {!categoria.activo && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                            Inactiva
                          </span>
                        )}
                      </div>

                      {categoria.subcategorias.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-1">
                            Subcategorías:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {categoria.subcategorias.map((sub, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {categoria.activo ? (
                        <>
                          <button
                            onClick={() => abrirFormularioEditar(categoria)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEliminar(categoria.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestaurar(categoria.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restaurar"
                        >
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario Modal */}
          {mostrandoFormulario && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {editando ? "Editar Categoría" : "Nueva Categoría"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={formData.orden}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          orden: parseInt(e.target.value),
                        })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategorías
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={nuevaSubcategoria}
                        onChange={(e) => setNuevaSubcategoria(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAgregarSubcategoria();
                          }
                        }}
                        placeholder="Nueva subcategoría"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarSubcategoria}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {formData.subcategorias.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => handleEliminarSubcategoria(idx)}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) =>
                        setFormData({ ...formData, activo: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">Activa</label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={cerrarFormulario}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {editando ? "Actualizar" : "Crear"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
