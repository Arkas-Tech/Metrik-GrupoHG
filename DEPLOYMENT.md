# Guía de Deploy — Metrik

**Servidor**: 72.62.161.61  
**Usuario SSH**: sgpme  
**Directorio app**: `/home/sgpme/app/`

---

## Cómo funciona el deploy automático

El servidor tiene un webhook escuchando en el puerto 9001. Cuando se hace `git push origin main`, GitHub envía una notificación al servidor y este ejecuta automáticamente el script `deploy.sh`.

El script hace lo siguiente:

1. `git pull origin main` — descarga el código nuevo
2. Detecta si cambiaron archivos del frontend (`sgpme_app/`)
3. Construye el frontend en un directorio staging (sin interrumpir el sitio en producción)
4. Hace un swap atómico del build nuevo al directorio live
5. Recarga PM2 con rolling restart (zero downtime)

### Para hacer un deploy

```bash
# 1. Agregar los archivos modificados
git add <archivos>

# 2. Hacer commit
git commit -m "descripcion del cambio"

# 3. Push — esto dispara el deploy automáticamente
git push origin main
```

El servidor tarda entre 3 y 15 minutos en completar el build.  
Verificar en el navegador con hard refresh (`Cmd+Shift+R`).

---

## Deploy manual (si el webhook falla)

Si el deploy automático no se disparó o falló, conectarse por SSH y correr el script directamente:

```bash
ssh sgpme@72.62.161.61

cd /home/sgpme/app
bash deploy.sh
```

Ver los logs en tiempo real:

```bash
tail -f /home/sgpme/app/logs/deploy.log
```

---

## Verificar estado del servidor

```bash
ssh sgpme@72.62.161.61

# Ver procesos activos
pm2 list

# Ver logs del frontend (Next.js)
pm2 logs metrik-frontend --lines 50

# Ver logs del backend (FastAPI)
pm2 logs metrik-backend --lines 50
```

Los servicios que deben estar corriendo:

- `metrik-frontend` — Next.js en puerto 3030
- `metrik-backend` — FastAPI en puerto 8000

---

## Si algo falla después del deploy

**El frontend no actualiza / sitio con error**

```bash
ssh sgpme@72.62.161.61
cd /home/sgpme/app
bash deploy.sh
```

**PM2 caído o proceso muerto**

```bash
ssh sgpme@72.62.161.61
pm2 restart all
```

**Ver qué pasó en el último deploy**

```bash
ssh sgpme@72.62.161.61
tail -100 /home/sgpme/app/logs/deploy.log
```

---

## Infraestructura resumida

```
Usuario -> nginx (puerto 80)
            +-- /api/* y /auth/*  ->  Backend FastAPI   (puerto 8000)
            +-- /*                ->  Frontend Next.js  (puerto 3030)

PM2 administra ambos procesos con autorestart.
PostgreSQL en localhost:5432, base de datos: sgpme.
```

**Variables de entorno del frontend** en el servidor  
Archivo: `/home/sgpme/app/frontend/.env.production`

```
NEXT_PUBLIC_API_URL=http://72.62.161.61
NEXT_PUBLIC_USE_BACKEND=true
```
