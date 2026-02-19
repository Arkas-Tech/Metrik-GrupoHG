# Cambios Pendientes de Deploy

## Fecha: 18 de Febrero, 2026

---

## 📋 Historial de Deploys

### ✅ Deploy 18/Feb/2026 - 22:30 hrs (Commit 406172e)

**Cambios desplegados:**

- ✅ Gráfica de proyección vs gasto: usa `Math.max()` como base100
- ✅ Línea negra de presupuesto cuando proyección > presupuesto
- ✅ Gráfica muestra gasto sin proyección/presupuesto
- ✅ Campo `productos` en facturas (textarea grande)
- ✅ Soporte completo para decimales en montos
- ✅ Campos de dirección separados en proveedores (7 campos)
- ✅ Campo `razon_social` en proveedores
- ✅ RFC opcional en ProveedorResponse (compatibilidad con datos existentes)

**Migraciones ejecutadas en PostgreSQL:**

- ✅ `separar_direccion_proveedores.py` - 7 campos de dirección
- ✅ Columna `productos` en facturas (vía psql directo)

**Notas de deployment:**

- ⚠️ Cache de navegador requiere limpieza manual (Service Worker PWA)
- 💡 Para futuros deploys: usuarios deben hacer "Empty Cache and Hard Reload" en DevTools
- 📝 Nginx cache y Next.js cache se limpian automáticamente en servidor

---

## 🚧 Cambios Pendientes

### 🔐 Permisos Desglosados: Navegación + Agencias

**Reestructuración del sistema de permisos por usuario:**

1. **ConfiguracionPermisos.tsx - Interfaz con secciones:**
   - ✅ Selector desplegable con dos secciones: "🧭 Navegación" y "🏢 Agencias"
   - ✅ Sección Navegación: toggles para Dashboard, Estrategia, Facturas, Eventos, Digital
   - ✅ Sección Agencias: toggles para las 15 agencias (MARCAS) del sistema
   - ✅ Contador de permisos activos por sección (ej: 5/5, 14/14)
   - ✅ Chevron icons para indicar sección expandida/colapsada
   - ✅ Panel de usuarios reducido ~35% (w-80 → w-52) para dar más espacio a permisos
   - ✅ Ambas secciones inician cerradas por defecto (no hay sección abierta al entrar)
   - ✅ Click en sección abierta la cierra (toggle manual)

2. **Backend - Nuevo campo `permisos_agencias`:**
   - ✅ Columna `permisos_agencias` (TEXT JSON) agregada a tabla `users` en models.py
   - ✅ Migración ejecutada: `migrations/add_permisos_agencias.py`
   - ✅ PUT `/admin/user/{id}/permisos` acepta `permisos` + `permisos_agencias`
   - ✅ GET `/admin/user` retorna ambos campos por usuario
   - ✅ GET `/auth/user` retorna `permisos_agencias` del usuario autenticado

3. **Frontend - Tipos y Auth:**
   - ✅ `Usuario` interface actualizada con `permisos_agencias?: Record<string, boolean>`
   - ✅ `useAuthBackend.tsx` mapea `permisos_agencias` en verificarSesion e iniciarSesion
   - ✅ NavBar sigue funcionando sin cambios (lee `usuario.permisos` directamente)

4. **Filtrado global por agencias permitidas:**
   - ✅ `MarcaContext.tsx` - Calcula `marcasPermitidas` basado en `permisos_agencias` del usuario
   - ✅ Admin ve todas las marcas; otros usuarios solo ven las asignadas
   - ✅ Auto-selección si el usuario solo tiene 1 agencia permitida
   - ✅ Si marca seleccionada deja de estar permitida, se resetea a null
   - ✅ `FiltroMarcaGlobal.tsx` - Usa `marcasPermitidas` en vez de `MARCAS` hardcodeadas
   - ✅ Si 0 agencias: no muestra filtro; si 1 agencia: muestra texto fijo; si >1: muestra selector

5. **Formularios actualizados con marcas permitidas:**
   - ✅ `FormularioMetricaSimple.tsx` - Usa `marcasPermitidas` del contexto
   - ✅ `FormularioProyeccion.tsx` - Usa `marcasPermitidas` del contexto
   - ✅ `FormularioFactura.tsx` - Usa `marcasPermitidas` del contexto
   - ✅ `FormularioPresenciaTradicional.tsx` - Usa `marcasPermitidas` del contexto
   - ✅ `FormularioCampana.tsx` - Usa `marcasPermitidas` del contexto
   - ✅ `FormularioEvento.tsx` - Usa `marcasPermitidas` del contexto (multi-select botones)
   - ✅ `FormularioPresencia.tsx` - Usa `marcasPermitidas` del contexto

6. **Defaults de permisos:**
   - ✅ Navegación: todas activadas por defecto (nuevo y existente)
   - ✅ Agencias: todas desactivadas por defecto (admin debe asignar)

**Archivos modificados:**

- `sgpme_app/src/components/ConfiguracionPermisos.tsx` - Reescrito con secciones, default agencias=false
- `sgpme_app/src/contexts/MarcaContext.tsx` - Nuevo: `marcasPermitidas` + auto-selección
- `sgpme_app/src/components/FiltroMarcaGlobal.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioMetricaSimple.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioProyeccion.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioFactura.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioPresenciaTradicional.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioCampana.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioEvento.tsx` - Usa marcasPermitidas
- `sgpme_app/src/components/FormularioPresencia.tsx` - Usa marcasPermitidas
- `sgpme_app/src/types/index.ts` - Campo `permisos_agencias` en Usuario
- `sgpme_app/src/hooks/useAuthBackend.tsx` - Mapeo de permisos_agencias
- `HGApp/models.py` - Columna `permisos_agencias` en Users
- `HGApp/routers/admin.py` - PermisosRequest y endpoints actualizados
- `HGApp/routers/auth.py` - Retorna permisos_agencias en GET /auth/user
- `HGApp/migrations/add_permisos_agencias.py` - Migración de BD

**⚠️ Migración requerida en servidor:**

```bash
cd HGApp && python3 migrations/add_permisos_agencias.py
```

---

### 🔒 Filtrado "Todas las agencias" respeta permisos de usuario

**Corrección crítica:** Cuando un usuario selecciona "Todas las agencias" en el header, ahora se filtran los datos solo por las agencias que tiene asignadas, en vez de mostrar datos de TODAS las agencias del sistema.

1. **MarcaContext.tsx - Nueva función `filtraPorMarca`:**
   - ✅ Callback que retorna `true` si la marca pasa el filtro actual
   - ✅ Si hay marca seleccionada: filtra por esa marca específica
   - ✅ Si "Todas las agencias": filtra por `marcasPermitidas` del usuario
   - ✅ Exportada en el contexto para uso en toda la app

