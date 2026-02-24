"""
Router para plantillas dinámicas de formularios de Presencia Tradicional.
Cada subcategoría puede tener su propia plantilla con secciones y campos configurables.
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import FormTemplate
from routers.auth import get_current_user
import json

router = APIRouter(
    prefix='/form-templates',
    tags=['form-templates']
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ──────────────────────────────────────────────────────────────────────────────
# Defaults
# ──────────────────────────────────────────────────────────────────────────────

DEFAULT_SECCIONES = [
    {"id": "informacion_general",    "nombre": "Información General",     "activo": True, "campos": []},
    {"id": "temporalidad",           "nombre": "Temporalidad",            "activo": True, "campos": []},
    {"id": "alcance",                "nombre": "Alcance",                 "activo": True, "campos": []},
    {"id": "caracteristicas_fisicas","nombre": "Características Físicas", "activo": True, "campos": []},
    {"id": "proveedor",              "nombre": "Proveedor",               "activo": True, "campos": [],
     "esProveedorEspecial": True},
    {"id": "costos_contrato",        "nombre": "Costos y Contrato",       "activo": True, "campos": []},
    {"id": "impresion_instalador",   "nombre": "Impresión e Instalador",  "activo": True, "campos": []},
    {"id": "evidencia",              "nombre": "Evidencia",               "activo": True, "campos": []},
]


def build_default_template(subcategoria: str) -> dict:
    return {"subcategoria": subcategoria, "secciones": DEFAULT_SECCIONES}


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────────────────────────────────────

class TemplatePayload(BaseModel):
    template: dict  # The full template JSON


class TemplateResponse(BaseModel):
    subcategoria: str
    template: dict


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TemplateResponse], status_code=status.HTTP_200_OK)
async def get_all_templates(user: user_dependency, db: db_dependency):
    """Devuelve todas las plantillas guardadas."""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    rows = db.query(FormTemplate).all()
    return [
        TemplateResponse(subcategoria=r.subcategoria, template=json.loads(r.template_json))
        for r in rows
    ]


@router.get("/{subcategoria}", response_model=TemplateResponse, status_code=status.HTTP_200_OK)
async def get_template(
    subcategoria: str,
    user: user_dependency,
    db: db_dependency,
):
    """
    Devuelve la plantilla para una subcategoría.
    Si todavía no existe, retorna la plantilla por defecto (sin guardarla aún).
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    row = db.query(FormTemplate).filter(FormTemplate.subcategoria == subcategoria).first()
    if row is None:
        return TemplateResponse(
            subcategoria=subcategoria,
            template=build_default_template(subcategoria)
        )

    return TemplateResponse(subcategoria=row.subcategoria, template=json.loads(row.template_json))


@router.put("/{subcategoria}", response_model=TemplateResponse, status_code=status.HTTP_200_OK)
async def upsert_template(
    subcategoria: str,
    payload: TemplatePayload,
    user: user_dependency,
    db: db_dependency,
):
    """Crear o actualizar la plantilla de formulario para una subcategoría."""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    # Solo administradores
    if user.get('role') not in ('administrador', 'admin'):
        raise HTTPException(status_code=403, detail='Solo administradores pueden modificar plantillas')

    template_str = json.dumps(payload.template, ensure_ascii=False)

    row = db.query(FormTemplate).filter(FormTemplate.subcategoria == subcategoria).first()
    if row is None:
        row = FormTemplate(subcategoria=subcategoria, template_json=template_str)
        db.add(row)
    else:
        row.template_json = template_str

    db.commit()
    db.refresh(row)

    return TemplateResponse(subcategoria=row.subcategoria, template=json.loads(row.template_json))


@router.delete("/{subcategoria}", status_code=status.HTTP_200_OK)
async def delete_template(
    subcategoria: str,
    user: user_dependency,
    db: db_dependency,
):
    """Elimina la plantilla (vuelve a defaults)."""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    if user.get('role') not in ('administrador', 'admin'):
        raise HTTPException(status_code=403, detail='Solo administradores pueden eliminar plantillas')

    row = db.query(FormTemplate).filter(FormTemplate.subcategoria == subcategoria).first()
    if row:
        db.delete(row)
        db.commit()

    return {"message": "Plantilla eliminada, se usarán los campos por defecto"}
