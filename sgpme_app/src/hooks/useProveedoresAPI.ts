"use client";

import { useState, useEffect, useCallback } from "react";
import { Proveedor } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

interface ProveedorBackend {
  id: number;
  nombre: string;
  razon_social?: string;
  contacto: string;
  email: string;
  rfc: string; // Ahora obligatorio
  telefono?: string;
  direccion?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
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

  const cargarProveedores = useCallback(async () => {
    try {
      console.log("🔄 Cargando proveedores desde API...");
      setLoading(true);
      const response = await fetchConToken(`${API_URL}/proveedores/`);

      if (!response.ok) {
        throw new Error(`Error al cargar proveedores: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `📊 Datos recibidos del backend:`,
        data.length,
        "proveedores",
      );

      const proveedoresTransformados = data.map((prov: ProveedorBackend) => ({
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
        categoria: prov.categoria || "",
        activo: prov.activo ?? true,
        fechaCreacion: prov.fecha_creacion
          ? prov.fecha_creacion.split("T")[0]
          : new Date().toISOString().split("T")[0],
        fechaModificacion: undefined,
      }));

      console.log(
        `✅ Proveedores transformados:`,
        proveedoresTransformados.length,
        "proveedores en estado",
      );

      setProveedores(proveedoresTransformados);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("❌ Error cargando proveedores:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const crearProveedor = useCallback(
    async (
      datos: Omit<Proveedor, "id" | "fechaCreacion">,
    ): Promise<Proveedor> => {
      try {
        console.log("🟢 Creando proveedor:", datos.nombre);

        const proveedorData = {
          nombre: datos.nombre,
          razon_social: datos.razonSocial || null,
          contacto: datos.contacto,
          email: datos.email,
          rfc: datos.rfc, // Ahora obligatorio
          telefono: datos.telefono || null,
          direccion: datos.direccion || null,
          calle: datos.calle || null,
          numero_exterior: datos.numeroExterior || null,
          numero_interior: datos.numeroInterior || null,
          colonia: datos.colonia || null,
          ciudad: datos.ciudad || null,
          estado: datos.estado || null,
          codigo_postal: datos.codigoPostal || null,
          categoria: datos.categoria,
          activo: datos.activo ?? true,
        };

        console.log("📝 Datos a enviar:", proveedorData);

        const response = await fetchConToken(`${API_URL}/proveedores/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proveedorData),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("❌ Error response:", response.status, errorData);
          throw new Error(`Error al crear proveedor: ${response.status}`);
        }

        const proveedorCreado = await response.json();
        console.log("✅ Proveedor creado exitosamente, recargando lista...");

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
          categoria: proveedorCreado.categoria,
          activo: proveedorCreado.activo,
          fechaCreacion: new Date().toISOString().split("T")[0],
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("❌ Error creando proveedor:", err);
        throw err;
      }
    },
    [cargarProveedores],
  );

  const actualizarProveedor = useCallback(
    async (id: string, datos: Partial<Proveedor>): Promise<boolean> => {
      try {
        console.log("🔵 Actualizando proveedor:", id);

        const proveedorData = {
          nombre: datos.nombre,
          razon_social: datos.razonSocial || null,
          contacto: datos.contacto,
          email: datos.email,
          rfc: datos.rfc, // Ahora obligatorio
          telefono: datos.telefono || null,
          direccion: datos.direccion || null,
          calle: datos.calle || null,
          numero_exterior: datos.numeroExterior || null,
          numero_interior: datos.numeroInterior || null,
          colonia: datos.colonia || null,
          ciudad: datos.ciudad || null,
          estado: datos.estado || null,
          codigo_postal: datos.codigoPostal || null,
          categoria: datos.categoria,
          activo: datos.activo ?? true,
        };

        console.log("📝 Datos a actualizar:", proveedorData);

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

        console.log(
          "✅ Proveedor actualizado exitosamente, recargando lista...",
        );

        await cargarProveedores();
        console.log("✅ Lista de proveedores recargada");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("❌ Error actualizando proveedor:", err);
        return false;
      }
    },
    [cargarProveedores],
  );

  const eliminarProveedor = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        console.log("🔴 Desactivando proveedor:", id);

        const proveedor = proveedores.find((p) => p.id === id);
        if (!proveedor) {
          console.error("❌ Proveedor no encontrado:", id);
          return false;
        }

        return await actualizarProveedor(id, { ...proveedor, activo: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("❌ Error desactivando proveedor:", err);
        return false;
      }
    },
    [proveedores, actualizarProveedor],
  );

  const reactivarProveedor = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        console.log("🟢 Reactivando proveedor:", id);

        const proveedor = proveedores.find((p) => p.id === id);
        if (!proveedor) {
          console.error("❌ Proveedor no encontrado:", id);
          return false;
        }

        return await actualizarProveedor(id, { ...proveedor, activo: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("❌ Error reactivando proveedor:", err);
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