2. **evento-utils.ts - Nueva función `eventoPerteneceAMarcas` (plural):**
   - ✅ Verifica si un evento (que puede tener múltiples marcas) pertenece a alguna de las marcas permitidas
   - ✅ Usa `obtenerArrayMarcas()` para manejar marca string o string[]

3. **Páginas con filtro client-side corregidas:**
   - ✅ `estrategia/page.tsx` - Usa `filtraPorMarca` en vez de `!marcaSeleccionada || ...`
   - ✅ `facturas/page.tsx` - 2 filtros corregidos con `filtraPorMarca`
   - ✅ `eventos/page.tsx` - Usa `eventoPerteneceAMarcas` con `marcasPermitidas` cuando no hay marca específica
   - ✅ `campanas/page.tsx` - Filtra campañas por `filtraPorMarca` antes de otros filtros
   - ✅ `digital/page.tsx` - Filtra campañas activas por `filtraPorMarca`

4. **DashboardGeneral.tsx - 8+ filtros corregidos:**
   - ✅ Importa `useMarcaGlobal` y usa `filtraPorMarca`/`marcasPermitidas`
   - ✅ Facturas, presupuestos, proyecciones, gastos: `filtraPorMarca(item.marca)`
   - ✅ Eventos: `eventoPerteneceAMarcas(evento.marca, marcasPermitidas)`
   - ✅ Presencias: `filtraPorMarca(presencia.agencia)`
   - ✅ Campañas activas: filtro por marca añadido

5. **Hooks API con post-filtrado:**
   - ✅ `useMetricas.ts` - Post-filtra métricas por `marcasPermitidas` cuando no hay marca específica
   - ✅ `usePresencias.ts` - Post-filtra presencias por `marcasPermitidas` cuando no hay marca específica

6. **Componentes gráficos con filtrado:**
   - ✅ `GraficaPresupuestoVsGasto.tsx` - Filtra presupuestos y proyecciones por agencias permitidas
   - ✅ `GraficaProyeccionVsGasto.tsx` - Filtra presupuestos, proyecciones y facturas por agencias permitidas
   - ✅ `PresupuestoAnual.tsx` - Calcula suma solo de agencias permitidas (ya no usa `/suma` endpoint)

7. **Página /presupuesto - Filtrado por agencias:**
   - ✅ `ListaPresupuestosMensuales.tsx` - Filtra marcas agrupadas por `marcasPermitidas`
   - ✅ Solo se muestran las agencias asignadas al usuario
   - ✅ Formulario de edición solo muestra agencias permitidas

**Archivos modificados:**

- `sgpme_app/src/contexts/MarcaContext.tsx` - Agregada función `filtraPorMarca`
- `sgpme_app/src/lib/evento-utils.ts` - Agregada `eventoPerteneceAMarcas`
- `sgpme_app/src/app/estrategia/page.tsx` - Filtro corregido
- `sgpme_app/src/app/facturas/page.tsx` - 2 filtros corregidos
- `sgpme_app/src/app/eventos/page.tsx` - Filtro corregido con multi-marca
- `sgpme_app/src/app/campanas/page.tsx` - Filtro por marca añadido
- `sgpme_app/src/app/digital/page.tsx` - Filtro por marca añadido
- `sgpme_app/src/components/DashboardGeneral.tsx` - 8+ filtros corregidos
- `sgpme_app/src/hooks/useMetricas.ts` - Post-filtrado por agencias
- `sgpme_app/src/hooks/usePresencias.ts` - Post-filtrado por agencias
- `sgpme_app/src/components/GraficaPresupuestoVsGasto.tsx` - Filtrado de datos
- `sgpme_app/src/components/GraficaProyeccionVsGasto.tsx` - Filtrado de datos
- `sgpme_app/src/components/PresupuestoAnual.tsx` - Filtrado y suma por agencias
- `sgpme_app/src/components/ListaPresupuestosMensuales.tsx` - Filtrado de marcas agrupadas

**⚠️ No requiere migración de BD**

---

### 🎨 Página Digital (antes Métricas)

**Reestructuración completa de la página de métricas:**

1. **Renombrado de ruta:**
   - ✅ Carpeta renombrada: `/app/metricas/` → `/app/digital/`
   - ✅ Ruta actualizada en navegación: `/metricas` → `/digital`
   - ✅ Etiqueta en menú: "📈 Métricas" → "📈 Digital"

2. **Cambios en sección Funnel:**
   - ✅ Título cambiado: "Funnel Digital" → "Funnel"
   - ✅ Métrica "Pisos" eliminada de las tarjetas principales
   - ✅ Grid reducido de 4 a 3 columnas (Leads, Citas, Ventas)
   - ✅ Columna "Pisos" removida del historial de métricas
   - ✅ Cálculo `pisosCambio` eliminado

3. **Nuevas secciones agregadas:**
   - ✅ **Conciliación con BDC** - Placeholder con estado "Próximamente"
   - ✅ **Diagramas de Conversión** - Placeholder con estado "Próximamente"

4. **Sección Embajadores:**
   - ✅ Copiada desde DashboardGeneral
   - ✅ 3 tarjetas de embajadores: @mariana_fitness, @carlos_tech, @sofia_lifestyle
   - ✅ Métricas por embajador: Presupuesto, Leads, Audiencia
   - ✅ Diseño con gradientes de colores (purple, pink, indigo)

5. **Orden final de secciones:**
   1. Funnel (3 métricas)
   2. Historial de Métricas
   3. Conciliación con BDC (próximamente)
   4. Diagramas de Conversión (próximamente)
   5. Campañas Digitales (Meta, Google, TikTok)
   6. Embajadores

6. **Compatibilidad Tailwind v4:**
   - ✅ Todas las clases `bg-gradient-to-br` actualizadas a `bg-linear-to-br`

**Archivos modificados:**

- `/app/digital/page.tsx` (antes metricas/page.tsx)
- `/app/dashboard/page.tsx`
- `/app/eventos/page.tsx`
- `/app/facturas/page.tsx`
- `/app/estrategia/page.tsx`
- `/app/campanas/page.tsx`
- `/app/campanas/[id]/anuncios/page.tsx`
- `/app/presupuesto/page.tsx`
- `/components/LayoutDashboard.tsx`

**Notas técnicas:**

- ⚠️ La ruta ahora es `/digital` en lugar de `/metricas`
- 💡 Usuarios verán "Digital" en el navegador y en el menú
- 📝 Los botones internos conservan "Registrar Métricas" para claridad funcional

---

### 📄 Visor de PDFs en Facturas

**Nueva funcionalidad para visualizar PDFs sin descargar:**

1. **Visualización en modal:**
   - ✅ Modal con iframe para mostrar PDFs directamente en el navegador
   - ✅ Tamaño del modal: 90vh de altura, máximo ancho de 6xl
   - ✅ Botón de cerrar (X) en la esquina superior derecha
   - ✅ Título del modal muestra el nombre del archivo

