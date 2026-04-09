"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFacturasAPI as useFacturas } from "@/hooks/useFacturasAPI";
import { useProveedoresAPI as useProveedores } from "@/hooks/useProveedoresAPI";
import { useEventos } from "@/hooks/useEventos";
import { useAuth } from "@/hooks/useAuthUnified";
import { useMarcaGlobal } from "@/contexts/MarcaContext";
import {
  Factura,
  Proveedor,
  FiltrosFactura,
  Archivo,
  Cotizacion,
  MESES,
} from "@/types";
import FormularioFactura from "@/components/FormularioFactura";
import FormularioProveedor from "@/components/FormularioProveedor";
import ListaFacturas from "@/components/ListaFacturas";
import ListaProveedores from "@/components/ListaProveedores";
import FiltrosFacturas from "@/components/FiltrosFacturas";
import GraficaProyeccionVsGasto from "@/components/GraficaProyeccionVsGasto";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import GestionPerfilCoordinador from "@/components/GestionPerfilCoordinador";
import CambiarContrasenaCoordinador from "@/components/CambiarContrasenaCoordinador";
import { showToast } from "@/lib/toast";

function FacturasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    usuario,
    tienePermiso,
    cerrarSesion: cerrarSesionAuth,
    loading: authLoading,
  } = useAuth();
  const { filtraPorMarca } = useMarcaGlobal();
  // Función para obtener la vista inicial basada en parámetros de URL
  const getInitialView = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get("action");

      if (action === "nuevo-proveedor") {
        return "nuevo-proveedor";
      }
    }
    return "dashboard";
  };

  const [vistaActual, setVistaActual] = useState<
    | "dashboard"
    | "nueva"
    | "editar"
    | "proveedores"
    | "nuevo-proveedor"
    | "editar-proveedor"
  >(getInitialView());
  const [facturaEditando, setFacturaEditando] = useState<Factura | null>(null);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(
    null,
  );

  // Navegación con soporte para botón atrás del navegador
  const navegarA = (
    vista:
      | "dashboard"
      | "nueva"
      | "editar"
      | "proveedores"
      | "nuevo-proveedor"
      | "editar-proveedor",
  ) => {
    window.history.pushState({ vista }, "");
    setVistaActual(vista);
  };

  useEffect(() => {
    // Seed the initial history entry so back from the first sub-view works
    window.history.replaceState({ vista: "dashboard" }, "");

    const handlePopState = (e: PopStateEvent) => {
      setVistaActual((e.state?.vista as typeof vistaActual) ?? "dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const mesActual = MESES[new Date().getMonth()];
  const añoActual = new Date().getFullYear();

  const [filtros, setFiltros] = useState<FiltrosFactura>({
    estado: "Todas",
    busqueda: "",
    mes: mesActual,
    año: añoActual,
  });
  const [activeConfigView, setActiveConfigView] = useState("");

  // Estados para popup de comprobante de pago
  const [mostrarPopupComprobante, setMostrarPopupComprobante] = useState(false);
  const [facturaIdParaPagar, setFacturaIdParaPagar] = useState<string | null>(
    null,
  );
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(
    null,
  );
  const [arrastrando, setArrastrando] = useState(false);

  // Estados para popup de confirmación de cambio de estado desde Pagada
  const [mostrarPopupConfirmacionEstado, setMostrarPopupConfirmacionEstado] =
    useState(false);
  const [facturaParaCambiarEstado, setFacturaParaCambiarEstado] = useState<{
    id: string;
    nuevoEstado: Factura["estado"];
  } | null>(null);
  const [comprobanteParaEliminar, setComprobanteParaEliminar] =
    useState<Archivo | null>(null);

  // Estados para modal de nuevo proveedor desde formulario de factura
  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);
  const [proveedorRecienCreado, setProveedorRecienCreado] = useState<
    string | null
  >(null);

  const isAdmin =
    usuario?.tipo === "administrador" || usuario?.tipo === "developer";
  const isCoordinador = usuario?.tipo === "coordinador";
  const mostrarMenu = isAdmin || isCoordinador;

  console.log("User info:", {
    usuario: usuario?.tipo,
    isAdmin,
    isCoordinador,
    mostrarMenu,
  });

  const handleMenuClick = useCallback((item: string) => {
    if (item === "configuracion") {
      window.location.href = "/configuracion";
      return;
    }
    setActiveConfigView(item);
  }, []);

  const {
    facturas,
    loading,
    error,
    cargarFacturas,
    guardarFactura,
    eliminarFactura,
    marcarComoPagada,
    autorizar,
    rechazar,
    ingresarFactura,
    obtenerFacturasPorFiltros,
    exportarExcel,
    descargarArchivo,
    descargarCotizacion,
    eliminarArchivo,
  } = useFacturas();

  const { eventos } = useEventos();

  const {
    proveedores,
    loading: loadingProveedores,
    error: errorProveedores,
    cargarProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    reactivarProveedor,
  } = useProveedores();

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push("/login");
    }
  }, [usuario, authLoading, router]);

  // Detectar cambios en los parámetros de URL
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "nuevo-proveedor") {
      setVistaActual("nuevo-proveedor");
    }
  }, [searchParams]);

  useEffect(() => {
    if (usuario) {
      if (
        vistaActual === "proveedores" ||
        vistaActual === "editar-proveedor" ||
        vistaActual === "nuevo-proveedor"
      ) {
        cargarProveedores();
      } else {
        cargarFacturas();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, vistaActual, filtros]);

  const facturasFiltradasMemo = obtenerFacturasPorFiltros(filtros).filter(
    (factura) => filtraPorMarca(factura.marca),
  );

  // Filtrar facturas con eventos que han sido ingresadas
  const facturasConEventosIngresadas = useMemo(() => {
    return facturas
      .filter(
        (factura) =>
          factura.eventoId &&
          factura.fechaIngresada &&
          factura.fechaIngresada.trim() !== "",
      )
      .filter((factura) => filtraPorMarca(factura.marca))
      .map((factura) => {
        const evento = eventos.find((e) => e.id === factura.eventoId);
        return {
          ...factura,
          eventoData: evento,
        };
      });
  }, [facturas, eventos, filtraPorMarca]);

  // Filtrar facturas con eventos por mes y año del evento
  const facturasEventosPorPeriodo = useMemo(() => {
    return facturasConEventosIngresadas.filter((factura) => {
      if (!factura.eventoData?.fechaInicio) return false;
      const [añoEvento, mesEvento] = factura.eventoData.fechaInicio.split("-");

      const matchAño =
        !filtros.año || parseInt(añoEvento) === Number(filtros.año);

      // Convertir mes del filtro a número si es necesario
      let mesNumeroFiltro: number | null = null;
      if (filtros.mes) {
        if (typeof filtros.mes === "string" && isNaN(Number(filtros.mes))) {
          // Es un nombre de mes, convertir a número
          mesNumeroFiltro = MESES.indexOf(filtros.mes) + 1;
        } else {
          mesNumeroFiltro = Number(filtros.mes);
        }
      }

      const matchMes =
        !mesNumeroFiltro || parseInt(mesEvento) === mesNumeroFiltro;

      return matchAño && matchMes;
    });
  }, [facturasConEventosIngresadas, filtros.mes, filtros.año]);

  // Obtener presupuesto de Relaciones Públicas para el periodo
  const [presupuestoRP, setPresupuestoRP] = useState(0);

  useEffect(() => {
    const obtenerPresupuestoRP = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const token = localStorage.getItem("token");

        // Construir params: si no hay filtros, traer TODOS los presupuestos RP
        const params = new URLSearchParams({
          categoria: "Relaciones Públicas",
        });

        if (filtros.año) {
          params.append("anio", filtros.año.toString());
        }
        if (filtros.mes) {
          // Convertir nombre de mes a número si es necesario
          let mesNumero: number;
          if (typeof filtros.mes === "string" && isNaN(Number(filtros.mes))) {
            // Es un nombre de mes, convertir a número
            mesNumero = MESES.indexOf(filtros.mes) + 1;
          } else {
            // Ya es un número o se puede convertir
            mesNumero = Number(filtros.mes);
          }
          params.append("mes", mesNumero.toString());
        }

        const response = await fetch(`${API_URL}/presupuesto?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        // Verificar si data es un array, si no, convertirlo
        const presupuestos = Array.isArray(data) ? data : [data];

        const total = presupuestos.reduce(
          (sum: number, p: { monto?: number }) => sum + (p.monto || 0),
          0,
        );
        setPresupuestoRP(total);
        console.log(
          "Presupuesto RP cargado:",
          total,
          "para mes:",
          filtros.mes || "todos",
          "año:",
          filtros.año || "todos",
        );
      } catch (error) {
        console.error("Error obteniendo presupuesto RP:", error);
        setPresupuestoRP(0);
      }
    };

    obtenerPresupuestoRP();
  }, [filtros.mes, filtros.año]);

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

  const manejarCrearFactura = async (
    datos: Omit<Factura, "id" | "fechaCreacion">,
  ) => {
    try {
      const nuevaFactura: Factura = {
        ...datos,
        id: "temp",
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      const resultado = await guardarFactura(nuevaFactura);
      if (resultado.success) {
        // NO cambiar vista aquí, dejar que FormularioFactura lo maneje después de subir archivos
        return resultado.facturaId;
      }
    } catch (error) {
      console.error("Error al crear factura:", error);
    }
  };

  const manejarEditarFactura = (factura: Factura) => {
    setFacturaEditando(factura);
    navegarA("editar");
  };

  const manejarActualizarFactura = async (datos: Partial<Factura>) => {
    if (facturaEditando) {
      try {
        const facturaActualizada: Factura = {
          ...facturaEditando,
          ...datos,
          fechaModificacion: new Date().toISOString(),
        };
        const resultado = await guardarFactura(facturaActualizada);
        if (resultado.success) {
          // NO cambiar vista aquí, dejar que FormularioFactura lo maneje después de subir archivos
          setFacturaEditando(null);
          return resultado.facturaId;
        }
      } catch (error) {
        console.error("Error al actualizar factura:", error);
      }
    }
  };

  const manejarEliminarFactura = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta factura?")) {
      try {
        await eliminarFactura(id);
      } catch (error) {
        console.error("Error al eliminar factura:", error);
      }
    }
  };

  const manejarCambiarEstado = async (
    id: string,
    nuevoEstado: Factura["estado"],
  ) => {
    console.log("🔵 Cambiando estado de factura", id, "a", nuevoEstado);

    // Verificar si la factura está en estado "Pagada" y se está cambiando a otro estado
    const factura = facturas.find((f) => f.id === id);
    if (factura && factura.estado === "Pagada" && nuevoEstado !== "Pagada") {
      // Buscar si hay un comprobante de pago
      const comprobante = factura.archivos.find(
        (a) => a.tipo === "Comprobante",
      );

      if (comprobante) {
        // Mostrar popup de confirmación
        setFacturaParaCambiarEstado({ id, nuevoEstado });
        setComprobanteParaEliminar(comprobante);
        setMostrarPopupConfirmacionEstado(true);
        return; // Detener aquí, se continuará después de la confirmación
      }
    }

    // Continuar con el cambio de estado normal
    await ejecutarCambioEstado(id, nuevoEstado);
  };

  const ejecutarCambioEstado = async (
    id: string,
    nuevoEstado: Factura["estado"],
  ) => {
    console.log(
      "🔵 Ejecutando cambio de estado de factura",
      id,
      "a",
      nuevoEstado,
    );
    try {
      switch (nuevoEstado) {
        case "Pagada":
          console.log("📝 Abriendo popup para comprobante de pago...");
          setFacturaIdParaPagar(id);
          setMostrarPopupComprobante(true);
          break;
        case "Autorizada":
          console.log("📝 Autorizando factura...");
          const resultado = await autorizar(id);
          console.log("📝 Resultado de autorizar:", resultado);
          break;
        case "Rechazada":
          console.log("📝 Rechazando factura...");
          await rechazar(id);
          break;
        default:
          console.log("📝 Cambiando estado default...");
          const factura = facturas.find((f) => f.id === id);
          if (factura) {
            const facturaActualizada = {
              ...factura,
              estado: nuevoEstado,
              fechaModificacion: new Date().toISOString(),
            };

            // Si se revierte de "Ingresada" o "Pagada" a "Pendiente" o "Autorizada", borrar fecha_ingresada
            const estadosAnteriores: Factura["estado"][] = [
              "Ingresada",
              "Pagada",
            ];
            const estadosNuevos: Factura["estado"][] = [
              "Pendiente",
              "Autorizada",
            ];

            if (
              estadosNuevos.includes(nuevoEstado) &&
              estadosAnteriores.includes(factura.estado)
            ) {
              facturaActualizada.fechaIngresada = undefined;
            }

            await guardarFactura(facturaActualizada);
          }
      }
      console.log("✅ Estado cambiado exitosamente");
    } catch (error) {
      console.error("❌ Error al cambiar estado:", error);
    }
  };

  const manejarIngresarFactura = async (id: string, fechaIngreso: string) => {
    console.log("🔵 Ingresando factura", id, "con fecha", fechaIngreso);
    try {
      await ingresarFactura(id, fechaIngreso);
      console.log("✅ Factura ingresada exitosamente");
    } catch (error) {
      console.error("❌ Error al ingresar factura:", error);
    }
  };

  const confirmarPagoConComprobante = async () => {
    if (!archivoComprobante) {
      showToast(
        "Debes subir un comprobante de pago para marcar la factura como pagada",
        "error",
      );
      return;
    }

    console.log("📝 Marcando como pagada con comprobante...");
    try {
      if (facturaIdParaPagar) {
        await marcarComoPagada(facturaIdParaPagar, archivoComprobante);
      }
      setMostrarPopupComprobante(false);
      setFacturaIdParaPagar(null);
      setArchivoComprobante(null);
      console.log("✅ Factura marcada como pagada exitosamente");
    } catch (error) {
      console.error("❌ Error al marcar factura como pagada:", error);
    }
  };

  const cerrarPopupComprobante = () => {
    setMostrarPopupComprobante(false);
    setFacturaIdParaPagar(null);
    setArchivoComprobante(null);
  };

  const confirmarCambioEstadoConEliminacion = async () => {
    if (!facturaParaCambiarEstado) return;

    try {
      // Si hay comprobante, eliminarlo primero
      if (comprobanteParaEliminar) {
        console.log("🗑️ Eliminando comprobante de pago...");
        await eliminarArchivo(
          facturaParaCambiarEstado.id,
          comprobanteParaEliminar.id,
        );
      }

      // Luego ejecutar el cambio de estado
      await ejecutarCambioEstado(
        facturaParaCambiarEstado.id,
        facturaParaCambiarEstado.nuevoEstado,
      );

      // Cerrar popup y limpiar estados
      setMostrarPopupConfirmacionEstado(false);
      setFacturaParaCambiarEstado(null);
      setComprobanteParaEliminar(null);
    } catch (error) {
      console.error(
        "❌ Error al cambiar estado y eliminar comprobante:",
        error,
      );
    }
  };

  const cerrarPopupConfirmacionEstado = () => {
    setMostrarPopupConfirmacionEstado(false);
    setFacturaParaCambiarEstado(null);
    setComprobanteParaEliminar(null);
  };

  const descargarComprobanteAntesDeCerrar = () => {
    if (comprobanteParaEliminar && facturaParaCambiarEstado) {
      descargarArchivo(
        facturaParaCambiarEstado.id,
        comprobanteParaEliminar.id,
        comprobanteParaEliminar.nombre,
      );
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoComprobante(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivoComprobante(e.dataTransfer.files[0]);
    }
  };

  const subirArchivo = (
    facturaId: string,
    archivo: Omit<Archivo, "id" | "fechaSubida">,
  ) => {
    console.log("Subir archivo no implementado aún:", facturaId, archivo);
  };

  const agregarCotizacion = (
    facturaId: string,
    cotizacion: Omit<Cotizacion, "id">,
  ) => {
    console.log(
      "Agregar cotización no implementado aún:",
      facturaId,
      cotizacion,
    );
  };

  const manejarCrearProveedor = async (
    datos: Omit<Proveedor, "id" | "fechaCreacion">,
  ) => {
    try {
      await crearProveedor(datos);
      setVistaActual("proveedores");
    } catch (error) {
      console.error("Error al crear proveedor:", error);
      showToast(
        error instanceof Error ? error.message : "Error al crear proveedor",
        "error",
      );
    }
  };

  const manejarEditarProveedor = (proveedor: Proveedor) => {
    setProveedorEditando(proveedor);
    navegarA("editar-proveedor");
  };

  const manejarActualizarProveedor = async (
    datos: Omit<Proveedor, "id" | "fechaCreacion">,
  ) => {
    if (proveedorEditando) {
      try {
        await actualizarProveedor(proveedorEditando.id, datos);
        setVistaActual("proveedores");
        setProveedorEditando(null);
      } catch (error) {
        console.error("Error al actualizar proveedor:", error);
      }
    }
  };

  // Handler para crear proveedor desde el modal en formulario de factura
  const manejarCrearProveedorDesdeModal = async (
    datos: Omit<Proveedor, "id" | "fechaCreacion">,
  ) => {
    try {
      const nuevoProveedor = await crearProveedor(datos);
      console.log("✅ Proveedor creado desde modal:", nuevoProveedor);

      // Cerrar el modal
      setMostrarModalProveedor(false);

      // Recargar proveedores para asegurar que la lista esté actualizada
      await cargarProveedores();

      // Pequeño delay para asegurar que React actualice el estado
      setTimeout(() => {
        // Guardar el ID del proveedor recién creado
        if (nuevoProveedor && nuevoProveedor.id) {
          console.log(
            "🎯 Estableciendo proveedor recién creado:",
            nuevoProveedor.id,
          );
          setProveedorRecienCreado(nuevoProveedor.id);
        }
      }, 100);
    } catch (error) {
      console.error("Error al crear proveedor desde modal:", error);
      showToast(
        error instanceof Error ? error.message : "Error al crear proveedor",
        "error",
      );
    }
  };

  const manejarEliminarProveedor = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas desactivar este proveedor?")) {
      try {
        await eliminarProveedor(id);
      } catch (error) {
        console.error("Error al eliminar proveedor:", error);
      }
    }
  };

  const manejarReactivarProveedor = async (id: string) => {
    try {
      await reactivarProveedor(id);
    } catch (error) {
      console.error("Error al reactivar proveedor:", error);
    }
  };

  const handleCerrarSesion = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      cerrarSesionAuth();
      router.push("/login");
    }
  };

  if (loading && facturas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
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
        paginaActiva="facturas"
        onMenuClick={handleMenuClick}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="pt-14 pl-14 bg-white min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 pt-8">
          {vistaActual === "dashboard" && (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Facturas y Pagos
                    </h2>
                    <p className="text-gray-600">
                      {usuario?.tipo === "auditor"
                        ? "Consulta y auditoría de facturas y pagos"
                        : "Gestión de facturas, proveedores y control de pagos"}
                    </p>
                  </div>
                  {(tienePermiso("facturas", "crear") ||
                    tienePermiso("facturas", "marcarPagada") ||
                    tienePermiso("facturas", "exportar")) && (
                    <div className="flex flex-wrap gap-3">
                      {tienePermiso("facturas", "crear") && (
                        <>
                          <button
                            onClick={() => navegarA("nueva")}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            📄 Cargar Factura (PDF/XML)
                          </button>
                          <button
                            onClick={() => navegarA("proveedores")}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            🏢 Gestionar Proveedores
                          </button>
                        </>
                      )}
                      {tienePermiso("facturas", "exportar") && (
                        <button
                          onClick={() => exportarExcel()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          📊 Exportar CSV
                        </button>
                      )}
                      {usuario?.tipo === "auditor" && (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            👁️ Modo Auditor
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                {/* Filtros primero */}
                <div className="w-full">
                  <FiltrosFacturas
                    filtros={filtros}
                    onFiltrosChange={setFiltros}
                    facturas={facturas}
                  />
                </div>

                {/* Gráfica de proyección vs gasto */}
                <div className="w-full">
                  <GraficaProyeccionVsGasto
                    año={filtros.año}
                    mes={filtros.mes}
                    categoriaFiltro={filtros.categoria}
                  />
                </div>

                {/* Lista de facturas */}
                <div className="w-full">
                  <ListaFacturas
                    facturas={facturasFiltradasMemo}
                    onEditar={manejarEditarFactura}
                    onEliminar={manejarEliminarFactura}
                    onCambiarEstado={manejarCambiarEstado}
                    onIngresarFactura={manejarIngresarFactura}
                    onSubirArchivo={subirArchivo}
                    onAgregarCotizacion={agregarCotizacion}
                    onDescargarArchivo={descargarArchivo}
                    onDescargarCotizacion={descargarCotizacion}
                    loading={loading}
                    permisos={{
                      editar: tienePermiso("facturas", "editar"),
                      eliminar: tienePermiso("facturas", "eliminar"),
                      autorizar: tienePermiso("facturas", "autorizar"),
                      marcarPagada: tienePermiso("facturas", "marcarPagada"),
                      ingresar:
                        tienePermiso("facturas", "autorizar") ||
                        usuario?.tipo === "coordinador",
                    }}
                    esAdministrador={
                      usuario?.tipo === "administrador" ||
                      usuario?.tipo === "developer"
                    }
                  />
                </div>
              </div>
            </>
          )}

          {vistaActual === "nueva" && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Facturas
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Registrar Nueva Factura
                </h2>
              </div>
              <FormularioFactura
                onSubmit={manejarCrearFactura}
                onCancel={() => setVistaActual("dashboard")}
                loading={loading}
                onAbrirModalProveedor={() => setMostrarModalProveedor(true)}
                proveedorRecienCreado={proveedorRecienCreado}
              />
            </div>
          )}

          {vistaActual === "editar" && facturaEditando && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("dashboard")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Facturas
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Editar Factura
                </h2>
              </div>
              <FormularioFactura
                facturaInicial={facturaEditando}
                onSubmit={manejarActualizarFactura}
                onCancel={() => setVistaActual("dashboard")}
                loading={loading}
                onAbrirModalProveedor={() => setMostrarModalProveedor(true)}
                proveedorRecienCreado={proveedorRecienCreado}
              />
            </div>
          )}

          {vistaActual === "proveedores" && (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <button
                      onClick={() => setVistaActual("dashboard")}
                      className="text-blue-600 hover:text-blue-800 mb-4"
                    >
                      ← Volver a Facturas
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Gestión de Proveedores
                    </h2>
                    <p className="text-gray-600">
                      Administra la información de contacto y detalles de tus
                      proveedores
                    </p>
                  </div>

                  {tienePermiso("facturas", "crear") && (
                    <button
                      onClick={() => navegarA("nuevo-proveedor")}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ➕ Nuevo Proveedor
                    </button>
                  )}
                </div>
              </div>

              <ListaProveedores
                proveedores={proveedores}
                onEditar={manejarEditarProveedor}
                onEliminar={manejarEliminarProveedor}
                onReactivar={manejarReactivarProveedor}
                loading={loadingProveedores}
              />
            </>
          )}

          {vistaActual === "nuevo-proveedor" && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("proveedores")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Proveedores
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Registrar Nuevo Proveedor
                </h2>
              </div>
              <FormularioProveedor
                onSubmit={manejarCrearProveedor}
                onCancelar={() => setVistaActual("proveedores")}
                loading={loadingProveedores}
              />
            </div>
          )}

          {vistaActual === "editar-proveedor" && proveedorEditando && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setVistaActual("proveedores")}
                  className="text-blue-600 hover:text-blue-800 mb-4"
                >
                  ← Volver a Proveedores
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Editar Proveedor
                </h2>
              </div>
              <FormularioProveedor
                proveedor={proveedorEditando}
                onSubmit={manejarActualizarProveedor}
                onCancelar={() => {
                  setVistaActual("proveedores");
                  setProveedorEditando(null);
                }}
                loading={loadingProveedores}
              />
            </div>
          )}
        </main>
      </div>

      {activeConfigView === "mi-perfil" && (
        <GestionPerfilCoordinador onClose={() => setActiveConfigView("")} />
      )}
      {activeConfigView === "cambiar-contrasena" && (
        <CambiarContrasenaCoordinador onClose={() => setActiveConfigView("")} />
      )}

      {/* Popup para comprobante de pago */}
      {mostrarPopupComprobante && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comprobante de Pago
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Sube el comprobante de pago para marcar esta factura como pagada.
              <span className="text-red-600 font-medium">
                {" "}
                El comprobante es obligatorio.
              </span>
            </p>

            {/* Zona de drag & drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${
                arrastrando
                  ? "border-blue-500 bg-blue-50"
                  : archivoComprobante
                    ? "border-green-300 bg-gray-50"
                    : "border-gray-300 bg-gray-50"
              }`}
            >
              {archivoComprobante ? (
                <div className="space-y-2">
                  <div className="text-green-600 text-4xl">✓</div>
                  <p className="text-sm font-medium text-gray-900">
                    {archivoComprobante.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(archivoComprobante.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setArchivoComprobante(null)}
                    className="text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-gray-400 text-4xl">📄</div>
                  <p className="text-sm text-gray-600">
                    Arrastra el archivo aquí o
                  </p>
                  <label className="inline-block cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 underline text-sm">
                      selecciona un archivo
                    </span>
                    <input
                      type="file"
                      onChange={handleArchivoChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, JPG o PNG (máx. 10MB)
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmarPagoConComprobante}
                disabled={!archivoComprobante}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  archivoComprobante
                    ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Marcar como Pagada
              </button>
              <button
                onClick={cerrarPopupComprobante}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmación para cambio de estado desde Pagada */}
      {mostrarPopupConfirmacionEstado &&
        comprobanteParaEliminar &&
        facturaParaCambiarEstado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚠️ Confirmar Cambio de Estado
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Esta factura está marcada como{" "}
                <span className="font-semibold text-green-600">Pagada</span> y
                tiene un comprobante de pago adjunto.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <span className="text-amber-600 text-xl">📄</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {comprobanteParaEliminar.nombre}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Subido el{" "}
                      {new Date(
                        comprobanteParaEliminar.fechaSubida,
                      ).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-red-600 font-medium mb-4">
                Si continúas, el comprobante de pago será eliminado
                permanentemente.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                ¿Deseas descargar el comprobante antes de continuar?
              </p>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    descargarComprobanteAntesDeCerrar();
                    setTimeout(() => {
                      confirmarCambioEstadoConEliminacion();
                    }, 500);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Descargar y Continuar
                </button>
                <button
                  onClick={confirmarCambioEstadoConEliminacion}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Continuar sin Descargar
                </button>
                <button
                  onClick={cerrarPopupConfirmacionEstado}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal para agregar proveedor desde formulario de factura */}
      {mostrarModalProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Agregar Nuevo Proveedor
              </h3>
              <button
                onClick={() => setMostrarModalProveedor(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <FormularioProveedor
                onSubmit={manejarCrearProveedorDesdeModal}
                onCancelar={() => setMostrarModalProveedor(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacturasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Cargando...
        </div>
      }
    >
      <FacturasPageContent />
    </Suspense>
  );
}
