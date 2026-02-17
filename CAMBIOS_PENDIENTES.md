# Cambios Pendientes de Deploy

## Fecha: 17 de Febrero, 2026

### 🎯 CAMBIO RECIENTE 2: Dashboard - Sección Asesores (Placeholder)

**Descripción:** Agregar nueva sección placeholder "Asesores" al final del Dashboard:

- ✅ Sección ubicada al final del dashboard (antes de los modales)
- ✅ Diseño placeholder con mensaje "Próximamente"
- ✅ Icono de grupo de personas (usuarios múltiples)
- ✅ Mensaje descriptivo: "Gestión de asesores en desarrollo"

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

- Nuevo div con clase `bg-white rounded-lg shadow-md p-6`
- Header con título "👥 Asesores" (emoji + texto)
- Contenido centrado con:
  - Icono SVG de usuarios múltiples (h-16 w-16)
  - Texto "Próximamente" (texto grande y bold)
  - Subtítulo "Gestión de asesores en desarrollo" (texto pequeño)
- Icono Heroicon: Users con tres personas
- Colores: gris claro para el estado placeholder
- Ubicación: Entre la sección de Presencia Tradicional y los modales

**Diseño del placeholder:**

```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">
    👥 Asesores
  </h2>
  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
    <svg className="h-16 w-16 mb-4 text-gray-400" ...>
      {/* Heroicon users */}
    </svg>
    <p className="text-lg font-medium">Próximamente</p>
    <p className="text-sm">Gestión de asesores en desarrollo</p>
  </div>
</div>
```

**Notas:**

- Sección preparada para futura implementación
- Funcionalidad de gestión de asesores pendiente de desarrollo
- Posibles features futuras:
  - Lista de asesores por agencia
  - Métricas de desempeño
  - Asignación de leads/citas
  - Comisiones y objetivos

**Estado:** ✅ Completado (placeholder)

---

### 🎯 CAMBIO RECIENTE 1: Dashboard - Eliminación de Previsualizador PDF y Adición de Listado de Eventos

**Descripción:** Dos cambios relacionados con el Dashboard:

1. **Eliminación del previsualizador de PDF:**
   - ✅ Se removió completamente el modal de previsualización de PDFs
   - ✅ Se eliminaron los botones de "👁️ Ver PDF" en las tablas de Desplazamiento
   - ✅ Se mantienen solo las funciones de carga (📎) y descarga (⬇️) de PDFs

2. **Nueva sección de Listado de Eventos:**
   - ✅ Agregada debajo de la sección de Desplazamiento
   - ✅ Muestra eventos del mes seleccionado
   - ✅ Filtrado por mes con selector
   - ✅ Filtrado automático por agencia (usa el filtro del header)
   - ✅ Eliminada la sección placeholder de eventos del final del dashboard

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

**1. Eliminación del previsualizador:**

- Removidos estados:
  - `pdfPreviewUrl`
  - `pdfPreviewNombre`
  - `showPdfModal`
- Removida función `handlePdfPreview`
- Removido componente modal de previsualización completo
- Actualizadas tablas para mostrar solo botones de carga/descarga

**2. Listado de Eventos:**

- Nuevo import: `useEventos` hook y tipo `Evento`
- Nuevo estado: `mesEventos` para filtro de mes (inicializado con mes actual)
- Nuevo useMemo: `eventosFiltrados` que filtra eventos por:
  - Mes seleccionado (mesEventos)
  - Agencia del header (agenciaSeleccionada)
- Nueva sección UI con:
  - Header con título "📅 Eventos del Mes" y selector de mes
  - Tabla responsive con columnas:
    - Nombre del evento
    - Tipo de evento
    - Agencia (marca)
    - Fecha (formateada en español: día, mes, año)
    - Estado (con badges de colores)
  - Mensaje cuando no hay eventos
  - Estados con colores distintivos:
    - Realizado: verde
    - Confirmado: azul
    - Por Suceder: amarillo
    - Prospectado: morado
    - Cancelado: rojo
