import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * API endpoint que devuelve el BUILD_ID actual del servidor.
 * El cliente compara su BUILD_ID almacenado con este valor
 * para detectar actualizaciones automáticamente.
 *
 * GET /api/version → { buildId: "abc123", timestamp: 1234567890 }
 */
export async function GET() {
  try {
    // Next.js genera un BUILD_ID único por cada build
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    const buildId = fs.readFileSync(buildIdPath, "utf8").trim();

    return NextResponse.json(
      {
        buildId,
        timestamp: Date.now(),
      },
      {
        headers: {
          // Nunca cachear esta respuesta — siempre debe ser fresca
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Error reading BUILD_ID:", error);
    return NextResponse.json(
      { buildId: null, error: "BUILD_ID not found" },
      { status: 500 },
    );
  }
}
