"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { Usuario, TipoUsuario, PermisosUsuario } from "@/types";
import { AUTH_ENDPOINTS } from "@/lib/api";

const PERMISOS_POR_TIPO: Record<TipoUsuario, PermisosUsuario> = {
  administrador: {
    proyecciones: {
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
      exportar: true,
    },
    facturas: {
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
      autorizar: true,
      marcarPagada: true,
      exportar: true,
    },
    dashboard: {
      verEstadisticas: true,
      verMetricas: true,
      verConsolidado: true,
    },
    sistema: {
      gestionUsuarios: true,
      configuracion: true,
      auditoria: true,
    },
  },
  coordinador: {
    proyecciones: {
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
      exportar: true,
    },
    facturas: {
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
      autorizar: false,
      marcarPagada: true,
      exportar: true,
    },
    dashboard: {
      verEstadisticas: true,
      verMetricas: true,
      verConsolidado: false,
    },
    sistema: {
      gestionUsuarios: false,
      configuracion: false,
      auditoria: false,
    },
  },
  auditor: {
    proyecciones: {
      crear: false,
      editar: false,
      eliminar: false,
      ver: true,
      exportar: true,
    },
    facturas: {
      crear: false,
      editar: false,
      eliminar: false,
      ver: true,
      autorizar: false,
      marcarPagada: false,
      exportar: true,
    },
    dashboard: {
      verEstadisticas: true,
      verMetricas: true,
      verConsolidado: true,
    },
    sistema: {
      gestionUsuarios: false,
      configuracion: false,
      auditoria: true,
    },
  },
};

interface AuthContextType {
  usuario: Usuario | null;
  permisos: PermisosUsuario | null;
  loading: boolean;
  iniciarSesion: (username: string, password: string) => Promise<boolean>;
  cerrarSesion: () => void;
  tienePermiso: (modulo: keyof PermisosUsuario, accion: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<PermisosUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const response = await fetch(AUTH_ENDPOINTS.USER_PROFILE, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            // IMPORTANTE: Obtener datos actualizados del backend, no del localStorage
            const userData = await response.json();

            const usuarioMapeado: Usuario = {
              id: userData.id.toString(),
              nombre: userData.full_name,
              email: userData.email,
              tipo: userData.role as TipoUsuario,
              grupo: "Grupo HG",
              fechaCreacion: new Date().toISOString().split("T")[0],
              activo: true,
            };

            console.log(
              "useAuthBackend - Usuario del backend:",
              usuarioMapeado
            );
            console.log("useAuthBackend - Tipo:", usuarioMapeado.tipo);

            setUsuario(usuarioMapeado);
            setPermisos(PERMISOS_POR_TIPO[usuarioMapeado.tipo]);
            // Actualizar localStorage con datos frescos del backend
            localStorage.setItem("usuario", JSON.stringify(usuarioMapeado));
          } else {
            console.error(
              "useAuthBackend - Error en verificación, limpiando sesión"
            );
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
          }
        } catch (error) {
          console.error("Error al verificar sesión:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
        }
      }
      setLoading(false);
    };

    verificarSesion();
  }, []);

  const iniciarSesion = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setLoading(true);

    try {
      // IMPORTANTE: Limpiar localStorage ANTES de iniciar sesión
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { access_token } = data;

        localStorage.setItem("token", access_token);

        const userResponse = await fetch(AUTH_ENDPOINTS.USER_PROFILE, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();

          const usuarioMapeado: Usuario = {
            id: userData.id.toString(),
            nombre: userData.full_name,
            email: userData.email,
            tipo: userData.role as TipoUsuario,
            grupo: "Grupo HG",
            fechaCreacion: new Date().toISOString().split("T")[0],
            activo: true,
          };

          setUsuario(usuarioMapeado);
          setPermisos(PERMISOS_POR_TIPO[usuarioMapeado.tipo]);
          localStorage.setItem("usuario", JSON.stringify(usuarioMapeado));

          setLoading(false);
          return true;
        }
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }

    setLoading(false);
    return false;
  };

  const cerrarSesion = () => {
    setUsuario(null);
    setPermisos(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  };

  const tienePermiso = (
    modulo: keyof PermisosUsuario,
    accion: string
  ): boolean => {
    if (!permisos || !permisos[modulo]) return false;

    const moduloPermisos = permisos[modulo];
    return (moduloPermisos as Record<string, boolean>)[accion] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        permisos,
        loading,
        iniciarSesion,
        cerrarSesion,
        tienePermiso,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