2. **Botones "Ver" agregados:**
   - ✅ Botón "Ver" junto a "Descargar" para archivos PDF de facturas
   - ✅ Botón "Ver" junto a "Descargar" para cotizaciones PDF
   - ✅ Solo aparece para archivos de tipo PDF
   - ✅ Color morado distintivo (purple-600) para diferenciarlo de "Descargar" (blue-600)

3. **Funcionalidad técnica:**
   - ✅ Función `verPDF()` que carga el PDF usando `fetchConToken` con autenticación automática
   - ✅ Uso de `fetchConToken` de `@/lib/auth-utils` para manejo correcto de tokens
   - ✅ Crea blob URL temporal para mostrar en iframe
   - ✅ Limpieza automática de URLs al cerrar el modal (revokeObjectURL)
   - ✅ Manejo de errores con alertas informativas
   - ✅ Soporta tanto archivos de facturas como cotizaciones
   - ✅ Renovación automática de token si expira (manejo de 401)

4. **Endpoints utilizados:**
   - Archivos: `/facturas/{facturaId}/archivos/{archivoId}/descargar`
   - Cotizaciones: `/facturas/{facturaId}/cotizaciones/{cotizacionId}/descargar`

**Archivos modificados:**

- `/components/ListaFacturas.tsx`

**Beneficios:**

- 📖 Visualización rápida sin descargar archivos
- 🔍 Navegación dentro del PDF (zoom, scroll, páginas)
- 💾 Opción de descargar sigue disponible
- 🎯 UX mejorada para revisión rápida de documentos

---

### 🔧 Correcciones en Formulario de Facturas

**Problemas corregidos en el guardado de cotizaciones y UX:**

1. **Eliminación de botones "Ver" del formulario:**
   - ✅ Removido botón "Ver" de archivos en el editor de facturas
   - ✅ Removido botón "Ver" de cotizaciones en el editor de facturas
   - ✅ Solo queda botón "Eliminar" en el formulario de edición
   - ℹ️ El botón "Ver" sigue disponible en la lista de facturas (detalles expandidos)

2. **Corrección del flujo de guardado de cotizaciones:**
   - ✅ Problema identificado: el componente se desmontaba antes de subir cotizaciones
   - ✅ Solución: `FormularioFactura` ahora llama a `onCancel()` DESPUÉS de subir todos los archivos y cotizaciones
   - ✅ Agregado timeout de 500ms para asegurar que las cargas terminen
   - ✅ `manejarCrearFactura` ya no cambia vista inmediatamente
   - ✅ `manejarActualizarFactura` ya no cambia vista inmediatamente
   - ✅ Ahora las cotizaciones se guardan correctamente antes de cerrar el formulario

3. **Mejoras en el proceso de guardado:**
   - ✅ Logs de consola detallados para debugging
   - ✅ Manejo secuencial de subida de archivos y cotizaciones
   - ✅ Cada cotización se sube individualmente con confirmación
   - ✅ Al terminar todo el proceso, se cierra el formulario automáticamente

**Archivos modificados:**

- `/components/FormularioFactura.tsx` - Flujo de guardado y eliminación de botones "Ver"
- `/app/facturas/page.tsx` - Funciones `manejarCrearFactura` y `manejarActualizarFactura`

**Resultado:**

- ✅ Las cotizaciones ahora se guardan correctamente
- ✅ Los archivos se suben antes de cerrar el formulario
- ✅ UX más limpia en el editor (sin botones "Ver" redundantes)
- ✅ Los botones "Ver" siguen funcionando en la vista de detalles de la lista

---

### 📊 Mejoras en Sección de Desplazamiento (Dashboard)

**Visualización de PDFs y mejoras de UI:**

1. **Visor de PDF en modal:**
   - ✅ Modal para visualizar PDFs sin descargar (igual que en facturas)
   - ✅ Función `verPDF()` con autenticación mediante `fetchConToken`
   - ✅ Iframe de 90vh de altura dentro del modal
   - ✅ Botón de cerrar con XMarkIcon
   - ✅ Limpieza automática de blob URLs al cerrar
   - ✅ Título del modal muestra el nombre del archivo

2. **Rediseño completo de botones PDF:**
   - ✅ **Botón "Cambiar/Subir"** (modo edición):
     - Antes: Recuadro azul con emoji 📎 y texto "Cambiar"/"Subir"
     - Ahora: Solo ícono `ArrowPathIcon` naranja sin recuadro ni texto
   - ✅ **Botón "Ver"**:
     - Ícono `EyeIcon` (azul) sin recuadro
     - Abre el PDF en el modal viewer
   - ✅ **Botón "Descargar"**:
     - Antes: Emoji ⬇️ en recuadro verde
     - Ahora: Ícono `ArrowDownTrayIcon` (verde) sin recuadro
   - ✅ **Botón "Borrar"** (modo edición):
     - X roja sin recuadro
   - ✅ Todos los botones ahora son solo íconos sin fondos de colores
   - ✅ Aplicado consistentemente en las 4 tablas: Mayor Existencia, Más de 90 días, Demos, Otros

3. **Correcciones de colores de texto:**
   - ✅ Selectores de agencia y mes: agregado `text-gray-900` (antes texto gris)
   - ✅ Inputs de edición: agregado `text-gray-900` en todos los campos (12 inputs en total)
   - ✅ Los 3 inputs por tabla (Unidad, %, OC) ahora mantienen texto negro al editar
   - ✅ Antes el texto se ponía gris al activar modo edición

4. **Iconos importados:**
   - ✅ `ArrowPathIcon` - Símbolo de flechas circulares para cambiar/subir PDF
   - ✅ `ArrowDownTrayIcon` - Ícono de descarga profesional
   - ✅ `EyeIcon` - Ya estaba importado, usado para "Ver"
   - ✅ `XMarkIcon` - Ya estaba importado, usado para cerrar modal

5. **Experiencia de usuario mejorada:**
   - 🎯 Interfaz más limpia y profesional con íconos en lugar de emojis
   - 📖 Vista previa rápida de PDFs sin descargar
   - 🎨 Mejor legibilidad con texto negro consistente
   - 🖱️ Botones más intuitivos y minimalistas

**Archivos modificados:**

- `/components/DashboardGeneral.tsx`
  - Imports: agregado `ArrowPathIcon`, `ArrowDownTrayIcon`
  - Estado: agregado `pdfViewer` para control del modal
  - Funciones: agregadas `verPDF()` y `cerrarPdfViewer()`
  - Botones PDF: actualizados en las 4 tablas
  - Selectores: agregado `text-gray-900`
  - Inputs: agregado `text-gray-900` en 12 campos de edición
  - Modal: agregado al final del componente

**Tablas afectadas:**

- ✅ Mayor Existencia
- ✅ Más de 90 días
- ✅ Demos
- ✅ Otros

**Beneficios:**

- 📄 Visualización inmediata de PDFs en modal
- 🎨 UI profesional con íconos de Heroicons
- 👁️ Mejor contraste de texto (negro vs gris)
- 🔄 Ícono intuitivo para cambiar archivos
- 💾 Descarga con ícono estándar de la industria

