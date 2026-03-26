from typing import Annotated, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import DiagramaConversion
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/diagramas-conversion", tags=["diagramas-conversion"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class DiagramaRequest(BaseModel):
    marca: str
    modelo: str  # MFCRM | MWCRM | GFCRM
    mes: int
    anio: int
    canal_proyeccion: Optional[str] = None
    canal_conversion: Optional[str] = None
    departamento: Optional[str] = None
    anuncio: Optional[str] = None
    oferta_comercial: Optional[str] = None
    tipo: Optional[str] = None
    preguntas: Optional[str] = None  # JSON string
    objetivo: Optional[str] = None
    tipo_destino: Optional[str] = None
    destino: Optional[str] = None
    notas: Optional[str] = None


class DiagramaResponse(BaseModel):
    id: int
    marca: str
    modelo: str
    mes: int
    anio: int
    canal_proyeccion: Optional[str] = None
    canal_conversion: Optional[str] = None
    departamento: Optional[str] = None
    anuncio: Optional[str] = None
    oferta_comercial: Optional[str] = None
    tipo: Optional[str] = None
    preguntas: Optional[str] = None
    objetivo: Optional[str] = None
    tipo_destino: Optional[str] = None
    destino: Optional[str] = None
    notas: Optional[str] = None
    creado_por: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[DiagramaResponse], status_code=status.HTTP_200_OK)
async def read_all_diagramas(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    modelo: Optional[str] = Query(None),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    query = db.query(DiagramaConversion)
    if marca:
        query = query.filter(DiagramaConversion.marca == marca)
    if mes:
        query = query.filter(DiagramaConversion.mes == mes)
    if anio:
        query = query.filter(DiagramaConversion.anio == anio)
    if modelo:
        query = query.filter(DiagramaConversion.modelo == modelo)
    return query.order_by(DiagramaConversion.fecha_creacion.desc()).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_diagrama(
    user: user_dependency,
    db: db_dependency,
    req: DiagramaRequest,
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = DiagramaConversion(
        marca=req.marca,
        modelo=req.modelo,
        mes=req.mes,
        anio=req.anio,
        canal_proyeccion=req.canal_proyeccion,
        canal_conversion=req.canal_conversion,
        departamento=req.departamento,
        anuncio=req.anuncio,
        oferta_comercial=req.oferta_comercial,
        tipo=req.tipo,
        preguntas=req.preguntas,
        objetivo=req.objetivo,
        tipo_destino=req.tipo_destino,
        destino=req.destino,
        notas=req.notas,
        creado_por=user.get("username"),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"id": obj.id, "message": "Diagrama creado correctamente"}


@router.put("/{diagrama_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_diagrama(
    user: user_dependency,
    db: db_dependency,
    req: DiagramaRequest,
    diagrama_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = db.query(DiagramaConversion).filter(DiagramaConversion.id == diagrama_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Diagrama no encontrado")
    obj.marca = req.marca
    obj.modelo = req.modelo
    obj.mes = req.mes
    obj.anio = req.anio
    obj.canal_proyeccion = req.canal_proyeccion
    obj.canal_conversion = req.canal_conversion
    obj.departamento = req.departamento
    obj.anuncio = req.anuncio
    obj.oferta_comercial = req.oferta_comercial
    obj.tipo = req.tipo
    obj.preguntas = req.preguntas
    obj.objetivo = req.objetivo
    obj.tipo_destino = req.tipo_destino
    obj.destino = req.destino
    obj.notas = req.notas
    db.commit()


@router.delete("/{diagrama_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diagrama(
    user: user_dependency,
    db: db_dependency,
    diagrama_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    if user.get("role") not in ["administrador", "admin"]:
        raise HTTPException(status_code=403, detail="Sin permisos para eliminar")
    obj = db.query(DiagramaConversion).filter(DiagramaConversion.id == diagrama_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Diagrama no encontrado")
    db.delete(obj)
    db.commit()
