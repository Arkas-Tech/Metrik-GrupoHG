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

### 🎯 **NUEVO**: Preview de Imágenes en Formulario de Campañas + Fix Imágenes Negras en Brief + Rediseño Grid

**Descripción:** Se agregó funcionalidad de preview de imágenes en el formulario de campañas con el formato estándar (60% ancho, 90vh alto), se corrigió el problema de imágenes negras en el formulario de briefs, y se rediseñó el grid de imágenes.

**Problemas resueltos:**

1. **FormularioCampana**: Las imágenes no tenían preview modal, solo se mostraban como miniaturas sin forma de ampliarlas
2. **FormularioBrief**: Las imágenes se veían negras en las miniaturas por uso de `bg-black bg-opacity-0` (incompatible con Tailwind v4)
3. **FormularioBrief**: Grid de imágenes demasiado grande, se necesitaban 4 por hilera y más compactas

**Causa raíz de imágenes negras:** Tailwind CSS v4 ya no soporta `bg-opacity-*` como clase separada. `bg-black bg-opacity-0` renderizaba un fondo negro sólido sobre las imágenes. Solución: usar `bg-transparent group-hover:bg-black/20` (sintaxis v4).

**Rediseño del grid de imágenes en FormularioBrief:**

- Grid: de `grid-cols-1 md:grid-cols-2` → `grid-cols-2 md:grid-cols-4`
- Miniaturas: altura `h-32` (128px), compactas
- Padding reducido: `p-4` → `p-3`
- Inputs compactos: `text-xs px-2 py-1.5`
- Labels removidas para ahorrar espacio
- Badges y botones proporcionalmente más pequeños

**Cambios implementados:**

**1. FormularioCampana.tsx:**

- Import de `XMarkIcon` de Heroicons
- Estado `imagenPreview` para controlar preview modal
- Imágenes clickeables con `cursor-pointer` y efecto hover
- Modal de preview con formato estándar:
  - Anchura: 60% del viewport (`max-w-[60%]`)
  - Altura: 90vh (`max-h-[90vh]`)
  - Imagen: max 85vh con `object-contain`
  - Botón cerrar en esquina superior derecha
  - Click fuera para cerrar
  - Info card debajo de la imagen
- Botón eliminar con `stopPropagation` para no abrir preview
- Link "Ver anuncio" con `stopPropagation` para no abrir preview

**2. FormularioBrief.tsx:**

- Cambio de `<Image>` (Next.js) a `<img>` nativo en miniaturas
- Razón: Next.js Image component con `fill` prop causa problemas con URLs base64/blob locales
- Reducción de tamaño de miniaturas: de `h-48` (192px) a `h-32` (128px) para mejor visualización
- Las miniaturas usan `<img>` con `w-full h-32 object-cover`
- Agregado `loading="eager"` para carga inmediata de imágenes base64
- Preview modal sigue usando ImageModal component (que funciona correctamente)
- Agregado `overflow-hidden` al contenedor para garantizar bordes redondeados
- Simplificación del CSS para mejor compatibilidad con URLs base64

**Flujo de usuario - FormularioCampana:**

1. Usuario agrega imágenes al formulario de campaña
2. Ve miniaturas en grid de 2-4 columnas
3. Hace click en cualquier imagen para ver preview en tamaño grande
4. Se abre modal con imagen en 60% ancho, 90vh alto
5. Ve título y descripción debajo de la imagen
6. Cierra con botón X o click fuera
7. Puede eliminar imagen con botón rojo (sin abrir preview)
8. Puede ver link del anuncio (sin abrir preview)

**Flujo de usuario - FormularioBrief:**

1. Usuario agrega imágenes al formulario de brief
2. Ahora ve las imágenes correctamente (ya no aparecen negras)
3. Puede ver miniaturas compactas h-32 (128px) con imagen visible
4. Click en miniatura abre ImageModal con preview completo
5. Experiencia consistente en todo el flujo

**Archivos modificados:**

- `sgpme_app/src/components/FormularioCampana.tsx`:
  - Nuevo import: XMarkIcon
  - Nuevo estado: imagenPreview
  - onClick en imágenes para abrir preview
  - stopPropagation en botón eliminar y link
  - Modal de preview con formato estándar
