"use client";

import React, { useState } from "react";
import { Factura, Archivo, Cotizacion } from "@/types";
import { fetchConToken } from "@/lib/auth-utils";

interface ListaFacturasProps {
  facturas: Factura[];
  onEditar: (factura: Factura) => void;
  onEliminar: (id: string) => void;
  onCambiarEstado: (id: string, estado: Factura["estado"]) => void;
  onIngresarFactura?: (id: string, fechaIngreso: string) => void;
  onSubirArchivo?: (
    facturaId: string,
    archivo: Omit<Archivo, "id" | "fechaSubida">,
  ) => void;
  onAgregarCotizacion?: (
    facturaId: string,
    cotizacion: Omit<Cotizacion, "id">,
  ) => void;
  onDescargarArchivo?: (
    facturaId: string,
    archivoId: string,
    nombreArchivo: string,
  ) => void;
  onDescargarCotizacion?: (
    facturaId: string,
    cotizacionId: string,
    nombreArchivo: string,
  ) => void;
  loading?: boolean;
  permisos?: {
    editar: boolean;
    eliminar: boolean;
    autorizar: boolean;
    marcarPagada: boolean;
    ingresar: boolean;
  };
  esAdministrador?: boolean;
}

export default function ListaFacturas({
  facturas,
  onEditar,
  onEliminar,
  onCambiarEstado,
  onIngresarFactura,
  onDescargarArchivo,
  onDescargarCotizacion,
  loading = false,
  permisos = {
    editar: true,
    eliminar: true,
    autorizar: true,
    marcarPagada: true,
    ingresar: true,
  },
  esAdministrador = false,
}: ListaFacturasProps) {
  const [facturaExpandida, setFacturaExpandida] = useState<string | null>(null);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<string[]>(
    [],
  );
  const [mostrarPopupIngreso, setMostrarPopupIngreso] = useState(false);
  const [facturaAIngresar, setFacturaAIngresar] = useState<string | null>(null);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [nuevoEstadoDeseado, setNuevoEstadoDeseado] = useState<
    Factura["estado"] | null
  >(null);
  const [ordenFechaIngreso, setOrdenFechaIngreso] = useState<"asc" | "desc">(
    "asc",
  );
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    url: string | null;
    nombre: string;
  }>({ isOpen: false, url: null, nombre: "" });

  const formatearMonto = (monto: number) => {
    if (typeof monto !== "number" || isNaN(monto)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const formatearFecha = (fecha: string) => {
    // Convertir de yyyy-mm-dd a dd/mm/yyyy sin usar Date para evitar problemas de zona horaria
    const partes = fecha.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fecha;
  };

  const toggleExpandir = (id: string) => {
    setFacturaExpandida(facturaExpandida === id ? null : id);
  };

  const toggleSeleccionFactura = (id: string) => {
    setFacturasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id],
    );
  };

  const toggleOrdenFechaIngreso = () => {
    setOrdenFechaIngreso((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Ordenar facturas por fecha de ingreso
  const facturasOrdenadas = [...facturas].sort((a, b) => {
    // Las que tienen fecha de ingreso
    const tieneA = a.fechaIngresada && a.fechaIngresada.trim() !== "";
    const tieneB = b.fechaIngresada && b.fechaIngresada.trim() !== "";

    // Si ambas tienen fecha de ingreso, ordenar por fecha
    if (tieneA && tieneB) {
      const fechaA = new Date(a.fechaIngresada!).getTime();
      const fechaB = new Date(b.fechaIngresada!).getTime();
      return ordenFechaIngreso === "asc" ? fechaA - fechaB : fechaB - fechaA;
    }

    // Si solo una tiene fecha de ingreso, la que no tiene va arriba
    if (tieneA && !tieneB) return 1;
    if (!tieneA && tieneB) return -1;

    // Si ninguna tiene fecha de ingreso, ordenar por fecha de pago
    if (!tieneA && !tieneB) {
      const fechaPagoA = a.fechaEstimadaPago
        ? new Date(a.fechaEstimadaPago).getTime()
        : 0;
      const fechaPagoB = b.fechaEstimadaPago
        ? new Date(b.fechaEstimadaPago).getTime()
        : 0;
      return fechaPagoA - fechaPagoB;
    }

    return 0;
  });

  const seleccionarTodasFacturas = () => {
    if (facturasSeleccionadas.length === facturas.length) {
      setFacturasSeleccionadas([]);
    } else {
      setFacturasSeleccionadas(facturas.map((f) => f.id));
    }
  };

  const getEstadoColor = (estado: Factura["estado"]) => {
    switch (estado) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "Autorizada":
        return "bg-orange-100 text-orange-800";
      case "Ingresada":
        return "bg-purple-100 text-purple-800";
      case "Pagada":
        return "bg-green-100 text-green-800";
      case "Rechazada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const descargarArchivo = (
    facturaId: string,
    archivoId: string,
    nombreArchivo: string,
  ) => {
    if (onDescargarArchivo) {
      onDescargarArchivo(facturaId, archivoId, nombreArchivo);
    } else {
      alert("Función de descarga no disponible");
    }
  };

  const verPDF = async (
    facturaId: string,
    archivoId: string,
    nombreArchivo: string,
    tipo: "archivo" | "cotizacion",
  ) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

      const endpoint =
        tipo === "archivo"
          ? `${API_URL}/facturas/${facturaId}/archivos/${archivoId}/descargar`
          : `${API_URL}/facturas/${facturaId}/cotizaciones/${archivoId}/descargar`;

      const response = await fetchConToken(endpoint);

      if (!response.ok) {
        throw new Error(`Error al cargar PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setPdfViewer({ isOpen: true, url, nombre: nombreArchivo });
    } catch (error) {
      console.error("Error cargando PDF:", error);
      alert("Error al cargar el PDF para visualización");
    }
  };

  const cerrarPdfViewer = () => {
    if (pdfViewer.url) {
      window.URL.revokeObjectURL(pdfViewer.url);
    }
    setPdfViewer({ isOpen: false, url: null, nombre: "" });
  };

  const abrirPopupIngreso = (facturaId: string) => {
    setFacturaAIngresar(facturaId);
    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split("T")[0];
    setFechaIngreso(hoy);
    setMostrarPopupIngreso(true);
  };

  const cerrarPopupIngreso = () => {
    setMostrarPopupIngreso(false);
    setFacturaAIngresar(null);
    setFechaIngreso("");
    setNuevoEstadoDeseado(null);
  };

  const confirmarIngreso = () => {
    if (facturaAIngresar && fechaIngreso && onIngresarFactura) {
      onIngresarFactura(facturaAIngresar, fechaIngreso);
      // Si había un estado deseado (Pagada), cambiarlo después de ingresar
      if (nuevoEstadoDeseado && nuevoEstadoDeseado !== "Ingresada") {
        setTimeout(() => {
          onCambiarEstado(facturaAIngresar, nuevoEstadoDeseado);
        }, 500);
      }
      cerrarPopupIngreso();
    }
  };

  const manejarCambioEstado = (
    factura: Factura,
    nuevoEstado: Factura["estado"],
  ) => {
    // Si intenta cambiar a Ingresada o Pagada y no tiene fecha_ingresada
    if (
      (nuevoEstado === "Ingresada" || nuevoEstado === "Pagada") &&
      !factura.fechaIngresada &&
      (factura.estado === "Pendiente" || factura.estado === "Autorizada")
    ) {
      // Abrir popup para pedir fecha de ingreso
      setFacturaAIngresar(factura.id);
      const hoy = new Date().toISOString().split("T")[0];
      setFechaIngreso(hoy);
      setNuevoEstadoDeseado(nuevoEstado);
      setMostrarPopupIngreso(true);
    } else {
      // Cambio de estado normal
      onCambiarEstado(factura.id, nuevoEstado);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Lista de Facturas
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {facturas.length} factura{facturas.length !== 1 ? "s" : ""} encontrada
          {facturas.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={facturasSeleccionadas.length === facturas.length}
                  onChange={seleccionarTodasFacturas}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Folio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                <button
                  onClick={toggleOrdenFechaIngreso}
                  className="flex items-center space-x-1 hover:text-gray-900 transition-colors"
                >
                  <span>Fecha Ingresada</span>
                  <span className="text-sm">
                    {ordenFechaIngreso === "asc" ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 11l5-5m0 0l5 5m-5-5v12"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 13l-5 5m0 0l-5-5m5 5V6"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Orden de Compra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Fecha Pago
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="text-gray-500 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay facturas
                  </h3>
                  <p className="text-gray-500">
                    Registra tu primera factura para comenzar.
                  </p>
                </td>
              </tr>
            ) : (
              facturasOrdenadas.map((factura) => (
                <React.Fragment key={factura.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpandir(factura.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={facturasSeleccionadas.includes(factura.id)}
                        onChange={() => toggleSeleccionFactura(factura.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {factura.folio}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {factura.proveedor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {factura.fechaIngresada
                        ? formatearFecha(factura.fechaIngresada)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {factura.ordenCompra || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatearMonto(factura.subtotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {esAdministrador ? (
                        <select
                          value={factura.estado}
                          onChange={(e) =>
                            manejarCambioEstado(
                              factura,
                              e.target.value as Factura["estado"],
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${getEstadoColor(
                            factura.estado,
                          )}`}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Autorizada">Autorizada</option>
                          <option value="Ingresada">Ingresada</option>
                          <option value="Pagada">Pagada</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(
                            factura.estado,
                          )}`}
                        >
                          {factura.estado}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatearFecha(factura.fechaEstimadaPago)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandir(factura.id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver
                      </button>
                      {permisos.editar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditar(factura);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Editar
                        </button>
                      )}
                      {permisos.eliminar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEliminar(factura.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      )}
                      {permisos.autorizar && factura.estado === "Pendiente" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCambiarEstado(factura.id, "Autorizada");
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Autorizar
                        </button>
                      )}
                      {permisos.ingresar &&
                        factura.estado === "Autorizada" &&
                        !factura.fechaIngresada && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirPopupIngreso(factura.id);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ingresada
                          </button>
                        )}
                      {permisos.marcarPagada &&
                        (factura.estado === "Autorizada" ||
                          factura.estado === "Ingresada") &&
                        factura.fechaIngresada && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCambiarEstado(factura.id, "Pagada");
                            }}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Marcar Pagada
                          </button>
                        )}
                    </td>
                  </tr>
                  {facturaExpandida === factura.id && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              Detalles de la Factura
                            </h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-gray-700">Subtotal:</dt>
                                <dd className="font-medium text-gray-900">
                                  {formatearMonto(factura.subtotal)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-700">IVA:</dt>
                                <dd className="font-medium text-gray-900">
                                  {formatearMonto(factura.iva)}
                                </dd>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <dt className="text-gray-700 font-medium">
                                  Total:
                                </dt>
                                <dd className="font-bold text-lg text-gray-900">
                                  {formatearMonto(factura.total)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-700">
                                  Fecha Emisión:
                                </dt>
                                <dd className="text-gray-900">
                                  {formatearFecha(factura.fechaEmision)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-700">Marca:</dt>
                                <dd className="font-medium text-gray-900">
                                  {factura.marca}
                                </dd>
                              </div>
                              {factura.categoria && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-700">Categoría:</dt>
                                  <dd className="font-medium text-gray-900">
                                    {factura.categoria}
                                  </dd>
                                </div>
                              )}
                              {factura.subcategoria && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-700">
                                    Subcategoría:
                                  </dt>
                                  <dd className="font-medium text-gray-900">
                                    {factura.subcategoria}
                                  </dd>
                                </div>
                              )}
                              {factura.eventoNombre && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-700">Evento:</dt>
                                  <dd className="font-medium text-blue-900">
                                    {factura.eventoNombre}
                                  </dd>
                                </div>
                              )}
                              {factura.campanyaNombre && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-700">Campaña:</dt>
                                  <dd className="font-medium text-purple-900">
                                    {factura.campanyaNombre}
                                  </dd>
                                </div>
                              )}
                              {factura.productos && (
                                <div className="pt-2">
                                  <dt className="text-gray-700">Productos:</dt>
                                  <dd className="mt-1 text-gray-900 font-medium whitespace-pre-wrap">
                                    {factura.productos}
                                  </dd>
                                </div>
                              )}
                              {factura.observaciones && (
                                <div className="pt-2">
                                  <dt className="text-gray-700">
                                    Observaciones:
                                  </dt>
                                  <dd className="mt-1 text-gray-900 font-medium">
                                    {factura.observaciones}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              Archivos
                            </h4>
                            {factura.archivos.length > 0 ? (
                              <div className="space-y-2">
                                {factura.archivos.map((archivo) => (
                                  <div
                                    key={archivo.id}
                                    className="flex items-center justify-between bg-white p-2 rounded"
                                  >
                                    <div className="flex items-center space-x-2 flex-1">
                                      <span className="text-sm text-gray-900 font-medium">
                                        {archivo.nombre}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-1 rounded ${
                                          archivo.tipo === "PDF"
                                            ? "bg-red-100 text-red-800"
                                            : archivo.tipo === "XML"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-green-100 text-green-800"
                                        }`}
                                      >
                                        {archivo.tipo}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {archivo.tipo === "PDF" && (
                                        <button
                                          onClick={() =>
                                            verPDF(
                                              factura.id,
                                              archivo.id,
                                              archivo.nombre,
                                              "archivo",
                                            )
                                          }
                                          className="text-purple-600 hover:text-purple-900 text-xs font-medium"
                                        >
                                          Ver
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          descargarArchivo(
                                            factura.id,
                                            archivo.id,
                                            archivo.nombre,
                                          )
                                        }
                                        className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                      >
                                        Descargar
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">
                                No hay archivos adjuntos.
                              </p>
                            )}

                            {factura.cotizaciones.length > 0 && (
                              <>
                                <h4 className="font-medium text-gray-900 mb-3 mt-4">
                                  Cotizaciones
                                </h4>
                                <div className="space-y-2">
                                  {factura.cotizaciones.map((cotizacion) => (
                                    <div
                                      key={cotizacion.id}
                                      className="bg-white p-2 rounded text-sm"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex justify-between">
                                            <span className="text-gray-900 font-medium">
                                              {cotizacion.proveedor}
                                            </span>
                                          </div>
                                          {cotizacion.observaciones && (
                                            <p className="text-gray-700 text-xs mt-1">
                                              {cotizacion.observaciones}
                                            </p>
                                          )}
                                          {cotizacion.archivo && (
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                              <span className="text-xs text-gray-600">
                                                Cotización PDF
                                              </span>
                                              <div className="flex items-center space-x-2">
                                                <button
                                                  onClick={() =>
                                                    verPDF(
                                                      factura.id,
                                                      cotizacion.id,
                                                      cotizacion.archivo!
                                                        .nombre,
                                                      "cotizacion",
                                                    )
                                                  }
                                                  className="text-purple-600 hover:text-purple-900 text-xs font-medium"
                                                >
                                                  Ver
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (onDescargarCotizacion) {
                                                      onDescargarCotizacion(
                                                        factura.id,
                                                        cotizacion.id,
                                                        cotizacion.archivo!
                                                          .nombre,
                                                      );
                                                    }
                                                  }}
                                                  className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                                >
                                                  Descargar
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                            {factura.fechaAutorizacion && (
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Historial
                                </h4>
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Creada:
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                      {formatearFecha(factura.fechaCreacion)}
                                    </span>
                                  </div>
                                  {factura.fechaAutorizacion && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Autorizada:
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {formatearFecha(
                                          factura.fechaAutorizacion,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {factura.fechaRealPago && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Pagada:
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {formatearFecha(factura.fechaRealPago)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {facturasSeleccionadas.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <span className="text-sm text-gray-700">
            {facturasSeleccionadas.length} factura
            {facturasSeleccionadas.length !== 1 ? "s" : ""} seleccionada
            {facturasSeleccionadas.length !== 1 ? "s" : ""}
          </span>
          <div className="space-x-2">
            <button
              onClick={() => {
                facturasSeleccionadas.forEach((id) => {
                  const factura = facturas.find((f) => f.id === id);
                  if (factura?.estado === "Autorizada") {
                    onCambiarEstado(id, "Pagada");
                  }
                });
                setFacturasSeleccionadas([]);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              Marcar como Pagadas
            </button>
            <button
              onClick={() => setFacturasSeleccionadas([])}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Popup para ingresar factura */}
      {mostrarPopupIngreso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {nuevoEstadoDeseado === "Pagada"
                ? "Factura Ingresada a Pago para Marcar como Pagada"
                : "Factura Ingresada a Pago"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {nuevoEstadoDeseado === "Pagada"
                ? "Para marcar la factura como pagada, primero debes ingresarla. Ingresa la fecha en que fue recibida o ingresada al sistema contable."
                : "Ingresa la fecha en que la factura fue recibida o ingresada al sistema contable."}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Ingreso *
              </label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmarIngreso}
                disabled={!fechaIngreso}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium"
              >
                Confirmar
              </button>
              <button
                onClick={cerrarPopupIngreso}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visor de PDF */}
      {pdfViewer.isOpen && pdfViewer.url && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {pdfViewer.nombre}
              </h3>
              <button
                onClick={cerrarPdfViewer}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfViewer.url}
                className="w-full h-full border-0"
                title={pdfViewer.nombre}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