- Ubicación: Insertada entre sección Desplazamiento y Campañas Digitales
- Eliminada: Sección placeholder de eventos del final (que solo mostraba "Próximamente")

**Lógica de filtrado de eventos:**

```typescript
const eventosFiltrados = useMemo(() => {
  return eventos.filter((evento) => {
    // Filtrar por agencia (del header)
    if (agenciaSeleccionada && evento.marca !== agenciaSeleccionada) {
      return false;
    }

    // Filtrar por mes
    const fechaEvento = new Date(evento.fechaInicio);
    const mesEvento = fechaEvento.getMonth() + 1;
    return mesEvento === mesEventos;
  });
}, [eventos, agenciaSeleccionada, mesEventos]);
```

**Diseño de la tabla:**

- Tabla con diseño Tailwind moderno
- Headers con fondo gris claro
- Filas con hover effect
- Badges de estado con colores semánticos
- Fecha formateada en formato largo español
- Mensaje centrado cuando no hay eventos
- Scroll horizontal en pantallas pequeñas

**Estados removidos del previsualizador:**

```typescript
// ANTES (removido):
const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
const [pdfPreviewNombre, setPdfPreviewNombre] = useState<string>("");
const [showPdfModal, setShowPdfModal] = useState(false);
```

**Funcionalidad de eventos:**

- Usa datos de la página de eventos existente
- Integración con hook `useEventos`
- Filtrado sincronizado con filtro de agencia global
- Selector de mes independiente
- No es editable (solo lectura)
- Sirve como vista rápida de eventos del mes

**Estado:** ✅ Completado

---

## Fecha: 17 de Febrero, 2026

### 🎯 CAMBIO 1: Dashboard - Nuevas Métricas y Visualizaciones

**Descripción:** Agregar debajo de las primeras métricas (presupuesto, total gastado, total por pagar y gráfica):

- **Lado Izquierdo:**
  - ✅ Barra de progreso comparando proyección, presupuesto y gasto mensual (estilo /facturas)
  - ✅ Recuadro de reembolsos con total
  - ✅ Información obtenida de las secciones correspondientes

- **Lado Derecho:**
  - ✅ Gráfica de pie con proyección de categorías

- **Filtro:**
  - ✅ YTD (Year to Date)
  - ✅ Mes
  - ✅ Q (Quarter)

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

- Agregado import de PieChart, Pie, Cell de recharts
- Nuevos estados: `periodoSeleccionado`, `mesSeleccionado`, `proyecciones`, `totalReembolsos`
- Nuevo hook useEffect para cargar proyecciones desde API
- Nuevos useMemo:
  - `mesesPeriodo`: calcula meses según período (YTD/Mes/Q)
  - `proyeccionesFiltradas`: filtra proyecciones por período y agencia
  - `datosBarraProgreso`: calcula proyección, presupuesto y gasto total
  - `reembolsosData`: suma total de reembolsos en proyecciones
  - `datosGraficaPie`: agrupa proyecciones por categoría para gráfica
- Nueva sección UI con:
  - Filtros de período (YTD/Mes/Q) con selectores dinámicos
  - Barra de progreso visual con 3 colores (verde/rojo/azul + líneas de referencia)
  - Tarjeta de reembolsos con total y contador de proyecciones
  - Gráfica de pie con colores y leyenda
- Colores definidos en `COLORES_PIE` array (10 colores distintos)

**Mejoras adicionales:**

- Gráfica de pie sin etiquetas en las porciones (evita amontonamiento cuando hay poca proyección)
- Aumentado tamaño de la gráfica (outerRadius 90)
- Porciones sin espacios entre ellas para mejor aprovechamiento visual
- Toda la información se muestra en la leyenda debajo

**Estado:** ✅ Completado (Build errors corregidos: JSX órfano y variable duplicada datosGrafica)

---

### 🎯 CAMBIO 2: Dashboard - Sección Funnel