- `sgpme_app/src/components/FormularioBrief.tsx`:
  - Cambio de `<Image fill>` a `<img>` en miniaturas
  - Agregado `overflow-hidden` al contenedor
  - Mantiene ImageModal para preview (sigue funcionando)

**Notas técnicas:**

- **Next.js Image limitations**: El componente `<Image>` con prop `fill` no funciona bien con URLs base64/blob/local porque Next.js intenta optimizar la imagen y falla
- **Solución**: Usar `<img>` nativo para miniaturas (no requiere optimización), y `<Image>` solo en modal cuando ya está cargada
- **Preview modal estándar**: 60% ancho es ideal para ver detalles sin abrumar pantalla
- **stopPropagation**: Necesario en botones/links dentro de elementos clickeables para prevenir abrir preview accidentalmente
- Compatible con todos los tamaños de pantalla
- z-index 50 asegura que modal esté sobre todo el contenido

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Preview de Imágenes en Brief de Eventos

**Descripción:** Las imágenes en la galería del brief ahora son clickeables y abren un modal de preview en tamaño completo, permitiendo ver las imágenes con mejor detalle sin salir del brief.

**Problema resuelto:** Antes las imágenes solo se mostraban en miniaturas pequeñas (h-48) sin forma de ampliarlas. Ahora se pueden ver en tamaño completo con un solo click.

**Cambios implementados:**

1. **Imágenes clickeables:**
   - Todas las imágenes en la galería ahora tienen `cursor-pointer`
   - Click en cualquier imagen abre el modal de preview
   - Efecto hover visual para indicar que son clickeables

2. **Modal de preview fullscreen:**
   - Fondo oscuro semi-transparente (bg-opacity-75)
   - Botón de cerrar (X) en esquina superior derecha
   - Click fuera de la imagen cierra el modal
   - **Límites de tamaño optimizados:**
     - Altura máxima: 90vh (90% de la altura de la ventana)
     - Anchura máxima: 60% del ancho de la ventana
     - Imagen se ajusta manteniendo proporciones (`object-contain`)
   - Título y descripción de la imagen debajo del preview
   - Diseño responsive que funciona en móvil y desktop

3. **Experiencia de usuario mejorada:**
   - Click en la imagen (dentro del modal) no cierra el preview
   - ESC o click fuera cierra el modal
   - Transición suave al abrir/cerrar
   - Imágenes de alta calidad (1200x800 base)
   - Texto legible con fondo blanco debajo de la imagen

**Flujo de uso:**

1. Usuario abre brief de un evento con imágenes
2. Ve la galería de imágenes en miniatura
3. Hace click en cualquier imagen que quiera ver en detalle
4. Se abre modal con la imagen en tamaño grande (max 90% altura, 60% ancho)
5. Puede leer el título y descripción debajo de la imagen
6. Cierra el modal haciendo click en:
   - Botón X en la esquina
   - Fondo oscuro fuera de la imagen
7. Puede abrir otra imagen repitiendo el proceso

**Archivos modificados:**

- `/sgpme_app/src/components/BriefTemplate.tsx`:
  - Import de `XMarkIcon` de Heroicons
  - Estado `imagenPreview` para controlar qué imagen se muestra
  - Función `setImagenPreview` para abrir/cerrar modal
  - onClick en cada imagen de la galería
  - Nuevo modal overlay con imagen fullscreen
  - Límites de tamaño: `max-w-[60%]` y `max-h-[90vh]`
  - Botón de cerrar y click fuera para cerrar

**Notas técnicas:**

- El modal usa `position: fixed` con `z-50` para estar sobre todo
- Las imágenes se cargan con Next.js Image component para optimización
- `object-contain` asegura que la imagen completa sea visible
- `stopPropagation` en la imagen evita que cierre el modal al hacer click en ella
- Compatible con todos los tamaños de pantalla (responsive)
- No afecta al PDF descargable (solo funcionalidad en UI web)

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Estandarización de Preview de Imágenes en Toda la Aplicación

**Descripción:** Se ha estandarizado el formato de los modales de preview de imágenes en toda la aplicación para ofrecer una experiencia consistente. Todos los previews de imágenes ahora usan las mismas dimensiones y estilos.

**Problema resuelto:** Antes había diferentes implementaciones de preview de imágenes en la aplicación:

