import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    console.log("API_URL:", API_URL);

    // Probar endpoint básico
    const response = await fetch(`${API_URL}/`);
    const status = response.status;
    const data = await response.text();

    return NextResponse.json({
      api_url: API_URL,
      status,
      data,
      message: `API test ${status === 200 ? "successful" : "failed"}`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        api_url: process.env.NEXT_PUBLIC_API_URL,
      },
      { status: 500 },
    );
  }
}
