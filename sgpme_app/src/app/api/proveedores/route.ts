import { NextResponse } from "next/server";
import { Proveedor } from "@/types";

let proveedoresDB: Proveedor[] = [
  {
    id: "1",
    nombre: "Publicidad Digital SA",
    contacto: "Juan Pérez",
    email: "contacto@publicidaddigital.com",
    rfc: "PDS850101ABC",
    categoria: "Publicidad Digital",
    fechaCreacion: "2024-01-15",
    activo: true,
  },
  {
    id: "2",
    nombre: "Medios Impresos Norte",
    contacto: "María López",
    email: "ventas@mediosnorte.com",
    rfc: "MIN920202XYZ",
    categoria: "Medios Impresos",
    fechaCreacion: "2024-02-20",
    activo: true,
  },
  {
    id: "3",
    nombre: "Eventos Premium SA",
    contacto: "Carlos Ruiz",
    email: "info@eventospremium.com",
    rfc: "EPS850315DEF",
    categoria: "Eventos",
    fechaCreacion: "2024-03-10",
    activo: true,
  },
  {
    id: "4",
    nombre: "Marketing Express",
    contacto: "Ana Torres",
    email: "contacto@marketingexpress.com",
    rfc: "MEX940225GHI",
    categoria: "Marketing",
    fechaCreacion: "2024-04-05",
    activo: false,
  },
  {
    id: "5",
    nombre: "Toyota Motor Sales",
    contacto: "Roberto Sánchez",
    email: "ventas@toyota.mx",
    rfc: "TMS850501MN1",
    categoria: "Automotriz",
    fechaCreacion: "2024-01-10",
    activo: true,
  },
  {
    id: "6",
    nombre: "Subaru de México",
    contacto: "Laura González",
    email: "info@subaru.mx",
    rfc: "SMX920315OP2",
    categoria: "Automotriz",
    fechaCreacion: "2024-01-12",
    activo: true,
  },
];

export async function GET() {
  try {
    return NextResponse.json(proveedoresDB);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const nuevoProveedor: Omit<Proveedor, "id" | "fechaCreacion"> =
      await request.json();

    const proveedor: Proveedor = {
      ...nuevoProveedor,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString().split("T")[0],
    };

    proveedoresDB.push(proveedor);

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const proveedoresActualizados: Proveedor[] = await request.json();
    proveedoresDB = proveedoresActualizados;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar proveedores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    proveedoresDB = proveedoresDB.filter((proveedor) => proveedor.id !== id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
