"use client";

import { useState, useEffect } from "react";
import { fetchConToken } from "@/lib/auth-utils";

export interface Categoria {
  id: number;
  nombre: string;
  subcategorias: string[];
  activo: boolean;
  orden: number;
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetchConToken(`${API_URL}/categorias?activo=true`);

      if (!response.ok) {
        throw new Error("Error al cargar categorías");
      }

      const data = await response.json();
      setCategorias(data);
      setError(null);
    } catch (err) {
      console.error("Error cargando categorías:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      // En caso de error, usar categorías por defecto
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // Obtener solo los nombres de las categorías activas
  const nombresCategorias = categorias.map((cat) => cat.nombre);

  // Crear objeto de subcategorías por categoría
  const subcategoriasPorCategoria: Record<string, string[]> = {};
  categorias.forEach((cat) => {
    subcategoriasPorCategoria[cat.nombre] = cat.subcategorias;
  });

  return {
    categorias,
    nombresCategorias,
    subcategoriasPorCategoria,
    loading,
    error,
    refetch: fetchCategorias,
  };
}
