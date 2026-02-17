export type TipoUsuario = "administrador" | "coordinador" | "auditor";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  tipo: TipoUsuario;
  grupo: string;
  avatar?: string;
  fechaCreacion: string;
  activo: boolean;
}

export interface PermisosUsuario {
  proyecciones: {
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    ver: boolean;
    exportar: boolean;
  };
  facturas: {
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    ver: boolean;
    autorizar: boolean;
    marcarPagada: boolean;
    exportar: boolean;
  };
  dashboard: {
    verEstadisticas: boolean;
    verMetricas: boolean;
    verConsolidado: boolean;
  };
  sistema: {
    gestionUsuarios: boolean;
    configuracion: boolean;
    auditoria: boolean;
  };
}

export interface Partida {
  id: string;
  categoria: string;
  subcategoria: string;
  monto: number;
  esReembolso?: boolean;
  notas?: string;
}

export interface Proyeccion {
  id: string;
  año: number;
  mes: string;
  marca: string;
  montoTotal: number;
  partidas: Partida[];
  fechaCreacion: string;
  fechaModificacion?: string;
  estado: "pendiente" | "aprobada";
  autorizadaPor?: string;
  fechaAutorizacion?: string;
  excedePrespuesto: boolean;
}

export interface FiltrosProyeccion {
  meses?: string[];
  año?: number;
}

export interface EstadisticasProyeccion {
  totalProyecciones: number;
  montoTotalGeneral: number;
  marcas: string[];
  mesesActivos: string[];
}

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const MARCAS = [
  "Toyota Chihuahua",
  "Toyota Delicias",
  "Toyota Cuauhtemoc",
  "Toyota Monclova",
  "Toyota Piedras Negras",
  "Kia Juventud",
  "Kia Juarez",
  "Subaru Chihuahua",
  "Subaru Juárez",
  "GWM Chihuahua",
  "GWM Juárez",
  "Seminuevos Chihuahua",
  "Seminuevos Juárez",
  "Seminuevos Monclova",
];

export const AÑOS = [2024, 2025, 2026, 2027, 2028];

export const CATEGORIAS_PREDEFINIDAS = [
  "Social Media",
  "Digital",
  "Medios Tradicionales",
  "Marketing de Contenido",
  "Eventos",
  "Imagen Corporativa",
  "Plataformas",
];

export const SUBCATEGORIAS_POR_CATEGORIA: Record<string, string[]> = {
  "Social Media": [
    "Meta",
    "Facebook",
    "Instagram",
    "TikTok",
    "Pinterest",
    "LinkedIn",
    "Otros",
  ],
  Digital: [
    "Google Search",
    "Google Display",
    "WEB",
    "Youtube",
    "Mailing",
    "WhatsApp Business",
    "Otros",
  ],
  "Medios Tradicionales": [
    "Espectaculares",
    "TV",
    "Radio",
    "Periodico",
    "Revistas",
    "Publicidad Movil",
    "Otros",
  ],
  "Marketing de Contenido": ["Produccion de Contenido", "Influencers", "Otros"],
  Eventos: [
    "Eventos en Agencia",
    "Eventos Privados",
    "Eventos Masivos",
    "Eventos Planta",
    "Eventos para Clientes",
    "Lanzamientos",
    "Otros",
  ],
  "Imagen Corporativa": [
    "Comunicacion Interna",
    "Comunicacion Planta",
    "Rotulacion Demos",
  ],
  Plataformas: ["CRM", "WEB", "Otras Plataformas"],
};

export interface Proveedor {
  id: string;
  nombre: string;
  razonSocial?: string;
  contacto: string;
  email: string;
  rfc?: string;
  telefono?: string;
  direccion?: string;
  categoria: string;
  activo: boolean;
  fechaCreacion: string;
  creadoPor?: string;
}

export interface Archivo {
  id: string;
  nombre: string;
  tipo: "PDF" | "XML" | "Comprobante";
  url: string;
  fechaSubida: string;
}

export interface Cotizacion {
  id: string;
  proveedor: string;
  monto: number;
  archivo?: Archivo;
  observaciones?: string;
}

export interface Factura {
  id: string;
  folio: string;
  proveedor: string;
  rfc: string;
  subtotal: number;
  iva: number;
  total: number;
  fechaEmision: string;
  fechaEstimadaPago: string;
  fechaRealPago?: string;
  fechaIngresada?: string;
  estado: "Pendiente" | "Autorizada" | "Pagada" | "Rechazada" | "Ingresada";
  observaciones?: string;
  proyeccionId?: string;
  eventoId?: string;
  eventoNombre?: string;
  campanyaId?: string;
  campanyaNombre?: string;
  marca: string;
  categoria?: string;
  subcategoria?: string;
  usoCfdi: string;
  metodoPago: string;
  ordenCompra?: string;
  mesAsignado?: string;
  añoAsignado?: number;
  archivos: Archivo[];
  cotizaciones: Cotizacion[];
  fechaCreacion: string;
  fechaModificacion?: string;
  autorizadoPor?: string;
  fechaAutorizacion?: string;
}

export interface FiltrosFactura {
  estado: Factura["estado"] | "Todas";
  estadosMultiples?: Factura["estado"][];
  mes?: string;
  año?: number;
  fechaInicio?: string;
  fechaFin?: string;
  montoMin?: number;
  montoMax?: number;
  busqueda?: string;
  categoria?: string;
}

