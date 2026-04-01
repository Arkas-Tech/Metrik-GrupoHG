from typing import Annotated, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette import status
from models import FunnelPisos, FunnelPisosHistorial
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/funnel-pisos", tags=["funnel-pisos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class FunnelPisosRequest(BaseModel):
    marca: str
    mes: int
    anio: int
    pisos: int = 0
    cotizaciones: int = 0
    solicitudes_credito: int = 0
    ventas: int = 0


@router.get("/", status_code=status.HTTP_200_OK)
async def get_all(
    user: user_dependency,
    db: db_dependency,
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
):
    """Get all funnel pisos records, optionally filtered by mes/anio."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    query = db.query(FunnelPisos)
    if mes:
        query = query.filter(FunnelPisos.mes == mes)
    if anio:
        query = query.filter(FunnelPisos.anio == anio)
    results = query.all()
    return [
        {
            "id": r.id,
            "marca": r.marca,
            "mes": r.mes,
            "anio": r.anio,
            "pisos": r.pisos,
            "cotizaciones": r.cotizaciones,
            "solicitudes_credito": r.solicitudes_credito,
            "ventas": r.ventas,
            "editado_por": r.editado_por,
            "fecha_edicion": str(r.fecha_edicion) if r.fecha_edicion else None,
        }
        for r in results
    ]


@router.get("/detalle", status_code=status.HTTP_200_OK)
async def get_detalle(
    user: user_dependency,
    db: db_dependency,
    marca: str = Query(...),
    mes: int = Query(...),
    anio: int = Query(...),
):
    """Get a single record for a specific marca+mes+anio."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    record = (
        db.query(FunnelPisos)
        .filter(
            FunnelPisos.marca == marca,
            FunnelPisos.mes == mes,
            FunnelPisos.anio == anio,
        )
        .first()
    )
    if not record:
        return {"pisos": 0, "cotizaciones": 0, "solicitudes_credito": 0, "ventas": 0, "editado_por": None, "fecha_edicion": None}
    return {
        "id": record.id,
        "marca": record.marca,
        "mes": record.mes,
        "anio": record.anio,
        "pisos": record.pisos,
        "cotizaciones": record.cotizaciones,
        "solicitudes_credito": record.solicitudes_credito,
        "ventas": record.ventas,
        "editado_por": record.editado_por,
        "fecha_edicion": str(record.fecha_edicion) if record.fecha_edicion else None,
    }


@router.put("/", status_code=status.HTTP_200_OK)
async def upsert(
    user: user_dependency,
    db: db_dependency,
    req: FunnelPisosRequest,
):
    """Create or update funnel pisos for a specific marca+mes+anio."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")

    username = user.get("username", "desconocido")

    record = (
        db.query(FunnelPisos)
        .filter(
            FunnelPisos.marca == req.marca,
            FunnelPisos.mes == req.mes,
            FunnelPisos.anio == req.anio,
        )
        .first()
    )

    if record:
        record.pisos = req.pisos
        record.cotizaciones = req.cotizaciones
        record.solicitudes_credito = req.solicitudes_credito
        record.ventas = req.ventas
        record.editado_por = username
    else:
        record = FunnelPisos(
            marca=req.marca,
            mes=req.mes,
            anio=req.anio,
            pisos=req.pisos,
            cotizaciones=req.cotizaciones,
            solicitudes_credito=req.solicitudes_credito,
            ventas=req.ventas,
            editado_por=username,
        )
        db.add(record)

    db.flush()

    # Save history entry
    historial = FunnelPisosHistorial(
        funnel_pisos_id=record.id,
        marca=req.marca,
        mes=req.mes,
        anio=req.anio,
        pisos=req.pisos,
        cotizaciones=req.cotizaciones,
        solicitudes_credito=req.solicitudes_credito,
        ventas=req.ventas,
        editado_por=username,
    )
    db.add(historial)
    db.commit()

    return {"message": "Guardado correctamente", "id": record.id}


@router.get("/historial", status_code=status.HTTP_200_OK)
async def get_historial(
    user: user_dependency,
    db: db_dependency,
    marca: str = Query(...),
    mes: int = Query(...),
    anio: int = Query(...),
):
    """Get edit history for a specific marca+mes+anio."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    results = (
        db.query(FunnelPisosHistorial)
        .filter(
            FunnelPisosHistorial.marca == marca,
            FunnelPisosHistorial.mes == mes,
            FunnelPisosHistorial.anio == anio,
        )
        .order_by(FunnelPisosHistorial.fecha_edicion.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": r.id,
            "pisos": r.pisos,
            "cotizaciones": r.cotizaciones,
            "solicitudes_credito": r.solicitudes_credito,
            "ventas": r.ventas,
            "editado_por": r.editado_por,
            "fecha_edicion": str(r.fecha_edicion) if r.fecha_edicion else None,
        }
        for r in results
    ]
