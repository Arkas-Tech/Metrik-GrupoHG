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
