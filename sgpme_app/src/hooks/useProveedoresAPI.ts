"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Proveedor } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";
import {
  getCached,
  getStale,
  setCache,
  invalidateCacheByPrefix,
  deduplicateRequest,
} from "@/lib/dataCache";

interface ProveedorBackend {
  id: number;
  nombre: string;
  razon_social?: string;
  contacto: string;
  email: string;
  rfc: string;
  telefono?: string;
  direccion?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  contactos_json?: string;
  categoria: string;
  activo: boolean;
  creado_por: string;
  fecha_creacion?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const useProveedoresAPI = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cargarProveedores = useCallback(async () => {
    const cacheKey = "proveedores:all";

    // Return stale data immediately if available
    const stale = getStale<Proveedor[]>(cacheKey);
    if (stale) {
      setProveedores(stale);
      setLoading(false);
    }

    // Skip network if cache is fresh
    const fresh = getCached<Proveedor[]>(cacheKey);
    if (fresh) return;

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!stale) setLoading(true);

      const proveedoresTransformados = await deduplicateRequest<Proveedor[]>(
        cacheKey,
        async () => {
          const response = await fetchConToken(`${API_URL}/proveedores/`, {
            signal: controller.signal,
          });
          if (!response.ok)
            throw new Error(`Error al cargar proveedores: ${response.status}`);
          const data = await response.json();

          return data.map((prov: ProveedorBackend) => ({
            id: prov.id.toString(),
            nombre: prov.nombre || "",
            razonSocial: prov.razon_social || undefined,
            contacto: prov.contacto || "",
            email: prov.email || "",
            rfc: prov.rfc || "",
            telefono: prov.telefono || "",
            direccion: prov.direccion || "",
            calle: prov.calle || "",
            numeroExterior: prov.numero_exterior || "",
            numeroInterior: prov.numero_interior || "",
            colonia: prov.colonia || "",
            ciudad: prov.ciudad || "",
            estado: prov.estado || "",
            codigoPostal: prov.codigo_postal || "",
            contactos: prov.contactos_json
              ? (() => {
                  try {
                    return JSON.parse(prov.contactos_json!);
                  } catch {
                    return [];
                  }
                })()
              : [],
            categoria: prov.categoria || "",
            activo: prov.activo ?? true,
            fechaCreacion: prov.fecha_creacion
              ? prov.fecha_creacion.split("T")[0]
              : new Date().toISOString().split("T")[0],
            fechaModificacion: undefined,
          }));
        },
      );

      if (!controller.signal.aborted) {
        setCache(cacheKey, proveedoresTransformados);
        setProveedores(proveedoresTransformados);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
    return () => {
      abortRef.current?.abort();
    };
  }, [cargarProveedores]);