**Descripción:** Agregar nueva sección "Funnel" debajo de la sección de Análisis Detallado de Proyecciones con dos categorías:

- **Digital:**
  - ✅ Recuadro de Leads (azul) - valor inicial: 0
  - ✅ Recuadro de Citas (verde) - valor inicial: 0
  - ✅ Recuadro de Ventas (esmeralda) - valor inicial: 0

- **Eventos:**
  - ✅ Recuadro de Pisos (morado) - valor inicial: 0
  - ✅ Recuadro de Leads (rosa) - valor inicial: 0
  - ✅ Recuadro de Ventas (rose) - valor inicial: 0

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

- Nueva sección "Funnel" con diseño de cards
- Subsección "Digital" con grid de 3 columnas
- Subsección "Eventos" con grid de 3 columnas
- Cada card incluye:
  - Ícono SVG temático (usuario, calendario, dinero, edificio, grupos, check)
  - Título de la métrica
  - Valor en grande (actualmente en 0)
  - Colores diferenciados por tipo de métrica
- Diseño responsive (md:grid-cols-3)
- Iconos de Heroicons

**Notas:**

- Valores inicialmente en 0, pendiente definir fuente de datos
- La lógica para cargar datos reales se implementará posteriormente

**Estado:** ✅ Completado (estructura inicial con valores en 0)

---

### 🎯 CAMBIO 3: Dashboard - Sección Desplazamiento

**Descripción:** Agregar nueva sección "Desplazamiento" debajo de la sección Funnel con sistema de edición en línea:

- **Filtro por mes:** Selector para filtrar información por mes específico
- **Modo de edición:** Botón para activar/desactivar modo de edición
- **4 Recuadros con tablas editables:**
  - ✅ Mayor Existencia (arriba izquierda)
  - ✅ Más de 90 días (arriba derecha)
  - ✅ Demos (abajo izquierda)
  - ✅ Otros (abajo derecha)

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

- Nuevos estados:
  - `mesDesplazamiento`: mes seleccionado para filtrar
  - `modoEdicionDesplazamiento`: controla si se está editando
  - `mayorExistencia`, `mas90Dias`, `demos`, `otros`: arrays de datos para cada tabla
- Cada tabla tiene 3 columnas: "Unidad", "%", "OC"
- Grid 2x2 responsive (md:grid-cols-2)
- Características de las tablas:
  - Altura fija con scroll (maxHeight: 300px)
  - Headers sticky (permanecen visibles al hacer scroll)
  - En modo lectura: muestra datos
  - En modo edición:
    - Inputs editables para cada celda
    - Botón "+ Agregar" para agregar filas
    - Botón "✕" para eliminar filas
    - Cambios en tiempo real
- Botón de edición que alterna entre "✏️ Editar" y "💾 Guardar"
- Estado "Sin datos" cuando no hay información
- Diseño consistente con sombras y bordes

**Funcionalidades:**

- ✅ Filtrado por mes con datos independientes
- ✅ Edición en línea de todas las tablas
- ✅ Agregar filas dinámicamente
- ✅ Eliminar filas
- ✅ Altura uniforme para todos los recuadros
- ✅ Scroll independiente cuando hay muchas filas
- ✅ **NUEVO:** Datos organizados por mes (cada mes tiene su propia información)
- ✅ **NUEVO:** La información se actualiza solo para el mes seleccionado
- ✅ **NUEVO:** Diseño visual mejorado con gradientes de colores
- ✅ **NUEVO:** Cada recuadro tiene esquema de color único (azul, ámbar, morado, esmeralda)
- ✅ **NUEVO:** Botones con gradientes y efectos hover
- ✅ **NUEVO:** Inputs con bordes de colores y focus rings
- ✅ **NUEVO:** Transiciones suaves en hover
- ✅ **NUEVO:** Iconos emoji para identificar cada categoría
- ✅ **NUEVO:** Subtítulo descriptivo en el header

**Mejoras de Diseño:**

