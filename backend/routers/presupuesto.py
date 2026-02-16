from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from database import SessionLocal
from models import PresupuestoMensual, Marcas, Categorias
from routers.auth import get_current_user
import json

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

# Función helper para obtener categorías activas de la base de datos
def get_categorias_activas(db: Session) -> List[str]:
    """Obtiene la lista de nombres de categorías activas desde la base de datos"""
    categorias = db.query(Categorias).filter(Categorias.activo == True).order_by(Categorias.orden, Categorias.nombre).all()
    return [cat.nombre for cat in categorias]

# Modelos Pydantic
class PresupuestoMensualRequest(BaseModel):
    mes: int = Field(ge=1, le=12)
    anio: int = Field(ge=2020, le=2050)
    categoria: str
    marca_id: int = Field(gt=0)
    monto: float = Field(ge=0)  # Permitir 0 para poder vaciar presupuestos
    monto_mensual_base: Optional[float] = Field(default=0.0, ge=0)  # Monto base para auto-rellenar
    
    class Config:
        populate_by_name = True

class PresupuestoMensualResponse(BaseModel):
    id: int
    mes: int
    anio: int
    categoria: str
    marca_id: int
    marca_nombre: Optional[str] = None
    monto: float
    monto_mensual_base: Optional[float] = 0.0
    fecha_modificacion: datetime
    modificado_por: str

    class Config:
        from_attributes = True
        populate_by_name = True

class PresupuestoMensualSumaResponse(BaseModel):
    mes: Optional[int] = None
    anio: Optional[int] = None
    categoria: Optional[str] = None
    marca_id: Optional[int] = None
    monto_total: float
    cantidad_registros: int
    
    class Config:
        populate_by_name = True


# Endpoints

@router.get("/categorias", response_model=List[str], status_code=status.HTTP_200_OK)
async def get_categorias(user: user_dependency, db: db_dependency):
    """Obtener lista de categorías disponibles desde la base de datos"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    return get_categorias_activas(db)


@router.get("/", response_model=List[PresupuestoMensualResponse], status_code=status.HTTP_200_OK)
async def get_presupuestos_mensuales(
    user: user_dependency, 
    db: db_dependency, 
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mes"),
    anio: Optional[int] = Query(None, ge=2020, le=2050, description="Filtrar por año"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    marca_id: Optional[int] = Query(None, description="Filtrar por agencia/marca")
):
    """
    Obtener presupuestos mensuales con filtros opcionales
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(PresupuestoMensual)
    
    # Aplicar filtros
    if mes is not None:
        query = query.filter(PresupuestoMensual.mes == mes)
    if anio is not None:
        query = query.filter(PresupuestoMensual.anio == anio)
    if categoria:
        query = query.filter(PresupuestoMensual.categoria == categoria)
    if marca_id is not None:
        query = query.filter(PresupuestoMensual.marca_id == marca_id)
    
    presupuestos = query.order_by(
        PresupuestoMensual.anio.desc(),
        PresupuestoMensual.mes.desc(),
        PresupuestoMensual.categoria,
        PresupuestoMensual.marca_id
    ).all()
    
    # Enriquecer con nombre de marca
    result = []
    for p in presupuestos:
        marca = db.query(Marcas).filter(Marcas.id == p.marca_id).first()
        presupuesto_dict = {
            "id": p.id,
            "mes": p.mes,
            "anio": p.anio,
            "categoria": p.categoria,
            "marca_id": p.marca_id,
            "marca_nombre": marca.cuenta if marca else None,
            "monto": p.monto,
            "monto_mensual_base": p.monto_mensual_base if hasattr(p, 'monto_mensual_base') else 0.0,
            "fecha_modificacion": p.fecha_modificacion,
            "modificado_por": p.modificado_por
        }
        result.append(PresupuestoMensualResponse(**presupuesto_dict))
    
    return result