- Algunos usaban modales muy anchos (`max-w-7xl` ≈ 1280px)
- Otros tenían alturas limitadas a 70vh
- Diseños inconsistentes en botones de cerrar
- Experiencia de usuario fragmentada

**Formato estándar implementado:**

- **Anchura:** 60% del viewport (`max-w-[60%]`)
- **Altura:** 90% del viewport (`max-h-[90vh]`)
- **Imagen:** Altura máxima 85vh con `object-contain`
- **Botón cerrar:** Esquina superior derecha (top-4 right-4)
- **Fondo:** Negro semi-transparente (bg-opacity-75)
- **Cierre:** Click fuera de la imagen o botón X
- **Información:** Título y descripción debajo de la imagen

**Componentes actualizados:**

1. **ImageModal.tsx** (componente base):
   - Cambió de `max-w-7xl` a `max-w-[60%]`
   - Cambió de `fill` con contenedores fijos a dimensiones explícitas
   - Imagen ahora usa `max-h-[85vh]` en vez de `max-h-[70vh]`
   - Close button movido de `-top-12 right-0` a `top-4 right-4`
   - Removido texto de instrucción innecesario
   - Info card ajustada para estar debajo de la imagen
   - **Usado por:** FormularioBrief (previews de imágenes en formulario del brief)

2. **campanas/page.tsx** (vista de campañas):
   - Modal inline actualizado de `max-w-7xl` a `max-w-[60%]`
   - Altura de contenedor de `max-h-screen` a `max-h-[90vh]`
   - Close button mejorado con bg-white y mejor posicionamiento
   - Imagen usa `max-h-[85vh]` para consistencia
   - Opacidad de fondo ajustada de 90 a 75 para uniformidad

3. **BriefTemplate.tsx** (ya implementado previamente):
   - ✅ Ya tenía el nuevo formato estándar
   - Sirvió como referencia para actualizar los demás

**Componentes verificados (no requieren preview):**

- **FormularioCampana.tsx**: Solo muestra miniaturas con botón de eliminar, no tiene preview modal

**Flujo consistente en toda la app:**

1. Usuario hace click en cualquier imagen (brief, campañas, formularios)
2. Se abre modal de preview con dimensiones estándar (60% ancho, 90vh alto)
3. Imagen se muestra en tamaño óptimo manteniendo proporciones
4. Info visible debajo de la imagen cuando está disponible
5. Cierre intuitivo con click fuera o botón X
6. Experiencia visual y funcionalmente idéntica en toda la aplicación

**Beneficios:**

- ✅ Experiencia de usuario consistente
- ✅ Imágenes no demasiado grandes ni pequeñas (60% es el punto ideal)
- ✅ Espacio suficiente para ver detalles sin ocupar toda la pantalla
- ✅ Diseño limpio y profesional
- ✅ Código más mantenible (estándar único)
- ✅ Responsive en todos los dispositivos

**Archivos modificados:**

- `sgpme_app/src/components/ImageModal.tsx`
- `sgpme_app/src/app/campanas/page.tsx`

**Notas técnicas:**

- El estándar 60% de ancho es ideal para ver detalles sin abrumar la pantalla
- 90vh de altura deja espacio para header/footer de navegador
- 85vh para la imagen permite espacio para la info card (5vh)
- `object-contain` asegura que imágenes verticales y horizontales se vean bien
- z-index de 50-60 asegura que estén sobre todo el contenido
- Compatible con Next.js Image component y tags img estándar

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Facturas Asignadas en Brief de Eventos

**Descripción:** Los briefs de eventos ahora muestran todas las facturas que han sido asignadas al evento con estado "Ingresada", mostrando el total gastado y un desglose detallado de cada factura. Esta información también se incluye en el PDF descargable del brief.

**Problema resuelto:** Antes no había visibilidad del gasto real de un evento directamente en su brief. Ahora se puede ver el total gastado y el detalle de cada factura asignada al evento.

**Cambios implementados:**