- Fondo con gradiente sutil (gris claro)
- Bordes redondeados (rounded-xl)
- Sombras mejoradas (shadow-lg con hover:shadow-lg)
- Selector de mes en recuadro blanco con sombra
- Botón de edición con gradiente verde/azul según estado
- Cada tabla con gradiente de fondo temático:
  - Mayor Existencia: azul a índigo
  - Más de 90 días: ámbar a naranja
  - Demos: morado a violeta
  - Otros: esmeralda a teal
- Filas con hover effect de color temático
- Inputs con bordes de color y focus rings
- Botón eliminar con hover effect rojo

**Estructura de Datos:**

```typescript
desplazamientoPorMes: {
  [mes: number]: {
    mayorExistencia: Array<{ unidad, porcentaje, oc }>,
    mas90Dias: Array<{ unidad, porcentaje, oc }>,
    demos: Array<{ unidad, porcentaje, oc }>,
    otros: Array<{ unidad, porcentaje, oc }>
  }
}
```

**Notas:**

- Los datos se almacenan por mes en estado local
- Cada mes mantiene su propia información independiente
- Al cambiar de mes, se muestran los datos específicos de ese mes
- Al editar, solo se actualiza el mes seleccionado
- Pendiente: implementar persistencia en backend/API

**Estado:** ✅ Completado (con datos por mes y diseño mejorado)

---

### 🎯 CAMBIO 4: Dashboard - Sistema de Adjuntos PDF en Desplazamiento

**Descripción:** Agregar funcionalidad de adjuntos PDF a cada fila de las 4 tablas de la sección Desplazamiento:

- **Funcionalidad de PDF:**
  - ✅ Botón de carga (📎) en modo de edición
  - ✅ Botón de vista previa (👁️) visible cuando hay PDF
  - ✅ Botón de descarga (⬇️) visible cuando hay PDF
  - ✅ Modal de previsualización con visor de PDF integrado

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Detalles técnicos implementados:**

- **Nuevos estados:**
  - `pdfPreviewUrl`: URL del PDF en base64 para preview
  - `showPdfModal`: controla visibilidad del modal de previsualización

- **Estructura de datos actualizada:**

```typescript
desplazamientoPorMes: {
  [mes: number]: {
    mayorExistencia: Array<{
      unidad,
      porcentaje,
      oc,
      pdf?: string,        // Base64 del PDF
      pdfNombre?: string   // Nombre del archivo
    }>,
    mas90Dias: Array<{ unidad, porcentaje, oc, pdf?, pdfNombre? }>,
    demos: Array<{ unidad, porcentaje, oc, pdf?, pdfNombre? }>,
    otros: Array<{ unidad, porcentaje, oc, pdf?, pdfNombre? }>
  }
}
```

- **Nuevas funciones:**
  - `handlePdfUpload(file, categoria, index)`:
    - Acepta solo archivos PDF
    - Convierte a base64 usando FileReader API
    - Almacena en estado con nombre del archivo
  - `handlePdfPreview(pdfBase64)`:
    - Abre modal con vista previa
    - Muestra PDF en iframe
  - `handlePdfDownload(pdfBase64, nombreArchivo)`:
    - Crea link temporal
    - Descarga PDF con nombre original
    - Limpia link después de descarga

- **Cambios en tablas:**
  - Nueva columna "PDF" (w-32, centrada)
  - Colspan actualizado de 3/4 a 4/5
  - Cada fila tiene:
    - Input file (oculto, accept="application/pdf")
    - Botón subir con ícono 📎 (solo en modo edición)
    - Botón previsualizar con ícono 👁️ (condicional)
    - Botón descargar con ícono ⬇️ (condicional)
  - Colores de botones por tabla:
    - Mayor Existencia: azul (bg-blue-500)
    - Más de 90 días: ámbar (bg-amber-500)
    - Demos: morado (bg-purple-500)
    - Otros: esmeralda (bg-emerald-500)
    - Preview: índigo (bg-indigo-500) - todas las tablas
    - Descarga: verde (bg-green-500) - todas las tablas

