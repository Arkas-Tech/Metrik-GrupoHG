"use client";

import { useState, useEffect } from "react";
import { Factura, MARCAS, METODOS_PAGO, MESES, AÑOS } from "@/types";
import { useProveedoresAPI } from "@/hooks/useProveedoresAPI";
import { useFacturasAPI } from "@/hooks/useFacturasAPI";
import { useCategoriasAPI } from "@/hooks/useCategoriasAPI";
import { fetchConToken } from "@/lib/auth-utils";
import DateInput from "./DateInput";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Función auxiliar para formatear fechas sin problemas de timezone
const formatearFechaLocal = (fechaStr: string): string => {
  const fecha = new Date(fechaStr);
  const año = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${dia}/${mes}/${año}`;
};

interface FormularioFacturaProps {
  facturaInicial?: Factura;
  onSubmit: (
    datos: Omit<Factura, "id" | "fechaCreacion">,
  ) => Promise<string | void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function FormularioFactura({
  facturaInicial,
  onSubmit,
  onCancel,
  loading = false,
}: FormularioFacturaProps) {
  const {
    proveedores,
    loading: proveedoresLoading,
    cargarProveedores,
  } = useProveedoresAPI();

  const { subirArchivos, subirCotizacion } = useFacturasAPI();

  const [folio, setFolio] = useState(facturaInicial?.folio || "");
  const [proveedor, setProveedor] = useState(facturaInicial?.proveedor || "");
  const [rfc, setRfc] = useState(facturaInicial?.rfc || "");
  const [subtotal, setSubtotal] = useState(
    facturaInicial?.subtotal?.toString() || "",
  );
  const [iva, setIva] = useState(facturaInicial?.iva?.toString() || "");
  const [total, setTotal] = useState(facturaInicial?.total?.toString() || "");
  const [fechaEmision, setFechaEmision] = useState(
    facturaInicial?.fechaEmision || "",
  );
  const [fechaEstimadaPago, setFechaEstimadaPago] = useState(
    facturaInicial?.fechaEstimadaPago || "",
  );
  const [marca, setMarca] = useState(facturaInicial?.marca || "");
  const [categoria, setCategoria] = useState(facturaInicial?.categoria || "");
  const [subcategoria, setSubcategoria] = useState(
    facturaInicial?.subcategoria || "",
  );
  const [usoCfdi, setUsoCfdi] = useState(facturaInicial?.usoCfdi || "");
  const [metodoPago, setMetodoPago] = useState(
    facturaInicial?.metodoPago || "",
  );
  const [observaciones, setObservaciones] = useState(
    facturaInicial?.observaciones || "",
  );
  const [ordenCompra, setOrdenCompra] = useState(
    facturaInicial?.ordenCompra || "",
  );
  const [eventoId, setEventoId] = useState(facturaInicial?.eventoId || "");
  const [campanyaId, setCampanyaId] = useState(
    facturaInicial?.campanyaId || "",
  );

  // Cargar categorías desde API
  const { cargarCategorias } = useCategoriasAPI();
  const [categorias, setCategorias] = useState<
    Array<{ nombre: string; subcategorias: string[] }>
  >([]);

  useEffect(() => {
    const cargarCategoriasFactura = async () => {
      try {
        const cats = await cargarCategorias(true);
        setCategorias(
          cats.map((c) => ({
            nombre: c.nombre,
            subcategorias: c.subcategorias,
          })),
        );
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      }
    };
    cargarCategoriasFactura();
  }, [cargarCategorias]);

  // Mes y año actual por defecto
  const mesActual = MESES[new Date().getMonth()];
  const añoActual = new Date().getFullYear();

  const [mesAsignado, setMesAsignado] = useState(
    facturaInicial?.mesAsignado || mesActual,
  );
  const [añoAsignado, setAñoAsignado] = useState(
    facturaInicial?.añoAsignado || añoActual,
  );

  const [eventosDisponibles, setEventosDisponibles] = useState<
    Array<{ id: number; nombre: string; fecha_inicio: string }>
  >([]);
  const [campanyasDisponibles, setCampanyasDisponibles] = useState<
    Array<{ id: number; nombre: string; fecha_inicio: string }>
  >([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [cargandoCampanyas, setCargandoCampanyas] = useState(false);

  const [archivos, setArchivos] = useState<File[]>([]);
  const [archivosCotizaciones, setArchivosCotizaciones] = useState<File[]>([]);
  const [archivosExistentes, setArchivosExistentes] = useState(
    facturaInicial?.archivos || [],
  );
  const [cotizaciones, setCotizaciones] = useState(
    facturaInicial?.cotizaciones || [],
  );

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [procesandoXML, setProcesandoXML] = useState(false);

  useEffect(() => {
    const subtotalNum = parseFloat(subtotal) || 0;
    const ivaNum = parseFloat(iva) || 0;
    const totalCalculado = subtotalNum + ivaNum;
    setTotal(totalCalculado.toFixed(2));
  }, [subtotal, iva]);

  useEffect(() => {
    if (proveedores.length === 0 && !proveedoresLoading) {
      cargarProveedores();
    }
  }, [proveedores.length, proveedoresLoading, cargarProveedores]);

  useEffect(() => {
    if (facturaInicial && proveedores.length > 0) {
      console.log("🔄 Sincronizando proveedor:", {
        facturaInicial: facturaInicial.proveedor,
        rfcFactura: facturaInicial.rfc,
        proveedoresDisponibles: proveedores.length,
      });

      const proveedorEncontrado = proveedores.find(
        (p) =>
          p.nombre === facturaInicial.proveedor ||
          (facturaInicial.rfc && p.rfc === facturaInicial.rfc),
      );

      if (proveedorEncontrado) {
        console.log("✅ Proveedor encontrado:", proveedorEncontrado.nombre);
        if (proveedor !== proveedorEncontrado.nombre) {
          setProveedor(proveedorEncontrado.nombre);
        }
        if (rfc !== (proveedorEncontrado.rfc || "")) {
          setRfc(proveedorEncontrado.rfc || "");
        }
      } else {
        console.log("❌ Proveedor no encontrado en la lista");
      }
    }
  }, [facturaInicial, proveedores, proveedor, rfc]);

  useEffect(() => {
    if (facturaInicial) {
      console.log("🔄 Sincronizando mes y año asignados:", {
        mesAsignado: facturaInicial.mesAsignado,
        añoAsignado: facturaInicial.añoAsignado,
      });

      // Siempre sincronizar, incluso si viene undefined (usa valores por defecto)
      setMesAsignado(facturaInicial.mesAsignado || mesActual);
      setAñoAsignado(facturaInicial.añoAsignado || añoActual);
    }
  }, [facturaInicial, mesActual, añoActual]);

  // Resetear subcategoría cuando cambia la categoría
  useEffect(() => {
    if (!facturaInicial) {
      setSubcategoria("");
    }
  }, [categoria, facturaInicial]);

  useEffect(() => {
    const cargarEventosYCampanyas = async () => {
      try {
        setCargandoEventos(true);
        const responseEventos = await fetchConToken(
          `${API_URL}/facturas/eventos-disponibles`,
        );
        if (responseEventos.ok) {
          const data = await responseEventos.json();
          setEventosDisponibles(data);
        }
        setCargandoEventos(false);

        setCargandoCampanyas(true);
        const responseCampanyas = await fetchConToken(
          `${API_URL}/facturas/campanyas-disponibles`,
        );
        if (responseCampanyas.ok) {
          const data = await responseCampanyas.json();
          setCampanyasDisponibles(data);
        }
        setCargandoCampanyas(false);
      } catch (error) {
        console.error("Error cargando eventos y campañas:", error);
        setCargandoEventos(false);
        setCargandoCampanyas(false);
      }
    };

    cargarEventosYCampanyas();
  }, []);

  const handleProveedorChange = (proveedorId: string) => {
    const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);
    if (proveedorSeleccionado) {
      setProveedor(proveedorSeleccionado.nombre);
      setRfc(proveedorSeleccionado.rfc || "");
    } else {
      setProveedor("");
      setRfc("");
    }
    if (errores.proveedor) {
      setErrores((prev) => ({ ...prev, proveedor: "" }));
    }
    if (errores.rfc) {
      setErrores((prev) => ({ ...prev, rfc: "" }));
    }
  };

  const handleRfcChange = (nuevoRfc: string) => {
    const rfcUpperCase = nuevoRfc.toUpperCase();
    setRfc(rfcUpperCase);

    if (rfcUpperCase.length >= 10) {
      const proveedorEncontrado = proveedores.find(
        (p) => p.rfc && p.rfc === rfcUpperCase,
      );
      if (proveedorEncontrado) {
        setProveedor(proveedorEncontrado.nombre);

        if (errores.proveedor) {
          setErrores((prev) => ({ ...prev, proveedor: "" }));
        }
      }
    }

    if (errores.rfc) {
      setErrores((prev) => ({ ...prev, rfc: "" }));
    }
  };
  useEffect(() => {
    const subtotalNum = parseFloat(subtotal) || 0;
    const ivaNum = parseFloat(iva) || 0;
    const totalCalculado = subtotalNum + ivaNum;
    if (totalCalculado > 0) {
      setTotal(totalCalculado.toString());
    }
  }, [subtotal, iva]);

  useEffect(() => {
    if (!folio && !facturaInicial) {
      const ultimoNumero = Math.floor(Math.random() * 9999) + 1;
      setFolio(`A${ultimoNumero.toString().padStart(3, "0")}`);
    }
  }, [folio, facturaInicial]);

  useEffect(() => {
    if (facturaInicial) {
      setFolio(facturaInicial.folio || "");
      setProveedor(facturaInicial.proveedor || "");
      setRfc(facturaInicial.rfc || "");
      setSubtotal(facturaInicial.subtotal?.toString() || "");
      setIva(facturaInicial.iva?.toString() || "");
      setTotal(facturaInicial.total?.toString() || "");
      setFechaEmision(facturaInicial.fechaEmision || "");
      setFechaEstimadaPago(facturaInicial.fechaEstimadaPago || "");
      setMarca(facturaInicial.marca || "");
      setCategoria(facturaInicial.categoria || "");
      setMetodoPago(facturaInicial.metodoPago || "");
      setObservaciones(facturaInicial.observaciones || "");
      setOrdenCompra(facturaInicial.ordenCompra || "");
      setEventoId(facturaInicial.eventoId || "");
      setCampanyaId(facturaInicial.campanyaId || "");
    }
  }, [facturaInicial]);

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!folio) nuevosErrores.folio = "El folio es requerido";
    if (!proveedor) nuevosErrores.proveedor = "El proveedor es requerido";
    if (!rfc) nuevosErrores.rfc = "El RFC es requerido";
    if (!subtotal || parseFloat(subtotal) <= 0)
      nuevosErrores.subtotal = "El subtotal debe ser mayor a 0";
    if (!iva || parseFloat(iva) < 0)
      nuevosErrores.iva = "El IVA debe ser mayor o igual a 0";
    if (!total || parseFloat(total) <= 0)
      nuevosErrores.total = "El total debe ser mayor a 0";
    if (!fechaEmision)
      nuevosErrores.fechaEmision = "La fecha de emisión es requerida";
    if (!fechaEstimadaPago)
      nuevosErrores.fechaEstimadaPago =
        "La fecha estimada de pago es requerida";
    if (!marca) nuevosErrores.marca = "La agencia es requerida";
    if (!categoria) nuevosErrores.categoria = "La categoría es requerida";
    if (!subcategoria)
      nuevosErrores.subcategoria = "La subcategoría es requerida";
    if (!usoCfdi) nuevosErrores.usoCfdi = "El uso CFDI es requerido";
    if (!metodoPago)
      nuevosErrores.metodoPago = "El método de pago es requerido";

    if (rfc && !/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc.toUpperCase())) {
      nuevosErrores.rfc = "El RFC no tiene un formato válido";
    }

    if (fechaEmision && fechaEstimadaPago) {
      const emision = new Date(fechaEmision);
      const estimada = new Date(fechaEstimadaPago);
      if (estimada < emision) {
        nuevosErrores.fechaEstimadaPago =
          "La fecha estimada debe ser posterior a la emisión";
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarSubidaArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const archivosValidos = files.filter((file) => {
      const extension = file.name.toLowerCase().split(".").pop();
      return extension === "pdf" || extension === "xml";
    });

    if (archivosValidos.length !== files.length) {
      alert("Solo se permiten archivos PDF y XML");
    }

    setArchivos((prev) => [...prev, ...archivosValidos]);

    archivosValidos.forEach((archivo) => {
      if (archivo.name.toLowerCase().endsWith(".xml")) {
        procesarArchivoXML(archivo);
      }
    });
  };

  const eliminarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const procesarArchivoXML = async (archivo: File) => {
    try {
      setProcesandoXML(true);
      const contenidoXML = await archivo.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(contenidoXML, "text/xml");

      if (xmlDoc.documentElement.nodeName === "parsererror") {
        alert("Error al leer el archivo XML. Verifica que sea un XML válido.");
        return;
      }

      const comprobante =
        xmlDoc.getElementsByTagName("cfdi:Comprobante")[0] ||
        xmlDoc.getElementsByTagName("Comprobante")[0] ||
        xmlDoc.getElementsByTagNameNS(
          "http://www.sat.gob.mx/cfd/3",
          "Comprobante",
        )[0] ||
        xmlDoc.getElementsByTagNameNS(
          "http://www.sat.gob.mx/cfd/4",
          "Comprobante",
        )[0];

      if (!comprobante) {
        alert(
          "No se pudo encontrar la información del comprobante en el XML. Verifica que sea un CFDI válido.",
        );
        return;
      }

      const emisor =
        xmlDoc.getElementsByTagName("cfdi:Emisor")[0] ||
        xmlDoc.getElementsByTagName("Emisor")[0] ||
        xmlDoc.getElementsByTagNameNS(
          "http://www.sat.gob.mx/cfd/3",
          "Emisor",
        )[0] ||
        xmlDoc.getElementsByTagNameNS(
          "http://www.sat.gob.mx/cfd/4",
          "Emisor",
        )[0];

      const folio =
        comprobante.getAttribute("Folio") ||
        comprobante.getAttribute("folio") ||
        "";
      const fecha =
        comprobante.getAttribute("Fecha") ||
        comprobante.getAttribute("fecha") ||
        "";
      const subTotal =
        comprobante.getAttribute("SubTotal") ||
        comprobante.getAttribute("subTotal") ||
        "";
      const total =
        comprobante.getAttribute("Total") ||
        comprobante.getAttribute("total") ||
        "";
      const metodoPago =
        comprobante.getAttribute("MetodoPago") ||
        comprobante.getAttribute("metodoPago") ||
        "";
      const usoCFDI =
        comprobante.getAttribute("UsoCFDI") ||
        comprobante.getAttribute("usoCFDI") ||
        "";

      const subTotalNum = parseFloat(subTotal) || 0;
      const totalNum = parseFloat(total) || 0;
      const ivaCalculado = totalNum - subTotalNum;

      let nombreProveedor = "";
      let rfcProveedor = "";

      if (emisor) {
        nombreProveedor =
          emisor.getAttribute("Nombre") || emisor.getAttribute("nombre") || "";
        rfcProveedor =
          emisor.getAttribute("Rfc") || emisor.getAttribute("rfc") || "";
      }

      if (folio) setFolio(folio);

      if (rfcProveedor || nombreProveedor) {
        const proveedorExistente = proveedores.find(
          (p) =>
            (rfcProveedor &&
              p.rfc &&
              p.rfc.toLowerCase() === rfcProveedor.toLowerCase()) ||
            (nombreProveedor &&
              p.nombre.toLowerCase() === nombreProveedor.toLowerCase()),
        );

        if (proveedorExistente) {
          setProveedor(proveedorExistente.nombre);
          setRfc(proveedorExistente.rfc || "");
        } else {
          if (nombreProveedor) setProveedor(nombreProveedor);
          if (rfcProveedor) handleRfcChange(rfcProveedor);
        }
      }

      if (subTotal) setSubtotal(subTotal);
      if (ivaCalculado > 0) setIva(ivaCalculado.toFixed(2));
      if (total) setTotal(total);
      if (metodoPago) setMetodoPago(metodoPago);
      if (usoCFDI) setUsoCfdi(usoCFDI);
      if (usoCFDI) setUsoCfdi(usoCFDI);

      if (fecha) {
        const fechaObj = new Date(fecha);
        if (!isNaN(fechaObj.getTime())) {
          const fechaFormateada = fechaObj.toISOString().split("T")[0];
          setFechaEmision(fechaFormateada);

          const fechaPago = new Date(fechaObj);
          fechaPago.setDate(fechaPago.getDate() + 30);
          const fechaPagoFormateada = fechaPago.toISOString().split("T")[0];
          setFechaEstimadaPago(fechaPagoFormateada);
        }
      }

      alert(
        "Información del XML cargada correctamente. Revisa y ajusta los datos si es necesario.",
      );
    } catch (error) {
      console.error("Error al procesar XML:", error);
      alert(
        "Error al procesar el archivo XML. Verifica que sea un CFDI válido.",
      );
    } finally {
      setProcesandoXML(false);
    }
  };

  const manejarSubidaCotizacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const archivosValidos = files.filter((file) => {
      return file.type === "application/pdf" && file.size <= 10 * 1024 * 1024;
    });

    if (archivosValidos.length !== files.length) {
      alert("Solo se permiten archivos PDF de máximo 10MB");
      return;
    }

    const totalCotizaciones =
      cotizaciones.length +
      archivosCotizaciones.length +
      archivosValidos.length;
    if (totalCotizaciones > 3) {
      alert("Máximo 3 cotizaciones por factura (incluyendo las existentes)");
      return;
    }

    setArchivosCotizaciones((prev) => [...prev, ...archivosValidos]);
  };

  const eliminarCotizacion = (index: number) => {
    setArchivosCotizaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const eliminarArchivoExistente = (archivoId: string) => {
    setArchivosExistentes((prev) =>
      prev.filter((archivo) => archivo.id !== archivoId),
    );
  };

  const eliminarCotizacionExistente = (cotizacionId: string) => {
    setCotizaciones((prev) =>
      prev.filter((cotizacion) => cotizacion.id !== cotizacionId),
    );
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setEnviando(true);

    try {
      const datosFactura = {
        folio,
        proveedor,
        rfc: rfc.toUpperCase(),
        subtotal: parseFloat(subtotal),
        iva: parseFloat(iva),
        total: parseFloat(total),
        fechaEmision,
        fechaEstimadaPago,
        marca,
        categoria,
        subcategoria,
        usoCfdi,
        metodoPago,
        observaciones,
        ordenCompra,
        proyeccionId: undefined,
        eventoId: eventoId || undefined,
        campanyaId: campanyaId || undefined,
        mesAsignado,
        añoAsignado,
        estado: facturaInicial?.estado || ("Pendiente" as const),
        archivos: archivosExistentes,
        cotizaciones: cotizaciones,
      };

      console.log("📤 Datos de factura a enviar:", {
        "state.mesAsignado": mesAsignado,
        "state.añoAsignado": añoAsignado,
        "datosFactura.mesAsignado": datosFactura.mesAsignado,
        "datosFactura.añoAsignado": datosFactura.añoAsignado,
        todosLosDatos: datosFactura,
      });

      console.log("🚀 Llamando a onSubmit con:", datosFactura);
      const facturaId = await onSubmit(datosFactura);
      console.log("✅ onSubmit completado, facturaId:", facturaId);

      if (
        (archivos.length > 0 || archivosCotizaciones.length > 0) &&
        facturaId
      ) {
        console.log("📤 Subiendo archivos con ID de factura:", facturaId);

        try {
          if (archivos.length > 0) {
            console.log(`📤 Subiendo ${archivos.length} archivo(s)...`);
            const exitoArchivos = await subirArchivos(facturaId, archivos);
            if (exitoArchivos) {
              console.log("✅ Archivos subidos exitosamente");
            } else {
              console.error("❌ Error subiendo archivos");
            }
          }

          for (const archivo of archivosCotizaciones) {
            console.log(`📤 Subiendo cotización: ${archivo.name}...`);
            const exitoCotizacion = await subirCotizacion(
              facturaId,
              `Cotización ${archivo.name}`,
              0,
              archivo,
              `Archivo: ${archivo.name}`,
            );
            if (exitoCotizacion) {
              console.log("✅ Cotización subida exitosamente");
            } else {
              console.error("❌ Error subiendo cotización:", archivo.name);
            }
          }
        } catch (error) {
          console.error("❌ Error subiendo archivos:", error);
        }
      }

      if (!facturaInicial) {
        setFolio("");
        setProveedor("");
        setRfc("");
        setSubtotal("");
        setIva("");
        setTotal("");
        setFechaEmision("");
        setFechaEstimadaPago("");
        setMarca("");
        setCategoria("");
        setMetodoPago("");
        setObservaciones("");
        setOrdenCompra("");
        setEventoId("");
        setCampanyaId("");
        setArchivos([]);
        setArchivosCotizaciones([]);
        setArchivosExistentes([]);
        setCotizaciones([]);
      }
    } catch (error) {
      console.error("Error al enviar formulario:", error);
    } finally {
      setEnviando(false);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(monto);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={manejarSubmit} className="space-y-6">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📁 Archivos de Factura (PDF/XML)
          </h3>

          <div className="mb-4">
            <input
              type="file"
              multiple
              accept=".pdf,.xml"
              onChange={manejarSubidaArchivo}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
              disabled={enviando}
            />
            <p className="text-xs text-gray-600 mt-1">
              Solo archivos PDF y XML. Máximo 10MB por archivo.
            </p>
            {procesandoXML ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                <p className="text-xs text-yellow-700">
                  ⏳ Procesando archivo XML...
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Si subes un archivo XML (CFDI), la
                  información de la factura se llenará automáticamente.
                </p>
              </div>
            )}
          </div>

          {archivosExistentes.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">
                Archivos existentes:
              </h4>
              {archivosExistentes.map((archivo) => (
                <div
                  key={archivo.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200"
                >
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">📄</span>
                    <span className="text-sm font-medium text-gray-700">
                      {archivo.nombre}
                    </span>
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                      {archivo.tipo}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => window.open(archivo.url, "_blank")}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      disabled={enviando}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarArchivoExistente(archivo.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={enviando}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {archivos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">
                Archivos nuevos seleccionados:
              </h4>
              {archivos.map((archivo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white p-3 rounded border border-purple-100"
                >
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">📄</span>
                    <span className="text-sm font-medium text-gray-700">
                      {archivo.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarArchivo(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    disabled={enviando}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folio *
            </label>
            <input
              type="text"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="A001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
            {errores.folio && (
              <p className="text-red-500 text-xs mt-1">{errores.folio}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <select
              value={
                proveedores.find(
                  (p) => p.nombre === proveedor || (rfc && p.rfc === rfc),
                )?.id || ""
              }
              onChange={(e) => handleProveedorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando || proveedoresLoading}
            >
              <option value="">
                {proveedoresLoading
                  ? "Cargando proveedores..."
                  : "Selecciona un proveedor"}
              </option>
              {proveedores
                .filter((p) => p.activo)
                .map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre} {prov.rfc ? `- ${prov.rfc}` : ""}
                  </option>
                ))}
            </select>
            {errores.proveedor && (
              <p className="text-red-500 text-xs mt-1">{errores.proveedor}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC *
            </label>
            <input
              type="text"
              value={rfc}
              onChange={(e) => handleRfcChange(e.target.value)}
              placeholder={
                proveedor
                  ? "RFC autocompletado desde proveedor"
                  : "ABC123456DEF"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
              maxLength={13}
              readOnly={!!proveedor}
            />
            {errores.rfc && (
              <p className="text-red-500 text-xs mt-1">{errores.rfc}</p>
            )}
            {rfc && proveedores.find((p) => p.rfc === rfc) && (
              <p className="text-green-600 text-xs mt-1">
                ✓ Proveedor detectado automáticamente
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtotal *
            </label>
            <input
              type="text"
              value={
                subtotal
                  ? new Intl.NumberFormat("es-MX").format(parseFloat(subtotal))
                  : ""
              }
              onChange={(e) => {
                const valor = e.target.value.replace(/,/g, "");
                if (valor === "" || /^\d+\.?\d{0,2}$/.test(valor)) {
                  setSubtotal(valor);
                }
              }}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
            {errores.subtotal && (
              <p className="text-red-500 text-xs mt-1">{errores.subtotal}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IVA *
            </label>
            <input
              type="text"
              value={
                iva
                  ? new Intl.NumberFormat("es-MX").format(parseFloat(iva))
                  : ""
              }
              onChange={(e) => {
                const valor = e.target.value.replace(/,/g, "");
                if (valor === "" || /^\d+\.?\d{0,2}$/.test(valor)) {
                  setIva(valor);
                }
              }}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
            {errores.iva && (
              <p className="text-red-500 text-xs mt-1">{errores.iva}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total *
            </label>
            <div className="relative">
              <input
                type="number"
                value={total}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed"
                disabled
                readOnly
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-blue-600">📊 Calculado</span>
              </div>
            </div>
            {errores.total && (
              <p className="text-red-500 text-xs mt-1">{errores.total}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Emisión *
            </label>
            <DateInput
              value={fechaEmision}
              onChange={setFechaEmision}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
            {errores.fechaEmision && (
              <p className="text-red-500 text-xs mt-1">
                {errores.fechaEmision}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Estimada de Pago *
            </label>
            <DateInput
              value={fechaEstimadaPago}
              onChange={setFechaEstimadaPago}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
            {errores.fechaEstimadaPago && (
              <p className="text-red-500 text-xs mt-1">
                {errores.fechaEstimadaPago}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes Asignado *
            </label>
            <select
              value={mesAsignado}
              onChange={(e) => setMesAsignado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              {MESES.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año Asignado *
            </label>
            <select
              value={añoAsignado}
              onChange={(e) => setAñoAsignado(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              {AÑOS.map((año) => (
                <option key={año} value={año}>
                  {año}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agencia *
            </label>
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              <option value="">Seleccionar agencia</option>
              {MARCAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errores.marca && (
              <p className="text-red-500 text-xs mt-1">{errores.marca}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evento (opcional)
            </label>
            <select
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando || cargandoEventos}
            >
              <option value="">Sin evento asociado</option>
              {eventosDisponibles.map((evento) => (
                <option key={evento.id} value={evento.id.toString()}>
                  {evento.nombre} ({formatearFechaLocal(evento.fecha_inicio)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaña (opcional)
            </label>
            <select
              value={campanyaId}
              onChange={(e) => setCampanyaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando || cargandoCampanyas}
            >
              <option value="">Sin campaña asociada</option>
              {campanyasDisponibles.map((campanya) => (
                <option key={campanya.id} value={campanya.id.toString()}>
                  {campanya.nombre} (
                  {formatearFechaLocal(campanya.fecha_inicio)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orden de Compra (opcional)
            </label>
            <input
              type="text"
              value={ordenCompra}
              onChange={(e) => setOrdenCompra(e.target.value)}
              placeholder="Ej: OC-2024-001, REF-ABC123..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((cat) => (
                <option key={cat.nombre} value={cat.nombre}>
                  {cat.nombre}
                </option>
              ))}
            </select>
            {errores.categoria && (
              <p className="text-red-500 text-xs mt-1">{errores.categoria}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategoría *
            </label>
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando || !categoria}
            >
              <option value="">Seleccionar subcategoría</option>
              {categoria &&
                categorias
                  .find((c) => c.nombre === categoria)
                  ?.subcategorias.map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
            </select>
            {errores.subcategoria && (
              <p className="text-red-500 text-xs mt-1">
                {errores.subcategoria}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uso CFDI *
            </label>
            <select
              value={usoCfdi}
              onChange={(e) => setUsoCfdi(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              <option value="">Seleccionar uso CFDI</option>
              <option value="G01">G01 - Adquisición de mercancías</option>
              <option value="G02">
                G02 - Devoluciones, descuentos o bonificaciones
              </option>
              <option value="G03">G03 - Gastos en general</option>
              <option value="I01">I01 - Construcciones</option>
              <option value="I02">
                I02 - Mobilario y equipo de oficina por inversiones
              </option>
              <option value="I03">I03 - Equipo de transporte</option>
              <option value="I04">I04 - Equipo de computo y accesorios</option>
              <option value="I05">
                I05 - Dados, troqueles, moldes, matrices y herramental
              </option>
              <option value="I06">I06 - Comunicaciones telefónicas</option>
              <option value="I07">I07 - Comunicaciones satelitales</option>
              <option value="I08">I08 - Otra maquinaria y equipo</option>
              <option value="D01">
                D01 - Honorarios médicos, dentales y gastos hospitalarios
              </option>
              <option value="D02">
                D02 - Gastos médicos por incapacidad o discapacidad
              </option>
              <option value="D03">D03 - Gastos funerales</option>
              <option value="D04">D04 - Donativos</option>
              <option value="D05">
                D05 - Intereses reales efectivamente pagados por créditos
                hipotecarios
              </option>
              <option value="D06">D06 - Aportaciones voluntarias al SAR</option>
              <option value="D07">
                D07 - Primas por seguros de gastos médicos
              </option>
              <option value="D08">
                D08 - Gastos de transportación escolar obligatoria
              </option>
              <option value="D09">
                D09 - Depósitos en cuentas para el ahorro
              </option>
              <option value="D10">D10 - Pagos por servicios educativos</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
              <option value="CP01">CP01 - Pagos</option>
              <option value="CN01">CN01 - Nómina</option>
            </select>
            {errores.usoCfdi && (
              <p className="text-red-500 text-xs mt-1">{errores.usoCfdi}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={enviando}
            >
              <option value="">Seleccionar método de pago</option>
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo.codigo} value={metodo.codigo}>
                  {metodo.descripcion}
                </option>
              ))}
            </select>
            {errores.metodoPago && (
              <p className="text-red-500 text-xs mt-1">{errores.metodoPago}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Comentarios adicionales..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={enviando}
          />
        </div>
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Cotizaciones (PDF)
            <span className="text-sm text-gray-500 ml-2">
              ({cotizaciones.length + archivosCotizaciones.length}/3)
            </span>
          </h3>

          <div className="mb-4">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={manejarSubidaCotizacion}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              disabled={
                enviando ||
                cotizaciones.length + archivosCotizaciones.length >= 3
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF. Máximo 3 cotizaciones de 10MB cada una.
            </p>
          </div>
          {cotizaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">
                Cotizaciones existentes:
              </h4>
              {cotizaciones.map((cotizacion) => (
                <div
                  key={cotizacion.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200"
                >
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">📄</span>
                    <span className="text-sm font-medium text-gray-700">
                      {cotizacion.proveedor}
                    </span>
                    {cotizacion.archivo && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                        {cotizacion.archivo.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {cotizacion.archivo && (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(cotizacion.archivo!.url, "_blank")
                        }
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        disabled={enviando}
                      >
                        Ver
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => eliminarCotizacionExistente(cotizacion.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={enviando}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {archivosCotizaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">
                Cotizaciones nuevas seleccionadas:
              </h4>
              {archivosCotizaciones.map((archivo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200"
                >
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">📄</span>
                    <span className="text-sm font-medium text-gray-700">
                      {archivo.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarCotizacion(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    disabled={enviando}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {parseFloat(total) > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">
              Resumen de Factura
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold ml-2 text-gray-900">
                  {formatearMonto(parseFloat(subtotal) || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">IVA:</span>
                <span className="font-semibold ml-2 text-gray-900">
                  {formatearMonto(parseFloat(iva) || 0)}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t">
                <span className="text-gray-800 font-medium">Total:</span>
                <span className="text-xl font-bold text-blue-600 ml-2">
                  {formatearMonto(parseFloat(total) || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={enviando || loading}
          >
            {enviando || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {facturaInicial ? "Actualizando..." : "Guardando..."}
              </>
            ) : facturaInicial ? (
              "Actualizar Factura"
            ) : (
              "Guardar Factura"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