1. **Recuadro "Total Gastado" en Brief (BriefTemplate.tsx):**
   - Aparece después de la sección "Presupuesto" cuando hay facturas asignadas
   - **Diseño de recuadro único clickeable:**
     - Muestra "Total Gastado" con el monto total en un solo recuadro azul claro
     - Flecha hacia arriba (⬆️) cuando está colapsado (indica "expandir")
     - Flecha hacia abajo (⬇️) cuando está expandido (indica "colapsar")
     - Todo el recuadro es clickeable, no solo la flecha
     - Efecto hover para indicar interactividad
   - **Desglose de facturas desplegable:**
     - Click en el recuadro expande/colapsa la lista de facturas
     - Lista de facturas con tres columnas:
       - **Proveedor**: Nombre del proveedor
       - **Subtotal**: Monto de la factura (sin IVA)
       - **Subcategoría**: Categoría de gasto de la factura
     - Diseño limpio sin botones adicionales
   - Solo muestra facturas con estado "Ingresada" (las que ya se reflejan en gráficas)

2. **Funcionalidad desplegable simplificada:**
   - Click en cualquier parte del recuadro "Total Gastado" para expandir/colapsar
   - Por defecto inicia colapsado (solo se ve el total)
   - Transición suave al expandir/colapsar
   - Sin botones separados ni elementos innecesarios

3. **PDF descargable actualizado (exportarBriefPDF):**
   - Sección "Total Gastado" después del presupuesto
   - Lista numerada de facturas con formato: "Proveedor - Monto - Subcategoría"
   - Formateo de moneda en pesos mexicanos
   - Solo incluye en PDF si hay facturas asignadas

**Flujo de uso:**

**Asignar factura a evento:**

1. Usuario crea/edita factura en módulo de Facturas
2. Asigna la factura a un evento específico
3. Factura pasa por proceso de autorización y eventual estado "Ingresada"
4. Al pasar a "Ingresada", se refleja en gráficas de presupuesto del calendario

**Ver facturas en Brief:**

1. Usuario abre brief de un evento (desde lista de eventos o calendario)
2. Sección "Gasto Real" aparece después de "Presupuesto"
3. Ve el total gastado inmediatamente
4. Puede hacer click en "Ver desglose de facturas" para ver el detalle
5. Cada factura muestra: Proveedor, Subtotal, Subcategoría

**Descargar PDF con facturas:**

1. Usuario hace click en "Descargar PDF" del brief
2. PDF se genera incluyendo el total gastado y lista de facturas
3. Facturas aparecen después de la sección de presupuesto
4. Formato legible y profesional

**Archivos modificados:**

- `/sgpme_app/src/components/BriefTemplate.tsx`:
  - Import de `useFacturasAPI` y `useState`
  - Import de iconos `ChevronDownIcon` y `ChevronRightIcon`
  - Hook `useFacturas()` para obtener facturas
  - useMemo para filtrar facturas del evento (eventoId match + estado "Ingresada")
  - useMemo para calcular total gastado
  - Estado `facturasExpandidas` para controlar desplegable
  - Nueva sección UI con total y lista desplegable

- `/sgpme_app/src/hooks/useEventos.ts`:
  - Import de tipo `Factura` desde types
  - Modificación de firma de `exportarBriefPDF` para recibir `facturas: Factura[] = []`
  - Filtrado de facturas del evento en función PDF
  - Cálculo de total gastado en función PDF
  - Agregado de sección "Total Gastado" y "Desglose de Facturas" al PDF

- `/sgpme_app/src/app/eventos/page.tsx`:
  - Llamada a `exportarBriefPDF(eventoEditando.id, facturas)` pasando facturas como parámetro

**Notas técnicas:**

- Solo se muestran facturas con estado "Ingresada" (consistente con gráficas de presupuesto)
- El filtrado se hace por `eventoId` exacto para evitar mostrar facturas de otros eventos
- El total gastado se calcula sobre el campo `subtotal` de las facturas (sin IVA)
- Si un evento no tiene facturas asignadas, la sección no aparece
- Compatible con eventos existentes sin facturas
- El PDF incluye las facturas solo si existen, sin afectar briefs sin facturas

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Actualización Automática de Service Worker (Sin intervención del usuario)

**Problema resuelto:** Los usuarios ya no necesitan limpiar cache manualmente después de cada deploy. El sistema ahora detecta y aplica actualizaciones automáticamente.

**Cambios implementados:**