export interface EstadisticasFactura {
  totalFacturas: number;
  montoTotal: number;
  facturasPendientes: number;
  facturasAutorizadas: number;
  facturasPagadas: number;
  montosPorEstado: {
    pendiente: number;
    autorizada: number;
    pagada: number;
  };
}

export const ESTADOS_FACTURA = [
  "Pendiente",
  "Autorizada",
  "Pagada",
  "Rechazada",
] as const;

export const TIPOS_ARCHIVO = ["PDF", "XML", "Comprobante"] as const;

export const USOS_CFDI = [
  { codigo: "G01", descripcion: "G01 - Adquisición de mercancías" },
  {
    codigo: "G02",
    descripcion: "G02 - Devoluciones, descuentos o bonificaciones",
  },
  { codigo: "G03", descripcion: "G03 - Gastos en general" },
  { codigo: "P01", descripcion: "P01 - Por definir" },
  {
    codigo: "D01",
    descripcion: "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  },
  {
    codigo: "D02",
    descripcion: "D02 - Gastos médicos por incapacidad o discapacidad",
  },
  { codigo: "D03", descripcion: "D03 - Gastos funerales" },
  { codigo: "D04", descripcion: "D04 - Donativos" },
  { codigo: "D07", descripcion: "D07 - Primas por seguros de gastos médicos" },
  {
    codigo: "D08",
    descripcion: "D08 - Gastos de transportación escolar obligatoria",
  },
  {
    codigo: "D10",
    descripcion: "D10 - Pagos por servicios educativos (colegiaturas)",
  },
];

export const METODOS_PAGO = [
  { codigo: "PUE", descripcion: "PUE - Pago en una sola exhibición" },
  { codigo: "PPD", descripcion: "PPD - Pago en parcialidades o diferido" },
  { codigo: "01", descripcion: "01 - Efectivo" },
  { codigo: "02", descripcion: "02 - Cheque nominativo" },
  { codigo: "03", descripcion: "03 - Transferencia electrónica de fondos" },
  { codigo: "04", descripcion: "04 - Tarjeta de crédito" },
  { codigo: "05", descripcion: "05 - Monedero electrónico" },
  { codigo: "06", descripcion: "06 - Dinero electrónico" },
  { codigo: "08", descripcion: "08 - Vales de despensa" },
  { codigo: "28", descripcion: "28 - Tarjeta de débito" },
  { codigo: "29", descripcion: "29 - Tarjeta de servicios" },
  { codigo: "99", descripcion: "99 - Por definir" },
];

export interface Evento {
  id: string;
  nombre: string;
  marca: string;
  fechaInicio: string;
  fechaFin?: string;
  fechasTentativas?: string[];
  estado:
    | "Realizado"
    | "Prospectado"
    | "Confirmado"
    | "Por Suceder"
    | "Cancelado";
  objetivo: string;
  audiencia: string;
  responsable: string;
  presupuestoEstimado: number;
  presupuestoReal?: number;
  descripcion?: string;
  observaciones?: string;
  ubicacion?: string;
  coordenadasResponsable?: string;
  tipoEvento: string;
  gastosProyectados: GastoEvento[];
  brief?: BriefEvento;
  fechaCreacion: string;
  fechaModificacion?: string;
  creadoPor: string;
}

export interface GastoEvento {
  id: string;
  concepto: string;
  categoria: string;
  montoEstimado: number;
  montoReal?: number;
  proveedor?: string;
  estado: "Proyectado" | "Autorizado" | "Pagado";
  fechaEstimada: string;
  fechaReal?: string;
}

export interface BriefEvento {
  id: string;
  eventoId: string;
  objetivoEspecifico: string;
  audienciaDetallada: string;
  mensajeClave: string;
  actividades: ActividadEvento[];
  cronograma: CronogramaEvento[];
  requerimientos: string;
  proveedores: string;
  logistica: string;
  presupuestoDetallado: string;
  observacionesEspeciales: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  creadoPor: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
}

export interface ActividadEvento {
  id: string;
  nombre: string;
  descripcion: string;
  duracion: string;
  responsable: string;
  recursos: string;
}

export interface CronogramaEvento {
  id: string;
  actividad: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  estado: "Pendiente" | "En Progreso" | "Completada";
}

export interface FiltrosEvento {
  estado: Evento["estado"] | "Todos";
  marca?: string;
  mes?: string;
  año?: number | null;
  tipoEvento?: string;
  responsable?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface EstadisticasEvento {
  total: number;
  realizados: number;
  prospectados: number;
  confirmados: number;
  porSuceder: number;
  cancelados: number;
  presupuestoTotal: number;
  gastosReales: number;
  diferencia: number;
}

export interface TestimonioEvento {
  id: string;
  nombre: string;
  cargo: string;
  empresa: string;
  comentario: string;
}

export interface ImagenEvento {
  id: string;
  nombre: string;
  url: string;
  descripcion: string;
}

export const ESTADOS_EVENTO = [
  "Realizado",
  "Prospectado",
  "Confirmado",
  "Por Suceder",
  "Cancelado",
] as const;

export const TIPOS_EVENTO = [
  "Lanzamiento",
  "Showroom",
  "Test Drive",
  "Capacitación",
  "Promocional",
  "Corporativo",
  "Feria Automotriz",
  "Roadshow",
  "Evento Digital",
  "Conferencia",
  "Otros",
];

export const CATEGORIAS_GASTO_EVENTO = [
  "Venue/Locación",
  "Catering",
  "Decoración",
  "Audio/Video",
  "Transporte",
  "Personal",
  "Material Promocional",
  "Publicidad",
  "Seguros",
  "Permisos",
  "Otros",
];
