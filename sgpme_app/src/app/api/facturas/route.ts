import { NextRequest, NextResponse } from "next/server";
import { readData, writeData, initializeData } from "@/lib/database";
import { Factura } from "@/types";

const FACTURAS_INICIALES: Factura[] = [
  {
    id: "1",
    folio: "A001",
    proveedor: "Publicidad Digital SA",
    rfc: "PDS850101ABC",
    subtotal: 84483.62,
    iva: 13517.38,
    total: 98500,
    fechaEmision: "2024-10-10",
    fechaEstimadaPago: "2024-10-15",
    estado: "Pagada",
    marca: "Subaru",
    usoCfdi: "G03",
    metodoPago: "03",
    observaciones: "Campaña publicitaria Q4",
    archivos: [
      {
        id: "arch-1",
        nombre: "factura_A001.pdf",
        tipo: "PDF",
        url: "/mock-files/factura_A001.pdf",
        fechaSubida: "2024-10-10",
      },
      {
        id: "arch-2",
        nombre: "factura_A001.xml",
        tipo: "XML",
        url: "/mock-files/factura_A001.xml",
        fechaSubida: "2024-10-10",
      },
    ],
    cotizaciones: [
      {
        id: "cot-1",
        proveedor: "Publicidad Digital SA",
        monto: 95000,
        observaciones: "Propuesta inicial",
      },
    ],
    fechaCreacion: "2024-10-10",
  },
  {
    id: "2",
    folio: "A002",
    proveedor: "Eventos y Conferencias SA",
    rfc: "ECS841205XYZ",
    subtotal: 146551.72,
    iva: 23448.28,
    total: 170000,
    fechaEmision: "2024-10-12",
    fechaEstimadaPago: "2024-10-20",
    estado: "Autorizada",
    marca: "Subaru",
    usoCfdi: "G03",
    metodoPago: "03",
    observaciones: "Evento de lanzamiento nuevo modelo",
    archivos: [
      {
        id: "arch-3",
        nombre: "factura_A002.pdf",
        tipo: "PDF",
        url: "/mock-files/factura_A002.pdf",
        fechaSubida: "2024-10-12",
      },
    ],
    cotizaciones: [
      {
        id: "cot-2",
        proveedor: "Eventos y Conferencias SA",
        monto: 165000,
        observaciones: "Cotización evento completo",
      },
      {
        id: "cot-3",
        proveedor: "Otro Proveedor",
        monto: 180000,
        observaciones: "Alternativa más costosa",
      },
    ],
    fechaCreacion: "2024-10-12",
  },
  {
    id: "3",
    folio: "A003",
    proveedor: "Imprenta Digital Pro",
    rfc: "IDP920815ABC",
    subtotal: 34482.76,
    iva: 5517.24,
    total: 40000,
    fechaEmision: "2024-10-14",
    fechaEstimadaPago: "2024-10-21",
    estado: "Pendiente",
    marca: "Toyota",
    usoCfdi: "G03",
    metodoPago: "03",
    observaciones: "Material promocional trimestre",
    archivos: [
      {
        id: "arch-4",
        nombre: "factura_A003.pdf",
        tipo: "PDF",
        url: "/mock-files/factura_A003.pdf",
        fechaSubida: "2024-10-14",
      },
    ],
    cotizaciones: [
      {
        id: "cot-4",
        proveedor: "Imprenta Digital Pro",
        monto: 38000,
        observaciones: "Material estándar",
      },
    ],
    fechaCreacion: "2024-10-14",
  },
];

export async function GET() {
  try {
    const facturas = await initializeData("facturas", FACTURAS_INICIALES);
    return NextResponse.json(facturas);
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const nuevaFactura: Factura = await request.json();
    const facturas = await readData<Factura>("facturas");

    facturas.push(nuevaFactura);
    await writeData("facturas", facturas);

    return NextResponse.json(nuevaFactura, { status: 201 });
  } catch (error) {
    console.error("Error al crear factura:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const facturas: Factura[] = await request.json();
    await writeData("facturas", facturas);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar facturas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
