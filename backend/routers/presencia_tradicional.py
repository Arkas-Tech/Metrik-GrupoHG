from typing import Annotated, Optional, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import PresenciaTradicional
from database import SessionLocal
from .auth import get_current_user
from datetime import date

router = APIRouter(
    prefix='/presencia-tradicional',
    tags=['presencia-tradicional']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class PresenciaTradicionalRequest(BaseModel):
    tipo: str = Field(min_length=1, max_length=50)
    nombre: str = Field(min_length=1, max_length=200)
    agencia: Optional[str] = None
    marca: str = Field(min_length=1, max_length=100)
    ciudad: Optional[str] = None
    campanya: Optional[str] = None
    ubicacion: Optional[str] = None
    contenido: Optional[str] = None
    notas: Optional[str] = None
    fecha_instalacion: date
    duracion: Optional[str] = None
    cambio_lona: Optional[date] = None
    vista: Optional[str] = None
    iluminacion: Optional[str] = None
    dimensiones: Optional[str] = None
    proveedor: Optional[str] = None
    codigo_proveedor: Optional[str] = None
    costo_mensual: Optional[float] = None
    duracion_contrato: Optional[str] = None
    inicio_contrato: Optional[date] = None
    termino_contrato: Optional[date] = None
    impresion: Optional[str] = None
    costo_impresion: Optional[float] = None
    instalacion: Optional[str] = None
    imagenes_json: Optional[str] = None
    observaciones: Optional[str] = None

class PresenciaTradicionalResponse(BaseModel):
    id: int
    tipo: str
    nombre: str
    agencia: Optional[str]
    marca: str
    ciudad: Optional[str]
    campanya: Optional[str]
    ubicacion: Optional[str]
    contenido: Optional[str]
    notas: Optional[str]
    fecha_instalacion: date
    duracion: Optional[str]
    cambio_lona: Optional[date]
    vista: Optional[str]
    iluminacion: Optional[str]
    dimensiones: Optional[str]
    proveedor: Optional[str]
    codigo_proveedor: Optional[str]
    costo_mensual: Optional[float]
    duracion_contrato: Optional[str]
    inicio_contrato: Optional[date]
    termino_contrato: Optional[date]
    impresion: Optional[str]
    costo_impresion: Optional[float]
    instalacion: Optional[str]
    imagenes_json: Optional[str]
    observaciones: Optional[str]
    creado_por: str

@router.get("/", response_model=list[PresenciaTradicionalResponse], status_code=status.HTTP_200_OK)
async def read_all_presencia(user: user_dependency, db: db_dependency,
                             marca: Optional[str] = Query(None),
                             agencia: Optional[str] = Query(None),
                             tipo: Optional[str] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(PresenciaTradicional)
    
    if marca:
        query = query.filter(PresenciaTradicional.marca.ilike(marca))
    if agencia:
        query = query.filter(PresenciaTradicional.agencia.ilike(agencia))
    if tipo:
        query = query.filter(PresenciaTradicional.tipo.ilike(tipo))
        
    presencias = query.all()
    return presencias

@router.get("/{presencia_id}", response_model=PresenciaTradicionalResponse, status_code=status.HTTP_200_OK)
async def read_presencia(user: user_dependency, db: db_dependency, presencia_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    presencia = db.query(PresenciaTradicional).filter(PresenciaTradicional.id == presencia_id).first()
    
    if presencia is None:
        raise HTTPException(status_code=404, detail='Presencia no encontrada')
    
    return presencia

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_presencia(user: user_dependency, db: db_dependency, presencia_request: PresenciaTradicionalRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    presencia_model = PresenciaTradicional(
        tipo=presencia_request.tipo,
        nombre=presencia_request.nombre,
        agencia=presencia_request.agencia,
        marca=presencia_request.marca,
        ciudad=presencia_request.ciudad,
        campanya=presencia_request.campanya,
        ubicacion=presencia_request.ubicacion,
        contenido=presencia_request.contenido,
        notas=presencia_request.notas,
        fecha_instalacion=presencia_request.fecha_instalacion,
        duracion=presencia_request.duracion,
        cambio_lona=presencia_request.cambio_lona,
        vista=presencia_request.vista,
        iluminacion=presencia_request.iluminacion,
        dimensiones=presencia_request.dimensiones,
        proveedor=presencia_request.proveedor,
        codigo_proveedor=presencia_request.codigo_proveedor,
        costo_mensual=presencia_request.costo_mensual,
        duracion_contrato=presencia_request.duracion_contrato,
        inicio_contrato=presencia_request.inicio_contrato,
        termino_contrato=presencia_request.termino_contrato,
        impresion=presencia_request.impresion,
        costo_impresion=presencia_request.costo_impresion,
        instalacion=presencia_request.instalacion,
        imagenes_json=presencia_request.imagenes_json,
        observaciones=presencia_request.observaciones,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )
    
    db.add(presencia_model)
    db.commit()
    db.refresh(presencia_model)
    
    return {"id": presencia_model.id, "message": "Presencia tradicional creada exitosamente"}

@router.put("/{presencia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_presencia(user: user_dependency, db: db_dependency, 
                           presencia_request: PresenciaTradicionalRequest,
                           presencia_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    presencia_model = db.query(PresenciaTradicional).filter(PresenciaTradicional.id == presencia_id).first()
    
    if presencia_model is None:
        raise HTTPException(status_code=404, detail='Presencia no encontrada')
    
    presencia_model.tipo = presencia_request.tipo
    presencia_model.nombre = presencia_request.nombre
    presencia_model.agencia = presencia_request.agencia
    presencia_model.marca = presencia_request.marca
    presencia_model.ciudad = presencia_request.ciudad
    presencia_model.campanya = presencia_request.campanya
    presencia_model.ubicacion = presencia_request.ubicacion
    presencia_model.contenido = presencia_request.contenido
    presencia_model.notas = presencia_request.notas
    presencia_model.fecha_instalacion = presencia_request.fecha_instalacion
    presencia_model.duracion = presencia_request.duracion
    presencia_model.cambio_lona = presencia_request.cambio_lona
    presencia_model.vista = presencia_request.vista
    presencia_model.iluminacion = presencia_request.iluminacion
    presencia_model.dimensiones = presencia_request.dimensiones
    presencia_model.proveedor = presencia_request.proveedor
    presencia_model.codigo_proveedor = presencia_request.codigo_proveedor
    presencia_model.costo_mensual = presencia_request.costo_mensual
    presencia_model.duracion_contrato = presencia_request.duracion_contrato
    presencia_model.inicio_contrato = presencia_request.inicio_contrato
    presencia_model.termino_contrato = presencia_request.termino_contrato
    presencia_model.impresion = presencia_request.impresion
    presencia_model.costo_impresion = presencia_request.costo_impresion
    presencia_model.instalacion = presencia_request.instalacion
    presencia_model.imagenes_json = presencia_request.imagenes_json
    presencia_model.observaciones = presencia_request.observaciones
    
    db.commit()

@router.delete("/{presencia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presencia(user: user_dependency, db: db_dependency, presencia_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Solo administradores pueden eliminar
    if user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=403, detail='No tienes permisos para eliminar presencias')
    
    presencia_model = db.query(PresenciaTradicional).filter(PresenciaTradicional.id == presencia_id).first()
    
    if presencia_model is None:
        raise HTTPException(status_code=404, detail='Presencia no encontrada')
    
    db.delete(presencia_model)
    db.commit()
