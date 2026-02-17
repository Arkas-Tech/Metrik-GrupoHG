"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuthUnified";
import { TrashIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserPlusIcon } from "@heroicons/react/24/solid";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Usuario {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

interface FormularioUsuario {
  username: string;
  email: string;
  full_name: string;
  role: string;
  password: string;
}

interface GestionAccesosProps {
  onClose: () => void;
}

export default function GestionAccesos({ onClose }: GestionAccesosProps) {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formulario, setFormulario] = useState<FormularioUsuario>({
    username: "",
    email: "",
    full_name: "",
    role: "coordinador",
    password: "",
  });

  const roles = [
    { value: "administrador", label: "Administrador", color: "red" },
    { value: "coordinador", label: "Coordinador", color: "blue" },
    { value: "auditor", label: "Auditor", color: "green" },
  ];

  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Si es coordinador, solo mostrar su propio usuario
        if (usuario?.tipo === "coordinador") {
          const usuarioActual = data.filter(
            (u: Usuario) => u.id === Number(usuario.id)
          );
          setUsuarios(usuarioActual);
        } else {
          setUsuarios(data);
        }
      } else {
        console.error("Error al cargar usuarios:", response.status);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/auth/`;
      const method = "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formulario),
      });

      if (response.ok) {
        await cargarUsuarios();
        cerrarModal();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  };

  const eliminarUsuario = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/auth/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await cargarUsuarios();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || "Error al eliminar usuario"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  };

  const abrirModal = () => {
    setFormulario({
      username: "",
      email: "",
      full_name: "",
      role: "coordinador",
      password: "",
    });
    setShowModal(true);
    setShowPassword(false);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setShowPassword(false);
  };

  const getRoleColor = (role: string) => {
    const roleInfo = roles.find((r) => r.value === role);
    return roleInfo?.color || "gray";
  };

  const getRoleBadgeClass = (role: string) => {
    const color = getRoleColor(role);
    const colorClasses = {
      red: "bg-red-100 text-red-800 border-red-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      colorClasses[color as keyof typeof colorClasses]
    }`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3">Cargando usuarios...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-full flex flex-col">
        <div className="overflow-y-auto flex-1 p-6">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {usuario?.tipo === "coordinador"
                    ? "Mi Perfil"
                    : "Gestión de Accesos"}
                </h1>
                <p className="text-gray-600 mt-1">
                  {usuario?.tipo === "coordinador"
                    ? "Administra tu información personal"
                    : "Administra usuarios, roles y permisos del sistema"}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-md transition-colors"
                  title="Volver"
                >
                  ✕
                </button>
                {usuario?.tipo === "administrador" && (
                  <button
                    onClick={() => abrirModal()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                    <span>Nuevo Usuario</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Usuarios del Sistema ({usuarios.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {usuarios.map((user) => (
                <div key={user.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="shrink-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          @{user.username}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className={getRoleBadgeClass(user.role)}>
                        {roles.find((r) => r.value === user.role)?.label ||
                          user.role}
                      </span>

                      <div className="flex items-center space-x-2">
                        {usuario?.tipo === "administrador" &&
                          user.id !== Number(usuario?.id) && (
                            <button
                              onClick={() => eliminarUsuario(user.id)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                              title="Eliminar usuario"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Nuevo Usuario
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={formulario.full_name}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                          setFormulario({
                            ...formulario,
                            username: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        disabled={usuario?.tipo === "coordinador"}
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
                          setFormulario({
                            ...formulario,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        required
                      />
                    </div>

                    {usuario?.tipo === "administrador" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rol
                        </label>
                        <select
                          value={formulario.role}
                          onChange={(e) =>
                            setFormulario({
                              ...formulario,
                              role: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          required
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formulario.password}
                          onChange={(e) =>
                            setFormulario({
                              ...formulario,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-4 h-4" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={cerrarModal}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Crear
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