---

### 🔙 Texto de Botones "Volver" Mejorado

**Corrección de textos para mayor claridad:**

1. **Eventos - Formularios:**
   - ✅ Formulario de nuevo evento: "Volver al Dashboard" → "Volver a Eventos"
   - ✅ Formulario de editar evento: "Volver al Dashboard" → "Volver a Eventos"
   - ✅ Formulario de brief: "Volver al Dashboard" → "Volver a Eventos"
   - ✅ Vista template del brief: "Volver al Dashboard" → "Volver a Eventos"
   - ✅ Vista preview del brief: "Volver al Dashboard" → "Volver a Eventos"

2. **Facturas - Gestión de Proveedores:**
   - ✅ Página de proveedores: "Volver al Dashboard de Facturas" → "Volver a Facturas"

**Archivos modificados:**

- `/app/eventos/page.tsx` - 5 botones actualizados
- `/app/facturas/page.tsx` - 1 botón actualizado

**Beneficio:**

- 🎯 Textos más concisos y claros
- 🧭 Mejor orientación para el usuario sobre a dónde regresa
- ✨ Consistencia en nomenclatura de navegación

---

### ⚙️ Página de Configuración Dedicada

**Conversión de popup a página completa:**

1. **Nueva ruta `/configuracion`:**
   - ✅ Página creada: `/app/configuracion/page.tsx`
   - ✅ Layout completo: header, nav bar, sidebar izquierdo
   - ✅ Mismo diseño que dashboard/estrategia/facturas/eventos
   - ✅ Acceso solo para administradores
   - ✅ Tab "⚙️ Configuración" destacado en nav bar

2. **Estructura del menú lateral:**
   - ✅ Header morado "Configuración"
   - ✅ Menú extensible con opciones:
     - "Configuración por Categoría" (con icono FolderIcon)
     - Preparado para futuras opciones de configuración
   - ✅ Estado `seccionActiva` para selección de menú

3. **Componente ConfiguracionCategorias:**
   - ✅ Nuevo archivo: `/components/ConfiguracionCategorias.tsx`
   - ✅ Funcionalidad extraída de PopupConfiguracion
   - ✅ Sin wrapper de modal - contenido directo
   - ✅ Todas las features preservadas:
     - Crear, editar, eliminar, restaurar categorías
     - Gestión de subcategorías
     - Toggle activo/inactive
     - Ordenamiento
     - Validación de formularios
     - Integración con API (useCategoriasAPI)

4. **Navegación actualizada en todas las páginas:**
   - ✅ `/app/dashboard/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/estrategia/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/facturas/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/eventos/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/digital/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/campanas/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/presencias/page.tsx` - handleMenuClick ruta a /configuracion
   - ✅ `/app/presupuesto/page.tsx` - handleMenuClick ruta a /configuracion

5. **Limpieza de código:**
   - ✅ Removidos todos los render blocks de PopupConfiguracion
   - ✅ Removidos todos los imports de PopupConfiguracion
   - ✅ PopupConfiguracion.tsx preservado pero sin usar
   - 📝 Puede eliminarse en el futuro si se confirma que no se necesita

**Archivos creados:**

- `/app/configuracion/page.tsx` - Página principal de configuración (299 líneas)
- `/components/ConfiguracionCategorias.tsx` - Componente de categorías (427 líneas)

**Archivos modificados:**

- `/app/dashboard/page.tsx` - Navegación + limpieza popup
- `/app/estrategia/page.tsx` - Navegación + limpieza popup
- `/app/facturas/page.tsx` - Navegación + limpieza popup
- `/app/eventos/page.tsx` - Navegación + limpieza popup
- `/app/digital/page.tsx` - Navegación + limpieza popup
- `/app/campanas/page.tsx` - Navegación + limpieza popup
- `/app/presencias/page.tsx` - Navegación actualizada
- `/app/presupuesto/page.tsx` - Navegación + limpieza popup

**Beneficios:**

- 🚀 Mejor UX - página dedicada vs popup modal
- 🎯 Espacio completo para gestión de configuración
- 📱 Navegación consistente con resto de la aplicación
- 🔧 Menú lateral extensible para futuras opciones
- 🎨 Layout profesional y organizado
- 🔐 Control de acceso centralizado (admin only)

**Notas técnicas:**

- Configuración solo accesible desde ConfigSidebar (admin) o ConfigSidebarCoordinador
- Componente ConfiguracionCategorias es reutilizable
- PopupConfiguracion.tsx puede eliminarse en futuro deploy si no se necesita
  **Mejoras recientes:**

- ✅ Tab "⚙️ Configuración" removido del nav bar (solo accesible desde menú lateral)
- ✅ Menú lateral expandido a 320px (w-80) para mejor legibilidad
- ✅ Nueva opción añadida: "Permisos" (con icono UserGroupIcon)
  - Sistema completo de gestión de permisos implementado
  - Control granular de acceso a páginas por usuario

**Archivos actualizados:**

- `/app/configuracion/page.tsx` - Nav bar limpio + menú más ancho + opción Permisos

---

### 🔐 Sistema de Permisos por Usuario

**Implementación completa de control de acceso:**

1. **Componente ConfiguracionPermisos:**
   - ✅ Archivo creado: `/components/ConfiguracionPermisos.tsx`
   - ✅ Lista de usuarios en panel izquierdo (nombre, username, rol)
   - ✅ Panel de permisos en lado derecho al seleccionar usuario
   - ✅ Toggle switches para cada página: Dashboard, Estrategia, Facturas, Eventos, Digital
   - ✅ Botón "Guardar Permisos" con indicador de carga
   - ✅ Integración con API para persistencia de permisos

2. **Backend - Modelo y Endpoints:**
   - ✅ Campo `permisos` agregado a tabla `users` (TEXT, JSON string)
   - ✅ Endpoint `PUT /admin/user/{user_id}/permisos` - Actualizar permisos
   - ✅ Endpoint `GET /admin/user` - Incluye permisos en respuesta
   - ✅ Endpoint `GET /auth/user` - Incluye permisos del usuario actual
   - ✅ Permisos por defecto para usuarios existentes (todos activos)

3. **Migración de Base de Datos:**
   - ✅ Script creado: `/HGApp/migrations/add_permisos_users.py`
   - ✅ Agrega columna `permisos` a tabla `users`
   - ✅ Inicializa permisos por defecto para usuarios existentes
   - 📝 **PENDIENTE EJECUTAR:** `python migrations/add_permisos_users.py`

4. **Funcionalidades Implementadas:**
   - ✅ Gestión visual de permisos con toggle switches
   - ✅ Persistencia de permisos en base de datos
   - ✅ Carga automática de permisos por usuario
   - ✅ Feedback visual (toasts) al guardar cambios
   - 🚧 **PENDIENTE:** Aplicar permisos en navegación (mostrar/ocultar tabs)
   - 🚧 **PENDIENTE:** Bloquear acceso directo a rutas sin permiso

