# Documentación Completa: Infraestructura y Deploy del Sistema SGPME

**Fecha de actualización**: 13 de Enero, 2026  
**Versión**: 1.0  
**Autor**: Documentación del Sistema SGPME

---

## Tabla de Contenidos

1. [Arquitectura del Servidor](#1-arquitectura-del-servidor)
2. [Servicios y Puertos](#2-servicios-y-puertos)
3. [Variables de Entorno Críticas](#3-variables-de-entorno-críticas)
4. [Diferencias Local vs Producción](#4-diferencias-local-vs-producción)
5. [Proceso de Deploy Completo](#5-proceso-de-deploy-completo)
6. [Problemas Comunes y Soluciones](#6-problemas-comunes-y-soluciones)
7. [Gestión de Base de Datos](#7-gestión-de-base-de-datos)
8. [Flujo de Desarrollo Completo](#8-flujo-de-desarrollo-completo)
9. [Comandos Útiles](#9-comandos-útiles)
10. [Checklist de Deploy](#10-checklist-de-deploy)
11. [Contactos y Credenciales](#11-contactos-y-credenciales)
12. [Notas Finales](#12-notas-finales)

---

## 1. ARQUITECTURA DEL SERVIDOR

### 1.1 Información del Servidor

- **IP**: 72.62.161.61
- **Sistema Operativo**: Linux (Ubuntu/Debian)
- **Acceso**: SSH con usuario `root`
- **Directorio Principal**: `/home/sgpme/app/`

### 1.2 Estructura de Directorios en Producción

```
/home/sgpme/app/
├── backend/                    # API FastAPI
│   ├── main.py                # Punto de entrada
│   ├── database.py            # Configuración de DB
│   ├── models.py              # Modelos SQLAlchemy
│   ├── requirements.txt       # Dependencias Python
│   ├── venv/                  # Virtual environment Python
│   ├── routers/               # Endpoints organizados
│   │   ├── auth.py           # Autenticación (prefix='/auth')
│   │   ├── presupuesto.py    # Presupuestos (prefix='/api/presupuesto')
│   │   ├── facturas.py       # Facturas
│   │   ├── eventos.py        # Eventos
│   │   ├── proyecciones.py   # Proyecciones
│   │   ├── proveedores.py    # Proveedores
│   │   ├── campanas.py       # Campañas
│   │   ├── metricas.py       # Métricas
│   │   ├── marcas.py         # Marcas
│   │   ├── admin.py          # Admin
│   │   └── presencia_tradicional.py
│   ├── migrations/            # Scripts SQL de migración
│   └── backups/              # Backups de base de datos
│       ├── diarios/
│       ├── semanales/
│       └── mensuales/
│
└── frontend/                  # Aplicación Next.js
    ├── package.json
    ├── next.config.ts
    ├── .env.production       # Variables de entorno CRÍTICAS
    ├── .next/                # Build compilado (generado)
    ├── src/
    │   ├── app/              # Rutas Next.js
    │   ├── components/       # Componentes React
    │   ├── hooks/            # Custom hooks
    │   ├── lib/              # Utilidades
    │   └── types/            # TypeScript types
    └── public/               # Archivos estáticos
```

---

## 2. SERVICIOS Y PUERTOS

### 2.1 Backend (FastAPI + Uvicorn)

- **Puerto**: 8000 (interno)
- **Proceso**: `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Comando de inicio**:
  ```bash
  cd /home/sgpme/app/backend
  source venv/bin/activate
  nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
  ```
- **Logs**: `/tmp/backend.log` o `/tmp/backend_new.log`
- **Virtual Environment**: `/home/sgpme/app/backend/venv/`

### 2.2 Frontend (Next.js)

- **Puerto**: 3000 (interno)
- **Proceso**: `next-server`
- **Comando de inicio**:
  ```bash
  cd /home/sgpme/app/frontend
  npm run start  # Usa el build de .next/
  ```
- **Build**:
  ```bash
  NEXT_PUBLIC_API_URL=http://72.62.161.61 NEXT_PUBLIC_USE_BACKEND=true npm run build
  ```
- **Logs**: `/tmp/frontend.log`, `/tmp/frontend_v2.log`, etc.

### 2.3 Nginx (Reverse Proxy)

- **Puerto**: 80 (público)
- **Configuración**: `/etc/nginx/sites-enabled/sgpme`
- **Función**: Proxy inverso que enruta peticiones

**Configuración Nginx**:

```nginx
server {
    listen 80;
    server_name 72.62.161.61;

    # Proxy para API backend
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para autenticación (sin /api/)
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2.4 PostgreSQL

- **Puerto**: 5432 (interno)
- **Base de datos**: `sgpme`
- **Usuario**: `sgpme_user`
- **Contraseña**: `SgPme2025!Secure#Pass`
- **Host**: `localhost` (o 72.62.161.61 si te conectas remotamente)
- **Conexión**: `postgresql://sgpme:ay123@localhost:5432/sgpme`

---

## 3. VARIABLES DE ENTORNO CRÍTICAS

### 3.1 Frontend (.env.production)

**Archivo**: `/home/sgpme/app/frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=http://72.62.161.61
NEXT_PUBLIC_USE_BACKEND=true
```

**⚠️ IMPORTANTE**:

- NO incluir puerto :8000 en `NEXT_PUBLIC_API_URL`
- Nginx maneja el routing en puerto 80
- Las variables DEBEN estar antes del build

### 3.2 Backend (.env)

**Archivo**: `/home/sgpme/app/backend/.env`

---

## 4. DIFERENCIAS LOCAL vs PRODUCCIÓN

### 4.1 Configuración de URLs

| Aspecto           | Local                     | Producción                                                               |
| ----------------- | ------------------------- | ------------------------------------------------------------------------ |
| Backend URL       | `http://localhost:8000`   | `http://72.62.161.61:8000` (directo) o `http://72.62.161.61` (via nginx) |
| Frontend URL      | `http://localhost:3001`   | `http://72.62.161.61`                                                    |
| API_URL en código | `"http://localhost:8000"` | `""` (string vacío) o `http://72.62.161.61`                              |
| Rutas de API      | Directas al puerto 8000   | A través de nginx (puerto 80)                                            |

### 4.2 Código que Difiere

**❌ NUNCA usar en código fuente**:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

**✅ CORRECTO**:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
```

**Explicación**:

- En producción, "localhost" se resuelve al servidor mismo
- Con nginx, las URLs deben ser relativas o absolutas sin puerto
- El fallback `""` genera URLs relativas que nginx maneja correctamente

### 4.3 Archivos Afectados por API_URL

Estos archivos tienen `const API_URL = process.env.NEXT_PUBLIC_API_URL || ""`:

```
src/lib/auth-utils.ts
src/lib/api.ts
src/hooks/useAuth.tsx
src/hooks/useCampanas.ts
src/hooks/useEventos.ts
src/hooks/useFacturas.ts
src/hooks/useFacturasAPI.ts
src/hooks/useMetricas.ts
src/hooks/usePresencias.ts
src/hooks/useProveedoresAPI.ts
src/hooks/useProyecciones.ts
src/components/PresupuestoAnual.tsx
src/components/FormularioEvento.tsx
src/components/FormularioFactura.tsx
src/components/GestionAccesos.tsx
src/components/GestionPerfilCoordinador.tsx
src/components/CambiarContrasenaCoordinador.tsx
src/components/RecuperarContrasena.tsx
src/components/GraficaProyeccionVsGasto.tsx
```

### 4.4 CORS Configuration

**Backend (main.py)**:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # Local development
        "http://127.0.0.1:3001",
        "http://72.62.161.61:3000",   # Producción directo
        "http://72.62.161.61"         # Producción via nginx
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 5. PROCESO DE DEPLOY COMPLETO

### 5.1 Pre-Deploy Checklist

1. **Verificar cambios locales**:

   ```bash
   cd /Users/YOSMARCH/Desktop/sgpme
   git status  # Ver qué cambió
   ```

2. **Probar localmente**:

   - Backend en puerto 8000
   - Frontend en puerto 3001
   - Verificar que todo funciona

3. **Revisar API_URL en código**:
   ```bash
   grep -r "localhost:8000" sgpme_app/src/
   # NO debe aparecer nada (excepto comentarios)
   ```

### 5.2 Deploy del Backend

#### Paso 1: Subir archivos

```bash
# Desde tu máquina local
cd /Users/YOSMARCH/Desktop/sgpme

# Subir archivos específicos
scp HGApp/main.py root@72.62.161.61:/home/sgpme/app/backend/
scp HGApp/models.py root@72.62.161.61:/home/sgpme/app/backend/
scp HGApp/database.py root@72.62.161.61:/home/sgpme/app/backend/

# Subir directorio completo de routers
scp -r HGApp/routers/ root@72.62.161.61:/home/sgpme/app/backend/
```

#### Paso 2: Instalar dependencias (si hay nuevas)

```bash
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Paso 3: Migración de base de datos

```bash
# Si hay cambios en modelos, crear migración
ssh root@72.62.161.61
cd /home/sgpme/app/backend

# Crear script de migración
cat > migrations/crear_nueva_tabla.py << 'EOF'
from database import engine
from sqlalchemy import text

sql = text("""
CREATE TABLE nueva_tabla (
    id SERIAL PRIMARY KEY,
    campo VARCHAR(255)
);
""")

with engine.connect() as conn:
    conn.execute(sql)
    conn.commit()
    print("✅ Migración exitosa")
EOF

# Ejecutar migración
source venv/bin/activate
python3 migrations/crear_nueva_tabla.py
```

#### Paso 4: Reiniciar backend

```bash
# Matar proceso actual
pkill -9 uvicorn

# Iniciar nuevo proceso
cd /home/sgpme/app/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &

# Verificar que está corriendo
ps aux | grep uvicorn | grep -v grep
```

#### Paso 5: Verificar logs

```bash
tail -f /tmp/backend.log
# Debe mostrar:
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### 5.3 Deploy del Frontend

#### Paso 1: Subir código fuente

```bash
# Método 1: Subir directorio src completo
cd /Users/YOSMARCH/Desktop/sgpme/sgpme_app
tar czf /tmp/src.tar.gz src/
scp /tmp/src.tar.gz root@72.62.161.61:/tmp/

ssh root@72.62.161.61
cd /home/sgpme/app/frontend
rm -rf src
tar xzf /tmp/src.tar.gz

# Método 2: Subir archivos individuales
scp src/components/PresupuestoAnual.tsx root@72.62.161.61:/home/sgpme/app/frontend/src/components/
scp src/app/proyecciones/page.tsx root@72.62.161.61:/home/sgpme/app/frontend/src/app/proyecciones/
```

#### Paso 2: Verificar .env.production

```bash
ssh root@72.62.161.61
cat /home/sgpme/app/frontend/.env.production

# Debe contener:
# NEXT_PUBLIC_API_URL=http://72.62.161.61
# NEXT_PUBLIC_USE_BACKEND=true
```

#### Paso 3: Build con variables de entorno

```bash
ssh root@72.62.161.61
cd /home/sgpme/app/frontend

# Matar proceso frontend
pkill -9 node

# Limpiar cache
rm -rf .next

# Build con variables explícitas
NEXT_PUBLIC_API_URL=http://72.62.161.61 NEXT_PUBLIC_USE_BACKEND=true npm run build

# Verificar build exitoso
# Debe mostrar: ✓ Generating static pages...
```

#### Paso 4: Reiniciar frontend

```bash
# Iniciar nuevo proceso
nohup npm run start > /tmp/frontend.log 2>&1 &

# Esperar unos segundos
sleep 5

# Verificar proceso
ps aux | grep next-server | grep -v grep

# Verificar que responde
curl -I http://localhost:3000
# Debe retornar: HTTP/1.1 200 OK
```

#### Paso 5: Limpiar procesos zombies (si es necesario)

```bash
# Ver todos los procesos node
ps aux | grep node

# Matar procesos específicos por PID
kill -9 <PID>

# O matar todos
pkill -9 node
```

### 5.4 Verificar Deploy

#### Backend

```bash
# Probar endpoint
curl http://localhost:8000/api/health
curl http://72.62.161.61/api/health

# Ver logs en tiempo real
tail -f /tmp/backend.log
```

#### Frontend

```bash
# Verificar que sirve páginas
curl -I http://localhost:3000
curl -I http://72.62.161.61

# Verificar build
ls -lh /home/sgpme/app/frontend/.next/

# Ver logs
tail -f /tmp/frontend.log
```

#### Navegador

1. Abrir: `http://72.62.161.61`
2. Hacer hard refresh: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
3. Abrir DevTools (F12) → Console
4. Verificar que NO hay errores CORS
5. Verificar URLs:
   - ✅ `GET http://72.62.161.61/api/presupuesto/2026`
   - ❌ `GET http://72.62.161.61:8000/api/presupuesto/2026`

---

## 6. PROBLEMAS COMUNES Y SOLUCIONES

### 6.1 Error: CORS Policy

**Síntoma**:

```
Access to fetch at 'http://72.62.161.61:8000/api/...' from origin 'http://72.62.161.61'
has been blocked by CORS policy
```

**Causas**:

1. Frontend usa URL con puerto :8000 directamente
2. Backend no tiene la origin en allow_origins

**Solución**:

```bash
# 1. Verificar .env.production
cat /home/sgpme/app/frontend/.env.production
# Debe ser: NEXT_PUBLIC_API_URL=http://72.62.161.61 (SIN :8000)

# 2. Verificar código fuente NO tiene localhost:8000
ssh root@72.62.161.61
grep -r "localhost:8000" /home/sgpme/app/frontend/src/

# 3. Rebuild si es necesario
cd /home/sgpme/app/frontend
pkill -9 node
rm -rf .next
NEXT_PUBLIC_API_URL=http://72.62.161.61 npm run build
npm run start
```

### 6.2 Error: 500 Internal Server Error

**Síntoma**:

```
POST http://72.62.161.61/api/presupuesto/ 500 (Internal Server Error)
Error guardando presupuesto: SyntaxError: Unexpected token 'I', "Internal S"...
```

**Causas**:

1. Error en el backend (revisar logs)
2. Modelo no coincide con base de datos
3. Migración no ejecutada

**Solución**:

```bash
# 1. Ver logs del backend
tail -50 /tmp/backend.log | grep -E "ERROR|Exception|Traceback" -A 10

# 2. Verificar base de datos
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate
python3 << EOF
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM presupuesto_anual LIMIT 1"))
    print(result.keys())
EOF

# 3. Si el error es de columna no existe, ejecutar migración
# Ver sección 5.2 Paso 3
```

### 6.3 Error: Column does not exist

**Síntoma**:

```
column presupuesto_anual.anio does not exist
HINT: Perhaps you meant to reference the column "presupuesto_anual.año"
```

**Causa**: Nombre de columna en DB usa "año" pero modelo usa `anio`

**Solución**:

```bash
# Renombrar columna en DB
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate

cat > fix_column.py << 'EOF'
from database import engine
from sqlalchemy import text

sql = text('ALTER TABLE presupuesto_anual RENAME COLUMN "año" TO anio;')

with engine.connect() as conn:
    conn.execute(sql)
    conn.commit()
    print("✅ Columna renombrada")
EOF

python3 fix_column.py
```

### 6.4 Error: EADDRINUSE address already in use

**Síntoma**:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa**: Proceso zombie de Next.js ocupando puerto 3000

**Solución**:

```bash
# Ver qué proceso usa el puerto
ssh root@72.62.161.61
netstat -tulpn | grep :3000
# Muestra: tcp 0 0 :::3000 LISTEN 12345/next-server

# Matar proceso específico
kill -9 12345

# O matar todos los node
pkill -9 node

# Reiniciar
cd /home/sgpme/app/frontend
nohup npm run start > /tmp/frontend.log 2>&1 &
```

### 6.5 Error: Not authenticated

**Síntoma**:

```json
{ "detail": "Not authenticated" }
```

**Causa**: Token no se está enviando o es inválido

**Solución**:

```bash
# Verificar que auth-utils usa la ruta correcta
ssh root@72.62.161.61
grep "auth/token" /home/sgpme/app/frontend/src/lib/auth-utils.ts

# Debe ser: ${API_URL}/auth/token
# NO: ${API_URL}/api/auth/token

# Si está mal, corregir y rebuild
```

### 6.6 Cache del Navegador

**Síntoma**: Los cambios no se ven después de deploy

**Solución**:

1. **Hard Refresh**: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
2. **Ventana Incógnito**: Probar en modo privado
3. **Limpiar cache**:
   - Chrome: DevTools → Network → Disable cache
   - Firefox: about:preferences#privacy → Clear Data

---

## 7. GESTIÓN DE BASE DE DATOS

### 7.1 Acceso Directo (Producción)

```bash
# Método 1: psql (si está configurado peer auth)
ssh root@72.62.161.61
psql -U sgpme -d sgpme

# Método 2: Con contraseña
PGPASSWORD=ay123 psql -U sgpme -h localhost -d sgpme

# Método 3: Desde Python
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate
python3 << EOF
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM usuarios LIMIT 5"))
    for row in result:
        print(row)
EOF
```

### 7.2 Crear Migración

```bash
# 1. Crear archivo de migración
ssh root@72.62.161.61
cd /home/sgpme/app/backend/migrations

cat > agregar_campo_nueva_columna.py << 'EOF'
from database import engine
from sqlalchemy import text

sql = text("""
ALTER TABLE nombre_tabla
ADD COLUMN nueva_columna VARCHAR(255);
""")

with engine.connect() as conn:
    conn.execute(sql)
    conn.commit()
    print("✅ Migración exitosa: nueva_columna agregada")
EOF

# 2. Ejecutar migración
source ../venv/bin/activate
python3 agregar_campo_nueva_columna.py

# 3. Verificar
python3 << EOF
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='nombre_tabla'"))
    for row in result:
        print(row[0])
EOF
```

### 7.3 Backup y Restore

```bash
# Backup manual
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate
python3 backup_postgres.py

# Backup ubicación
ls -lh backups/diarios/

# Restore desde backup
python3 restaurar_postgres.py backups/diarios/sgpme_backup_20251229_172142.dump
```

---

## 8. FLUJO DE DESARROLLO COMPLETO

### 8.1 Nueva Feature (Ejemplo: Presupuesto Anual)

#### Paso 1: Desarrollo Local

```bash
# 1. Backend - Crear modelo
# Editar: HGApp/models.py
class PresupuestoAnual(Base):
    __tablename__ = 'presupuesto_anual'
    id = Column(Integer, primary_key=True)
    anio = Column(Integer, unique=True, nullable=False)
    monto = Column(Float, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, onupdate=datetime.utcnow)
    modificado_por = Column(String)

# 2. Backend - Crear router
# Crear: HGApp/routers/presupuesto.py
router = APIRouter(prefix='/api/presupuesto', tags=['presupuesto'])

@router.get('/{anio}')
async def get_presupuesto(anio: int, current_user: user_dependency, db: db_dependency):
    # ...

@router.post('/')
async def crear_presupuesto(request: PresupuestoRequest, current_user: user_dependency, db: db_dependency):
    # ...

# 3. Backend - Registrar router
# Editar: HGApp/main.py
from routers import ..., presupuesto
app.include_router(presupuesto.router)

# 4. Backend - Crear migración local
# Crear: HGApp/migrations/create_presupuesto_anual.py
from database import engine
from sqlalchemy import text

sql = text("""
CREATE TABLE presupuesto_anual (
    id SERIAL PRIMARY KEY,
    anio INTEGER UNIQUE NOT NULL,
    monto NUMERIC(12,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP,
    modificado_por VARCHAR(255)
);
""")

with engine.connect() as conn:
    conn.execute(sql)
    conn.commit()

# 5. Ejecutar migración local
cd /Users/YOSMARCH/Desktop/sgpme/HGApp
source ../sgpme_env/bin/activate
python3 migrations/create_presupuesto_anual.py

# 6. Probar backend local
uvicorn main:app --reload --port 8000

# 7. Frontend - Crear componente
# Crear: sgpme_app/src/components/PresupuestoAnual.tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function PresupuestoAnual({ año, esAdmin }: Props) {
  // ...
  const cargarPresupuesto = async () => {
    const response = await fetchConToken(`${API_URL}/api/presupuesto/${año}`);
    // ...
  };
}

# 8. Frontend - Integrar en página
# Editar: sgpme_app/src/app/proyecciones/page.tsx
import PresupuestoAnual from '@/components/PresupuestoAnual';

// ...
<PresupuestoAnual año={añoActual} esAdmin={isAdmin} />

# 9. Probar frontend local
cd sgpme_app
npm run dev
```

#### Paso 2: Deploy a Producción

```bash
# 1. Subir backend
scp HGApp/models.py root@72.62.161.61:/home/sgpme/app/backend/
scp HGApp/main.py root@72.62.161.61:/home/sgpme/app/backend/
scp HGApp/routers/presupuesto.py root@72.62.161.61:/home/sgpme/app/backend/routers/
scp HGApp/migrations/create_presupuesto_anual.py root@72.62.161.61:/home/sgpme/app/backend/migrations/

# 2. Ejecutar migración en producción
ssh root@72.62.161.61
cd /home/sgpme/app/backend
source venv/bin/activate
python3 migrations/create_presupuesto_anual.py

# 3. Reiniciar backend
pkill -9 uvicorn
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &

# 4. Subir frontend
cd /Users/YOSMARCH/Desktop/sgpme/sgpme_app
tar czf /tmp/src.tar.gz src/
scp /tmp/src.tar.gz root@72.62.161.61:/tmp/

ssh root@72.62.161.61
cd /home/sgpme/app/frontend
rm -rf src
tar xzf /tmp/src.tar.gz

# 5. Rebuild frontend
pkill -9 node
rm -rf .next
NEXT_PUBLIC_API_URL=http://72.62.161.61 NEXT_PUBLIC_USE_BACKEND=true npm run build
nohup npm run start > /tmp/frontend.log 2>&1 &

# 6. Verificar
curl http://72.62.161.61/api/presupuesto/2026
```

---

## 9. COMANDOS ÚTILES

### 9.1 Monitoreo

```bash
# Ver procesos
ps aux | grep uvicorn
ps aux | grep next-server
ps aux | grep nginx

# Ver puertos ocupados
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000
netstat -tulpn | grep :80

# Ver logs en tiempo real
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Uso de recursos
top
htop
df -h  # Espacio en disco
free -h  # Memoria
```

### 9.2 Mantenimiento

```bash
# Limpiar builds viejos
rm -rf /home/sgpme/app/frontend/.next
rm -rf /home/sgpme/app/frontend/node_modules/.cache

# Limpiar logs
> /tmp/backend.log
> /tmp/frontend.log

# Actualizar dependencias
cd /home/sgpme/app/backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

cd /home/sgpme/app/frontend
npm update

# Reiniciar servicios
systemctl restart nginx
pkill -9 uvicorn && nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
pkill -9 node && cd /home/sgpme/app/frontend && nohup npm run start > /tmp/frontend.log 2>&1 &
```

---

## 10. CHECKLIST DE DEPLOY

### Pre-Deploy

- [ ] Código probado localmente
- [ ] No hay `localhost:8000` hardcoded en código
- [ ] Migraciones de DB preparadas
- [ ] `.env.production` correcto
- [ ] Backup de DB creado

### Deploy Backend

- [ ] Archivos subidos al servidor
- [ ] Migraciones ejecutadas
- [ ] Backend reiniciado
- [ ] Logs sin errores
- [ ] Endpoints responden correctamente

### Deploy Frontend

- [ ] Código fuente subido
- [ ] `.env.production` verificado
- [ ] Build exitoso con variables correctas
- [ ] Frontend reiniciado
- [ ] Proceso corriendo en puerto 3000

### Post-Deploy

- [ ] Hard refresh en navegador
- [ ] No hay errores CORS en consola
- [ ] URLs correctas (sin :8000)
- [ ] Funcionalidad probada end-to-end
- [ ] Logs monitoreados por 5-10 minutos

---

## 11. CONTACTOS Y CREDENCIALES

### Servidor

- **IP**: 72.62.161.61
- **Usuario**: root
- **Autenticación**: SSH con contraseña

### Base de Datos

- **Host**: localhost
- **Puerto**: 5432
- **Database**: sgpme
- **Usuario**: sgpme_user
- **Password**: SgPme2025!Secure#Pass
- **Connection String**: `postgresql://sgpme:ay123@localhost:5432/sgpme`

### Usuario Admin Prueba

- **Email**: yosmar.chavez.aram@gmail.com
- **Password**: ay1234
- **Tipo**: administrador

---

## 12. NOTAS FINALES

### ⚠️ CRÍTICO

1. **NUNCA** hardcodear `localhost:8000` en código fuente
2. **SIEMPRE** usar variables de entorno con fallback a `""`
3. **OBLIGATORIO** hacer hard refresh después de deploy
4. **IMPORTANTE** verificar logs después de cada deploy
5. **ESENCIAL** hacer backup antes de migraciones

### 💡 TIPS

- Usa `tar` para subir directorios completos más rápido
- Los builds de Next.js cachean agresivamente - borrar `.next` cuando cambies env vars
- Nginx requiere reinicio solo si cambias su configuración
- PostgreSQL no requiere reinicio para cambios de datos
- Usa `nohup` y `&` para procesos que deben seguir corriendo después de desconectar SSH

### 🔧 TROUBLESHOOTING RÁPIDO

1. **Error CORS** → Verificar URL y rebuild frontend
2. **Error 500** → Ver logs backend
3. **Error 404** → Verificar router registrado en main.py
4. **No conecta DB** → Verificar connection string y que PostgreSQL esté corriendo
5. **Puerto ocupado** → Matar proceso con `pkill` o `kill -9`

---

## DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO EXTERNO                          │
│                  http://72.62.161.61                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Puerto 80
                         ▼
┌────────────────────────────────────────────────────────────┐
│                      NGINX                                 │
│              (Reverse Proxy)                               │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │   /api/*     │  │   /auth/*    │  │     /*      │    │
│  │  → :8000     │  │  → :8000     │  │  → :3000    │    │
│  └──────────────┘  └──────────────┘  └─────────────┘    │
└──────────┬──────────────────┬──────────────┬─────────────┘
           │                  │              │
           │ localhost:8000   │              │ localhost:3000
           ▼                  ▼              ▼
┌─────────────────────┐  ┌────────────────────────────────┐
│   BACKEND           │  │       FRONTEND                 │
│   FastAPI           │  │       Next.js                  │
│   - main.py         │  │       - .next/                 │
│   - routers/        │  │       - src/                   │
│   - models.py       │  │                                │
│   - database.py     │  │                                │
│                     │  │                                │
│   Puerto: 8000      │  │       Puerto: 3000             │
└──────────┬──────────┘  └────────────────────────────────┘
           │
           │ postgresql://localhost:5432/sgpme
           ▼
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL                            │
│                   Database: sgpme                       │
│                   Usuario: sgpme_user                   │
│                   Puerto: 5432                          │
└─────────────────────────────────────────────────────────┘
```

---

## FLUJO DE UNA PETICIÓN

```
1. Usuario → http://72.62.161.61/api/presupuesto/2026
                      │
                      ▼
2. Nginx (puerto 80) recibe la petición
                      │
                      ▼
3. Nginx verifica la ruta: /api/*
                      │
                      ▼
4. Nginx hace proxy a: http://localhost:8000/api/presupuesto/2026
                      │
                      ▼
5. Backend (uvicorn:8000) procesa
                      │
                      ▼
6. Router /api/presupuesto maneja la petición
                      │
                      ▼
7. Verifica autenticación (JWT token)
                      │
                      ▼
8. Consulta PostgreSQL
                      │
                      ▼
9. Retorna JSON response
                      │
                      ▼
10. Nginx envía respuesta al usuario
```

---

**Documento generado**: 13 de Enero, 2026  
**Última actualización**: Tras implementación exitosa de Presupuesto Anual  
**Mantenido por**: Equipo de Desarrollo SGPME