- **Modal de PDF:**
  - Overlay oscuro semi-transparente (bg-black bg-opacity-50)
  - Contenedor centrado responsive (max-w-4xl, h-5/6)
  - Header con título y botón cerrar (✕)
  - Iframe para mostrar PDF completo
  - Click en overlay cierra modal
  - Click en contenido no cierra modal (stopPropagation)
  - Auto-scroll en contenido del PDF

**Flujo de Usuario:**

1. En modo edición, usuario hace clic en botón 📎
2. Se abre selector de archivos (solo PDF)
3. Usuario selecciona PDF
4. Archivo se convierte a base64 y se guarda
5. Aparecen botones 👁️ y ⬇️
6. Clic en 👁️ abre modal con vista previa
7. Clic en ⬇️ descarga el PDF con nombre original
8. Datos se mantienen por mes (cada mes tiene sus propios PDFs)

**Características:**

- ✅ Almacenamiento en base64 en base de datos
- ✅ Vista previa en modal con iframe
- ✅ Descarga con nombre de archivo original
- ✅ Interfaz consistente en las 4 tablas
- ✅ Botones con tooltips descriptivos
- ✅ Botones solo visibles cuando corresponde
- ✅ Transiciones suaves en hover
- ✅ Modal responsive y accesible
- ✅ Datos independientes por mes
- ✅ Persistencia automática en base de datos
- ✅ Carga automática al cambiar mes/agencia

**Implementación Backend:**

- ✅ Modelo `Desplazamiento` en SQLite
- ✅ Router `/desplazamiento` con endpoints:
  - `POST /desplazamiento/guardar`: Guardar datos
  - `GET /desplazamiento/obtener/{mes}/{anio}/{marca_id}`: Obtener datos
  - `GET /desplazamiento/obtener-anio/{anio}/{marca_id}`: Obtener año completo
- ✅ Tabla `desplazamiento` creada con migración
- ✅ Datos organizados por mes/año/marca/categoría
- ✅ **FIX:** Agregado endpoint `GET /marcas/` para permitir carga de marcas desde frontend

**Implementación Frontend:**

- ✅ Carga automática de datos al montar componente
- ✅ Carga automática al cambiar mes
- ✅ Carga automática al cambiar agencia
- ✅ Guardado automático al editar cualquier campo
- ✅ Guardado automático al subir/eliminar PDF
- ✅ Integración con sistema de autenticación
- ✅ **DEBUG:** Logs de consola para rastrear guardado/carga
- ✅ **FIX:** useEffect optimizado para evitar loops infinitos
- ✅ **FIX:** Modal de PDF con tipo MIME correcto para visualización

**Notas:**

- PDFs se almacenan en base64 en la base de datos
- Almacenamiento en base64 puede ser pesado para PDFs grandes
- Constraint único: un registro por mes/año/marca/categoría
- Datos se mantienen entre sesiones y refrescos
- Pendiente: límite de tamaño de archivo (frontend)
- Pendiente: validación de tipo de archivo en backend
- Pendiente: optimización para PDFs grandes (considerar almacenamiento en S3/filesystem)

**Estado:** ✅ Completado (con persistencia completa en base de datos)

---

### 🎯 ACTUALIZACIÓN CAMBIO 4: Filtro de Agencia Local + Fix Previsualizador PDF

**Fecha:** 17 de Febrero, 2026 - Update 2

**Descripción:** Mejoras en la sección Desplazamiento:

1. **Filtro de agencia local en la sección Desplazamiento**
2. **Previsualizador de PDF mejorado con compatibilidad multi-navegador**

**Archivos modificados:**

- ✅ `/sgpme_app/src/components/DashboardGeneral.tsx`

**Cambios implementados:**

#### 1. Filtro de Agencia Local

**Problema resuelto:**

