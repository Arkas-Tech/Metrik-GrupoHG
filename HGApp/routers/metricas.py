from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from models import Metricas, Users
from routers.auth import get_current_user, get_db

router = APIRouter(
    prefix="/metricas",
    tags=["metricas"]
)

# Schemas
class MetricaBase(BaseModel):
    leads: int = 0
    citas: int = 0
    pisos: int = 0
    utilidades: int = 0
    mes: int
    anio: int
    marca: str  # Agencia requerida

class MetricaCreate(MetricaBase):
    pass

class MetricaUpdate(MetricaBase):
    pass

class MetricaResponse(MetricaBase):
    id: int
    fecha_creacion: datetime
    fecha_modificacion: datetime
    creado_por: str
    creado_por_nombre: Optional[str] = None

    class Config:
        from_attributes = True

# Endpoints
@router.get("", response_model=List[MetricaResponse])
def obtener_metricas(
    marca: Optional[str] = None,
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtener todas las métricas con filtros opcionales"""
    query = db.query(Metricas).outerjoin(Users, Metricas.user_id == Users.id)
    
    if marca:
        query = query.filter(Metricas.marca == marca)
    
    if mes:
        query = query.filter(Metricas.mes == mes)
    
    if anio:
        query = query.filter(Metricas.anio == anio)
    
    metricas = query.order_by(Metricas.fecha_modificacion.desc()).all()
    
    # Agregar nombre completo del usuario
    resultado = []
    for metrica in metricas:
        metrica_dict = {
            "id": metrica.id,
            "leads": metrica.leads,
            "citas": metrica.citas,
            "pisos": metrica.pisos,
            "utilidades": metrica.utilidades,
            "mes": metrica.mes,
            "anio": metrica.anio,
            "marca": metrica.marca,
            "fecha_creacion": metrica.fecha_creacion,
            "fecha_modificacion": metrica.fecha_modificacion,
            "creado_por": metrica.creado_por,
            "creado_por_nombre": None
        }
        
        # Buscar nombre completo del usuario
        if metrica.user_id:
            usuario = db.query(Users).filter(Users.id == metrica.user_id).first()
            if usuario:
                metrica_dict["creado_por_nombre"] = usuario.full_name
        
        resultado.append(metrica_dict)
    
    return resultado

@router.get("/{metrica_id}", response_model=MetricaResponse)
def obtener_metrica(
    metrica_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtener una métrica por ID"""
    metrica = db.query(Metricas).filter(Metricas.id == metrica_id).first()
    if not metrica:
        raise HTTPException(status_code=404, detail="Métrica no encontrada")
    return metrica

@router.post("", response_model=MetricaResponse, status_code=status.HTTP_201_CREATED)
def crear_metrica(
    metrica: MetricaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva métrica"""
    nueva_metrica = Metricas(
        leads=metrica.leads,
        citas=metrica.citas,
        pisos=metrica.pisos,
        utilidades=metrica.utilidades,
        mes=metrica.mes,
        anio=metrica.anio,
        marca=metrica.marca,
        creado_por=current_user.get('username', 'unknown'),
        user_id=current_user.get('id')
    )
    
    db.add(nueva_metrica)
    db.commit()
    db.refresh(nueva_metrica)
    return nueva_metrica

@router.put("/{metrica_id}", response_model=MetricaResponse)
def actualizar_metrica(
    metrica_id: int,
    metrica: MetricaUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Actualizar una métrica existente"""
    metrica_db = db.query(Metricas).filter(Metricas.id == metrica_id).first()
    if not metrica_db:
        raise HTTPException(status_code=404, detail="Métrica no encontrada")
    
    metrica_db.leads = metrica.leads
    metrica_db.citas = metrica.citas
    metrica_db.pisos = metrica.pisos
    metrica_db.utilidades = metrica.utilidades
    metrica_db.mes = metrica.mes
    metrica_db.anio = metrica.anio
    metrica_db.marca = metrica.marca
    
    db.commit()
    db.refresh(metrica_db)
    return metrica_db

@router.delete("/{metrica_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_metrica(
    metrica_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Eliminar una métrica"""
    metrica = db.query(Metricas).filter(Metricas.id == metrica_id).first()
    if not metrica:
        raise HTTPException(status_code=404, detail="Métrica no encontrada")
    
    db.delete(metrica)
    db.commit()
    return None
