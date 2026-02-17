import { NextRequest, NextResponse } from "next/server";
import { readData, writeData, initializeData } from "@/lib/database";
import { Proyeccion } from "@/types";

const PROYECCIONES_INICIALES: Proyeccion[] = [
  {
    id: "1",
    año: 2024,
    mes: "Noviembre",
    marca: "Subaru",
    montoTotal: 1800000,
    fechaCreacion: "2024-10-15",
    estado: "pendiente",
    excedePrespuesto: false,
    partidas: [
      {
        id: "1-1",
        categoria: "Marketing Digital",
        subcategoria: "Redes Sociales",
        monto: 800000,
      },
      {
        id: "1-2",
        categoria: "Eventos",
        subcategoria: "Lanzamiento",
        monto: 600000,
      },
      {
        id: "1-3",
        categoria: "Publicidad Tradicional",
        subcategoria: "Radio/TV",
        monto: 400000,
      },
    ],
  },
  {
    id: "2",
    año: 2024,
    mes: "Diciembre",
    marca: "Toyota",
    montoTotal: 2800000,
    fechaCreacion: "2024-10-10",
    estado: "pendiente",
    excedePrespuesto: false,
    partidas: [
      {
        id: "2-1",
        categoria: "Campaña Fin de Año",
        subcategoria: "Promoción Especial",
        monto: 1500000,
      },
      {
        id: "2-2",
        categoria: "Marketing Digital",
        subcategoria: "Google Ads",
        monto: 800000,
      },
      {
        id: "2-3",
        categoria: "Eventos",
        subcategoria: "Showroom",
        monto: 500000,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get("debug") === "true";

    if (debug) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      return NextResponse.json({
        debug: true,
        api_url: API_URL,
        message: "API debug info from proyecciones endpoint",
      });
    }

    const proyecciones = await initializeData(
      "proyecciones",
      PROYECCIONES_INICIALES,
    );
    return NextResponse.json(proyecciones);
  } catch (error) {
    console.error("Error al obtener proyecciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const nuevaProyeccion: Proyeccion = await request.json();
    const proyecciones = await readData<Proyeccion>("proyecciones");

    proyecciones.push(nuevaProyeccion);
    await writeData("proyecciones", proyecciones);

    return NextResponse.json(nuevaProyeccion, { status: 201 });
  } catch (error) {
    console.error("Error al crear proyección:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const proyecciones: Proyeccion[] = await request.json();
    await writeData("proyecciones", proyecciones);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar proyecciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