  const crearProveedor = useCallback(
    async (
      datos: Omit<Proveedor, "id" | "fechaCreacion">,
    ): Promise<Proveedor> => {
      try {
        const proveedorData = {
          nombre: datos.nombre,
          razon_social: datos.razonSocial || null,
          contacto: datos.contacto,
          email: datos.email,
          rfc: datos.rfc,
          telefono: datos.telefono || null,
          direccion: datos.direccion || null,
          calle: datos.calle || null,
          numero_exterior: datos.numeroExterior || null,
          numero_interior: datos.numeroInterior || null,
          colonia: datos.colonia || null,
          ciudad: datos.ciudad || null,
          estado: datos.estado || null,
          codigo_postal: datos.codigoPostal || null,
          contactos_json:
            datos.contactos && datos.contactos.length > 0
              ? JSON.stringify(datos.contactos)
              : null,
          categoria: datos.categoria,
          activo: datos.activo ?? true,
        };

        const response = await fetchConToken(`${API_URL}/proveedores/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proveedorData),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("❌ Error response:", response.status, errorData);
          try {
            const parsed = JSON.parse(errorData);
            if (parsed?.detail) throw new Error(parsed.detail);
          } catch (e) {
            if (e instanceof Error && e.message !== errorData) throw e;
          }
          throw new Error(`Error al crear proveedor: ${response.status}`);
        }

        const proveedorCreado = await response.json();

        invalidateCacheByPrefix("proveedores:");
        await cargarProveedores();

        return {
          id: proveedorCreado.id.toString(),
          nombre: proveedorCreado.nombre,
          razonSocial: proveedorCreado.razon_social || "",
          contacto: proveedorCreado.contacto,
          email: proveedorCreado.email,
          rfc: proveedorCreado.rfc,
          telefono: proveedorCreado.telefono || "",
          direccion: proveedorCreado.direccion || "",
          calle: proveedorCreado.calle || "",
          numeroExterior: proveedorCreado.numero_exterior || "",
          numeroInterior: proveedorCreado.numero_interior || "",
          colonia: proveedorCreado.colonia || "",
          ciudad: proveedorCreado.ciudad || "",
          estado: proveedorCreado.estado || "",
          codigoPostal: proveedorCreado.codigo_postal || "",
          contactos: proveedorCreado.contactos_json
            ? (() => {
                try {
                  return JSON.parse(proveedorCreado.contactos_json);
                } catch {
                  return [];
                }
              })()
            : [],
          categoria: proveedorCreado.categoria,
          activo: proveedorCreado.activo,
          fechaCreacion: new Date().toISOString().split("T")[0],
        };
      } catch (err) {
        console.error("❌ Error creando proveedor:", err);
        throw err;
      }
    },
    [cargarProveedores],
  );

  const actualizarProveedor = useCallback(
    async (id: string, datos: Partial<Proveedor>): Promise<boolean> => {
      try {
        const proveedorData = {
          nombre: datos.nombre,
          razon_social: datos.razonSocial || null,
          contacto: datos.contacto,
          email: datos.email,
          rfc: datos.rfc,
          telefono: datos.telefono || null,
          direccion: datos.direccion || null,
          calle: datos.calle || null,
          numero_exterior: datos.numeroExterior || null,
          numero_interior: datos.numeroInterior || null,
          colonia: datos.colonia || null,
          ciudad: datos.ciudad || null,
          estado: datos.estado || null,
          codigo_postal: datos.codigoPostal || null,
          contactos_json:
            datos.contactos && datos.contactos.length > 0
              ? JSON.stringify(datos.contactos)
              : null,
          categoria: datos.categoria,
          activo: datos.activo ?? true,
        };

        const response = await fetchConToken(`${API_URL}/proveedores/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proveedorData),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("❌ Error response:", response.status, errorData);
          throw new Error(`Error al actualizar proveedor: ${response.status}`);
        }

        invalidateCacheByPrefix("proveedores:");
        await cargarProveedores();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        return false;
      }
    },
    [cargarProveedores],
  );

  const eliminarProveedor = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const proveedor = proveedores.find((p) => p.id === id);
        if (!proveedor) {
          return false;
        }

        return await actualizarProveedor(id, { ...proveedor, activo: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        return false;
      }
    },
    [proveedores, actualizarProveedor],
  );

  const reactivarProveedor = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const proveedor = proveedores.find((p) => p.id === id);
        if (!proveedor) {
          return false;
        }

        return await actualizarProveedor(id, { ...proveedor, activo: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        return false;
      }
    },
    [proveedores, actualizarProveedor],
  );

  const obtenerProveedoresActivos = useCallback((): Proveedor[] => {
    return proveedores.filter((proveedor) => proveedor.activo);
  }, [proveedores]);

  const obtenerProveedoresPorCategoria = useCallback(
    (categoria: string): Proveedor[] => {
      return proveedores.filter(
        (proveedor) => proveedor.categoria === categoria && proveedor.activo,
      );
    },
    [proveedores],
  );

  const buscarProveedorPorRFC = useCallback(
    async (rfc: string): Promise<Proveedor | null> => {
      try {
        const response = await fetchConToken(
          `${API_URL}/proveedores/rfc/${rfc}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Error buscando proveedor: ${response.status}`);
        }

        const proveedorData = await response.json();
        return {
          id: proveedorData.id.toString(),
          nombre: proveedorData.nombre,
          contacto: proveedorData.contacto,
          email: proveedorData.email,
          rfc: proveedorData.rfc,
          telefono: proveedorData.telefono || "",
          direccion: proveedorData.direccion || "",
          categoria: proveedorData.categoria,
          activo: proveedorData.activo,
          fechaCreacion: proveedorData.fecha_creacion?.split("T")[0] || "",
        };
      } catch (err) {
        console.error("❌ Error buscando proveedor por RFC:", err);
        return null;
      }
    },
    [],
  );

  return {
    proveedores,
    loading,
    error,
    cargarProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    reactivarProveedor,
    obtenerProveedoresActivos,
    obtenerProveedoresPorCategoria,
    buscarProveedorPorRFC,
  };
};