**Permisos Disponibles:**

- 📊 Dashboard - Acceso a página principal con métricas
- 🎯 Estrategia - Acceso a proyecciones y presupuestos
- 📋 Facturas - Acceso a gestión de facturas
- 🎉 Eventos - Acceso a gestión de eventos
- 📈 Digital - Acceso a métricas digitales

**Archivos creados:**

- `/components/ConfiguracionPermisos.tsx` - Componente de gestión (307 líneas)
- `/HGApp/migrations/add_permisos_users.py` - Migración de BD (SQLite compatible)

**Archivos modificados:**

- `/HGApp/models.py` - Campo `permisos` en Users
- `/HGApp/routers/admin.py` - Endpoints de permisos + import json
- `/HGApp/routers/auth.py` - Endpoint /user incluye permisos + import json
- `/app/configuracion/page.tsx` - Importa y renderiza ConfiguracionPermisos

**Migración Ejecutada:**

- ✅ `python3 migrations/add_permisos_users.py` - Columna permisos agregada
- ✅ Permisos por defecto asignados a todos los usuarios existentes

**Correcciones y Fixes Aplicados:**

- ✅ Corrección en `/HGApp/routers/admin.py`:
  - Cambiado `user.get('user_role')` a `user.get('role')`
  - Cambiado verificación `'admin'` a `'administrador'`
  - Endpoint `/admin/user` ahora devuelve objetos serializables (dict)
  - Aplica a todos los endpoints: GET/POST/DELETE user, PUT permisos
- ✅ Corrección en `/components/ConfiguracionPermisos.tsx`:
  - Funciones `obtenerNombreRol` y `obtenerColorRol` actualizadas
  - Ahora mapean correctamente `'administrador'` en lugar de `'admin'`
- ✅ Servidor backend reiniciado para aplicar cambios

**Estado Actual:**

- ✅ **FUNCIONAL** - Gestión de permisos completamente operativa
- ✅ Backend sirviendo usuarios correctamente
- ✅ Frontend cargando y mostrando usuarios
- ✅ Guardado de permisos funcional

**Próximos pasos:**

1. ✅ ~~Ejecutar migración~~ - COMPLETADO
2. 🚧 Implementar lógica en navegación para:
   - Mostrar solo tabs con permiso activo
   - Redirigir si usuario intenta acceder sin permiso
3. 🚧 Crear hook usePermisos() para facilitar verificación en componentes
4. 🚧 Actualizar todas las páginas para respetar permisos

**Notas técnicas:**

- Permisos almacenados como JSON string en BD
- Por defecto, todos los permisos están activos
- Solo administradores pueden modificar permisos
- Cambios toman efecto inmediatamente (requiere refresh del usuario)
- Migración compatible con SQLite y PostgreSQL
  **Instrucciones para Deploy a Metrik:**

1. **Backend (HGApp):**

   ```bash
   cd HGApp
   # Ejecutar migración en servidor
   python3 migrations/add_permisos_users.py
   # Reiniciar servidor uvicorn
   pkill -f "uvicorn main:app"
   nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
   ```

2. **Frontend (sgpme_app):**

   ```bash
   cd sgpme_app
   # Build de producción
   npm run build
   # O reiniciar servidor de desarrollo
   npm run dev
   ```

3. **Archivos a Deployar:**
   - `/HGApp/models.py` - Modelo actualizado con campo permisos
   - `/HGApp/routers/admin.py` - Endpoints corregidos
   - `/HGApp/routers/auth.py` - Usuario con permisos
   - `/HGApp/migrations/add_permisos_users.py` - Migración
   - `/sgpme_app/src/components/ConfiguracionPermisos.tsx` - Componente nuevo
   - `/sgpme_app/src/app/configuracion/page.tsx` - Página actualizada

4. **Verificación Post-Deploy:**
   - ✅ Verificar que la migración se ejecutó correctamente
   - ✅ Probar acceso a /configuracion → Permisos
   - ✅ Verificar carga de usuarios
   - ✅ Probar asignación y guardado de permisos
   - ✅ Verificar que los permisos persisten en BD

---

## ✅ Navegación Dinámica Basada en Permisos - 19/Feb/2026

**Implementación completada:** Sistema de navegación que oculta/muestra botones según permisos de usuario.

**Cambios implementados:**

### 1. **Actualización del tipo Usuario** (`/types/index.ts`)

```typescript
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  tipo: TipoUsuario;
  grupo: string;
  avatar?: string;
  fechaCreacion: string;
  activo: boolean;
  permisos?: {
    dashboard?: boolean;
    estrategia?: boolean;
    facturas?: boolean;
    eventos?: boolean;
    digital?: boolean;
  };
}
```

### 2. **Actualización de useAuthBackend** (`/hooks/useAuthBackend.tsx`)

- ✅ Modificado `verificarSesion()` para extraer permisos del backend
- ✅ Modificado `iniciarSesion()` para extraer permisos del backend
- ✅ Agregado campo `permisos` al objeto Usuario mapeado
- ✅ Permisos por defecto (todos true) si no vienen del backend

**Código agregado en líneas 132-148:**

```typescript
permisos: userData.permisos || {
  dashboard: true,
  estrategia: true,
  facturas: true,
  eventos: true,
  digital: true,
},
```

### 3. **Creación del componente NavBar** (`/components/NavBar.tsx` - NUEVO)

- ✅ 87 líneas de código
- ✅ Componente reutilizable para navegación
- ✅ Props: `usuario` y `paginaActiva`
- ✅ Lee `usuario.permisos` y renderiza solo botones con permiso `true`
- ✅ Resalta la página activa con borde azul
- ✅ Maneja permisos undefined con valores por defecto

**Funcionalidad:**

```typescript
// Ejemplo: Si usuario.permisos.dashboard === false
// → El botón "📊 Dashboard" NO se renderiza

navItems.map((item) => item.visible && <button>{item.label}</button>);
```

### 4. **Actualización de todas las páginas** (Navegación unificada)

**Páginas modificadas:**

- ✅ `/app/dashboard/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/estrategia/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/facturas/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/eventos/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/digital/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/configuracion/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/campanas/page.tsx` - Import NavBar + reemplazo de `<nav>`
- ✅ `/app/presupuesto/page.tsx` - Import NavBar + reemplazo de `<nav>`

**Antes (28 líneas de nav duplicado):**

```tsx
<nav className="bg-white shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex space-x-8 h-14">
      <button onClick={() => router.push("/dashboard")}>📊 Dashboard</button>
      <button onClick={() => router.push("/estrategia")}>🎯 Estrategia</button>
      {/* ... más botones ... */}
    </div>
  </div>
</nav>
```

**Después (1 línea):**

```tsx
<NavBar usuario={usuario} paginaActiva="dashboard" />
```

### 5. **Flujo completo de funcionamiento**

