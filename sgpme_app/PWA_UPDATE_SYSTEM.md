# Sistema de Auto-Actualización PWA

## 🎯 ¿Cómo funciona?

Este sistema permite que los usuarios actualicen la aplicación **cuando ellos quieran**, sin interrumpir su trabajo.

### Flujo de Actualización:

1. **Detección automática**: El sistema verifica si hay nueva versión:
   - Al cargar la app
   - Cuando el usuario regresa a la pestaña
   - Cada 5 minutos automáticamente

2. **Notificación elegante**: Si hay actualización, aparece un toast en la esquina inferior derecha con:
   - Mensaje claro: "¡Nueva versión disponible!"
   - Botón "🔄 Actualizar ahora"
   - Botón "Más tarde"

3. **Usuario decide**:
   - Si hace clic en "Actualizar ahora" → se limpia caché y recarga
   - Si hace clic en "Más tarde" → puede seguir trabajando
   - Se le volverá a notificar después

## 📝 Cómo Publicar una Actualización

### Paso 1: Incrementar versión

Edita `/src/lib/versionCheck.ts`:

```typescript
export const APP_VERSION = "1.0.2"; // Incrementa el número
```

### Paso 2: Deploy normal

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

El webhook automáticamente:

1. Hace `git pull` en el servidor
2. Ejecuta `npm run build`
3. Recarga PM2 con `pm2 reload metrik-frontend`

### Paso 3: Usuarios se actualizan solos

- **Usuarios activos**: Verán el toast y actualizarán cuando quieran
- **Usuarios inactivos**: Al regresar verán la versión nueva automáticamente

## 🚀 PWA Features

### Instalable

Los usuarios pueden instalar la app en su dispositivo:

- **Desktop**: Chrome muestra botón "Instalar" en la barra de direcciones
- **Mobile**: Safari/Chrome muestran opciones de "Agregar a pantalla de inicio"

### Funciona Offline (próximamente)

El Service Worker permite:

- Caché de assets estáticos
- Funcionalidad básica sin internet
- Sincronización cuando vuelve la conexión

### Detección de Conexión

- Si el usuario pierde conexión y la recupera → verifica actualizaciones

## 🧪 Cómo Probar en Local

### 1. Cambiar versión para ver el toast:

```typescript
// En src/lib/versionCheck.ts
export const APP_VERSION = "1.0.999"; // Versión de prueba
```

### 2. Recargar la página

- Abre http://localhost:3000
- Verás el toast con la notificación de actualización

### 3. Probar funcionalidad:

- ✅ Clic en "Actualizar ahora" → debe recargar
- ✅ Clic en "Más tarde" → toast desaparece, puedes seguir usando
- ✅ Cambiar de tab y regresar → toast aparece de nuevo
- ✅ En DevTools → Application → Service Workers → ver SW registrado

## 🔧 Configuración

### next.config.ts

```typescript
withPWA({
  dest: "public", // Genera SW en /public
  disable: process.env.NODE_ENV === "development", // Deshabilitado en dev
  reloadOnOnline: true, // Verifica al recuperar internet
});
```

### manifest.json

Define cómo se ve la app instalada:

- Nombre: "GRUPO HG - SGPME"
- Colores: Azul (#3b82f6)
- Iconos: 192px, 384px, 512px

## 📱 Testing en Producción

### Desktop (Chrome)

1. Visita https://metrik.grupohg.com.mx
2. Verás icono "⊕ Instalar" en la barra de direcciones
3. Instala la app
4. Se abre en ventana standalone (sin barra del navegador)

### Mobile (Safari iOS)

1. Visita https://metrik.grupohg.com.mx
2. Toca botón "Compartir"
3. "Agregar a pantalla de inicio"
4. Se crea icono de app en home screen

### Mobile (Chrome Android)

1. Visita https://metrik.grupohg.com.mx
2. Chrome muestra banner "Agregar SGPME a la pantalla de inicio"
3. Instala la app

## 🎨 Personalización

### Cambiar colores del toast

Edita `/src/components/UpdateNotification.tsx`:

```tsx
<div className="bg-blue-500 rounded-full">  {/* Color del icono */}
<button className="bg-blue-500 hover:bg-blue-600">  {/* Botón actualizar */}
```

### Cambiar frecuencia de verificación

Edita `/src/components/VersionChecker.tsx`:

```tsx
const interval = setInterval(handleCheckVersion, 5 * 60 * 1000); // 5 minutos
```

### Iconos de la PWA

Reemplaza los archivos SVG en `/public/`:

- `icon-192x192.svg`
- `icon-384x384.svg`
- `icon-512x512.svg`

## 🐛 Troubleshooting

### "No veo el toast después de actualizar"

- Borra localStorage: DevTools → Application → Local Storage → Clear All
- Hard refresh: Cmd+Shift+R (Mac) o Ctrl+Shift+F5 (Windows)

### "Service Worker no se actualiza"

- DevTools → Application → Service Workers → "Unregister"
- Recargar la página

### "La app no se puede instalar"

- Verifica que estés en HTTPS (o localhost)
- Verifica que `manifest.json` sea válido
- Revisa console para errores

## 📊 Métricas de Actualización

Para ver cuántos usuarios actualizan, podrías agregar analytics:

```typescript
export function acceptUpdate() {
  // Track actualización
  if (window.gtag) {
    window.gtag("event", "app_update", {
      old_version: oldVersion,
      new_version: APP_VERSION,
    });
  }

  clearAllCache();
  localStorage.setItem(VERSION_KEY, APP_VERSION);
  window.location.reload();
}
```

## 🚦 Estado Actual

- ✅ Sistema de versionamiento configurado
- ✅ Toast de notificación implementado
- ✅ PWA configurada (manifest + service worker)
- ✅ Auto-detección cada 5 minutos
- ✅ Detección al cambiar de tab
- ⏳ Analytics de actualizaciones (opcional)
- ⏳ Modo offline completo (opcional)

---

¿Dudas? Revisa:

- `/src/lib/versionCheck.ts` - Lógica de versionamiento
- `/src/components/VersionChecker.tsx` - Detección automática
- `/src/components/UpdateNotification.tsx` - UI del toast
- `/next.config.ts` - Configuración PWA