1. **Configuración de PWA mejorada (`next.config.ts`):**
   - `skipWaiting: true` - Activa nueva versión del SW inmediatamente
   - `cleanupOutdatedCaches: true` - Elimina caches viejos automáticamente
   - Runtime caching con estrategias específicas por tipo de asset:
     - **Archivos estáticos JS/CSS**: CacheFirst (24h de expiración)
     - **Imágenes**: StaleWhileRevalidate (64 entradas max)
     - **Fuentes**: CacheFirst (1 año para Google Fonts)
     - **API calls**: NetworkFirst (5min cache, 10s timeout)
     - **Next.js data**: StaleWhileRevalidate (24h)

2. **Hook de actualización automática (`useServiceWorker.ts`):**
   - Detecta cuando hay una nueva versión del service worker
   - Envía mensaje SKIP_WAITING al nuevo SW
   - Listener de controllerchange para recargar página automáticamente
   - Verificación de actualizaciones cada 60 segundos
   - Solo se ejecuta en producción

3. **Integración en ClientProviders:**
   - Hook ejecutado globalmente en toda la aplicación
   - Activación transparente sin afectar UX

**Flujo de actualización:**

1. Usuario tiene versión vieja cargada
2. Deploy de nueva versión → nuevo BUILD_ID generado
3. SW detecta actualización (check cada 60s)
4. Nuevo SW se instala en background
5. Nuevo SW hace skipWaiting() automáticamente
6. Página se recarga automáticamente
7. Usuario ve nueva versión - **SIN intervención manual**

**Archivos modificados:**

- `/sgpme_app/next.config.ts` - Configuración PWA con skipWaiting y runtime caching
- `/sgpme_app/src/hooks/useServiceWorker.ts` - Hook de actualización automática (nuevo)
- `/sgpme_app/src/components/ClientProviders.tsx` - Integración del hook

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

**⚠️ Nota importante:** Una vez desplegado, los usuarios con la versión vieja aún necesitarán limpiar cache UNA ÚLTIMA VEZ. Después de eso, todas las actualizaciones futuras serán automáticas.

---

### 🎯 **NUEVO**: Eventos Clickeables en Lista de Calendario Trimestral

**Descripción:** Los eventos mostrados en la lista "Eventos del Trimestre" ahora son completamente clickeables y abren el mismo modal de resumen detallado que se muestra al hacer click en un evento desde el calendario.

**Problema resuelto:** Antes, la lista de eventos del trimestre solo permitía interacción limitada. Ahora permite acceso directo al resumen completo del evento con un click.

**Cambios implementados:**

1. **Click en evento de la lista:**
   - Al hacer click en cualquier evento de la lista "Eventos del Trimestre", se abre el modal `ModalEventosDia`
   - El modal muestra el resumen completo del evento (igual que cuando se hace click desde el calendario)
   - Incluye todos los detalles: descripción, ubicación, audiencia, objetivo, presupuesto, facturas, etc.

2. **Experiencia consistente:**
   - Misma funcionalidad que hacer click en un día con eventos y luego seleccionar el evento
   - El usuario puede crear o ver el brief del evento directamente desde la lista
   - Navegación más rápida sin necesidad de buscar el día en el calendario

**Flujo de interacción:**

1. Usuario ve la lista de "Eventos del Trimestre" en la parte inferior del calendario
2. Usuario hace click en cualquier evento de la lista
3. Se abre el modal con el resumen detallado del evento
4. Usuario puede ver brief, crear brief, o cerrar el modal

**Archivos modificados:**

- `/sgpme_app/src/components/CalendarioTrimestral.tsx` - onClick de eventos de la lista abre modal con resumen

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Botones de Brief en Modal de Resumen de Eventos

**Descripción:** El modal de resumen de eventos ahora incluye botones interactivos para crear o ver el brief del evento, directamente desde la sección "Brief del Evento". Los botones siguen el mismo diseño visual que los de la lista de eventos.

**Problema resuelto:** Aunque el modal mostraba el estado del brief ("Sin Brief" o "Brief Disponible"), no había forma de crear o ver el brief directamente desde ahí. Ahora se pueden realizar estas acciones sin cerrar el modal.

**Cambios implementados:**

