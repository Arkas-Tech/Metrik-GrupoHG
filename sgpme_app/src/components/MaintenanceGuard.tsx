"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { MAINTENANCE_ENDPOINTS, AUTH_ENDPOINTS } from "@/lib/api";

const DEV_BYPASS_KEY = "sgpme_dev_bypass";

export function useMaintenanceMode() {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(MAINTENANCE_ENDPOINTS.STATUS);
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setMessage(data.message || "");
      }
    } catch {
      // If we can't reach the server, don't block the app
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
      const res = await fetch(MAINTENANCE_ENDPOINTS.TOGGLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setMessage(data.message || "");
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { active, message, loading, toggle, refresh: checkStatus };
}

export default function MaintenanceGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { active, message, loading } = useMaintenanceMode();
  const [devBypass, setDevBypass] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Check for dev bypass on mount
  useEffect(() => {
    const bypass = localStorage.getItem(DEV_BYPASS_KEY);
    if (bypass === "true") {
      // Verify the stored token still belongs to a developer
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.role === "developer") {
            setDevBypass(true);
            return;
          }
        } catch {
          // invalid token
        }
      }
      // Also check stored usuario
      try {
        const stored = localStorage.getItem("usuario");
        if (stored) {
          const u = JSON.parse(stored);
          if (u.tipo === "developer") {
            setDevBypass(true);
            return;
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // While checking maintenance status, render children normally
  if (loading) return <>{children}</>;

  // If maintenance is not active, render normally
  if (!active) return <>{children}</>;

  // If developer bypass is active, render normally
  if (devBypass) return <>{children}</>;

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", loginEmail);
      formData.append("password", loginPassword);

      const res = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 503) {
          setLoginError("Solo developers pueden acceder durante mantenimiento");
        } else {
          setLoginError(data?.detail || "Credenciales incorrectas");
        }
        setLoginLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);

      // Get user profile to verify developer role
      const profileRes = await fetch(AUTH_ENDPOINTS.USER_PROFILE, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.role === "developer") {
          localStorage.setItem(DEV_BYPASS_KEY, "true");
          localStorage.setItem(
            "usuario",
            JSON.stringify({
              id: profile.id.toString(),
              nombre: profile.full_name,
              email: profile.email,
              tipo: profile.role,
              grupo: "Grupo HG",
              fechaCreacion: new Date().toISOString().split("T")[0],
              activo: true,
              permisos: profile.permisos || {},
              permisos_agencias: profile.permisos_agencias || {},
            }),
          );
          // Reload to let auth providers pick up the session
          window.location.reload();
          return;
        } else {
          // Not a developer — clean up
          localStorage.removeItem("token");
          setLoginError("Solo developers pueden acceder durante mantenimiento");
        }
      } else {
        localStorage.removeItem("token");
        setLoginError("Error al verificar perfil");
      }
    } catch {
      setLoginError("Error de conexión");
    }
    setLoginLoading(false);
  };

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setShowDevLogin(true);
      setLogoClicks(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full text-center">
        {/* Logo — tap 5 times to reveal dev login */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleLogoClick}
            className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold focus:outline-none"
            aria-label="Logo"
          >
            HG
          </button>
        </div>

        {showDevLogin ? (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-4">
              Acceso Developer
            </h1>
            <form onSubmit={handleDevLogin} className="space-y-3 text-left">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
              </div>
              {loginError && (
                <p className="text-red-500 text-xs">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loginLoading ? "Verificando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => setShowDevLogin(false)}
                className="w-full text-gray-400 text-xs hover:text-gray-600"
              >
                Cancelar
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Metrik en mantenimiento
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              {message ||
                "Estamos realizando mejoras en la plataforma. Estaremos de vuelta en breve."}
            </p>
            <div className="flex items-center justify-center gap-2 text-purple-600 text-sm font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              Volvemos pronto
            </div>
          </>
        )}
      </div>
    </div>
  );
}
