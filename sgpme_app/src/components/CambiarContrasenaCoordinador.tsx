"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuthUnified";
import { EyeIcon, EyeSlashIcon, KeyIcon } from "@heroicons/react/24/outline";
import { showToast } from "@/lib/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface CambiarContrasenaCoordinadorProps {
  onClose: () => void;
}

export default function CambiarContrasenaCoordinador({
  onClose,
}: CambiarContrasenaCoordinadorProps) {
  const { usuario } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formulario, setFormulario] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errores, setErrores] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validarFormulario = (): boolean => {
    const nuevosErrores = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    let esValido = true;

    if (!formulario.currentPassword) {
      nuevosErrores.currentPassword = "La contraseña actual es requerida";
      esValido = false;
    }

    if (!formulario.newPassword) {
      nuevosErrores.newPassword = "La nueva contraseña es requerida";
      esValido = false;
    } else if (formulario.newPassword.length < 6) {
      nuevosErrores.newPassword =
        "La contraseña debe tener al menos 6 caracteres";
      esValido = false;
    }

    if (!formulario.confirmPassword) {
      nuevosErrores.confirmPassword = "Debe confirmar la nueva contraseña";
      esValido = false;
    } else if (formulario.newPassword !== formulario.confirmPassword) {
      nuevosErrores.confirmPassword = "Las contraseñas no coinciden";
      esValido = false;
    }

    setErrores(nuevosErrores);
    return esValido;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/auth/change-password`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: formulario.currentPassword,
          new_password: formulario.newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast("✅ " + data.message, "success");
        onClose();

        // Limpiar formulario
        setFormulario({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const error = await response.json();
        if (error.detail === "La contraseña actual es incorrecta") {
          setErrores({
            ...errores,
            currentPassword: error.detail,
          });
        } else {
          showToast(`Error: ${error.detail || "Error desconocido"}`, "error");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Error de conexión. Por favor, intenta nuevamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <KeyIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Cambiar Contraseña
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Cerrar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Actualiza tu contraseña de forma segura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Usuario actual */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Usuario:</span>{" "}
                {usuario?.nombre || ""}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Email:</span>{" "}
                {usuario?.email || ""}
              </p>
            </div>

            {/* Contraseña actual */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={formulario.currentPassword}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      currentPassword: e.target.value,
                    })
                  }
                  className={`block w-full rounded-md pr-10 py-3 text-gray-900 placeholder-gray-400 ${
                    errores.currentPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  } shadow-sm`}
                  placeholder="Ingresa tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errores.currentPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errores.currentPassword}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={formulario.newPassword}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      newPassword: e.target.value,
                    })
                  }
                  className={`block w-full rounded-md pr-10 py-3 text-gray-900 placeholder-gray-400 ${
                    errores.newPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  } shadow-sm`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errores.newPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errores.newPassword}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirmar nueva contraseña{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formulario.confirmPassword}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`block w-full rounded-md pr-10 py-3 text-gray-900 placeholder-gray-400 ${
                    errores.confirmPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  } shadow-sm`}
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errores.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errores.confirmPassword}
                </p>
              )}
            </div>

            {/* Consejos de seguridad */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 mb-1">
                💡 Consejos de seguridad:
              </p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Usa al menos 6 caracteres</li>
                <li>• Combina letras, números y símbolos</li>
                <li>• No uses información personal</li>
                <li>• Evita contraseñas comunes</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Guardando...
                </span>
              ) : (
                "Cambiar Contraseña"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