1. **Login**: Usuario inicia sesión
2. **Backend**: `/auth/user` retorna permisos JSON
3. **Frontend**: useAuthBackend extrae permisos a `usuario.permisos`
4. **NavBar**: Lee permisos y renderiza solo botones permitidos
5. **Tiempo real**: Cambios en Configuración → Permisos afectan navegación inmediatamente

### 6. **Comportamiento esperado**

**Ejemplo de uso:**

1. Admin accede a **Configuración → Permisos**
2. Selecciona usuario "Juan Pérez"
3. Desactiva permiso de **Dashboard**
4. Guarda cambios
5. **Resultado**: Usuario "Juan Pérez" ya no ve el botón "📊 Dashboard" en ninguna página
6. Si reactiva el permiso → Botón reaparece

**Testing realizado:**

- ✅ Navegación muestra todos los botones por defecto
- ✅ Ocultar permiso → botón desaparece
- ✅ Mostrar permiso → botón reaparece
- ✅ Permisos persisten tras cerrar sesión y volver a entrar
- ✅ Cambios son consistentes en todas las páginas
- ✅ Sin errores de TypeScript o compilación

### 7. **Archivos modificados (Deploy)**

**Frontend:**

- `/types/index.ts` - Interface Usuario con permisos
- `/hooks/useAuthBackend.tsx` - Extracción de permisos
- `/components/NavBar.tsx` - **NUEVO** componente
- `/app/dashboard/page.tsx` - NavBar integrado
- `/app/estrategia/page.tsx` - NavBar integrado
- `/app/facturas/page.tsx` - NavBar integrado
- `/app/eventos/page.tsx` - NavBar integrado
- `/app/digital/page.tsx` - NavBar integrado
- `/app/configuracion/page.tsx` - NavBar integrado
- `/app/campanas/page.tsx` - NavBar integrado
- `/app/presupuesto/page.tsx` - NavBar integrado

**Backend:** (Sin cambios - ya estaba listo)

- `/HGApp/routers/auth.py` - Ya retorna permisos
- `/HGApp/routers/admin.py` - Ya maneja permisos
- `/HGApp/models.py` - Campo permisos ya existe

### 8. **Estado: FUNCIONAL ✅**

- ✅ Backend retorna permisos correctamente
- ✅ Frontend extrae y almacena permisos
- ✅ Navegación dinámica funcionando
- ✅ Sin errores de compilación
- ✅ Aplicado a todas las páginas
- ✅ Listo para deploy

**Próximos pasos sugeridos:**

- 🔄 Protección de rutas (redirigir si usuario sin permiso accede directamente a URL)
- 🔄 Hook `usePermisosDePagina()` para protección granular dentro de páginas
- 🔄 Mensaje informativo cuando usuario no tiene permisos

---

## ✅ Ordenamiento de Usuarios en Listas - 19/Feb/2026

**Implementación completada:** Sistema de ordenamiento consistente de usuarios en todas las listas del sistema.

**Requisito:**

Todos los usuarios deben aparecer ordenados en el siguiente orden:

1. **Administradores** (orden alfabético por nombre completo)
2. **Coordinadores** (orden alfabético por nombre completo)
3. **Auditores** (orden alfabético por nombre completo)

**Componentes modificados:**

### 1. **ConfiguracionPermisos.tsx** (`/components/ConfiguracionPermisos.tsx`)

- ✅ Agregada función `ordenarUsuarios()`
- ✅ Aplicada al cargar usuarios desde API
- ✅ Lista de usuarios ordenada al renderizar

**Código agregado (líneas 29-43):**

```typescript
// Función para ordenar usuarios: administrador > coordinador > auditor, alfabéticamente
const ordenarUsuarios = (usuarios: Usuario[]): Usuario[] => {
  const orden: Record<string, number> = {
    administrador: 1,
    coordinador: 2,
    auditor: 3,
  };

  return [...usuarios].sort((a, b) => {
    // Primero ordenar por rol
    const ordenA = orden[a.role] || 999;
    const ordenB = orden[b.role] || 999;
    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }
    // Luego alfabéticamente por nombre
    return a.full_name.localeCompare(b.full_name);
  });
};
```

**Aplicación:**

```typescript
if (response.ok) {
  const data = await response.json();
  setUsuarios(ordenarUsuarios(data)); // ← Ordenamiento aplicado
}
```

### 2. **GestionAccesos.tsx** (`/components/GestionAccesos.tsx`)

- ✅ Agregada misma función `ordenarUsuarios()`
- ✅ Aplicada al cargar usuarios desde API
- ✅ Aplicada tanto para administradores como coordinadores
- ✅ Ordenamiento se mantiene al agregar nuevos usuarios

**Aplicación (líneas 67-72):**

```typescript
if (response.ok) {
  const data = await response.json();
  if (usuario?.tipo === "coordinador") {
    const usuarioActual = data.filter(
      (u: Usuario) => u.id === Number(usuario.id),
    );
    setUsuarios(ordenarUsuarios(usuarioActual)); // ← Ordenamiento aplicado
  } else {
    setUsuarios(ordenarUsuarios(data)); // ← Ordenamiento aplicado
  }
}
```

### 3. **Comportamiento automático**

**Cuando se carga la página:**

- ✅ Usuarios se ordenan automáticamente al cargar

**Cuando se agrega un usuario nuevo:**

- ✅ Función `cargarUsuarios()` se ejecuta después de crear usuario
- ✅ `ordenarUsuarios()` se aplica automáticamente
- ✅ Lista se actualiza con nuevo orden

**Ejemplo de orden resultante:**

```
📄 Lista de Usuarios:
  1. 👤 Ana García (Administrador)
  2. 👤 Carlos Martínez (Administrador)
  3. 👤 Beatriz López (Coordinador)
  4. 👤 Diego Pérez (Coordinador)
  5. 👤 Elena Torres (Auditor)
  6. 👤 Francisco Ruiz (Auditor)
```

### 4. **Archivos modificados**

- `/components/ConfiguracionPermisos.tsx` - Función y aplicación de ordenamiento
- `/components/GestionAccesos.tsx` - Función y aplicación de ordenamiento

### 5. **Testing realizado**

- ✅ Usuarios se cargan ordenados correctamente
- ✅ Orden se mantiene al cambiar de sección
- ✅ Nuevo usuario se inserta en posición correcta
- ✅ Ordenamiento alfabético funciona con acentos (localeCompare)
- ✅ Sin errores de compilación

### 6. **Estado: FUNCIONAL ✅**

- ✅ Ordenamiento implementado en ambos componentes
- ✅ Función reutilizable y mantenible
- ✅ Comportamiento consistente
- ✅ Listo para deploy

---

## ✅ Accesos Integrado en Configuración + Limpieza de Menú Lateral - 19/Feb/2026

**Implementación completada:** Mover la gestión de Accesos (crear/eliminar usuarios) del popup del menú lateral a la página de Configuración como sección integrada.

### 1. **Página de Configuración actualizada** (`/app/configuracion/page.tsx`)

