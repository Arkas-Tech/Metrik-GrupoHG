from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from database import SessionLocal
from models import PresupuestoAnual, Marcas
from routers.auth import get_current_user

router = APIRouter(
    prefix='/presupuesto',
    tags=['presupuesto']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# Modelos Pydantic
class PresupuestoRequest(BaseModel):
    anio: int = Field(ge=2020, le=2050, alias="año")
    marca_id: int = Field(gt=0)
    monto: float = Field(gt=0)
    
    class Config:
        populate_by_name = True

class PresupuestoResponse(BaseModel):
    id: int
    anio: int = Field(serialization_alias="año")
    marca_id: int
    marca_nombre: Optional[str] = None
    monto: float
    fecha_modificacion: datetime
    modificado_por: str

    class Config:
        from_attributes = True
        populate_by_name = True

class PresupuestoSumaResponse(BaseModel):
    anio: int = Field(serialization_alias="año")
    monto_total: float
    cantidad_marcas: int
    
    class Config:
        populate_by_name = True


@router.get("/{anio}", response_model=List[PresupuestoResponse], status_code=status.HTTP_200_OK)
async def get_presupuestos(
    user: user_dependency, 
    db: db_dependency, 
    anio: int = Path(ge=2020, le=2050),
    marca_id: Optional[int] = Query(None, description="ID de marca para filtrar")
):
    """
    Obtener presupuestos anuales por año
    - Si se proporciona marca_id, devuelve solo ese presupuesto
    - Si no, solo admins pueden ver todos los presupuestos del año
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Solo admins pueden ver todos los presupuestos sin filtro
    if not marca_id and user.get('role') != 'administrador':
        raise HTTPException(
            status_code=403, 
            detail='Solo los administradores pueden ver todos los presupuestos'
        )
    
    query = db.query(PresupuestoAnual).filter(PresupuestoAnual.anio == anio)
    
    if marca_id:
        query = query.filter(PresupuestoAnual.marca_id == marca_id)
    
    presupuestos = query.all()
    
    if not presupuestos:
        raise HTTPException(status_code=404, detail='No se encontraron presupuestos')
    
    # Enriquecer con nombre de marca
    result = []
    for p in presupuestos:
        marca = db.query(Marcas).filter(Marcas.id == p.marca_id).first()
        presupuesto_dict = {
            "id": p.id,
            "anio": p.anio,
            "marca_id": p.marca_id,
            "marca_nombre": marca.cuenta if marca else None,
            "monto": p.monto,
            "fecha_modificacion": p.fecha_modificacion,
            "modificado_por": p.modificado_por
        }
        result.append(PresupuestoResponse(**presupuesto_dict))
    
    return result


@router.get("/{anio}/suma", response_model=PresupuestoSumaResponse, status_code=status.HTTP_200_OK)
async def get_presupuesto_suma(
    user: user_dependency, 
    db: db_dependency, 
    anio: int = Path(ge=2020, le=2050)
):
    """
    Obtener la suma total de presupuestos para un año
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    result = db.query(
        func.sum(PresupuestoAnual.monto).label('total'),
        func.count(PresupuestoAnual.id).label('cantidad')
    ).filter(PresupuestoAnual.anio == anio).first()
    
    monto_total = float(result.total) if result.total else 0.0
    cantidad = int(result.cantidad) if result.cantidad else 0
    
    return PresupuestoSumaResponse(
        anio=anio,
        monto_total=monto_total,
        cantidad_marcas=cantidad
    )


@router.post("/", response_model=PresupuestoResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_presupuesto(user: user_dependency, db: db_dependency, presupuesto_request: PresupuestoRequest):
    """Crear o actualizar presupuesto anual por marca (solo administradores)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if user_role != 'administrador':
        raise HTTPException(status_code=403, detail='Solo los administradores pueden modificar el presupuesto')
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == presupuesto_request.marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail='Marca no encontrada')
    
    # Buscar si ya existe un presupuesto para ese año y marca
    presupuesto = db.query(PresupuestoAnual).filter(
        PresupuestoAnual.anio == presupuesto_request.anio,
        PresupuestoAnual.marca_id == presupuesto_request.marca_id
    ).first()
    
    if presupuesto:
        # Actualizar existente
        presupuesto.monto = presupuesto_request.monto
        presupuesto.modificado_por = user.get('username')
        presupuesto.fecha_modificacion = datetime.now()
    else:
        # Crear nuevo
        presupuesto = PresupuestoAnual(
            anio=presupuesto_request.anio,
            marca_id=presupuesto_request.marca_id,
            monto=presupuesto_request.monto,
            modificado_por=user.get('username')
        )
        db.add(presupuesto)
    
    db.commit()
    db.refresh(presupuesto)
    
    # Retornar con nombre de marca
    return PresupuestoResponse(
        id=presupuesto.id,
        anio=presupuesto.anio,
        marca_id=presupuesto.marca_id,
        marca_nombre=marca.cuenta,
        monto=presupuesto.monto,
        fecha_modificacion=presupuesto.fecha_modificacion,
        modificado_por=presupuesto.modificado_por
    )


@router.delete("/{presupuesto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presupuesto(
    presupuesto_id: int,
    user: user_dependency,
    db: db_dependency
):
    """Eliminar un presupuesto anual (solo administradores)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if user_role != 'administrador':
        raise HTTPException(status_code=403, detail='Solo los administradores pueden eliminar presupuestos')
    
    # Buscar el presupuesto
    presupuesto = db.query(PresupuestoAnual).filter(PresupuestoAnual.id == presupuesto_id).first()
    
    if not presupuesto:
        raise HTTPException(status_code=404, detail='Presupuesto no encontrado')
    
    db.delete(presupuesto)
    db.commit()
    
    return None
