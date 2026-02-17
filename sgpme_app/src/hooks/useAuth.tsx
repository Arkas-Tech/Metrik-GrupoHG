"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { Usuario, TipoUsuario, PermisosUsuario } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
      eliminar: false,
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

const USUARIOS_SISTEMA = [
  {
    username: "yosch",
    password: "ay123",
    usuario: {
      id: "1",
      nombre: "Yosmar Chavez",
      email: "yosch@grupohg.com",
      tipo: "administrador" as TipoUsuario,
      grupo: "Grupo HG - Chihuahua",
      fechaCreacion: "2024-01-01",
      activo: true,
    },
  },
  {
    username: "phaddad",
    password: "test123",
    usuario: {
      id: "2",
      nombre: "Pablo Haddad",
      email: "phaddad@grupohg.com.mx",
      tipo: "administrador" as TipoUsuario,
      grupo: "Grupo HG - Chihuahua",
      fechaCreacion: "2024-01-01",
      activo: true,
    },
  },
  {
    username: "rcamacho",
    password: "test123",
    usuario: {
      id: "3",
      nombre: "Rodrigo Camacho",
      email: "gtemercadotecnia@grupohg.com.mx",
      tipo: "administrador" as TipoUsuario,
      grupo: "Grupo HG - Chihuahua",
      fechaCreacion: "2024-01-01",
      activo: true,
    },
  },
  {
    username: "pvillalobos",
    password: "test123",
    usuario: {
      id: "4",
      nombre: "Perla Villalobos",
      email: "mercadotecnia@grupohg.com.mx",
      tipo: "coordinador" as TipoUsuario,
      grupo: "Grupo HG - Chihuahua",
      fechaCreacion: "2024-01-15",
      activo: true,
    },
  },
  {
    username: "lfierro",
    password: "test123",
    usuario: {
      id: "5",
      nombre: "Lesly Fierro",
      email: "mercadotecnia2@grupohg.com.mx",
      tipo: "coordinador" as TipoUsuario,
      grupo: "Grupo HG - Chihuahua",
      fechaCreacion: "2024-01-15",
      activo: true,
    },
  },
  {
    username: "dguzman",
    password: "test123",
    usuario: {
      id: "6",
      nombre: "Dafne Guzman",
      email: "mercadotecniajrz@grupohg.com.mx",
      tipo: "coordinador" as TipoUsuario,
      grupo: "Grupo HG - Juárez",
      fechaCreacion: "2024-01-15",
      activo: true,
    },
  },
  {
    username: "iestupinan",
    password: "test123",
    usuario: {
      id: "7",
      nombre: "Ivan Estupiñan",
      email: "mercadotecniajrz2@grupohg.com.mx",
      tipo: "coordinador" as TipoUsuario,
      grupo: "Grupo HG - Juárez",
      fechaCreacion: "2024-01-15",
      activo: true,
    },
  },
  {
    username: "arosales",
    password: "test123",
    usuario: {
      id: "8",
      nombre: "America Rosales",
      email: "mercadotecniacoah@grupohg.com.mx",
      tipo: "coordinador" as TipoUsuario,
      grupo: "Grupo HG - Coahuila",
      fechaCreacion: "2024-01-15",
      activo: true,
    },
  },
  {
    username: "auditor1",
    password: "test123",
    usuario: {
      id: "9",
      nombre: "Auditor Sistema",
      email: "auditor1@grupohg.com.mx",
      tipo: "auditor" as TipoUsuario,
      grupo: "Grupo HG - Auditoria",
      fechaCreacion: "2024-01-20",
      activo: true,
    },
  },
];

const USUARIOS_DEMO: Usuario[] = USUARIOS_SISTEMA.map((u) => u.usuario);

interface AuthContextType {
  usuario: Usuario | null;
  permisos: PermisosUsuario | null;
  iniciarSesion: (email: string, password: string) => Promise<boolean>;
  cerrarSesion: () => void;
  cambiarUsuario: (usuarioId: string) => void;
  loading: boolean;
  tienePermiso: (modulo: keyof PermisosUsuario, accion: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<PermisosUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAutomaticoBackend = async () => {
    try {
      const formData = new FormData();
      formData.append("username", "yosch");
      formData.append("password", "ay123");

      const response = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.access_token;

        localStorage.setItem("token", token);

        const usuarioBackend: Usuario = {
          id: "yosch",
          nombre: "Yosmar Chavez",
          email: "yosch@grupohg.com",
          tipo: "administrador" as TipoUsuario,
          grupo: "Grupo HG - Chihuahua",
          fechaCreacion: new Date().toISOString().split("T")[0],
          activo: true,
        };

        setUsuario(usuarioBackend);
        setPermisos(PERMISOS_POR_TIPO[usuarioBackend.tipo]);
        localStorage.setItem("usuario", JSON.stringify(usuarioBackend));
        return true;
      }
    } catch (error) {
      console.error("Error en login automático:", error);
    }
    return false;
  };