@router.post("/", response_model=PresupuestoMensualResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_presupuesto_mensual(
    user: user_dependency,
    db: db_dependency,
    presupuesto_request: PresupuestoMensualRequest
):
    """
    Crear o actualizar un presupuesto mensual
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if user_role != 'administrador':
        raise HTTPException(status_code=403, detail='Solo los administradores pueden crear/modificar presupuestos')
    
    # Obtener categorías activas de la base de datos
    categorias_activas = get_categorias_activas(db)
    
    # Validar que la categoría existe
    if presupuesto_request.categoria not in categorias_activas:
        raise HTTPException(
            status_code=400, 
            detail=f'Categoría no válida. Use una de: {", ".join(categorias_activas)}'
        )
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == presupuesto_request.marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail='Marca/Agencia no encontrada')
    
    # Buscar si ya existe un presupuesto para esos valores
    presupuesto = db.query(PresupuestoMensual).filter(
        PresupuestoMensual.mes == presupuesto_request.mes,
        PresupuestoMensual.anio == presupuesto_request.anio,
        PresupuestoMensual.categoria == presupuesto_request.categoria,
        PresupuestoMensual.marca_id == presupuesto_request.marca_id
    ).first()
    
    if presupuesto:
        # Actualizar existente
        presupuesto.monto = presupuesto_request.monto
        presupuesto.monto_mensual_base = presupuesto_request.monto_mensual_base
        presupuesto.modificado_por = user.get('username')
        presupuesto.fecha_modificacion = datetime.now()
    else:
        # Crear nuevo
        presupuesto = PresupuestoMensual(
            mes=presupuesto_request.mes,
            anio=presupuesto_request.anio,
            categoria=presupuesto_request.categoria,
            marca_id=presupuesto_request.marca_id,
            monto=presupuesto_request.monto,
            monto_mensual_base=presupuesto_request.monto_mensual_base,
            modificado_por=user.get('username')
        )
        db.add(presupuesto)
    
    db.commit()
    db.refresh(presupuesto)
    
    # Retornar con nombre de marca
    return PresupuestoMensualResponse(
        id=presupuesto.id,
        mes=presupuesto.mes,
        anio=presupuesto.anio,
        categoria=presupuesto.categoria,
        marca_id=presupuesto.marca_id,
        marca_nombre=marca.cuenta,
        monto=presupuesto.monto,
        monto_mensual_base=presupuesto.monto_mensual_base,
        fecha_modificacion=presupuesto.fecha_modificacion,
        modificado_por=presupuesto.modificado_por
    )


@router.put("/{presupuesto_id}", response_model=PresupuestoMensualResponse, status_code=status.HTTP_200_OK)
async def update_presupuesto_mensual(
    presupuesto_id: int,
    user: user_dependency,
    db: db_dependency,
    presupuesto_request: PresupuestoMensualRequest
):
    """Actualizar un presupuesto mensual existente (solo administradores)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if user_role != 'administrador':
        raise HTTPException(status_code=403, detail='Solo los administradores pueden modificar presupuestos')
    
    # Obtener categorías activas de la base de datos
    categorias_activas = get_categorias_activas(db)
    
    # Validar que la categoría existe
    if presupuesto_request.categoria not in categorias_activas:
        raise HTTPException(
            status_code=400, 
            detail=f'Categoría no válida. Use una de: {", ".join(categorias_activas)}'
        )
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == presupuesto_request.marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail='Marca/Agencia no encontrada')
    
    # Buscar el presupuesto a actualizar
    presupuesto = db.query(PresupuestoMensual).filter(PresupuestoMensual.id == presupuesto_id).first()
    
    if not presupuesto:
        raise HTTPException(status_code=404, detail='Presupuesto no encontrado')
    
    # Actualizar campos
    presupuesto.mes = presupuesto_request.mes
    presupuesto.anio = presupuesto_request.anio
    presupuesto.categoria = presupuesto_request.categoria
    presupuesto.marca_id = presupuesto_request.marca_id
    presupuesto.monto = presupuesto_request.monto
    presupuesto.monto_mensual_base = presupuesto_request.monto_mensual_base
    presupuesto.modificado_por = user.get('username')
    presupuesto.fecha_modificacion = datetime.now()
    
    db.commit()
    db.refresh(presupuesto)
    
    # Retornar con nombre de marca
    return PresupuestoMensualResponse(
        id=presupuesto.id,
        mes=presupuesto.mes,
        anio=presupuesto.anio,
        categoria=presupuesto.categoria,
        marca_id=presupuesto.marca_id,
        marca_nombre=marca.cuenta,
        monto=presupuesto.monto,
        monto_mensual_base=presupuesto.monto_mensual_base,
        fecha_modificacion=presupuesto.fecha_modificacion,
        modificado_por=presupuesto.modificado_por
    )


@router.delete("/{presupuesto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presupuesto_mensual(
    presupuesto_id: int,
    user: user_dependency,
    db: db_dependency
):
    """Eliminar un presupuesto mensual (solo administradores)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if user_role != 'administrador':
        raise HTTPException(status_code=403, detail='Solo los administradores pueden eliminar presupuestos')
    
    # Buscar el presupuesto
    presupuesto = db.query(PresupuestoMensual).filter(PresupuestoMensual.id == presupuesto_id).first()
    
    if not presupuesto:
        raise HTTPException(status_code=404, detail='Presupuesto no encontrado')
    
    db.delete(presupuesto)
    db.commit()
    
    return None


@router.get("/suma", response_model=PresupuestoMensualSumaResponse, status_code=status.HTTP_200_OK)
async def get_suma_presupuestos_mensuales(
    user: user_dependency, 
    db: db_dependency, 
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mes"),
    anio: Optional[int] = Query(None, ge=2020, le=2050, description="Filtrar por año"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    marca_id: Optional[int] = Query(None, description="Filtrar por agencia/marca")
):
    """
    Obtener suma de presupuestos mensuales con filtros
    """
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(
        func.sum(PresupuestoMensual.monto).label('monto_total'),
        func.count(PresupuestoMensual.id).label('cantidad_registros')
    )
    
    # Aplicar filtros
    if mes is not None:
        query = query.filter(PresupuestoMensual.mes == mes)
    if anio is not None:
        query = query.filter(PresupuestoMensual.anio == anio)
    if categoria:
        query = query.filter(PresupuestoMensual.categoria == categoria)
    if marca_id is not None:
        query = query.filter(PresupuestoMensual.marca_id == marca_id)
    
    result = query.first()
    
    if not result or result[0] is None:
        raise HTTPException(status_code=404, detail='No se encontraron presupuestos con los filtros especificados')
    
    return PresupuestoMensualSumaResponse(
        mes=mes,
        anio=anio,
        categoria=categoria,
        marca_id=marca_id,
        monto_total=float(result[0]) if result[0] else 0.0,
        cantidad_registros=int(result[1]) if result[1] else 0
    )