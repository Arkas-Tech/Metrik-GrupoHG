from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
import models
from database import engine, SessionLocal
from routers import auth, marcas, admin, eventos, facturas, proyecciones, proveedores, campanas, presencia_tradicional, metricas, presupuesto, categorias, form_templates, desplazamiento, google_ads, meta_ads, embajadores, conciliacion_bdc, diagramas_conversion

# Cargar variables de entorno
load_dotenv()


@asynccontextmanager
async def lifespan(app):
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

@app.get("/")
async def root():
    return {"message": "SGPME API - Sistema de Gestión de Presupuestos, Marcas y Eventos"}