1. **Botón "➕ Crear Brief":**
   - Se muestra cuando el evento no tiene brief (estado: "⚠️ Sin Brief")
   - Al hacer click, llama a la función `onCrearBrief` del evento
   - Estilo: naranja (bg-orange-100 text-orange-700) igual que en lista de eventos
   - Badge y botón en la misma línea pegados (space-x-2)
   - Permite crear el brief sin salir del modal

2. **Botón "👁️ Preview":**
   - Se muestra cuando el evento tiene brief (estado: "Brief Disponible" + badge de aprobación si aplica)
   - Al hacer click, llama a la función `onVerBrief` del evento
   - Estilo: morado (bg-purple-100 text-purple-700) igual que en lista de eventos
   - Badges de estado y botón en la misma línea pegados (space-x-2)
   - Permite acceder al brief completo directamente

3. **Layout mejorado:**
   - Badges de estado y botones en la misma línea horizontal (flex items-center space-x-2)
   - Botones pegados al badge de estado, no separados con justify-between
   - Botones con padding py-2 (más grandes que antes) para consistencia con lista
   - Eventos propagados correctamente para evitar cerrar el modal accidentalmente

**Flujo de interacción:**

**Sin Brief:**

1. Usuario abre resumen del evento (desde calendario o lista)
2. Ve "⚠️ Sin Brief" en la sección "Brief del Evento"
3. Hace click en botón naranja "➕ Crear Brief"
4. Sistema navega a la creación del brief del evento

**Con Brief:**

1. Usuario abre resumen del evento
2. Ve "Brief Disponible" (y posiblemente "✓ Aprobado")
3. Hace click en botón morado "👁️ Preview"
4. Sistema abre/navega al brief existente del evento

**Archivos modificados:**

- `/sgpme_app/src/components/ModalEventosDia.tsx` - Botones con estilos consistentes con lista de eventos
- `/sgpme_app/src/app/eventos/page.tsx` - Props onCrearBrief y onVerBrief agregadas a CalendarioTrimestral y CalendarioAnual en dashboard

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Expansión de un Solo Evento a la Vez en Modal de Resumen

**Descripción:** El modal de resumen de eventos ahora permite expandir solo un evento a la vez. Al expandir un nuevo evento, el anterior se colapsa automáticamente. Además, al cerrar el modal, todos los eventos se resetean a su estado colapsado.

**Problema resuelto:** Antes era posible tener múltiples eventos expandidos simultáneamente, lo que hacía el modal muy largo y difícil de navegar. Ahora la experiencia es más limpia y enfocada.

**Cambios implementados:**

1. **Un evento expandido a la vez:**
   - Al hacer click para expandir un evento, cualquier otro evento expandido se colapsa automáticamente
   - Experiencia de navegación más limpia y enfocada
   - Reduce scrolling innecesario en días con múltiples eventos

2. **Reset al cerrar modal:**
   - Al cerrar el modal, todos los eventos regresan a su estado colapsado
   - La próxima vez que se abra el modal, todos los eventos inician colapsados
   - Estado limpio cada vez que se interactúa con el modal

**Flujo de interacción:**

1. Usuario abre modal de eventos del día (desde calendario)
2. Hace click en un evento → evento se expande mostrando detalles completos
3. Hace click en otro evento → el primer evento se colapsa, el segundo se expande
4. Usuario cierra el modal
5. Usuario vuelve a abrir el modal → todos los eventos inician colapsados

**Archivos modificados:**

- `/sgpme_app/src/components/ModalEventosDia.tsx` - Estado de expandedEventos cambiado de Set a string único, reset en onClose

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Filtrado de Eventos por Estado en Calendarios

**Descripción:** Los contadores de estado en todos los calendarios (Mensual, Trimestral y Anual) ahora son botones clickeables que filtran los eventos del calendario según el estado seleccionado. Al hacer click en un estado, solo se muestran los eventos con ese estado en el calendario.

**Problema resuelto:** Antes era difícil enfocarse en eventos de un estado específico cuando había muchos eventos en el calendario. Ahora se puede filtrar rápidamente por "Realizados", "Confirmados", "Por Suceder" o "Prospectados".

**Cambios implementados:**

1. **Botones de filtro interactivos:**
   - Todos los contadores de estado (Total, Realizados, Confirmados, Por Suceder, Prospectados) son ahora botones clickeables
   - Indicador visual del filtro activo (ring-2 y fondo más intenso)
   - Hover states para mejor UX
   - Click en "Total Eventos" muestra todos los eventos (resetea filtro)

