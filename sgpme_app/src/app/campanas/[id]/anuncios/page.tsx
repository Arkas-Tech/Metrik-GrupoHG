"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import {
  ArrowLeftIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";

interface CampanyaInfo {
  id: number;
  nombre: string;
  presupuesto: string;
  autoObjetivo: string;
  conversion: string;
  plataforma: string;
  agencia: string;
}

interface Anuncio {
  id: number;
  titulo: string;
  imagen: string;
  tipo: string;
}

const AnunciosPage = () => {
  const router = useRouter();
  const params = useParams();
  const campanyaId = params.id as string;

  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  useMarcaGlobal();
  const [activeConfigView, setActiveConfigView] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  if (authLoading || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

  const handleMenuClick = (item: string) => {
    if (item === "configuracion") {
      router.push("/configuracion");
      return;
    }
    setActiveConfigView(item);
  };

  const getCampanyaInfo = (id: string): CampanyaInfo => {
    const campanyas: { [key: string]: CampanyaInfo } = {
      "1": {
        id: 1,
        nombre: "Campaña Black Friday Kia K4",
        presupuesto: "$15,000",
        autoObjetivo: "Kia K4",
        conversion: "Formulario de Contacto",
        plataforma: "Meta Ads",
        agencia: "Kia",
      },
      "2": {
        id: 2,
        nombre: "Promoción Navideña Toyota Corolla",
        presupuesto: "$12,500",
        autoObjetivo: "Toyota Corolla",
        conversion: "Solicitud de Prueba de Manejo",
        plataforma: "Google Ads",
        agencia: "Toyota",
      },
      "3": {
        id: 3,
        nombre: "Lanzamiento Subaru WRX",
        presupuesto: "$18,750",
        autoObjetivo: "Subaru WRX",
        conversion: "Descarga de Brochure",
        plataforma: "Meta Ads",
        agencia: "Subaru",
      },
      "4": {
        id: 4,
        nombre: "Campaña Toyota Prius Eco",
        presupuesto: "$20,000",
        autoObjetivo: "Toyota Prius",
        conversion: "Registro de Interés",
        plataforma: "Google Ads",
        agencia: "Toyota",
      },
      "5": {
        id: 5,
        nombre: "Retargeting Gwm Tank 300",
        presupuesto: "$8,200",
        autoObjetivo: "Gwm Tank 300",
        conversion: "Llamada Telefónica",
        plataforma: "Meta Ads",
        agencia: "Gwm",
      },
      "6": {
        id: 6,
        nombre: "Campaña Subaru Crosstrek",
        presupuesto: "$16,500",
        autoObjetivo: "Subaru Crosstrek",
        conversion: "Visita a Concesionario",
        plataforma: "Google Ads",
        agencia: "Subaru",
      },
    };

    return (
      campanyas[id] || {
        id: parseInt(id),
        nombre: "Campaña Desconocida",
        presupuesto: "$0",
        autoObjetivo: "Modelo no definido",
        conversion: "No definida",
        plataforma: "Desconocida",
        agencia: "Desconocida",
      }
    );
  };

  const getAnuncios = (id: string): Anuncio[] => {
    const anunciosData: { [key: string]: Anuncio[] } = {
      "1": [
        {
          id: 1,
          titulo: "Kia K4 - Descuento Black Friday",
          imagen:
            "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&h=400&fit=crop",
          tipo: "Imagen Principal",
        },
        {
          id: 2,
          titulo: "K4 Interior Premium",
          imagen:
            "https://images.unsplash.com/photo-1621135802920-133df287f89c?w=600&h=400&fit=crop",
          tipo: "Banner Interior",
        },
        {
          id: 3,
          titulo: "K4 Tecnología Avanzada",
          imagen:
            "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=400&fit=crop",
          tipo: "Story Móvil",
        },
        {
          id: 4,
          titulo: "K4 Seguridad Total",
          imagen:
            "https://images.unsplash.com/photo-1550355191-aa8a80b41353?w=600&h=400&fit=crop",
          tipo: "Video Corto",
        },
      ],
      "2": [
        {
          id: 1,
          titulo: "Toyota Corolla - Edición Navidad",
          imagen:
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=400&fit=crop",
          tipo: "Imagen Principal",
        },
        {
          id: 2,
          titulo: "Corolla Híbrido Eficiente",
          imagen:
            "https://images.unsplash.com/photo-1564404464133-0a22e3b073de?w=600&h=400&fit=crop",
          tipo: "Banner Ecológico",
        },
        {
          id: 3,
          titulo: "Corolla Familia Segura",
          imagen:
            "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=400&fit=crop",
          tipo: "Story Familiar",
        },
      ],
      "3": [
        {
          id: 1,
          titulo: "Subaru WRX - Rendimiento Puro",
          imagen:
            "https://images.unsplash.com/photo-1544829099-b9a0c5303bea?w=600&h=400&fit=crop",
          tipo: "Imagen Deportiva",
        },
        {
          id: 2,
          titulo: "WRX Rally Performance",
          imagen:
            "https://images.unsplash.com/photo-1551522435-a13afa10f103?w=600&h=400&fit=crop",
          tipo: "Banner Deportivo",
        },
        {
          id: 3,
          titulo: "WRX Turbo Potencia",
          imagen:
            "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=600&h=400&fit=crop",
          tipo: "Video Acción",
        },
      ],
      "4": [
        {
          id: 1,
          titulo: "Toyota Prius - Eco Friendly",
          imagen:
            "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=600&h=400&fit=crop",
          tipo: "Banner Ecológico",
        },
        {
          id: 2,
          titulo: "Prius Tecnología Híbrida",
          imagen:
            "https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=600&h=400&fit=crop",
          tipo: "Infografía Tech",
        },
      ],
      "5": [
        {
          id: 1,
          titulo: "Gwm Tank 300 - Potencia SUV",
          imagen:
            "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&h=400&fit=crop",
          tipo: "Banner SUV",
        },
        {
          id: 2,
          titulo: "Tank 300 Off-Road",
          imagen:
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop",
          tipo: "Story Aventura",
        },
      ],
      "6": [
        {
          id: 1,
          titulo: "Subaru Crosstrek - Aventura",
          imagen:
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop",
          tipo: "Banner Aventura",
        },
        {
          id: 2,
          titulo: "Crosstrek All-Terrain",
          imagen:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
          tipo: "Video Offroad",
        },
      ],
    };

    return (
      anunciosData[id] || [
        {
          id: 1,
          titulo: "Vehículo - Anuncio General",
          imagen:
            "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=600&h=400&fit=crop",
          tipo: "Imagen",
        },
      ]
    );
  };

  const campanya = getCampanyaInfo(campanyaId);
  const anuncios = getAnuncios(campanyaId);

  const getPlatformColor = (plataforma: string) => {
    switch (plataforma) {
      case "Meta Ads":
        return "bg-blue-100 text-blue-800";
      case "Google Ads":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
        paginaActiva="anuncios"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/campanyas")}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 mr-2" />
                  Volver a Campañas
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {campanya.nombre}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getPlatformColor(
                      campanya.plataforma,
                    )}`}
                  >
                    {campanya.plataforma}
                  </span>
                </div>
                <p className="text-gray-600 mb-6">
                  Anuncios y creatividades de la campaña
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Auto Objetivo
                  </h3>
                  <p className="text-lg font-medium text-gray-900">
                    {campanya.autoObjetivo}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Conversión
                  </h3>
                  <p className="text-lg font-medium text-gray-900">
                    {campanya.conversion}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Presupuesto
                  </h3>
                  <p className="text-lg font-medium text-gray-900">
                    {campanya.presupuesto}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Anuncios de la Campaña
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {anuncios.map((anuncio) => (
                  <div
                    key={anuncio.id}
                    className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedImage(anuncio.imagen)}
                  >
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200 relative">
                      <Image
                        src={anuncio.imagen}
                        alt={anuncio.titulo}
                        width={600}
                        height={400}
                        className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {anuncio.titulo}
                      </h3>
                      <p className="text-sm text-gray-600">{anuncio.tipo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {activeConfigView === "mi-perfil" && (
        <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
      )}
      {activeConfigView === "cambiar-contrasena" && (
        <CambiarContrasenaCoordinador onClose={() => setActiveConfigView("")} />
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
              title="Cerrar"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600" />
            </button>
            <Image
              src={selectedImage}
              alt="Anuncio ampliado"
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnunciosPage;
