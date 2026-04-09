"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import { usePresencias, Presencia } from "@/hooks/usePresencias";
import FormularioPresencia from "@/components/FormularioPresencia";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaDollarSign,
} from "react-icons/fa";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";

interface PresenciaFormData {
  tipo: string;
  nombre: string;
  agencia: string;
  marca: string;
  ciudad: string;
  campana: string;
  ubicacion: string;
  contenido: string;
  notas: string;
  fecha_instalacion: string;
  duracion: string;
  cambio_lona: string;
  vista: string;
  iluminacion: string;
  dimensiones: string;
  proveedor: string;
  codigo_proveedor: string;
  costo_mensual: number;
  duracion_contrato: string;
  inicio_contrato: string;
  termino_contrato: string;
  impresion: string;
  costo_impresion: number;
  instalacion: string;
  observaciones: string;
  imagenes: Array<{
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
  }>;
}

export default function PresenciasPage() {
  const router = useRouter();
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { marcaSeleccionada } = useMarcaGlobal();
  const {
    presencias,
    cargando,
    error,
    crearPresencia,
    actualizarPresencia,
    eliminarPresencia,
  } = usePresencias();

  const [modalFormulario, setModalFormulario] = useState(false);
  const [presenciaEditando, setPresenciaEditando] = useState<Presencia | null>(
    null,
  );
  const [modalImagenes, setModalImagenes] = useState(false);
  const [imagenesVisualizacion, setImagenesVisualizacion] = useState<string[]>(
    [],
  );
  const [activeConfigView, setActiveConfigView] = useState("");

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  const handleCerrarSesion = () => {
    cerrarSesionAuth();
    router.push("/login");
  };

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      window.location.href = "/configuracion";
      return;
    }
    setActiveConfigView(item);
  };

  const handleSubmitPresencia = async (data: PresenciaFormData) => {
    let exito = false;

    if (presenciaEditando) {
      exito = await actualizarPresencia(presenciaEditando.id, data);
    } else {
      exito = await crearPresencia(data);
    }

    if (exito) {
      setModalFormulario(false);
      setPresenciaEditando(null);
    }
  };

  const handleEditarPresencia = (presencia: Presencia) => {
    setPresenciaEditando(presencia);
    setModalFormulario(true);
  };

  const handleEliminarPresencia = async (id: number) => {
    if (window.confirm("¿Estás seguro de eliminar esta presencia?")) {
      await eliminarPresencia(id);
    }
  };

  const handleVerImagenes = (imagenesJson: string | null) => {
    if (imagenesJson) {
      try {
        const imagenes = JSON.parse(imagenesJson);
        setImagenesVisualizacion(imagenes);
        setModalImagenes(true);
      } catch (error) {
        console.error("Error parseando imágenes:", error);
      }
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "Espectacular":
        return "bg-purple-100 text-purple-800";
      case "Revista":
        return "bg-blue-100 text-blue-800";
      case "Periódico":
        return "bg-gray-100 text-gray-800";
      case "Radio":
        return "bg-yellow-100 text-yellow-800";
      case "Televisión":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!usuario) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
        paginaActiva="presencias"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Presencia Tradicional - {marcaSeleccionada}
            </h1>
            <button
              onClick={() => {
                setPresenciaEditando(null);
                setModalFormulario(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaPlus className="mr-2" />
              Nueva Presencia
            </button>
          </div>
          {modalFormulario && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {presenciaEditando ? "Editar" : "Nueva"} Presencia
                  </h2>
                  <FormularioPresencia
                    onSubmit={handleSubmitPresencia}
                    onCancel={() => {
                      setModalFormulario(false);
                      setPresenciaEditando(null);
                    }}
                    marcaActual={marcaSeleccionada}
                  />
                </div>
              </div>
            </div>
          )}
          {modalImagenes && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Imágenes</h2>
                  <button
                    onClick={() => setModalImagenes(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {imagenesVisualizacion.map((imagen, index) => (
                    <div
                      key={index}
                      className="border border-gray-300 rounded-lg p-2"
                    >
                      <Image
                        src={imagen}
                        alt={`Imagen ${index + 1}`}
                        width={400}
                        height={256}
                        className="w-full h-64 object-contain rounded"
                      />
                      {index === 0 && (
                        <p className="text-xs text-center text-blue-600 font-semibold mt-2">
                          Vista Previa Principal
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {cargando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando presencias...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : presencias.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                No hay presencias registradas para esta marca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presencias.map((presencia) => {
                let imagenes: string[] = [];
                if (presencia.imagenes_json) {
                  try {
                    const parsed = JSON.parse(presencia.imagenes_json);
                    if (Array.isArray(parsed)) {
                      imagenes = parsed.map((item: string | { url: string }) =>
                        typeof item === "string" ? item : item.url,
                      );
                    }
                  } catch (error) {
                    console.error("Error parseando imágenes:", error);
                  }
                }

                return (
                  <div
                    key={presencia.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {imagenes.length > 0 && (
                      <div
                        className="h-48 bg-gray-100 cursor-pointer relative"
                        onClick={() =>
                          handleVerImagenes(presencia.imagenes_json)
                        }
                      >
                        <Image
                          src={imagenes[0]}
                          alt={presencia.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-2 ${getTipoColor(
                          presencia.tipo,
                        )}`}
                      >
                        {presencia.tipo}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {presencia.nombre}
                      </h3>
                      {presencia.ubicacion && (
                        <div className="flex items-start text-sm text-gray-600 mb-2">
                          <FaMapMarkerAlt className="mr-2 mt-1 shrink-0" />
                          <span className="line-clamp-2">
                            {presencia.ubicacion}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <FaCalendarAlt className="mr-2" />
                        <span>
                          {new Date(
                            presencia.fecha_instalacion,
                          ).toLocaleDateString("es-MX")}
                          {presencia.duracion && ` - ${presencia.duracion}`}
                        </span>
                      </div>
                      <div className="flex items-center text-sm font-semibold text-green-600 mb-3">
                        <FaDollarSign className="mr-1" />
                        <span>
                          {presencia.costo_mensual
                            ? new Intl.NumberFormat("es-MX", {
                                style: "currency",
                                currency: "MXN",
                              }).format(presencia.costo_mensual) + "/mes"
                            : "N/A"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3 space-y-1">
                        {presencia.ciudad && (
                          <p>
                            <span className="font-semibold">Ciudad:</span>{" "}
                            {presencia.ciudad}
                          </p>
                        )}
                        {presencia.dimensiones && (
                          <p>
                            <span className="font-semibold">Dimensiones:</span>{" "}
                            {presencia.dimensiones}
                          </p>
                        )}
                        {presencia.proveedor && (
                          <p>
                            <span className="font-semibold">Proveedor:</span>{" "}
                            {presencia.proveedor}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEditarPresencia(presencia)}
                          className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <FaEdit className="mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminarPresencia(presencia.id)}
                          className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          <FaTrash className="mr-1" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