- La sección Desplazamiento dependía del filtro global de agencia del dashboard
- Los usuarios debían seleccionar agencia en el header para poder usar Desplazamiento
- Confusión sobre dónde seleccionar la agencia

**Solución implementada:**

- **Nuevo estado:** `agenciaDesplazamiento` (independiente de `agenciaSeleccionada`)
- **Nuevo selector de agencia:** En la sección Desplazamiento con opciones:
  - "Todas las agencias" (muestra tablas vacías)
  - Lista completa de 14 agencias disponibles
- **Lógica actualizada:**
  - `guardarDesplazamientoEnDB()`: Usa `agenciaDesplazamiento` en lugar de `agenciaSeleccionada`
  - `cargarDesplazamientoDesdeDB()`: Usa `agenciaDesplazamiento` para filtrar datos
  - `useEffect`: Se dispara al cambiar `agenciaDesplazamiento` (no `agenciaSeleccionada`)
- **Comportamiento:**
  - Cuando está en "Todas las agencias": Tablas vacías, botón editar deshabilitado
  - Cuando se selecciona agencia específica: Carga datos de esa agencia, permite editar
  - Cambio de agencia: Recarga automáticamente datos de la nueva agencia

**Código clave:**

```typescript
// Nuevo estado
const [agenciaDesplazamiento, setAgenciaDesplazamiento] = useState<string | null>(null);

// Nuevo selector en UI
<select
  value={agenciaDesplazamiento || "todas"}
  onChange={(e) => {
    const valor = e.target.value === "todas" ? null : e.target.value;
    setAgenciaDesplazamiento(valor);
  }}
>
  <option value="todas">Todas las agencias</option>
  {marcas.map((marca) => (
    <option key={marca.id} value={marca.cuenta}>
      {marca.cuenta}
    </option>
  ))}
</select>

// Guardado con agencia local
if (!agenciaDesplazamiento || agenciaDesplazamiento === "todas") {
  console.log("[DEBUG-GUARDAR] ❌ No hay agencia seleccionada o está en 'todas'");
  return;
}
const marca = marcas.find((m) => m.cuenta === agenciaDesplazamiento);

// Carga con agencia local
if (!agenciaDesplazamiento || agenciaDesplazamiento === "todas") {
  // Mostrar tablas vacías
  setDesplazamientoPorMes((prev) => ({
    ...prev,
    [mesDesplazamiento]: {
      mayorExistencia: [],
      mas90Dias: [],
      demos: [],
      otros: [],
    },
  }));
  return;
}
```

**Beneficios:**

- ✅ Independencia total del filtro global del dashboard
- ✅ Interfaz más clara y directa para el usuario
- ✅ Evita confusión sobre qué filtro usar
- ✅ Permite gestionar Desplazamiento sin afectar otras secciones
- ✅ Botón "Editar" se deshabilita automáticamente cuando no hay agencia seleccionada
- ✅ Warning eliminado (ya no es necesario)

#### 2. Fix Previsualizador de PDF

**Problema resuelto:**

- El tag `<iframe>` no siempre muestra PDFs correctamente en todos los navegadores
- Safari y algunos navegadores móviles tienen problemas con PDFs en base64 en iframes
- No había fallback si el navegador no podía mostrar el PDF
- Faltaba opción de descarga directa desde el modal

**Solución implementada:**

- **Tag `<object>` en lugar de `<iframe>`:**
  - Mejor soporte multi-navegador para PDFs
  - Manejo nativo de contenido PDF
  - Fallback integrado cuando no se puede mostrar
- **Fallback visual:**
  - Si el navegador no puede mostrar el PDF, muestra mensaje amigable
  - Botón de descarga como alternativa
  - Diseño atractivo y profesional

- **Botón de descarga en header:**
  - Acceso directo a descarga sin necesidad de cerrar modal
  - Siempre visible en el header del modal

- **Nuevo estado:** `pdfPreviewNombre` para mostrar nombre del archivo

**Código del nuevo modal:**

