import { NextRequest, NextResponse } from "next/server";
import { readData } from "@/lib/database";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mes: string; anio: string; marca_id: string }> },
) {
  try {
    const { mes: mesStr, anio: anioStr, marca_id: marcaIdStr } = await params;
    const mes = parseInt(mesStr, 10);
    const anio = parseInt(anioStr, 10);
    const marca_id = parseInt(marcaIdStr, 10);

    if (isNaN(mes) || isNaN(anio) || isNaN(marca_id)) {
      return NextResponse.json(
        { error: "mes, anio y marca_id deben ser números" },
        { status: 400 },
      );
    }

    const registros = await readData<DesplazamientoRecord>("desplazamiento");
    const registro = registros.find(
      (r) => r.mes === mes && r.anio === anio && r.marca_id === marca_id,
    );

    if (!registro) {
      return NextResponse.json({
        mes,
        anio,
        marca_id,
        mayorExistencia: [],
        mas90Dias: [],
        demos: [],
        otros: [],
      });
    }

    return NextResponse.json(registro);
  } catch (error) {
    console.error("[API-DESPLAZAMIENTO-OBTENER] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
