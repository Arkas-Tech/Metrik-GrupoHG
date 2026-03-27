from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
import time
import traceback
import models
from database import engine, SessionLocal
from routers import auth, marcas, admin, eventos, facturas, proyecciones, proveedores, campanas, presencia_tradicional, metricas, presupuesto, categorias, form_templates, desplazamiento, google_ads, meta_ads, embajadores, conciliacion_bdc, diagramas_conversion, dev_tools, maintenance
from jose import jwt, JWTError
from starlette.responses import JSONResponse

# Cargar variables de entorno
load_dotenv()


@asynccontextmanager
async def lifespan(app):
    # Auto-migración: agregar columnas faltantes en embajadores
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            for col, coltype in [("imagenes_json", "TEXT"), ("cumplimiento_json", "TEXT")]:
                result = conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns "
                    f"WHERE table_name = 'embajadores' AND column_name = '{col}'"
                ))
                if not result.fetchone():
                    conn.execute(text(f"ALTER TABLE embajadores ADD COLUMN {col} {coltype}"))
                    conn.commit()
    except Exception:
        pass
    yield


app = FastAPI(
    title="SGPME API",
    description="Sistema de Gestión de Presupuestos, Marcas y Eventos",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3030", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3030",
        "http://72.62.161.61:3000",
        "http://72.62.161.61",
        "http://72.60.26.170:3030",
        "http://sgpme.arkastech.com",
        "https://sgpme.arkastech.com",
        "http://metrik.grupohg.com.mx",
        "https://metrik.grupohg.com.mx",
        "http://metrik.grupohg.com.mx:3000",
        "http://metrik.grupohg.com.mx:3001",
        "http://metrik.grupohg.com.mx:3030",
        "https://metrik.grupohg.com.mx:3000",
        "https://metrik.grupohg.com.mx:3001",
        "https://metrik.grupohg.com.mx:3030",
    ],  # Frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)


# ============ CONSTANTS ============

SECRET_KEY = '22d259b81d5448bfc4616f6aa4f9beecdbf0304262876cb79eb86f3ec34ffea7'
ALGORITHM = 'HS256'

# ============ MAINTENANCE MODE CACHE ============
_maintenance_cache = {'value': False, 'ts': 0}
_MAINTENANCE_CACHE_TTL = 30  # seconds

def _is_maintenance_active():
    """Check maintenance mode with 30s in-memory cache to avoid DB hit per request."""
    now = time.time()
    if now - _maintenance_cache['ts'] < _MAINTENANCE_CACHE_TTL:
        return _maintenance_cache['value']
    try:
        db = SessionLocal()
        try:
            flag = db.query(models.FeatureFlag).filter(
                models.FeatureFlag.name == 'maintenance_mode'
            ).first()
            result = bool(flag and flag.enabled)
        finally:
            db.close()
    except Exception:
        result = False
    _maintenance_cache['value'] = result
    _maintenance_cache['ts'] = now
    return result

def invalidate_maintenance_cache():
    """Called when maintenance is toggled to force immediate refresh."""
    _maintenance_cache['ts'] = 0


# ============ MAINTENANCE MODE MIDDLEWARE ============

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    path = request.url.path

    # Always allow: maintenance status, auth/token, docs, static, OPTIONS (CORS preflight)
    exempt_paths = ['/maintenance/status', '/auth/token', '/maintenance/toggle', '/docs', '/openapi.json', '/redoc', '/favicon.ico']
    if request.method == 'OPTIONS' or any(path.startswith(ep) for ep in exempt_paths):
        return await call_next(request)

    if not _is_maintenance_active():
        return await call_next(request)

    # Maintenance is ON — check if the request is from a developer
    auth_header = request.headers.get('authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            token = auth_header[7:]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get('role') == 'developer':
                return await call_next(request)
        except (Exception,):
            pass

    # Block everyone else
    return JSONResponse(
        status_code=503,
        content={'detail': 'Sistema en mantenimiento', 'maintenance': True}
    )


# ============ REQUEST LOGGING MIDDLEWARE ============

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.time()
    error_detail = None
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        error_detail = traceback.format_exc()
        raise
    finally:
        duration_ms = round((time.time() - start) * 1000, 2)
        path = request.url.path

        # Skip logging for docs, static, and dev request-logs to avoid recursion
        skip_paths = ['/docs', '/openapi.json', '/redoc', '/favicon.ico']
        if not any(path.startswith(sp) for sp in skip_paths):
            try:
                # Extract user info from JWT if present
                user_id = None
                user_role = None
                auth_header = request.headers.get('authorization', '')
                if auth_header.startswith('Bearer '):
                    try:
                        token = auth_header[7:]
                        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        user_id = payload.get('id')
                        user_role = payload.get('role')
                    except (JWTError, Exception):
                        pass

                db = SessionLocal()
                try:
                    log_entry = models.RequestLog(
                        method=request.method,
                        path=path,
                        status_code=status_code,
                        response_time_ms=duration_ms,
                        user_id=user_id,
                        user_role=user_role,
                        ip_address=request.client.host if request.client else None,
                        error_detail=error_detail,
                    )
                    db.add(log_entry)

                    # Auto-detect activity from write operations
                    if request.method in ('POST', 'PUT', 'DELETE') and status_code < 400:
                        entity_type = None
                        action = request.method.lower()
                        activity_paths = {
                            '/facturas': 'factura',
                            '/proyecciones': 'proyeccion',
                            '/campanas': 'campana',
                            '/presupuesto': 'presupuesto',
                            '/embajadores': 'embajador',
                            '/presencia': 'presencia',
                            '/eventos': 'evento',
                            '/admin': 'admin',
                            '/marcas': 'marca',
                        }
                        for prefix, etype in activity_paths.items():
                            if path.startswith(prefix):
                                entity_type = etype
                                break

                        if entity_type:
                            activity = models.ActivityLog(
                                user_id=user_id,
                                user_name=user_role,
                                action=f'{action}_{entity_type}',
                                entity_type=entity_type,
                                details=f'{request.method} {path} -> {status_code}',
                            )
                            db.add(activity)

                    db.commit()
                except Exception:
                    db.rollback()
                finally:
                    db.close()
            except Exception:
                pass

    return response


# Incluir routers
app.include_router(auth.router)
app.include_router(marcas.router)
app.include_router(admin.router)
app.include_router(eventos.router)
app.include_router(facturas.router)
app.include_router(proyecciones.router)
app.include_router(proveedores.router)
app.include_router(campanas.router)
app.include_router(presencia_tradicional.router)
app.include_router(metricas.router)
app.include_router(presupuesto.router)
app.include_router(categorias.router)
app.include_router(form_templates.router)
app.include_router(desplazamiento.router)
app.include_router(google_ads.router)
app.include_router(meta_ads.router)
app.include_router(embajadores.router)
app.include_router(conciliacion_bdc.router)
app.include_router(diagramas_conversion.router)
app.include_router(dev_tools.router)
app.include_router(maintenance.router)

@app.get("/")
async def root():
    return {"message": "SGPME API - Sistema de Gestión de Presupuestos, Marcas y Eventos"}