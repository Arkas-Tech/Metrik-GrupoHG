"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuthUnified";
import RecuperarContrasena from "@/components/RecuperarContrasena";

export default function LoginPage() {
  const router = useRouter();
  const { iniciarSesion, loading } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const exito = await iniciarSesion(username, password);
    if (exito) {
      router.push("/dashboard");
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-lg bg-gray-50 border border-gray-200 shadow-lg rounded-2xl px-8 py-10 animate-fade-in">
        <p className="text-gray-600 text-sm text-center mb-2 tracking-tight">
          Bienvenido(a), inicia sesión
        </p>

        <h1 className="text-4xl font-bold text-blue-800 text-center tracking-wide mb-1">
          SGPME
        </h1>

        <p className="text-gray-600 text-center text-sm mb-6 leading-relaxed">
          Sistema de Gestión de Presupuestos, Métricas de Marketing y Eventos
        </p>

        <form onSubmit={handleLogin} className="grid gap-4">
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm mb-1 font-medium">
              Correo
            </label>
            <input
              type="email"
              placeholder="Ingresa tu correo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white text-gray-800 placeholder-gray-400 border border-gray-300 focus:border-blue-400 outline-none transition shadow-sm"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-700 text-sm mb-1 font-medium">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white text-gray-800 placeholder-gray-400 border border-gray-300 focus:border-blue-400 outline-none transition shadow-sm"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center mt-1 bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-linear-to-r from-[#2857ff] to-[#4c2fff] text-white font-semibold tracking-wide shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>

          <button
            type="button"
            onClick={() => setMostrarRecuperar(true)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>

      <p className="mt-6 text-gray-500 text-xs text-center tracking-wide">
        Powered by Arkas Tech
      </p>

      {mostrarRecuperar && (
        <RecuperarContrasena
          onClose={() => setMostrarRecuperar(false)}
          onSuccess={() => {
            setError("");
            setUsername("");
            setPassword("");
          }}
        />
      )}
    </div>
  );
}
