"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth,
  obtenerNombreRol,
  obtenerColorRol,
} from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import FiltroMarcaGlobal from "@/components/FiltroMarcaGlobal";
import NavBar from "@/components/NavBar";
import { fetchConToken } from "@/lib/auth-utils";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import ConfigSidebar from "@/components/ConfigSidebar";
import ConfigSidebarCoordinador from "@/components/ConfigSidebarCoordinador";

interface Plataforma {
  plataforma: string;
  usuario: string;
}

interface Embajador {
  id: number;
  nombre: string;
  plataformas_json: string | null;
  presupuesto: number;
  leads: number;
  audiencia: number;
  marca: string | null;
  creado_por: string | null;
}

const MARCAS_CONOCIDAS = [
  "GWM Chihuahua",
  "Kia Juventud",
  "Kia Juarez",
  "Subaru Chihuahua",
  "Toyota Chihuahua",
  "Toyota Monclova",
];

const PLATAFORMAS_OPCIONES = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "X (Twitter)",
  "Twitch",
  "LinkedIn",
];

const emptyForm = {
  nombre: "",
  marca: "",
  presupuesto: "",
  leads: "",
  audiencia: "",
  plataformas: [{ plataforma: "Instagram", usuario: "" }] as Plataforma[],
};

function formatAudiencia(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function EmbajadoresPage() {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { filtraPorMarca } = useMarcaGlobal();
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [activeConfigView, setActiveConfigView] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [embajadores, setEmbajadores] = useState<Embajador[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Embajador | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [guardando, setGuardando] = useState(false);

  const isAdmin = usuario?.tipo === "administrador";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !usuario) router.push("/login");
  }, [usuario, authLoading, router]);

  const cargarEmbajadores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConToken(`${API_URL}/embajadores/`);
      if (res.ok) setEmbajadores(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (usuario) cargarEmbajadores();
  }, [usuario, cargarEmbajadores]);

  if (authLoading || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
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

  // ── Form helpers ────────────────────────────────────────────────────────────

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const abrirEditar = (emb: Embajador) => {
    setEditando(emb);
    let plataformas: Plataforma[] = [{ plataforma: "Instagram", usuario: "" }];
    try {
      if (emb.plataformas_json) plataformas = JSON.parse(emb.plataformas_json);
    } catch {
      /* ignore */
    }
    setForm({
      nombre: emb.nombre,
      marca: emb.marca || "",
      presupuesto: String(emb.presupuesto),
      leads: String(emb.leads),
      audiencia: String(emb.audiencia),
      plataformas,
    });
    setModalOpen(true);
  };

  const addPlataforma = () =>
    setForm((f) => ({
      ...f,
      plataformas: [...f.plataformas, { plataforma: "Instagram", usuario: "" }],
    }));

  const removePlataforma = (i: number) =>
    setForm((f) => ({
      ...f,
      plataformas: f.plataformas.filter((_, idx) => idx !== i),
    }));

  const updatePlataforma = (i: number, key: keyof Plataforma, value: string) =>
    setForm((f) => {
      const copy = [...f.plataformas];
      copy[i] = { ...copy[i], [key]: value };
      return { ...f, plataformas: copy };
    });

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    setGuardando(true);
    const body = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim() || null,
      presupuesto: parseFloat(form.presupuesto) || 0,
      leads: parseInt(form.leads) || 0,
      audiencia: parseInt(form.audiencia) || 0,
      plataformas_json: JSON.stringify(
        form.plataformas.filter((p) => p.usuario.trim()),
      ),
    };
    try {
      const url = editando
        ? `${API_URL}/embajadores/${editando.id}`
        : `${API_URL}/embajadores/`;
      const res = await fetchConToken(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok || res.status === 204) {
        setModalOpen(false);
        await cargarEmbajadores();
      } else {
        const err = await res.json();
        alert(err.detail || "Error al guardar");
      }
    } catch {
      alert("Error al conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (emb: Embajador) => {
    if (!confirm(`¿Eliminar a "${emb.nombre}"?`)) return;
    try {
      const res = await fetchConToken(`${API_URL}/embajadores/${emb.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) await cargarEmbajadores();
      else alert("Error al eliminar");
    } catch {
      alert("Error al conectar con el servidor");
    }
  };

  // ── Filter by marca ─────────────────────────────────────────────────────────

  const embajadoresFiltrados = embajadores.filter((e) =>
    !e.marca ? true : filtraPorMarca(e.marca),
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {mostrarMenu && (
                <button
                  onClick={() => setConfigSidebarOpen(true)}
                  className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Configuración"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              )}
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shrink-0">
                HG
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Metrik</h1>
                <p className="text-sm text-gray-600 font-medium">
                  {usuario.grupo}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <FiltroMarcaGlobal />
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {usuario.nombre}
                  </p>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${obtenerColorRol(usuario.tipo)}`}
                  >
                    {obtenerNombreRol(usuario.tipo)}
                  </span>
                </div>
                <button
                  onClick={handleCerrarSesion}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <NavBar usuario={usuario} paginaActiva="dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Dashboard
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Embajadores</h2>
              <p className="text-sm text-gray-500">
                {embajadoresFiltrados.length} embajadores
              </p>
            </div>
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Nuevo embajador
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : embajadoresFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No hay embajadores registrados
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Haz clic en &quot;Nuevo embajador&quot; para agregar uno
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {embajadoresFiltrados.map((emb) => {
              let plataformas: Plataforma[] = [];
              try {
                if (emb.plataformas_json)
                  plataformas = JSON.parse(emb.plataformas_json);
              } catch {
                /* ignore */
              }

              return (
                <div
                  key={emb.id}
                  className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                        <UserGroupIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {emb.nombre}
                        </h3>
                        {emb.marca && (
                          <span className="text-xs text-purple-600 font-medium">
                            {emb.marca}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2 shrink-0">
                      <button
                        onClick={() => abrirEditar(emb)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleEliminar(emb)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Plataformas */}
                  {plataformas.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Plataformas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plataformas.map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full font-medium"
                          >
                            {p.plataforma}
                            {p.usuario ? ` · ${p.usuario}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Métricas */}
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Presupuesto</span>
                      <span className="text-sm font-bold text-gray-900">
                        $
                        {new Intl.NumberFormat("es-MX").format(emb.presupuesto)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Leads</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat("es-MX").format(emb.leads)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Audiencia</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatAudiencia(emb.audiencia)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editando ? "Editar embajador" : "Nuevo embajador"}
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
                  placeholder="Ej. @mariana_fitness"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">— Sin agencia —</option>
                  {MARCAS_CONOCIDAS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Plataformas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Plataformas y usuarios
                  </label>
                  <button
                    type="button"
                    onClick={addPlataforma}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.plataformas.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={p.plataforma}
                        onChange={(e) =>
                          updatePlataforma(i, "plataforma", e.target.value)
                        }
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {PLATAFORMAS_OPCIONES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={p.usuario}
                        onChange={(e) =>
                          updatePlataforma(i, "usuario", e.target.value)
                        }
                        placeholder="@usuario"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {form.plataformas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlataforma(i)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Presupuesto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presupuesto ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.presupuesto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, presupuesto: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Audiencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audiencia{" "}
                  <span className="text-gray-400 font-normal">
                    (número real, ej. 85400 para 85.4K)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.audiencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audiencia: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Actualizar"
                    : "Crear embajador"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config sidebars */}
      {isAdmin && (
        <ConfigSidebar
          isOpen={configSidebarOpen}
          onClose={() => setConfigSidebarOpen(false)}
          onNavigate={(item) => {
            if (item === "configuracion") {
              window.location.href = "/configuracion";
              return;
            }
            setActiveConfigView(item);
            setConfigSidebarOpen(false);
          }}
        />
      )}
      {isCoordinador && (
        <ConfigSidebarCoordinador
          isOpen={configSidebarOpen}
          onClose={() => setConfigSidebarOpen(false)}
          onNavigate={(item) => {
            setActiveConfigView(item);
            setConfigSidebarOpen(false);
          }}
        />
      )}
      {activeConfigView !== "" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setActiveConfigView("")}
        >
          <div
            className="bg-white rounded-xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveConfigView("")}
              className="float-right text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <p className="text-gray-600">{activeConfigView}</p>
          </div>
        </div>
      )}
    </div>
  );
}
