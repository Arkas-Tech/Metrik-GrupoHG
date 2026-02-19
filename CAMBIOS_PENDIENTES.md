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

**Archivos modificados:**

- `/sgpme_app/src/components/CalendarioMensual.tsx` - Botones de filtro y lógica de filtrado
- `/sgpme_app/src/components/CalendarioTrimestral.tsx` - Botones de filtro y lógica de filtrado
- `/sgpme_app/src/components/CalendarioAnual.tsx` - Botones de filtro y lógica de filtrado

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción
