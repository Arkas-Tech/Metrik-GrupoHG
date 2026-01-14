# SGPME - Sistema de Gestión de Presupuestos, Marcas y Eventos

Este proyecto conecta un backend FastAPI (HGApp) con un frontend Next.js (sgpme_app).

## Configuración del Backend (FastAPI)

### 1. Instalar dependencias

```bash
cd HGApp
pip install -r requirements.txt
```

### 2. Configurar la base de datos

Asegúrate de tener PostgreSQL instalado y configurado. Actualiza la configuración en `database.py`:

```python
SQLALCHEMY_DATABASE_URL = "postgresql://usuario:contraseña@localhost/sgpmedb"
```

### 3. Crear la base de datos

```sql
CREATE DATABASE sgpmedb;
```

### 4. Inicializar la base de datos

```bash
python init_db.py
```

Este script creará las tablas y usuarios por defecto.

### 5. Iniciar el servidor FastAPI

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El servidor estará disponible en: http://localhost:8000

## Configuración del Frontend (Next.js)

### 1. Instalar dependencias

```bash
cd sgpme_app
npm install
```

### 2. Configurar variables de entorno

El archivo `.env.local` ya está configurado con:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_BACKEND=true
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El frontend estará disponible en: http://localhost:3000

## Usuarios por defecto

El sistema incluye los siguientes usuarios:

**Administradores:**

- yosch / ay123
- phaddad / test123
- rcamacho / test123

**Coordinadores:**

- pvillalobos / test123
- lfierro / test123
- dguzman / test123
- iestupinan / test123
- arosales / test123

**Auditores:**

- auditor1 / audit123

## APIs Disponibles

### Autenticación

- POST `/auth/token` - Login
- GET `/auth/user` - Perfil del usuario
- POST `/auth/` - Crear usuario (solo admin)

### Marcas

- GET `/marcas/marca/` - Listar marcas
- POST `/marcas/marca/` - Crear marca
- GET `/marcas/marca/{id}` - Obtener marca
- PUT `/marcas/marca/{id}` - Actualizar marca
- DELETE `/marcas/marca/{id}` - Eliminar marca

### Eventos

- GET `/eventos/` - Listar eventos
- POST `/eventos/` - Crear evento
- GET `/eventos/{id}` - Obtener evento
- PUT `/eventos/{id}` - Actualizar evento
- DELETE `/eventos/{id}` - Eliminar evento

### Facturas

- GET `/facturas/` - Listar facturas
- POST `/facturas/` - Crear factura
- GET `/facturas/{id}` - Obtener factura
- PUT `/facturas/{id}` - Actualizar factura
- DELETE `/facturas/{id}` - Eliminar factura
- PATCH `/facturas/{id}/autorizar` - Autorizar factura
- PATCH `/facturas/{id}/marcar-pagada` - Marcar como pagada

### Proyecciones

- GET `/proyecciones/` - Listar proyecciones
- POST `/proyecciones/` - Crear proyección
- GET `/proyecciones/{id}` - Obtener proyección
- PUT `/proyecciones/{id}` - Actualizar proyección
- DELETE `/proyecciones/{id}` - Eliminar proyección
- GET `/proyecciones/resumen/por-marca` - Resumen por marca

### Proveedores

- GET `/proveedores/` - Listar proveedores
- POST `/proveedores/` - Crear proveedor
- GET `/proveedores/{id}` - Obtener proveedor
- PUT `/proveedores/{id}` - Actualizar proveedor
- DELETE `/proveedores/{id}` - Eliminar proveedor
- PATCH `/proveedores/{id}/toggle-activo` - Activar/desactivar

## Documentación API

Una vez que el backend esté ejecutándose, puedes acceder a la documentación automática de la API en:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Cambiar entre modo local y backend

Para cambiar entre el sistema de autenticación local y el backend, modifica en `.env.local`:

```bash
# Para usar backend FastAPI
NEXT_PUBLIC_USE_BACKEND=true

# Para usar sistema local (modo desarrollo)
NEXT_PUBLIC_USE_BACKEND=false
```

## Estructura del Proyecto

```
sgpme/
├── HGApp/                    # Backend FastAPI
│   ├── main.py              # Aplicación principal
│   ├── database.py          # Configuración de base de datos
│   ├── models.py            # Modelos SQLAlchemy
│   ├── init_db.py           # Script de inicialización
│   └── routers/             # Endpoints organizados por módulo
│       ├── auth.py          # Autenticación
│       ├── marcas.py        # Gestión de marcas
│       ├── eventos.py       # Gestión de eventos
│       ├── facturas.py      # Gestión de facturas
│       ├── proyecciones.py  # Gestión de proyecciones
│       └── proveedores.py   # Gestión de proveedores
└── sgpme_app/               # Frontend Next.js
    ├── src/
    │   ├── app/             # App Router
    │   ├── components/      # Componentes reutilizables
    │   ├── hooks/          # Custom hooks
    │   ├── lib/            # Utilities y configuración API
    │   └── types/          # Definiciones de tipos TypeScript
    └── .env.local          # Variables de entorno
```