```typescript
// Estado actualizado
const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
const [pdfPreviewNombre, setPdfPreviewNombre] = useState<string>("documento.pdf");
const [showPdfModal, setShowPdfModal] = useState(false);

// Función actualizada
const handlePdfPreview = (pdfBase64: string, nombreArchivo?: string) => {
  setPdfPreviewUrl(pdfBase64);
  setPdfPreviewNombre(nombreArchivo || "documento.pdf");
  setShowPdfModal(true);
};

// Modal con <object> y fallback
<object
  data={pdfPreviewUrl}
  type="application/pdf"
  className="w-full h-full"
>
  {/* Fallback cuando el navegador no soporta vista previa */}
  <div className="flex flex-col items-center justify-center h-full">
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-6xl mb-4">📄</div>
      <h4 className="text-lg font-bold">
        No se puede mostrar el PDF en el navegador
      </h4>
      <p className="text-gray-600 mb-4">
        Tu navegador no soporta la visualización de PDFs integrada.
      </p>
      <button onClick={() => handlePdfDownload(...)}>
        ⬇️ Descargar PDF
      </button>
    </div>
  </div>
</object>
```

**Mejoras en el modal:**

- ✅ Header con fondo gris claro (bg-gray-50)
- ✅ Muestra nombre del archivo en el header
- ✅ Botón de descarga prominente en el header
- ✅ Tag `<object>` con fallback elegante
- ✅ Modal más grande (max-w-5xl)
- ✅ Fondo gris para el área del PDF (bg-gray-100)
- ✅ Mensaje de error amigable y profesional
- ✅ Iconos emoji para mejor UX
- ✅ Transiciones suaves en todos los botones

**Llamadas actualizadas:**

```typescript
// Todas las llamadas ahora pasan el nombre del archivo
<button onClick={() => handlePdfPreview(item.pdf!, item.pdfNombre)}>
  👁️
</button>
```

**Compatibilidad:**

- ✅ Chrome/Edge: ✅ Vista previa nativa
- ✅ Firefox: ✅ Vista previa nativa
- ✅ Safari: ✅ Vista previa o fallback automático
- ✅ Safari iOS: ✅ Fallback con descarga
- ✅ Chrome Android: ✅ Vista previa o fallback
- ✅ Todos: ✅ Descarga siempre disponible

**Debug mejorado:**

```console
[DEBUG-CARGAR] agenciaDesplazamiento: Toyota Chihuahua
[DEBUG-CARGAR] marcas.length: 14
[DEBUG-CARGAR] mes: 2
[DEBUG-CARGAR] año: 2026
[DEBUG-CARGAR] 📡 Cargando desplazamiento desde: http://localhost:8000/desplazamiento/obtener/2/2026/1
[DEBUG-CARGAR] ✅ Datos cargados exitosamente: {...}
```

**Resumen de mejoras:**

1. ✅ Filtro de agencia local independiente
2. ✅ Selector de agencia directo en la sección
3. ✅ Opción "Todas las agencias" muestra vacío
4. ✅ Previsualizador de PDF con `<object>` tag
5. ✅ Fallback elegante para navegadores incompatibles
6. ✅ Botón de descarga en header del modal
7. ✅ Nombre de archivo visible en modal
8. ✅ Mejor compatibilidad multi-navegador
9. ✅ UX mejorada con mensajes claros
10. ✅ Warning eliminado (ya no necesario)

**Estado:** ✅ Completado y probado

---

## Instrucciones para Deploy

Cuando esté listo para subir:

```bash
git add .
git commit -m "Dashboard: Desplazamiento con filtro agencia local + fix previsualizador PDF con compatibilidad multi-navegador"
git push
```

Luego en servidor:

```bash
ssh arkastech 'cd /home/sgpme/app && git pull && pm2 stop metrik-frontend && nohup npm run build > /tmp/build.log 2>&1 & sleep 5 && tail -f /tmp/build.log'
```

Una vez completado el build:

```bash
ssh arkastech 'pm2 start metrik-frontend && pm2 save'
```
