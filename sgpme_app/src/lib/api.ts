const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/token`,
  REGISTER: `${API_BASE_URL}/auth/`,
  USER_PROFILE: `${API_BASE_URL}/auth/user`,
} as const;

export const MARCAS_ENDPOINTS = {
  GET_ALL: `${API_BASE_URL}/marcas/marca/`,
  GET_BY_ID: (id: string) => `${API_BASE_URL}/marcas/marca/${id}`,
  CREATE: `${API_BASE_URL}/marcas/marca/`,
  UPDATE: (id: string) => `${API_BASE_URL}/marcas/marca/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/marcas/marca/${id}`,
} as const;

export const EVENTOS_ENDPOINTS = {
  GET_ALL: `${API_BASE_URL}/eventos/`,
  GET_BY_ID: (id: string) => `${API_BASE_URL}/eventos/${id}`,
  CREATE: `${API_BASE_URL}/eventos/`,
  UPDATE: (id: string) => `${API_BASE_URL}/eventos/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/eventos/${id}`,
} as const;

export const FACTURAS_ENDPOINTS = {
  GET_ALL: `${API_BASE_URL}/facturas/`,
  GET_BY_ID: (id: string) => `${API_BASE_URL}/facturas/${id}`,
  CREATE: `${API_BASE_URL}/facturas/`,
  UPDATE: (id: string) => `${API_BASE_URL}/facturas/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/facturas/${id}`,
  AUTORIZAR: (id: string) => `${API_BASE_URL}/facturas/${id}/autorizar`,
  MARCAR_PAGADA: (id: string) => `${API_BASE_URL}/facturas/${id}/marcar-pagada`,
} as const;

export const PROYECCIONES_ENDPOINTS = {
  GET_ALL: `${API_BASE_URL}/proyecciones/`,
  GET_BY_ID: (id: string) => `${API_BASE_URL}/proyecciones/${id}`,
  CREATE: `${API_BASE_URL}/proyecciones/`,
  UPDATE: (id: string) => `${API_BASE_URL}/proyecciones/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/proyecciones/${id}`,
  RESUMEN_POR_MARCA: `${API_BASE_URL}/proyecciones/resumen/por-marca`,
} as const;

export const PROVEEDORES_ENDPOINTS = {
  GET_ALL: `${API_BASE_URL}/proveedores/`,
  GET_BY_ID: (id: string) => `${API_BASE_URL}/proveedores/${id}`,
  CREATE: `${API_BASE_URL}/proveedores/`,
  UPDATE: (id: string) => `${API_BASE_URL}/proveedores/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/proveedores/${id}`,
  TOGGLE_ACTIVO: (id: string) =>
    `${API_BASE_URL}/proveedores/${id}/toggle-activo`,
} as const;

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("token");

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return response;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

export function handleApiError(error: unknown): string {
  const apiError = error as ApiError;
  if (apiError.response?.data?.detail) {
    return apiError.response.data.detail;
  }
  if (apiError.message) {
    return apiError.message;
  }
  return "Ha ocurrido un error inesperado";
}
