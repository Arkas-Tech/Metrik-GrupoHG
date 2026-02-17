import { NextRequest, NextResponse } from "next/server";
import { readData, writeData, initializeData } from "@/lib/database";
import { Evento } from "@/types";

const EVENTOS_INICIALES: Evento[] = [
  {
    id: "1",
    nombre: "Lanzamiento Producto Q1",
    descripcion:
      "Presentación del nuevo producto estrella para el primer trimestre",
    tipoEvento: "Lanzamiento",
    fechaInicio: "2024-03-15",
    fechaFin: "2024-03-15",
    ubicacion: "Centro de Convenciones CDMX",
    marca: "Toyota",
    responsable: "María González",
    estado: "Confirmado",
    objetivo: "Posicionar el nuevo producto en el mercado objetivo",
    audiencia: "Distribuidores, prensa especializada y clientes VIP",
    presupuestoEstimado: 150000,
    presupuestoReal: 145000,
    observaciones: "Evento principal del trimestre con alta expectativa",
    gastosProyectados: [],
    fechaCreacion: "2024-02-01",
    fechaModificacion: "2024-02-15",
    creadoPor: "admin",
    brief: {
      id: "brief-1",
      eventoId: "1",
      objetivoEspecifico:
        "Posicionar el nuevo producto en el mercado objetivo mediante presentación ejecutiva",
      audienciaDetallada:
        "Distribuidores nivel nacional, prensa especializada automotriz y clientes VIP corporativos",
      mensajeClave:
        "Innovación tecnológica que transforma la experiencia de manejo",
      actividades: [
        {
          id: "act-1",
          nombre: "Presentación ejecutiva",
          descripcion: "Keynote con CEO y equipo directivo",
          duracion: "1 hora",
          responsable: "CEO",
          recursos: "Proyector, micrófono, pantalla LED",
        },
        {
          id: "act-2",
          nombre: "Demo técnica",
          descripcion: "Demostración de características técnicas",
          duracion: "1 hora",
          responsable: "Ing. Técnico",
          recursos: "Vehículo demo, herramientas técnicas",
        },
      ],
      cronograma: [
        {
          id: "cron-1",
          actividad: "Evento principal",
          fechaInicio: "2024-03-15T09:00:00",
          fechaFin: "2024-03-15T16:00:00",
          responsable: "Coordinador General",
          estado: "Completada",
        },
      ],
      requerimientos:
        "Pantallas LED, sistema de sonido profesional, coffee break y almuerzo premium",
      proveedores: "Proveedor AV Tech, Catering Premium, Seguridad Corporativa",
      logistica:
        "Setup completo 2 días antes, personal de seguridad especializado, shuttle service",
      presupuestoDetallado:
        "Venue: $45,000, Catering: $35,000, AV: $25,000, Decoración: $20,000",
      observacionesEspeciales: JSON.stringify({
        evidencia: { asistentes: 185, leads: 45, conversion: 24.3 },
        feedback: "Excelente recepción del producto, superó expectativas",
        testimonios: [
          {
            id: "test-1",
            nombre: "María González",
            cargo: "Gerente de Compras",
            empresa: "TechCorp",
            comentario:
              "El evento fue excepcional, los productos mostrados superaron nuestras expectativas.",
          },
          {
            id: "test-2",
            nombre: "Carlos Méndez",
            cargo: "Director IT",
            empresa: "InnovaSoft",
            comentario:
              "Muy profesional la organización y excelente calidad de presentación.",
          },
        ],
        imagenes: [
          {
            id: "img-1",
            nombre: "Presentación principal",
            descripcion: "Momento destacado de la presentación del producto",
            url: "evento-principal.jpg",
          },
          {
            id: "img-2",
            nombre: "Networking",
            descripcion: "Sesión de networking entre asistentes",
            url: "networking-session.jpg",
          },
        ],
      }),
      fechaCreacion: "2024-03-16",
      fechaModificacion: "2024-03-17",
      creadoPor: "admin",
    },
  },
  {
    id: "2",
    nombre: "Campaña Digital Navidad",
    descripcion: "Estrategia digital integrada para temporada navideña",
    tipoEvento: "Campaña Digital",
    fechaInicio: "2024-12-01",
    fechaFin: "2024-12-31",
    ubicacion: "Online/Digital",
    marca: "Honda",
    responsable: "Carlos Ruiz",
    estado: "Por Suceder",
    objetivo: "Maximizar alcance y engagement durante temporada navideña",
    audiencia: "Usuarios digitales interesados en vehículos Honda",
    presupuestoEstimado: 200000,
    observaciones: "Campaña multi-canal con enfoque en redes sociales",
    gastosProyectados: [],
    fechaCreacion: "2024-10-15",
    fechaModificacion: "2024-11-01",
    creadoPor: "admin",
  },
  {
    id: "3",
    nombre: "Evento Corporativo Anual",
    descripcion: "Reunión anual de distribuidores y socios comerciales",
    tipoEvento: "Corporativo",
    fechaInicio: "2024-11-20",
    fechaFin: "2024-11-22",
    ubicacion: "Resort Cancún",
    marca: "Mazda",
    responsable: "Ana Martínez",
    estado: "Realizado",
    objetivo: "Fortalecer lazos comerciales y presentar estrategia 2025",
    audiencia: "Distribuidores, socios comerciales y equipo directivo",
    presupuestoEstimado: 300000,
    presupuestoReal: 285000,
    observaciones: "Evento estratégico para fortalecer relaciones comerciales",
    gastosProyectados: [],
    fechaCreacion: "2024-08-01",
    fechaModificacion: "2024-11-23",
    creadoPor: "admin",
    brief: {
      id: "brief-3",
      eventoId: "3",
      objetivoEspecifico:
        "Fortalecer lazos comerciales y presentar estrategia 2025",
      audienciaDetallada:
        "120 distribuidores nacionales, socios comerciales estratégicos y equipo directivo corporativo",
      mensajeClave: "Unidos hacia el crecimiento y la excelencia comercial",
      actividades: [
        {
          id: "act-5",
          nombre: "Bienvenida ejecutiva",
          descripcion: "Cocktail de bienvenida con networking",
          duracion: "2 horas",
          responsable: "Directora Comercial",
          recursos: "Salón principal, bar, música ambiente",
        },
        {
          id: "act-6",
          nombre: "Presentación estratégica",
          descripcion: "Plan estratégico 2025 y metas comerciales",
          duracion: "2 horas",
          responsable: "CEO",
          recursos: "Salón de conferencias, proyector, documentos",
        },
      ],
      cronograma: [
        {
          id: "cron-3",
          actividad: "Bienvenida y networking",
          fechaInicio: "2024-11-20T19:00:00",
          fechaFin: "2024-11-20T21:00:00",
          responsable: "Directora Comercial",
          estado: "Completada",
        },
        {
          id: "cron-4",
          actividad: "Presentación estratégica",
          fechaInicio: "2024-11-21T09:00:00",
          fechaFin: "2024-11-21T17:00:00",
          responsable: "CEO",
          estado: "Completada",
        },
      ],
      requerimientos:
        "Resort all-inclusive, salones privados, equipos profesionales móviles",
      proveedores:
        "Resort Cancún, Empresa AV Móvil, Servicios de Entretenimiento",
      logistica:
        "Traslados aeropuerto-resort incluidos, seguridad del resort + adicional",
      presupuestoDetallado:
        "Venue: $80,000, Hospedaje: $120,000, Catering: $45,000, AV: $15,000",
      observacionesEspeciales: JSON.stringify({
        evidencia: { asistentes: 115, leads: 0, conversion: 0 },
        feedback:
          "Excelente ambiente, fortalecimiento de relaciones comerciales",
      }),
      fechaCreacion: "2024-11-23",
      fechaModificacion: "2024-11-25",
      creadoPor: "admin",
    },
  },
];

