# SISTEMA METRIK — Documentación Maestra

**Última actualización**: Abril 2026  
**Para usar en cualquier chat nuevo de Copilot como contexto de todo el sistema.**

---

## TABLA DE CONTENIDOS

1. [Acceso al Servidor](#1-acceso-al-servidor)
2. [Arquitectura General](#2-arquitectura-general)
3. [Estructura de Directorios](#3-estructura-de-directorios-local-vs-servidor)
4. [Base de Datos](#4-base-de-datos)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Cómo Hacer Deploy](#6-cómo-hacer-deploy)
7. [Gestión de Procesos (PM2)](#7-gestión-de-procesos-pm2)
8. [Problemas Comunes y Soluciones](#8-problemas-comunes-y-soluciones)
9. [Backend — Estructura y Routers](#9-backend--estructura-y-routers)
10. [Frontend — Estructura y Componentes](#10-frontend--estructura-y-componentes)
11. [Flujo de Autenticación](#11-flujo-de-autenticación)
12. [Sistema de Permisos y Marcas](#12-sistema-de-permisos-y-marcas)
13. [Módulo: Presencia Tradicional](#13-módulo-presencia-tradicional)
14. [Nginx y Proxy Reverso](#14-nginx-y-proxy-reverso)
15. [Comandos Rápidos de Referencia](#15-comandos-rápidos-de-referencia)

---

## 1. ACCESO AL SERVIDOR

| Campo                 | Valor          |
| --------------------- | -------------- |
| IP del servidor       | `72.62.161.61` |
| Usuario SSH           | `sgpme`        |
| Alias SSH configurado | `arkastech`    |
| Puerto SSH            | 22 (default)   |

### Conectarse:

```bash
ssh arkastech
# equivalente a: ssh sgpme@72.62.161.61
```

### Si el alias no funciona, revisar `~/.ssh/config`:

```
Host arkastech
  HostName 72.62.161.61
  User sgpme
  IdentityFile ~/.ssh/arkastech
```

---

## 2. ARQUITECTURA GENERAL

```
Internet
    │
    ▼
 Nginx (puerto 80/443)
    │
    ├──► /api/* ──────────► Backend FastAPI (puerto 8080)
    │                         - Python / SQLAlchemy / PostgreSQL
    │
    └──► /* ─────────────► Frontend Next.js (puerto 3030)
                              - Node.js / React / Tailwind CSS
```

- **Nginx** funciona como proxy reverso. El frontend hace llamadas a `/api/` y Nginx las redirige al backend en puerto 8080.
- **No hay CORS real** — el frontend y backend están en el mismo dominio gracias a Nginx.
- **PM2** gestiona todos los procesos (backend, frontend, webhook).
- **GitHub Webhook** (puerto 9001) recibe notificaciones de push y ejecuta `deploy.sh` automáticamente.

---

## 3. ESTRUCTURA DE DIRECTORIOS: LOCAL VS SERVIDOR

⚠️ **IMPORTANTE: La estructura local NO es igual a la del servidor.**

### Local (tu Mac — `/Users/YOSMARCH/Desktop/sgpme/`)

```
sgpme/
├── backend/              → Código del backend FastAPI (se sube al servidor)
├── sgpme_app/            → Código fuente del frontend Next.js (se sube al servidor)
├── HGApp/                → Copia/versión anterior del backend (NO usar en producción)
├── sgpme_env/            → Virtual environment Python LOCAL (no va al servidor)
├── ecosystem.config.js   → Configuración de PM2 (se copia al servidor en /home/sgpme/app/)
├── deploy.sh             → Script de deploy (se copia al servidor en /home/sgpme/app/)
├── webhook-server.js     → Servidor de webhook (se copia al servidor)
└── SISTEMA.md            → Este documento
```

### Servidor (`/home/sgpme/app/`)

```
/home/sgpme/app/
├── backend/              → Backend FastAPI en producción (PM2 id=42, puerto 8080)
├── sgpme_app/            → Código fuente frontend (copia del repo, compilado en frontend/)
├── frontend/             → Build compilado de Next.js (PM2 sirve desde aquí, puerto 3030)
├── frontend-staging/     → Directorio temporal para build nuevo (deploy zero-downtime)
├── ecosystem.config.js   → Config PM2
├── deploy.sh             → Script de deploy automático
├── webhook-server.js     → Webhook que escucha GitHub (PM2 id=2)
├── logs/                 → Logs de todos los procesos
│   ├── backend-error.log
│   ├── backend-out.log
│   ├── frontend-error.log
│   ├── frontend-out.log
│   └── deploy.log
└── venv/                 → Virtual environment Python del servidor
```

### Por qué existe `frontend/` separado de `sgpme_app/`:

- `sgpme_app/` = código fuente TypeScript (el repo)
- `frontend/` = resultado del `npm run build` (archivos `.next/` compilados)
- PM2 ejecuta `next start -p 3030` desde `frontend/`, NO desde `sgpme_app/`
- El script `deploy.sh` construye en `frontend-staging/` y luego hace swap atómico a `frontend/`

---

## 4. BASE DE DATOS

| Campo             | Valor                                          |
| ----------------- | ---------------------------------------------- |
| Motor             | PostgreSQL                                     |
| Nombre de la base | `sgpme` (NO es `sgpme_db`)                     |
| Usuario           | `sgpme`                                        |
| Host              | `localhost` (el backend se conecta localmente) |
| Puerto            | 5432                                           |

### Conectarse a la DB desde el servidor:

```bash
ssh arkastech
psql -U sgpme -d sgpme
```

### Comandos útiles en psql:

```sql
\dt                         -- listar todas las tablas
\d nombre_tabla             -- ver estructura de una tabla
SELECT * FROM users LIMIT 5;
\q                          -- salir
```

### Hacer backup manual:

```bash
ssh arkastech
cd /home/sgpme/app/backend
python backup_postgres.py
# Los backups quedan en /home/sgpme/app/backend/backups/
```

### Migraciones:

Los scripts de migración están en `/home/sgpme/app/backend/migrations/`. Si se agrega una columna nueva, hay que correr el script en el servidor:

```bash
ssh arkastech
cd /home/sgpme/app/backend
source ../venv/bin/activate
python migrations/nombre_del_script.py
```

---

## 5. VARIABLES DE ENTORNO

### En el servidor — Frontend (`.env.production`)

Ubicación: `/home/sgpme/app/frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_USE_BACKEND=true
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDbJPgp3D8pNd_cKUIZAbBnnPfGBa39G6Q
```

**¿Por qué `/api` y no la IP?** Porque Nginx redirige `/api/*` al backend. Así el browser nunca llama directamente al puerto 8080.

### En el servidor — Backend

El backend lee de variables de entorno o directamente del archivo `database.py`.  
La cadena de conexión PostgreSQL está en `backend/database.py`:

```python
DATABASE_URL = "postgresql://sgpme:PASSWORD@localhost/sgpme"
```

### Local (desarrollo)

Archivo: `sgpme_app/.env.local` (NO se sube a git, está en .gitignore)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_BACKEND=true
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDbJPgp3D8pNd_cKUIZAbBnnPfGBa39G6Q
```

---

## 6. CÓMO HACER DEPLOY

### Deploy normal (automático via webhook)

1. Hacer cambios en tu Mac
2. Commitear y hacer push:

```bash
cd /Users/YOSMARCH/Desktop/sgpme

git add -A
git commit -m "descripcion del cambio"
git push origin main
```

3. El webhook del servidor recibe el push y ejecuta `deploy.sh` automáticamente.
4. El build tarda entre **5 y 15 minutos**.
5. Verificar con hard refresh en el navegador: `Cmd+Shift+R`

---

### Deploy manual (si el webhook falla o quieres forzar)

```bash
ssh arkastech
cd /home/sgpme/app
bash deploy.sh
```

Ver logs en tiempo real:

```bash
tail -f /home/sgpme/app/logs/deploy.log
```

---

### Deploy manual forzado del frontend (más rápido, sin webhook)

Si ya hiciste push y solo quieres reconstruir el frontend:

```bash
ssh arkastech "cd /home/sgpme/app/frontend && npm run build 2>&1 | tail -5 && pm2 restart metrik-frontend --update-env"
```

⚠️ **El build se hace en `frontend/` directamente** — no es zero-downtime, pero es más rápido para emergencias.

---

### Orden del deploy al servidor:

El `deploy.sh` respeta este orden automáticamente:

1. **Git pull** — descarga código nuevo
2. **Backend** (si cambiaron archivos en `backend/`):
   - Instala dependencias nuevas (`pip install -r requirements.txt`)
   - Reinicia PM2: `pm2 restart metrik-backend --update-env`
3. **Frontend** (si cambiaron archivos en `sgpme_app/`):
   - Copia archivos fuente de `sgpme_app/` a `frontend-staging/`
   - Ejecuta `npm install` y `npm run build` en staging
   - Swap atómico: `frontend-staging/.next/` → `frontend/.next/`
   - Reload PM2: `pm2 reload metrik-frontend --update-env`

**El backend siempre se reinicia antes que el frontend**, porque el frontend puede depender de endpoints nuevos del backend.

---

### Cómo saber si el deploy terminó:

```bash
ssh arkastech "pm2 list"
```

Buscar que `metrik-frontend` y `metrik-backend` digan `online` y tengan uptime reciente (segundos/minutos).

---

## 7. GESTIÓN DE PROCESOS (PM2)

### Lista de todos los procesos:

```bash
ssh arkastech "pm2 list"
```

### Procesos de Metrik (los que nos importan):

| ID  | Nombre          | Puerto | Qué es             |
| --- | --------------- | ------ | ------------------ |
| 42  | metrik-backend  | 8080   | FastAPI (Python)   |
| 4   | metrik-frontend | 3030   | Next.js            |
| 2   | metrik-webhook  | 9001   | Listener de GitHub |

### Comandos útiles de PM2:

```bash
# Ver logs en tiempo real
pm2 logs metrik-backend --lines 50
pm2 logs metrik-frontend --lines 50

# Reiniciar un proceso
pm2 restart metrik-backend --update-env
pm2 restart metrik-frontend --update-env

# Reload sin downtime (frontend)
pm2 reload metrik-frontend --update-env

# Ver memoria y CPU en tiempo real
pm2 monit

# Estado detallado de un proceso
pm2 show metrik-backend
```

---

## 8. PROBLEMAS COMUNES Y SOLUCIONES

---

### ❗ BACKEND SE REINICIA CADA POCOS SEGUNDOS

**Síntoma:** En `pm2 list`, el contador de reinicios (`↺`) de `metrik-backend` va subiendo cada vez que lo checas. Los logs del backend muestran que arranca y se cae.

**Causas posibles y solución para cada una:**

#### Causa 1: Modo de mantenimiento activado

```bash
ssh arkastech "cat /home/sgpme/app/backend/maintenance.flag 2>/dev/null || echo 'No hay flag'"
```

Si el archivo existe, borrarlo:

```bash
ssh arkastech "rm -f /home/sgpme/app/backend/maintenance.flag"
ssh arkastech "pm2 restart metrik-backend --update-env"
```

#### Causa 2: Límite de memoria de PM2

El `ecosystem.config.js` tiene `max_memory_restart: "1G"`. Si el backend consume más de 1GB, PM2 lo mata y reinicia.  
Verificar memoria:

```bash
ssh arkastech "pm2 list"
# Ver columna mem de metrik-backend
```

Si está cerca de 1GB, reiniciar manualmente:

```bash
ssh arkastech "pm2 restart metrik-backend --update-env"
```

#### Causa 3: Error en el código Python (crash inmediato)

Ver los últimos errores:

```bash
ssh arkastech "tail -50 /home/sgpme/app/logs/backend-error.log"
```

Si hay un error de sintaxis o importación, leer el traceback y corregir el archivo correspondiente.

#### Causa 4: Thread pool sin límite (demasiadas conexiones)

En `backend/main.py`, el executor de threads debe estar limitado:

```python
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=4)  # NO dejar sin límite
```

Si no tiene `max_workers`, el backend puede crear cientos de threads y agotar RAM.

#### Causa 5: Variables de entorno perdidas tras restart

Siempre usar `--update-env` al reiniciar:

```bash
pm2 restart metrik-backend --update-env
# NO usar solo: pm2 restart metrik-backend
```

---

### ❗ FRONTEND NO CARGA / ERROR 502

**Síntoma:** El sitio muestra error 502 o pantalla en blanco.

```bash
# Verificar que el proceso esté online
ssh arkastech "pm2 list"

# Ver logs de errores
ssh arkastech "tail -30 /home/sgpme/app/logs/frontend-error.log"

# Reiniciar
ssh arkastech "pm2 restart metrik-frontend --update-env"
```

---

### ❗ CAMBIOS NO APARECEN EN PRODUCCIÓN

1. Verificar que el push llegó a GitHub
2. Verificar que el webhook disparó el deploy:
   ```bash
   ssh arkastech "tail -20 /home/sgpme/app/logs/deploy.log"
   ```
3. Si no se disparó, hacer deploy manual:
   ```bash
   ssh arkastech "cd /home/sgpme/app && bash deploy.sh"
   ```
4. Limpiar cache del navegador: `Cmd+Shift+R` o DevTools → Network → Disable cache → recargar

---

### ❗ PRESENCIAS TRADICIONALES NO CARGAN

**Historia de bugs resueltos (para no repetir):**

- **Bug 1**: El carousel mostraba `p.marca === null` para "todos" → usar `presenciaTradicionalData` filtrado normal.
- **Bug 2**: `presenciaTradicionalData` tenía filtro de fecha que excluía contratos sin fecha de fin → se eliminó el filtro de fecha.
- **Bug 3**: Hook `usePresencias` tenía `filterByMarcas` que filtraba por `p.agencia` usando `marcasPermitidas`. El array `marcasPermitidas` se recreaba en cada render de auth → causaba `AbortController` race conditions infinitas. **Solución definitiva**: el hook almacena datos crudos sin filtrar; el filtro `filtraPorMarca(presencia.marca)` se aplica solo en el componente `DashboardGeneral`.

---

### ❗ ERROR DE BUILD NEXT.JS (`/_global-error prerender`)

Este es un bug intermitente de Next.js. Solución:

```bash
ssh arkastech "cd /home/sgpme/app/frontend && rm -rf .next && npm run build 2>&1 | tail -10 && pm2 restart metrik-frontend --update-env"
```

---

### ❗ GOOGLE MAPS NO APARECE

Verificar que la variable esté en `.env.production` del servidor:

```bash
ssh arkastech "cat /home/sgpme/app/frontend/.env.production"
```

Si falta `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, agregarla:

```bash
ssh arkastech "echo 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDbJPgp3D8pNd_cKUIZAbBnnPfGBa39G6Q' >> /home/sgpme/app/frontend/.env.production"
ssh arkastech "cd /home/sgpme/app/frontend && npm run build 2>&1 | tail -5 && pm2 restart metrik-frontend --update-env"
```

---

## 9. BACKEND — ESTRUCTURA Y ROUTERS

**Tecnología**: Python + FastAPI + SQLAlchemy + PostgreSQL  
**Punto de entrada**: `backend/main.py`  
**Puerto en producción**: 8080  
**Start script**: `backend/start.sh` (activa venv y lanza uvicorn)

### Archivos principales:

| Archivo              | Qué hace                                                      |
| -------------------- | ------------------------------------------------------------- |
| `main.py`            | App FastAPI, CORS, includes de routers, configuración uvicorn |
| `models.py`          | Modelos SQLAlchemy (tablas de la DB)                          |
| `database.py`        | Conexión a PostgreSQL, SessionLocal                           |
| `email_service.py`   | Envío de correos                                              |
| `backup_postgres.py` | Script de backup de la DB                                     |

### Routers (prefijos de URL):

| Router                | Archivo                            | Prefijo                  |
| --------------------- | ---------------------------------- | ------------------------ |
| Autenticación         | `routers/auth.py`                  | `/auth`                  |
| Usuarios admin        | `routers/users.py`                 | `/users`                 |
| Coordinadores         | `routers/coor.py`                  | `/coor`                  |
| Presupuesto mensual   | `routers/presupuesto.py`           | `/presupuesto`           |
| Presupuesto anual     | `routers/presupuesto.py`           | `/api/presupuesto`       |
| Facturas              | `routers/facturas.py`              | `/facturas`              |
| Eventos               | `routers/eventos.py`               | `/eventos`               |
| Proyecciones          | `routers/proyecciones.py`          | `/proyecciones`          |
| Proveedores           | `routers/proveedores.py`           | `/proveedores`           |
| Campañas              | `routers/campanas.py`              | `/campanas`              |
| Métricas              | `routers/metricas.py`              | `/metricas`              |
| Marcas                | `routers/marcas.py`                | `/marcas`                |
| Admin                 | `routers/admin.py`                 | `/admin`                 |
| Presencia Tradicional | `routers/presencia_tradicional.py` | `/presencia-tradicional` |
| Formularios dinámicos | `routers/form_templates.py`        | `/form-templates`        |
| Google Ads            | `routers/google_ads.py`            | `/google-ads`            |
| Meta Ads              | `routers/meta_ads.py`              | `/meta-ads`              |
| Embajadores           | `routers/embajadores.py`           | `/embajadores`           |
| Diagramas             | `routers/diagramas_conversion.py`  | `/diagramas`             |
| Desplazamiento        | `routers/desplazamiento.py`        | `/desplazamiento`        |
| Conciliación BDC      | `routers/conciliacion_bdc.py`      | `/conciliacion-bdc`      |
| Funnel pisos          | `routers/funnel_pisos.py`          | `/funnel-pisos`          |
| Mantenimiento         | `routers/maintenance.py`           | `/maintenance`           |
| Dev Tools             | `routers/dev_tools.py`             | `/dev`                   |
| Categorías            | `routers/categorias.py`            | `/categorias`            |

---

## 10. FRONTEND — ESTRUCTURA Y COMPONENTES

**Tecnología**: Next.js 16.0.3 + React + TypeScript + Tailwind CSS  
**Puerto en producción**: 3030  
**Versión de Node**: 18+

### Directorios principales (`sgpme_app/src/`):

```
src/
├── app/                    → Páginas Next.js (App Router)
│   ├── page.tsx           → Login
│   ├── dashboard/         → Dashboard principal
│   └── ...
├── components/             → Componentes React reutilizables
├── hooks/                  → Custom hooks (lógica de datos)
├── context/                → Context providers globales
└── lib/                    → Utilidades y helpers
```

### Componentes principales:

| Componente                                    | Qué hace                                            |
| --------------------------------------------- | --------------------------------------------------- |
| `DashboardGeneral.tsx`                        | Dashboard principal con todos los módulos           |
| `LayoutDashboard.tsx`                         | Layout con navbar, sidebar y content                |
| `NavBar.tsx`                                  | Barra de navegación superior                        |
| `ConfiguracionFormularios.tsx`                | Editor de plantillas de formularios dinámicos       |
| `ConfiguracionPermisos.tsx`                   | Gestión de permisos por usuario y por marca         |
| `FormularioPresenciaDinamico.tsx`             | Formulario dinámico para crear/editar presencias    |
| `PresenciaDetallesDinamico.tsx`               | Modal de detalle de una presencia (solo vista)      |
| `GraficaPresupuestoVsGasto.tsx`               | Gráfica de presupuesto vs gasto real                |
| `GraficaProyeccionVsGasto.tsx`                | Gráfica de proyección vs gasto                      |
| `ListaFacturas.tsx`                           | Tabla de facturas con filtros                       |
| `ListaProveedores.tsx`                        | Lista de proveedores                                |
| `ImageUpload.tsx` / `ImageUploadMultiple.tsx` | Subida de imágenes                                  |
| `FiltroMarcaGlobal.tsx`                       | Selector de marca global (filtra todo el dashboard) |
| `PopupConfiguracion.tsx`                      | Popup de configuración                              |
| `GestionAccesos.tsx`                          | Admin: gestión de usuarios y accesos                |
| `MaintenanceGuard.tsx`                        | Guard que bloquea el app en modo mantenimiento      |
| `DevToolsPanel.tsx`                           | Panel de herramientas para dev                      |

### Custom Hooks (`hooks/`):

| Hook                                         | Qué hace                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `useAuthUnified.tsx`                         | Autenticación unificada (detecta backend o local)                              |
| `usePresencias.ts`                           | Datos de presencias tradicionales (sin filtro de marca — filtra el componente) |
| `useFacturas.ts` / `useFacturasAPI.ts`       | Datos de facturas                                                              |
| `useEventos.ts`                              | Datos de eventos                                                               |
| `useProveedores.ts` / `useProveedoresAPI.ts` | Datos de proveedores                                                           |
| `useCampanas.ts`                             | Datos de campañas publicitarias                                                |
| `useMetricas.ts`                             | Métricas de Google Ads / Meta Ads                                              |
| `useProyecciones.ts`                         | Proyecciones de gasto                                                          |
| `useCategorias.ts` / `useCategoriasAPI.ts`   | Categorías de facturas                                                         |
| `useAutoSave.tsx`                            | Autoguardado de formularios                                                    |
| `useToast.tsx`                               | Notificaciones toast                                                           |
| `useServiceWorker.ts`                        | Gestión del Service Worker (PWA)                                               |

---

## 11. FLUJO DE AUTENTICACIÓN

- El login devuelve un **JWT token** con expiración de **8 horas**.
- El token se guarda en `localStorage` bajo la clave `auth_token`.
- Cada request al backend incluye el header: `Authorization: Bearer <token>`.
- Al expirar, el usuario es redirigido al login automáticamente.
- El hook `useAuthUnified` detecta si usar backend real o datos locales (según `NEXT_PUBLIC_USE_BACKEND`).

### Endpoint de login:

```
POST /auth/login
Body: { "username": "...", "password": "..." }
Response: { "access_token": "...", "token_type": "bearer", "role": "admin|coordinador" }
```

### Roles:

- **admin** → acceso total, puede ver y editar todo
- **coordinador** → acceso restringido según permisos asignados

---

## 12. SISTEMA DE PERMISOS Y MARCAS

### Marcas (Agencias):

El sistema maneja múltiples agencias/marcas de automóviles. Cada usuario puede tener acceso a un subconjunto de marcas.

La marca global seleccionada se gestiona con el context `useMarcaGlobal()`.  
El componente `FiltroMarcaGlobal` permite cambiar la marca activa.

### Permisos por sección:

Los permisos se configuran en `ConfiguracionPermisos.tsx` y controlan:

- Qué secciones del dashboard puede ver el coordinador (Dashboard, Estrategia, Facturas, Eventos, Digital)
- Qué marcas puede ver el coordinador

Los permisos se guardan en la tabla `users` de PostgreSQL en un campo JSON.

---

## 13. MÓDULO: PRESENCIA TRADICIONAL

Este es el módulo más complejo del sistema.

### Qué es:

Registro de presencias físicas de las agencias (stands, eventos, exhibiciones, etc.).  
Cada presencia tiene: nombre, marca/agencia, tipo (subcategoría), imágenes, campos dinámicos según plantilla.

### Datos en BD:

- Tabla: `presencia_tradicional`
- Campos importantes: `id`, `nombre`, `marca`, `agencia`, `tipo`, `datos_json`, `imagenes_json`
- `agencia` y `marca` contienen el mismo valor (nombre de la agencia, ej: "Toyota Chihuahua")
- `datos_json` almacena todos los campos dinámicos del formulario
- `imagenes_json` es el fallback de imágenes cuando no hay campos de imagen en `datos_json`

### Formularios dinámicos:

Las presencias usan plantillas configurables. La plantilla define qué campos tiene el formulario.  
Las plantillas se guardan en la tabla `form_templates` y se editan desde `ConfiguracionFormularios.tsx`.

La plantilla tiene esta estructura:

```typescript
{
  subcategoria: string;        // tipo de presencia (ej: "stand", "evento")
  secciones: SeccionConfig[];  // secciones del formulario
  previewFieldId?: string;     // ID del campo de imagen que se muestra como thumbnail
}
```

### Lógica en el frontend:

- **Hook**: `usePresencias.ts` → carga todas las presencias SIN filtrar (datos crudos)
- **Componente**: `DashboardGeneral.tsx` → aplica `filtraPorMarca(presencia.marca)` para mostrar solo las de la marca activa
- **Carousel**: Agrupa presencias por tipo y las muestra en cartas con botones Editar / Ver / Eliminar
- **Imagen thumbnail**: Usa `templatesCache[presencia.tipo].previewFieldId` para saber qué campo de imagen mostrar primero

### Endpoints backend:

```
GET    /presencia-tradicional/           → lista todas las presencias
POST   /presencia-tradicional/           → crear presencia
GET    /presencia-tradicional/{id}       → detalle de una presencia
PUT    /presencia-tradicional/{id}       → editar presencia
DELETE /presencia-tradicional/{id}       → eliminar presencia
GET    /form-templates/{subcategoria}    → plantilla del formulario por tipo
POST   /form-templates/{subcategoria}    → guardar/actualizar plantilla
```

---

## 14. NGINX Y PROXY REVERSO

### Configuración en el servidor:

```bash
# Ver config nginx
ssh arkastech "cat /etc/nginx/sites-available/metrik"

# Recargar nginx (si se modifica la config)
ssh arkastech "nginx -t && systemctl reload nginx"
```

### Cómo funciona el proxy de `/api`:

```nginx
location /api/ {
    proxy_pass http://localhost:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    proxy_pass http://localhost:3030;
    proxy_set_header Host $host;
}
```

Entonces cuando el frontend llama a `/api/facturas`, Nginx lo convierte en `http://localhost:8080/facturas`.

---

## 15. COMANDOS RÁPIDOS DE REFERENCIA

### Ver estado del sistema:

```bash
ssh arkastech "pm2 list"
ssh arkastech "pm2 logs metrik-backend --lines 30 --nostream"
ssh arkastech "pm2 logs metrik-frontend --lines 30 --nostream"
```

### Deploy completo forzado (emergencia):

```bash
ssh arkastech "cd /home/sgpme/app && bash deploy.sh"
```

### Solo rebuild frontend:

```bash
ssh arkastech "cd /home/sgpme/app/frontend && npm run build 2>&1 | tail -5 && pm2 restart metrik-frontend --update-env"
```

### Solo reiniciar backend:

```bash
ssh arkastech "pm2 restart metrik-backend --update-env"
```

### Ver logs de deploy:

```bash
ssh arkastech "tail -50 /home/sgpme/app/logs/deploy.log"
```

### Ver .env.production del servidor:

```bash
ssh arkastech "cat /home/sgpme/app/frontend/.env.production"
```

### Editar .env.production del servidor:

```bash
ssh arkastech "nano /home/sgpme/app/frontend/.env.production"
# Después de editar, reconstruir:
ssh arkastech "cd /home/sgpme/app/frontend && npm run build 2>&1 | tail -5 && pm2 restart metrik-frontend --update-env"
```

### Ver últimas líneas del error log del backend:

```bash
ssh arkastech "tail -30 /home/sgpme/app/logs/backend-error.log"
```

### Conectarse y quedar en la sesión:

```bash
ssh arkastech
# Una vez dentro:
cd /home/sgpme/app
pm2 list
pm2 monit    # monitor en tiempo real
```

### Git en local (flujo normal):

```bash
cd /Users/YOSMARCH/Desktop/sgpme
git add -A
git commit -m "descripcion"
git push origin main
# → webhook dispara deploy automático en el servidor
```

### Ver qué commit está en producción:

```bash
ssh arkastech "cd /home/sgpme/app && git log --oneline -5"
```

### Ver qué commit tienes local:

```bash
cd /Users/YOSMARCH/Desktop/sgpme && git log --oneline -5
```

---

## NOTAS FINALES

- **Nunca editar archivos directamente en el servidor** (se sobreescriben en el próximo deploy). Siempre editar local y hacer push.
- **La carpeta `HGApp/`** en local es una copia/versión anterior del backend. No se usa en producción. El backend en producción es `backend/`.
- **El `sgpme_env/`** en local es el virtual environment de Python para desarrollo local únicamente.
- **`NEXT_PUBLIC_*` variables** solo se incluyen en el build si están en `.env.production` AL MOMENTO del build. Si se agregan después, hay que reconstruir.
- **Cache del navegador**: Los usuarios pueden ver versiones viejas del frontend. Solución: `Cmd+Shift+R` (hard refresh) o DevTools → Network → "Disable cache".
- **El repo es**: `github.com-metrik:Arkas-Tech/Metrik-GrupoHG.git`, rama `main`.
