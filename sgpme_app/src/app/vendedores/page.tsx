"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import Sidebar from "@/components/Sidebar";
import { showToast } from "@/lib/toast";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import Image from "next/image";
import { fetchConToken } from "@/lib/auth-utils";

interface Vendedor {
  id: number;
  nombre: string;
  marca: string | null;
  alcance: number;
  leads: number;
  ventas: number;
  inversion_mensual: number;
  publicaciones: number;
  creado_por: string | null;
}

const emptyForm = {
  nombre: "",
  marca: "",
  alcance: "",
  leads: "",
  ventas: "",
  inversion_mensual: "",
  publicaciones: "",
};

function formatAlcance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function VendedoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { filtraPorMarca, marcasPermitidas } = useMarcaGlobal();
  const [activeConfigView, setActiveConfigView] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Vendedor | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [guardando, setGuardando] = useState(false);

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";

  useEffect(() => {
    if (!authLoading && !usuario) router.push("/login");
  }, [usuario, authLoading, router]);

  const cargarVendedores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConToken(`${API_URL}/vendedores/`);
      if (res.ok) setVendedores(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (usuario) cargarVendedores();
  }, [usuario, cargarVendedores]);

  if (authLoading || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  const handleCerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      cerrarSesionAuth();
      router.push("/login");
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const abrirEditar = (v: Vendedor) => {
    setEditando(v);
    setForm({
      nombre: v.nombre,
      marca: v.marca || "",
      alcance: String(v.alcance),
      leads: String(v.leads),
      ventas: String(v.ventas),
      inversion_mensual: String(v.inversion_mensual),
      publicaciones: String(v.publicaciones),
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    setGuardando(true);
    const body = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim() || null,
      alcance: parseInt(form.alcance) || 0,
      leads: parseInt(form.leads) || 0,
      ventas: parseInt(form.ventas) || 0,
      inversion_mensual: parseFloat(form.inversion_mensual) || 0,
      publicaciones: parseInt(form.publicaciones) || 0,
    };
    try {
      const url = editando
        ? `${API_URL}/vendedores/${editando.id}`
        : `${API_URL}/vendedores/`;
      const res = await fetchConToken(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok || res.status === 201 || res.status === 204) {
        setModalOpen(false);
        await cargarVendedores();
        showToast(
          editando ? "Vendedor actualizado" : "Vendedor creado",
          "success",
        );
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(
          (err as { detail?: string }).detail || "Error al guardar",
          "error",
        );
      }
    } catch {
      showToast("Error al conectar con el servidor", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (v: Vendedor) => {
    if (!confirm(`¿Eliminar a "${v.nombre}"?`)) return;
    try {
      const res = await fetchConToken(`${API_URL}/vendedores/${v.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        await cargarVendedores();
        showToast("Vendedor eliminado", "success");
      } else {
        showToast("Error al eliminar", "error");
      }
    } catch {
      showToast("Error al conectar con el servidor", "error");
    }
  };

  const vendedoresFiltrados = vendedores.filter((v) =>
    !v.marca ? true : filtraPorMarca(v.marca),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-100 border-b border-gray-200 h-14 flex items-center">
        <div className="pl-3 shrink-0">
          <Image
            src="/metrik_logo.png"
            alt="Metrik"
            width={96}
            height={30}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex items-center gap-6 px-8">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Atrás"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.forward()}
            className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Adelante"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 w-80">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en Metrik..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-100 border-0 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors"
              readOnly
            />
          </div>
        </div>
      </header>

      <Sidebar
        usuario={usuario}
        paginaActiva="vendedores"
        onMenuClick={(item) => {
          if (item === "configuracion") {
            window.location.href = "/configuracion";
            return;
          }
          setActiveConfigView(item);
        }}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          {/* Top bar */}
          <div className="mb-8">
            <button
              onClick={() =>
                router.push(
                  searchParams.get("from") === "digital"
                    ? "/digital"
                    : "/dashboard",
                )
              }
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Volver a Dashboard
            </button>
            <div className="flex items-center justify-between mt-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vendedores</h2>
                <p className="text-sm text-gray-500">
                  {vendedoresFiltrados.length} vendedores
                </p>
              </div>
              <button
                onClick={abrirNuevo}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Nuevo vendedor
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
            </div>
          ) : vendedoresFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                No hay vendedores registrados
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Haz clic en &quot;Nuevo vendedor&quot; para agregar uno
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendedoresFiltrados.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                        <UserGroupIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {v.nombre}
                        </h3>
                        {v.marca && (
                          <span className="text-xs text-red-600 font-medium">
                            {v.marca}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2 shrink-0">
                      <button
                        onClick={() => abrirEditar(v)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleEliminar(v)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Alcance</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatAlcance(v.alcance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Leads</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat("es-MX").format(v.leads)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Ventas</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat("es-MX").format(v.ventas)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Inversión mensual
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        $
                        {new Intl.NumberFormat("es-MX").format(
                          v.inversion_mensual,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Publicaciones
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat("es-MX").format(v.publicaciones)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Modal crear/editar */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {editando ? "Editar vendedor" : "Nuevo vendedor"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Ej. Juan Pérez"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Agencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agencia
                  </label>
                  <select
                    value={form.marca}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, marca: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">— Sin agencia —</option>
                    {marcasPermitidas.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alcance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alcance{" "}
                    <span className="text-gray-400 font-normal">
                      (número real, ej. 85400 para 85.4K)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.alcance}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, alcance: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Leads */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leads
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.leads}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, leads: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Ventas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ventas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.ventas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ventas: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Inversión mensual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inversión mensual ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.inversion_mensual}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        inversion_mensual: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Publicaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publicaciones
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.publicaciones}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publicaciones: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {guardando
                    ? "Guardando..."
                    : editando
                      ? "Actualizar"
                      : "Crear vendedor"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeConfigView === "mi-perfil" && (
        <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
      )}
      {activeConfigView === "cambiar-contrasena" && (
        <CambiarContrasenaCoordinador onClose={() => setActiveConfigView("")} />
      )}
    </div>
  );
}
