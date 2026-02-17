"use client";

import { useState, useCallback } from "react";

export interface Categoria {
  id: number;
  nombre: string;
  subcategorias: string[];
  activo: boolean;
  orden: number;
}

export interface CategoriaFormData {
  nombre: string;
  subcategorias: string[];
  activo: boolean;
  orden: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Función auxiliar para asegurar que las URLs tengan slash al final para el proxy
// EXCEPTO cuando terminan en un ID o parámetro específico
const ensureTrailingSlash = (url: string): string => {
  // Si la URL tiene query params, insertamos el slash antes de los params
  if (url.includes("?")) {
    const [path, query] = url.split("?");
    // No agregar slash si termina en un número (ID) o palabra clave como "restore"
    if (/\/\d+$|\/restore$/.test(path)) {
      return url;
    }
    return path.endsWith("/") ? url : `${path}/?${query}`;
  }
  // Si termina en un número (ID) o palabra clave, no agregar slash
  if (/\/\d+$|\/restore$/.test(url)) {
    return url;
  }
  // Si no tiene query params, simplemente agregamos el slash al final si no lo tiene
  return url.endsWith("/") ? url : `${url}/`;
};

export function useCategoriasAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const cargarCategorias = useCallback(
    async (activo?: boolean): Promise<Categoria[]> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activo !== undefined) params.append("activo", activo.toString());

        const url = ensureTrailingSlash(
          `${API_BASE_URL}/categorias${params.toString() ? `?${params.toString()}` : ""}`,
        );

        const response = await fetch(url, {
          headers: getAuthHeader(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al cargar categorías");
        }

        const categorias = await response.json();
        return categorias;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const obtenerCategoria = useCallback(
    async (id: number): Promise<Categoria> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          ensureTrailingSlash(`${API_BASE_URL}/categorias/${id}`),
          {
            headers: getAuthHeader(),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al obtener categoría");
        }

        const categoria = await response.json();
        return categoria;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const crearCategoria = useCallback(
    async (
      datos: CategoriaFormData,
    ): Promise<{ message: string; id: number }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/categorias/`, {
          method: "POST",
          headers: getAuthHeader(),
          body: JSON.stringify(datos),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al crear categoría");
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const actualizarCategoria = useCallback(
    async (
      id: number,
      datos: CategoriaFormData,
    ): Promise<{ message: string }> => {
      setLoading(true);
      setError(null);

      try {
        const url = ensureTrailingSlash(`${API_BASE_URL}/categorias/${id}`);
        console.log("🔄 Actualizando categoría:", { id, url, datos });

        const response = await fetch(url, {
          method: "PUT",
          headers: getAuthHeader(),
          body: JSON.stringify(datos),
        });

        console.log(
          "📥 Respuesta recibida:",
          response.status,
          response.statusText,
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Error desconocido" }));
          console.error("❌ Error en respuesta:", errorData);
          throw new Error(errorData.detail || "Error al actualizar categoría");
        }

        const result = await response.json();
        console.log("✅ Categoría actualizada:", result);
        return result;
      } catch (err) {
        console.error("❌ Error en actualizarCategoria:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const eliminarCategoria = useCallback(
    async (id: number): Promise<{ message: string }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          ensureTrailingSlash(`${API_BASE_URL}/categorias/${id}`),
          {
            method: "DELETE",
            headers: getAuthHeader(),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al eliminar categoría");
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const restaurarCategoria = useCallback(
    async (id: number): Promise<{ message: string }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          ensureTrailingSlash(`${API_BASE_URL}/categorias/${id}/restore`),
          {
            method: "POST",
            headers: getAuthHeader(),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Error al restaurar categoría");
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    cargarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    restaurarCategoria,
  };
}