export async function GET() {
  try {
    const eventos = await initializeData("eventos", EVENTOS_INICIALES);
    return NextResponse.json(eventos);
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const nuevoEvento = await request.json();
    const eventos = await readData("eventos");

    const eventoConId = {
      ...nuevoEvento,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString().split("T")[0],
      fechaModificacion: new Date().toISOString(),
    };

    const eventosActualizados = [...eventos, eventoConId];
    await writeData("eventos", eventosActualizados);

    return NextResponse.json(eventoConId);
  } catch (error) {
    console.error("Error al crear evento:", error);
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (Array.isArray(data)) {
      await writeData("eventos", data);
      return NextResponse.json({ success: true });
    } else if (data.id) {
      const eventos = (await readData("eventos")) as Evento[];
      const eventoIndex = eventos.findIndex((e: Evento) => e.id === data.id);

      if (eventoIndex === -1) {
        return NextResponse.json(
          { error: "Evento no encontrado" },
          { status: 404 }
        );
      }

      eventos[eventoIndex] = {
        ...eventos[eventoIndex],
        ...data,
        fechaModificacion: new Date().toISOString(),
      };

      await writeData("eventos", eventos);
      return NextResponse.json(eventos[eventoIndex]);
    } else {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error al actualizar eventos:", error);
    return NextResponse.json(
      { error: "Error al actualizar eventos" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de evento requerido" },
        { status: 400 }
      );
    }

    const eventos = (await readData("eventos")) as Evento[];
    const eventosActualizados = eventos.filter((e: Evento) => e.id !== id);

    await writeData("eventos", eventosActualizados);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar evento:", error);
    return NextResponse.json(
      { error: "Error al eliminar evento" },
      { status: 500 }
    );
  }
}