- ✅ Menú lateral ahora tiene 3 opciones en orden: **Accesos → Permisos → Categorías**
- ✅ "Configuración por Categoría" renombrado a **"Categorías"**
- ✅ Sección por defecto al entrar: **Accesos**
- ✅ `GestionAccesos` se renderiza integrado (sin popup overlay)
- ✅ Importado `UsersIcon` para el ícono de Accesos

### 2. **GestionAccesos adaptado** (`/components/GestionAccesos.tsx`)

- ✅ Prop `onClose` ahora es **opcional** (`onClose?: () => void`)
- ✅ **Con `onClose`**: funciona como popup (overlay con fondo gris + botón ✕)
- ✅ **Sin `onClose`**: funciona como componente integrado (sin overlay, sin botón ✕)
- ✅ Componente `Wrapper` dinámico según modo de uso
- ✅ Retrocompatible con cualquier página que aún lo use como popup

### 3. **Accesos eliminado del menú lateral** (`/components/ConfigSidebar.tsx`)

- ✅ Removida opción "Accesos" del array `menuItems`
- ✅ Removido import de `UsersIcon` (ya no se usa)
- ✅ Menú lateral ahora tiene: **Mi Perfil, Cambiar Contraseña, Configuración**

### 4. **Limpieza de GestionAccesos en todas las páginas**

Removido import de `GestionAccesos` y bloque `activeConfigView === "accesos"` de:

- ✅ `/app/dashboard/page.tsx` - Import dinámico + bloque JSX
- ✅ `/app/estrategia/page.tsx` - Import + bloque JSX
- ✅ `/app/facturas/page.tsx` - Import + bloque JSX
- ✅ `/app/eventos/page.tsx` - Import + bloque JSX
- ✅ `/app/digital/page.tsx` - Import + 2 bloques JSX (uno con wrapper modal)
- ✅ `/app/campanas/page.tsx` - Import + bloque JSX
- ✅ `/app/presencias/page.tsx` - Import + bloque JSX
- ✅ `/app/campanas/[id]/anuncios/page.tsx` - Import + bloque JSX

### 5. **Archivos modificados (Deploy)**

- `/app/configuracion/page.tsx` - Menú actualizado con Accesos integrado
- `/components/GestionAccesos.tsx` - onClose opcional, modo integrado
- `/components/ConfigSidebar.tsx` - Removida opción Accesos
- `/app/dashboard/page.tsx` - Limpieza GestionAccesos
- `/app/estrategia/page.tsx` - Limpieza GestionAccesos
- `/app/facturas/page.tsx` - Limpieza GestionAccesos
- `/app/eventos/page.tsx` - Limpieza GestionAccesos
- `/app/digital/page.tsx` - Limpieza GestionAccesos
- `/app/campanas/page.tsx` - Limpieza GestionAccesos
- `/app/presencias/page.tsx` - Limpieza GestionAccesos
- `/app/campanas/[id]/anuncios/page.tsx` - Limpieza GestionAccesos

### 6. **Estado: FUNCIONAL ✅**

- ✅ Accesos funciona integrado en página de Configuración
- ✅ Menú lateral limpio (sin duplicados)
- ✅ Crear/eliminar usuarios desde Configuración → Accesos
- ✅ Sin errores de compilación en ninguna página
- ✅ Listo para deploy

---

## ✅ Correcciones UX en Calendario Mensual + Gráfica de Eventos - 19/Feb/2026

**Correcciones aplicadas:** Fix de año duplicado en header del calendario y verificación de filtrado de gráfica por agencia.

### 1. **Calendario Mensual - Año duplicado corregido** (`/components/CalendarioMensual.tsx`)

**Problema identificado:**

- ❌ Header mostraba "Febrero de 2026 2026 - Vista Mensual"
- 🐛 Causa: `nombreMes` incluía año con `toLocaleDateString("es-ES", { month: "long", year: "numeric" })` y luego se agregaba `fechaActual.getFullYear()` manualmente

**Solución aplicada:**

- ✅ Cambiado formato de fecha para incluir solo el mes: `{ month: "long" }`
- ✅ Año ahora se concatena manualmente con " de ": `{nombreMesCapitalizado} de {fechaActual.getFullYear()}`
- ✅ Header ahora muestra: "Febrero de 2026 - Vista Mensual"

**Código modificado:**

```tsx
// Antes:
const nombreMes = fechaActual.toLocaleDateString("es-ES", {
  month: "long",
  year: "numeric", // ← Incluía el año aquí
});
<h3>
  {nombreMesCapitalizado} {fechaActual.getFullYear()} - Vista Mensual
</h3>;
//      ↑ Febrero de 2026        ↑ 2026 = "Febrero de 2026 2026"

// Ahora:
const nombreMes = fechaActual.toLocaleDateString("es-ES", {
  month: "long", // ← Solo el mes
});
<h3>
  {nombreMesCapitalizado} de {fechaActual.getFullYear()} - Vista Mensual
</h3>;
//      ↑ Febrero         de    ↑ 2026 = "Febrero de 2026"
```

### 2. **Gráfica Presupuesto vs Gasto - Filtrado por agencia CONFIRMADO + GASTO REAL CORREGIDO**

**Verificación del filtrado en /eventos:**

- ✅ `GraficaPresupuestoVsGasto` ya estaba filtrando correctamente por agencia seleccionada en el header
- ✅ Usa `useMarcaGlobal()` para obtener `marcaSeleccionada` y `filtraPorMarca`
- ✅ Parámetros de API incluyen marca seleccionada: `marcaId` en presupuestos, `marca` en proyecciones
- ✅ Post-filtrado adicional con `filtraPorMarca()` en línea 118 (presupuestos) y línea 175 (proyecciones)
- ✅ El componente se re-renderiza cuando cambia `marcaSeleccionada` (dependencia del useEffect línea 269)

**Corrección crítica - Gasto Real no estaba filtrando por marca:**

- ❌ **Problema identificado:** `CalendarioMensual.tsx` calculaba `gastoReal` sumando TODAS las facturas del mes, sin filtrar por marca
- 🐛 **Causa:** El prop `gastoReal` pasado a `GraficaPresupuestoVsGasto` solo filtraba por mes/año, pero no por agencia
- ✅ **Solución aplicada:** Agregado filtro adicional `.filter((f) => filtraPorMarca(f.marca))` antes del `.reduce()`
- ✅ Importado `useMarcaGlobal` en CalendarioMensual
- ✅ Obtenido `filtraPorMarca` del contexto
- ✅ Ahora el gasto real solo suma facturas de la agencia seleccionada (o agencias permitidas si "Todas")

**Código modificado en CalendarioMensual.tsx:**

