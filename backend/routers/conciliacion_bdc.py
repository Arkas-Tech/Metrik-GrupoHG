from typing import Annotated, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from datetime import datetime
from models import ConciliacionBDC
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/conciliacion-bdc", tags=["conciliacion-bdc"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class ConciliacionRequest(BaseModel):
    marca: str
    semana_inicio: str
    semana_fin: str
    mes: int
    anio: int
    leads_activos: Optional[str] = None
    leads_cerrados: Optional[str] = None
    comparacion_medios: Optional[str] = None
    notas_generales: Optional[str] = None


class ConciliacionResponse(BaseModel):
    id: int
    marca: str
    semana_inicio: str
    semana_fin: str
    mes: int
    anio: int
    leads_activos: Optional[str] = None
    leads_cerrados: Optional[str] = None
    comparacion_medios: Optional[str] = None
    notas_generales: Optional[str] = None
    creado_por: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", status_code=status.HTTP_200_OK)
async def read_all_conciliaciones(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    query = db.query(ConciliacionBDC)
    if marca:
        query = query.filter(ConciliacionBDC.marca == marca)
    if mes:
        query = query.filter(ConciliacionBDC.mes == mes)
    if anio:
        query = query.filter(ConciliacionBDC.anio == anio)
    results = query.order_by(ConciliacionBDC.semana_inicio.desc()).all()
    return [
        {
            "id": r.id,
            "marca": r.marca,
            "semana_inicio": str(r.semana_inicio),
            "semana_fin": str(r.semana_fin),
            "mes": r.mes,
            "anio": r.anio,
            "leads_activos": r.leads_activos,
            "leads_cerrados": r.leads_cerrados,
            "comparacion_medios": r.comparacion_medios,
            "notas_generales": r.notas_generales,
            "creado_por": r.creado_por,
        }
        for r in results
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_conciliacion(
    user: user_dependency,
    db: db_dependency,
    req: ConciliacionRequest,
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = ConciliacionBDC(
        marca=req.marca,
        semana_inicio=datetime.strptime(req.semana_inicio, "%Y-%m-%d").date(),
        semana_fin=datetime.strptime(req.semana_fin, "%Y-%m-%d").date(),
        mes=req.mes,
        anio=req.anio,
        leads_activos=req.leads_activos,
        leads_cerrados=req.leads_cerrados,
        comparacion_medios=req.comparacion_medios,
        notas_generales=req.notas_generales,
        creado_por=user.get("username"),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"id": obj.id, "message": "Conciliación creada correctamente"}


@router.put("/{conciliacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_conciliacion(
    user: user_dependency,
    db: db_dependency,
    req: ConciliacionRequest,
    conciliacion_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = (
        db.query(ConciliacionBDC)
        .filter(ConciliacionBDC.id == conciliacion_id)
        .first()
    )
    if obj is None:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")
    obj.marca = req.marca
    obj.semana_inicio = datetime.strptime(req.semana_inicio, "%Y-%m-%d").date()
    obj.semana_fin = datetime.strptime(req.semana_fin, "%Y-%m-%d").date()
    obj.mes = req.mes
    obj.anio = req.anio
    obj.leads_activos = req.leads_activos
    obj.leads_cerrados = req.leads_cerrados
    obj.comparacion_medios = req.comparacion_medios
    obj.notas_generales = req.notas_generales
    db.commit()


@router.delete("/{conciliacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conciliacion(
    user: user_dependency,
    db: db_dependency,
    conciliacion_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    if user.get("role") not in ["administrador", "admin", "developer"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar conciliaciones")
    obj = (
        db.query(ConciliacionBDC)
        .filter(ConciliacionBDC.id == conciliacion_id)
        .first()
    )
    if obj is None:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")
    db.delete(obj)
    db.commit()