2. **Filtrado en tiempo real:**
   - Al seleccionar un estado, el calendario solo muestra eventos de ese estado
   - Los eventos en días se filtran dinámicamente
   - La lista de eventos (en trimestral) también se filtra
   - El contador total se mantiene para referencia

3. **Estados disponibles para filtrado:**
   - **Todos** (null): Muestra todos los eventos sin filtro
   - **Realizado**: Solo eventos completados (verde)
   - **Confirmado**: Solo eventos confirmados (azul)
   - **Por Suceder**: Solo eventos próximos (amarillo)
   - **Prospectado**: Solo eventos en prospección (morado)

**Flujo de interacción:**

1. Usuario abre calendario (Mensual, Trimestral o Anual)
2. Ve contadores de eventos por estado en la parte superior
3. Hace click en un estado específico (ej: "Realizados")
4. El calendario se actualiza mostrando solo eventos con ese estado
5. El botón seleccionado muestra indicador visual (ring + fondo)
6. Usuario puede click en "Total Eventos" para volver a ver todos

**Implementación técnica:**

- Estado `filtroEstado` agregado a cada componente de calendario
- Función `obtenerEventosDelDia` modificada para considerar el filtro
- Botones con clases condicionales para mostrar estado activo
- Filtro se aplica tanto a eventos en días como a listas de eventos
- **Lista de eventos trimestral**: La lista "Eventos del Trimestre" también se filtra según el estado seleccionado
- **Header estandarizado**: Los 3 calendarios ahora usan el mismo diseño de header con gradiente from-blue-600 to-purple-600
- **5 botones de filtro**: Todos los calendarios incluyen Total, Realizados, Confirmados, Por Suceder y Prospectados

**Archivos modificados:**

- `/sgpme_app/src/components/CalendarioMensual.tsx` - Botones de filtro, lógica de filtrado y header estandarizado
- `/sgpme_app/src/components/CalendarioTrimestral.tsx` - Botones de filtro (con Prospectados), lógica de filtrado en calendario y lista de eventos
- `/sgpme_app/src/components/CalendarioAnual.tsx` - Botones de filtro y lógica de filtrado

## **Estado:** ✅ Implementado localmente, pendiente de deploy a producción

### 🎯 **NUEVO**: Asignación de Múltiples Agencias por Evento

**Descripción:** Los eventos ahora pueden ser asignados a múltiples agencias simultáneamente. Esto permite registrar eventos que involucran a varias marcas del grupo (ej: evento compartido entre Toyota Chihuahua, Toyota Delicias y Subaru Chihuahua).

**Problema resuelto:** Antes cada evento solo podía pertenecer a una agencia, lo que causaba duplicación de eventos cuando varias marcas participaban en el mismo evento. Ahora un solo evento puede tener múltiples agencias asignadas.

**Cambios implementados:**

1. **Backend - Soporte para arrays de agencias:**
   - Tipo de dato `marca` actualizado a `Union[str, List[str]]` en Pydantic models
   - Serialización automática: arrays se guardan como JSON en PostgreSQL
   - Deserialización automática: JSON se parsea de vuelta a array al leer
   - Compatibilidad backward: eventos existentes con string único siguen funcionando
   - Filtrado inteligente: soporta buscar eventos tanto con marca string como array JSON

2. **Frontend - Tipos actualizados:**
   - Interface `Evento.marca` cambiada a `string | string[]`
   - Soporte completo para manejar tanto strings como arrays en toda la aplicación

3. **Formulario - Selector de agencias mejorado:**
   - **Nuevo diseño tipo pills/chips:** Interfaz moderna y compacta
   - Botones con forma de píldora (`rounded-full`) en lugar de checkboxes tradicionales
   - **Selección visual clara:** Botones seleccionados se pintan de azul intenso con texto blanco
   - **Contador en tiempo real:** Badge en esquina superior derecha muestra "X seleccionadas"
   - **Tamaño optimizado:** ~60% más compacto que diseño anterior
   - Layout flexible con `flex-wrap` que se adapta al contenido
   - Transiciones suaves (200ms) al seleccionar/deseleccionar
   - Validación: requiere al menos una agencia seleccionada

