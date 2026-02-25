import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/database";

interface DesplazamientoItem {
  unidad: string;
  porcentaje: string;
  oc: string;
  pdf?: string;
  pdfNombre?: string;
}

interface DesplazamientoRecord {
  mes: number;
  anio: number;
  marca_id: number;
  mayorExistencia: DesplazamientoItem[];
  mas90Dias: DesplazamientoItem[];
  demos: DesplazamientoItem[];
  otros: DesplazamientoItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DesplazamientoRecord;
    const { mes, anio, marca_id } = body;

    if (!mes || !anio || !marca_id) {
      return NextResponse.json(
        { error: "mes, anio y marca_id son requeridos" },
        { status: 400 },
      );
    }

    const registros = await readData<DesplazamientoRecord>("desplazamiento");

    const idx = registros.findIndex(
      (r) => r.mes === mes && r.anio === anio && r.marca_id === marca_id,
    );

    if (idx >= 0) {
      registros[idx] = body;
    } else {
      registros.push(body);
    }

    await writeData("desplazamiento", registros);

    return NextResponse.json({ ok: true, message: "Desplazamiento guardado" });
  } catch (error) {
    console.error("[API-DESPLAZAMIENTO-GUARDAR] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
