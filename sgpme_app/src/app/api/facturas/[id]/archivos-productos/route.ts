import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/database";
import { Factura, Archivo } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const archivos = formData.getAll("archivos") as File[];

    if (!archivos || archivos.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron archivos" },
        { status: 400 },
      );
    }

    const facturas = await readData<Factura>("facturas");
    const facturaIndex = facturas.findIndex((f) => f.id === id);

    if (facturaIndex === -1) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 },
      );
    }

    const nuevosArchivos: Archivo[] = archivos.map((archivo) => ({
      id: `arch-prod-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nombre: archivo.name,
      tipo: archivo.name.split(".").pop()?.toUpperCase() || "ARCHIVO",
      url: "#",
      fechaSubida: new Date().toISOString().split("T")[0],
      seccion: "productos",
    }));

    const facturaActual = facturas[facturaIndex];
    facturas[facturaIndex] = {
      ...facturaActual,
      archivos: [...(facturaActual.archivos || []), ...nuevosArchivos],
    };

    await writeData("facturas", facturas);

    return NextResponse.json(
      { archivos: nuevosArchivos, message: "Archivos subidos correctamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al subir archivos de productos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