  useEffect(() => {
    const cargarUsuario = async () => {
      const usuarioGuardado = localStorage.getItem("usuario");
      const tokenGuardado = localStorage.getItem("token");

      if (usuarioGuardado && tokenGuardado) {
        try {
          const usuarioData = JSON.parse(usuarioGuardado) as Usuario;
          if (
            usuarioData &&
            usuarioData.tipo &&
            PERMISOS_POR_TIPO[usuarioData.tipo]
          ) {
            setUsuario(usuarioData);
            setPermisos(PERMISOS_POR_TIPO[usuarioData.tipo]);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error al cargar usuario:", error);
          localStorage.removeItem("usuario");
          localStorage.removeItem("token");
        }
      }

      console.log("No hay usuario autenticado, haciendo login automático...");
      const loginExitoso = await loginAutomaticoBackend();
      if (!loginExitoso) {
        console.warn("Login automático falló");
      }
      setLoading(false);
    };

    cargarUsuario();
  }, []);

  const iniciarSesion = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.access_token;

        localStorage.setItem("token", token);

        const usuarioBackend: Usuario = {
          id: username,
          nombre: username === "yosch" ? "Yosmar Chavez" : username,
          email: username.includes("@") ? username : `${username}@grupohg.com`,
          tipo: "administrador" as TipoUsuario,
          grupo: "SGPME Sistema",
          fechaCreacion: new Date().toISOString().split("T")[0],
          activo: true,
        };

        setUsuario(usuarioBackend);
        setPermisos(PERMISOS_POR_TIPO[usuarioBackend.tipo]);
        localStorage.setItem("usuario", JSON.stringify(usuarioBackend));
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.log("Error backend login, intentando sistema local:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const credencialEncontrada = USUARIOS_SISTEMA.find(
      (cred) => cred.username === username && cred.password === password
    );

    if (credencialEncontrada) {
      const usuarioEncontrado = credencialEncontrada.usuario;
      setUsuario(usuarioEncontrado);
      setPermisos(PERMISOS_POR_TIPO[usuarioEncontrado.tipo]);
      localStorage.setItem("usuario", JSON.stringify(usuarioEncontrado));
      setLoading(false);
      return true;
    }

    setLoading(false);
    return false;
  };

  const cerrarSesion = () => {
    setUsuario(null);
    setPermisos(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
  };

  const cambiarUsuario = (usuarioId: string) => {
    const nuevoUsuario = USUARIOS_DEMO.find((u) => u.id === usuarioId);
    if (nuevoUsuario) {
      setUsuario(nuevoUsuario);
      setPermisos(PERMISOS_POR_TIPO[nuevoUsuario.tipo]);
      localStorage.setItem("usuario", JSON.stringify(nuevoUsuario));
    }
  };

  const tienePermiso = (
    modulo: keyof PermisosUsuario,
    accion: string
  ): boolean => {
    if (!permisos) return false;
    const moduloPermisos = permisos[modulo] as Record<string, boolean>;
    return moduloPermisos?.[accion] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        permisos,
        iniciarSesion,
        cerrarSesion,
        cambiarUsuario,
        loading,
        tienePermiso,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}

export const obtenerNombreRol = (tipo: TipoUsuario): string => {
  const nombres = {
    administrador: "Administrador",
    coordinador: "Coordinador",
    auditor: "Auditor",
  };
  return nombres[tipo];
};

export const obtenerColorRol = (tipo: TipoUsuario): string => {
  const colores = {
    administrador: "bg-purple-100 text-purple-800",
    coordinador: "bg-blue-100 text-blue-800",
    auditor: "bg-green-100 text-green-800",
  };
  return colores[tipo];
};

export const obtenerDescripcionRol = (tipo: TipoUsuario): string => {
  const descripciones = {
    administrador:
      "Acceso completo al sistema, gestión de usuarios y configuración",
    coordinador:
      "Gestión de proyecciones y facturas, sin permisos de eliminación",
    auditor: "Solo lectura y exportación, acceso a auditoría del sistema",
  };
  return descripciones[tipo];
};
