"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthUnified";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface FormularioPerfil {
  username: string;
  email: string;
  full_name: string;
}

interface GestionPerfilCoordinadorProps {
  onClose: () => void;
}

export default function GestionPerfilCoordinador({
  onClose,
}: GestionPerfilCoordinadorProps) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formulario, setFormulario] = useState<FormularioPerfil>({
    username: "",
    email: "",
    full_name: "",
  });

  useEffect(() => {
    if (usuario) {
      setFormulario({
        username: usuario.nombre || "",
        email: usuario.email || "",
        full_name: usuario.nombre || "",
      });
      setLoading(false);
    }
  }, [usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/auth/users/${usuario?.id}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formulario.username,
          email: formulario.email,
          full_name: formulario.full_name,
          password: "",
          role: usuario?.tipo || "coordinador",
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();

        // Actualizar localStorage con los nuevos datos
        const usuarioActualizado = {
          ...usuario,
          nombre: updatedUser.full_name,
          email: updatedUser.email,
        };
        localStorage.setItem("usuario", JSON.stringify(usuarioActualizado));

        alert("Perfil actualizado exitosamente");
        onClose();
        window.location.reload(); // Recargar para reflejar cambios
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Cargando perfil...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-full flex flex-col">
        <div className="overflow-y-auto flex-1 p-6">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600 mt-1">
                  Administra tu información personal
                </p>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-md transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Información Personal
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formulario.full_name}
                  onChange={(e) =>
                    setFormulario({ ...formulario, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  value={formulario.username}
                  onChange={(e) =>
                    setFormulario({ ...formulario, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formulario.email}
                  onChange={(e) =>
                    setFormulario({ ...formulario, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-900"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