4. **Funciones utilitarias creadas:**
   - `formatearMarca(marca)`: Convierte array a string legible ("Toyota, Subaru, GWM")
   - `eventoPerteneceAMarca(eventoMarca, filtro)`: Verifica si evento pertenece a agencia filtrada
   - `obtenerArrayMarcas(marca)`: Normaliza a formato array para procesamiento uniforme

5. **Componentes actualizados para mostrar múltiples agencias:**
   - `ModalEventosDia.tsx`: Muestra marcas como "Toyota, Subaru"
   - `CalendarioTrimestral.tsx`: Lista de eventos muestra todas las marcas
   - `BriefTemplate.tsx`: Brief muestra todas las agencias en header
   - `FormularioBrief.tsx`: Formulario de brief muestra todas las marcas
   - `DashboardGeneral.tsx`: Dashboard filtra y muestra correctamente
   - `eventos/page.tsx`: Tabla y cards muestran múltiples marcas

6. **Filtrado intelligente:**
   - Cuando se filtra por agencia, muestra eventos que tengan esa agencia en su lista
   - Funciona tanto con eventos de agencia única (legacy) como múltiples agencias
   - Filtro en CalendarioMensual, Trimestral, Anual y DashboardGeneral

**Flujo de uso:**

**Crear evento con múltiples agencias:**

1. Usuario abre formulario de nuevo evento
2. En sección "Agencias" ve selector con pills para cada marca
3. Usuario hace click en Toyota Chihuahua → se pinta azul
4. Usuario hace click en Subaru Chihuahua → se pinta azul
5. Usuario hace click en GWM Chihuahua → se pinta azul
6. Contador muestra "3 seleccionadas"
7. Usuario guarda evento
8. Backend guarda en DB: `["Toyota Chihuahua", "Subaru Chihuahua", "GWM Chihuahua"]` como JSON

**Ver evento con múltiples agencias:**

1. Evento se muestra en calendarios de todas las agencias seleccionadas
2. Al ver detalles: muestra "Toyota Chihuahua, Subaru Chihuahua, GWM Chihuahua"
3. Al filtrar por Toyota Chihuahua: evento aparece
4. Al filtrar por Subaru Chihuahua: evento aparece
5. Al filtrar por Kia: evento NO aparece

**Editar evento:**

1. Usuario abre evento existente
2. Formulario muestra pills azules para las agencias ya seleccionadas
3. Usuario puede agregar o quitar agencias con un click
4. Contador se actualiza en tiempo real

**Archivos backend modificados:**

- `/HGApp/routers/eventos.py`:
  - `EventoRequest.marca`: Union[str, List[str]]
  - `EventoResponse.marca`: Union[str, List[str]]
  - `deserialize_marca()`: función de deserialización JSON
  - `create_evento()`: serializa array a JSON
  - `update_evento()`: serializa array a JSON
  - `read_all_eventos()`: deserializa y filtra correctamente
  - `read_evento()`: deserializa marca

**Archivos frontend modificados:**

- `/sgpme_app/src/types/index.ts`: `marca: string | string[]`
- `/sgpme_app/src/lib/evento-utils.ts`: Funciones utilitarias (nuevo archivo)
- `/sgpme_app/src/components/FormularioEvento.tsx`: Selector de pills interactivo
- `/sgpme_app/src/components/ModalEventosDia.tsx`: Usa `formatearMarca()`
- `/sgpme_app/src/components/CalendarioTrimestral.tsx`: Usa `formatearMarca()`
- `/sgpme_app/src/components/BriefTemplate.tsx`: Usa `formatearMarca()`
- `/sgpme_app/src/components/FormularioBrief.tsx`: Usa `formatearMarca()`
- `/sgpme_app/src/components/DashboardGeneral.tsx`: Usa `eventoPerteneceAMarca()` y `formatearMarca()`
- `/sgpme_app/src/app/eventos/page.tsx`: Usa ambas funciones utilitarias

**Notas técnicas:**

- No requiere migración de base de datos (columna `marca` es Text, soporta JSON)
- Eventos existentes con string único siguen funcionando sin cambios
- Frontend maneja automáticamente conversión entre string y array
- Validación asegura al menos una agencia seleccionada

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción
