"use client";

export const obtenerTokenAutomatico = async (): Promise<string | null> => {
  // Solo retornar el token si existe, sin auto-login
  const token = localStorage.getItem("token");
  return token;
};

// Función auxiliar para normalizar URLs de API
const normalizarUrlApi = (url: string): string => {
  const apiEndpoints = [
    "presupuesto",
    "proyecciones",
    "facturas",
    "eventos",
    "campanas",
    "metricas",
    "marcas",
    "presencias",
    "proveedores",
    "categorias",
  ];

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Verificar si la URL es un endpoint de API
    const isApiEndpoint = apiEndpoints.some((endpoint) => {
      const pattern = new RegExp(`^/${endpoint}($|\\?)`);
      return pattern.test(path);
    });

    if (isApiEndpoint && !path.endsWith("/")) {
      // Agregar slash al final si no lo tiene
      urlObj.pathname = path + "/";
      return urlObj.toString();
    }
  } catch (error) {
    // Si no se puede parsear como URL, asumir que es relativa
    const apiEndpoints = [
      "presupuesto",
      "proyecciones",
      "facturas",
      "eventos",
      "campanas",
      "metricas",
      "marcas",
      "presencias",
      "proveedores",
      "categorias",
    ];

    for (const endpoint of apiEndpoints) {
      const pattern = new RegExp(`/${endpoint}($|\\?)`);
      if (pattern.test(url)) {
        return url.replace(pattern, `/${endpoint}/$1`);
      }
    }
  }

  return url;
};

export const fetchConToken = async (url: string, options: RequestInit = {}) => {
  // Normalizar la URL antes de hacer la petición
  const normalizedUrl = normalizarUrlApi(url);

  const token = await obtenerTokenAutomatico();

  if (!token) {
    // Si no hay token, redirigir al login en lugar de lanzar error
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("No se pudo obtener token de autenticación");
  }

  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const headers = baseHeaders;

  let response = await fetch(normalizedUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    const nuevoToken = await obtenerTokenAutomatico();

    if (nuevoToken) {
      const nuevasHeaders: Record<string, string> = {
        Authorization: `Bearer ${nuevoToken}`,
        ...(options.headers as Record<string, string>),
      };

      if (!(options.body instanceof FormData)) {
        nuevasHeaders["Content-Type"] = "application/json";
      }

      response = await fetch(normalizedUrl, {
        ...options,
        headers: nuevasHeaders,
      });
    }
  }

  return response;
};