```tsx
// Antes (línea 256-271):
gastoReal={facturas
  .filter(f => f.eventoId && f.fechaIngresada && ...)
  .filter(f => { /* filtro por mes/año */ })
  .reduce((sum, f) => sum + f.subtotal, 0)}
//                    ↑ Sumaba TODAS las facturas del mes sin importar marca

// Ahora:
gastoReal={facturas
  .filter(f => f.eventoId && f.fechaIngresada && ...)
  .filter(f => { /* filtro por mes/año */ })
  .filter((f) => filtraPorMarca(f.marca))  // ← NUEVO: Filtra por marca seleccionada
  .reduce((sum, f) => sum + f.subtotal, 0)}
```

**Flujo de filtrado completo ahora funciona correctamente:**

1. Usuario selecciona agencia en header → `MarcaContext` actualiza `marcaSeleccionada`
2. `CalendarioMensual` recibe `eventosParaCalendarios` ya filtrados por marca (eventos/page.tsx línea 147-151)
3. `eventosDelMes` filtra por mes/año (CalendarioMensual.tsx línea 74-81)
4. **`gastoReal` ahora filtra facturas por marca antes de sumar (✅ CORREGIDO)**
5. `GraficaPresupuestoVsGasto` recibe eventos + gastoReal filtrados + hace sus propias queries con `marcaSeleccionada`
6. Presupuestos y proyecciones se filtran por agencia a través de parámetros de API + post-filtro con `filtraPorMarca()`

**Resultado:**

- ✅ Al seleccionar una agencia, el gasto real ahora muestra solo las facturas de esa agencia
- ✅ Al seleccionar "Todas las agencias", muestra suma de facturas de agencias permitidas del usuario
- ✅ Gráfica ahora refleja correctamente el gasto de la agencia filtrada

### 3. **Archivos modificados**

- `/components/CalendarioMensual.tsx` - Fix año duplicado + **filtro de gastoReal por marca**

### 4. **Archivos verificados**

- `/components/GraficaPresupuestoVsGasto.tsx` - Filtrado por marca YA funcional (presupuestos y proyecciones)
- `/app/eventos/page.tsx` - Eventos ya filtrados por marca antes de pasar a CalendarioMensual

### 5. **Estado: FUNCIONAL ✅**

- ✅ Header del calendario muestra año una sola vez
- ✅ **Gasto real ahora filtra correctamente por agencia seleccionada**
- ✅ Gráfica de eventos muestra datos precisos de la agencia filtrada
- ✅ Sin errores de compilación
- ✅ Listo para deploy

---

## ✅ Rebranding: SGPME/SGPM → Metrik - 19/Feb/2026

**Cambio de marca en toda la aplicación:** Todos los textos de "SGPME" y "SGPM" han sido reemplazados por "Metrik" para unificar la identidad de marca.

### 1. **Headers de todas las páginas actualizados**

Cambio en el título principal del header de todas las páginas:

```tsx
// Antes:
<h1 className="text-xl font-semibold text-gray-900">SGPME</h1>

// Ahora:
<h1 className="text-xl font-semibold text-gray-900">Metrik</h1>
```

**Páginas modificadas:**

- ✅ `/app/dashboard/page.tsx` (ya tenía "Metrik")
- ✅ `/app/configuracion/page.tsx` (ya tenía "Metrik")
- ✅ `/app/eventos/page.tsx` - SGPME → Metrik
- ✅ `/app/facturas/page.tsx` - SGPME → Metrik
- ✅ `/app/digital/page.tsx` - SGPME → Metrik (2 headers)
- ✅ `/app/estrategia/page.tsx` - SGPME → Metrik
- ✅ `/app/campanas/page.tsx` - SGPME → Metrik
- ✅ `/app/campanas/[id]/anuncios/page.tsx` - SGPME → Metrik
- ✅ `/app/presencias/page.tsx` - SGPME → Metrik (2 headers)
- ✅ `/app/presupuesto/page.tsx` - SGPME → Metrik

### 2. **Página de Login actualizada**

```tsx
// Antes:
<h1 className="text-4xl font-bold text-blue-800 text-center tracking-wide mb-1">
  SGPME
</h1>

// Ahora:
<h1 className="text-4xl font-bold text-blue-800 text-center tracking-wide mb-1">
  Metrik
</h1>
```

**Archivo modificado:**

- ✅ `/app/login/page.tsx` - Título principal cambiado a "Metrik"

### 3. **Página de carga/redirección actualizada**

```tsx
// Antes:
<h1 className="text-4xl font-bold text-blue-800 mb-2">SGPM</h1>

// Ahora:
<h1 className="text-4xl font-bold text-blue-800 mb-2">Metrik</h1>
```

**Archivo modificado:**

- ✅ `/app/page.tsx` - Pantalla de carga ahora muestra "Metrik"

### 4. **Metadatos de la aplicación actualizados**

```tsx
// Antes:
export const metadata: Metadata = {
  title: "GRUPO HG - SGPME",
  appleWebApp: {
    title: "SGPME",
  },
};

// Ahora:
export const metadata: Metadata = {
  title: "GRUPO HG - Metrik",
  appleWebApp: {
    title: "Metrik",
  },
};
```

**Archivo modificado:**

- ✅ `/app/layout.tsx` - Título del navegador y PWA actualizados
  - `title`: "GRUPO HG - SGPME" → "GRUPO HG - Metrik"
  - `appleWebApp.title`: "SGPME" → "Metrik"

### 5. **Usuario de prueba actualizado**

```tsx
// Antes:
grupo: "SGPME Sistema",

// Ahora:
grupo: "Grupo HG",
```

**Archivo modificado:**

- ✅ `/hooks/useAuth.tsx` - Usuario de prueba ahora muestra "Grupo HG" en vez de "SGPME Sistema"

### 6. **Resumen de cambios**

**Total de archivos modificados:** 14

**Cambios aplicados:**

- ✅ 12 headers de páginas: SGPME → Metrik
- ✅ 1 título de login: SGPME → Metrik
- ✅ 1 pantalla de carga: SGPM → Metrik
- ✅ 2 metadatos (navegador + PWA): SGPME → Metrik
- ✅ 1 grupo de usuario de prueba: "SGPME Sistema" → "Grupo HG"

**Archivos NO modificados intencionalmente:**

- `/hooks/useAutoSave.tsx` - Prefijo de localStorage `sgpme_draft_` se mantiene por compatibilidad con datos almacenados

### 7. **Resultado visual**

- ✅ **Navegador:** Pestaña ahora muestra "GRUPO HG - Metrik"
- ✅ **PWA (iOS):** App instalada muestra "Metrik" como título
- ✅ **Headers:** Todas las páginas muestran "Metrik" en el header principal
- ✅ **Login:** Título principal es "Metrik"
- ✅ **Carga inicial:** Pantalla de carga muestra "Metrik"
- ✅ **Consistencia:** Branding unificado en toda la aplicación

### 8. **Estado: FUNCIONAL ✅**

- ✅ Rebranding completado en 14 archivos
- ✅ Sin errores de compilación
- ✅ Identidad de marca unificada como "Metrik"
- ✅ Listo para deploy

---
