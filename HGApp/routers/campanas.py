from typing import Annotated, Optional, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Campanas, Facturas
from database import SessionLocal
from .auth import get_current_user
from datetime import date

router = APIRouter(
    prefix='/campanas',
    tags=['campanas']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class CampanaRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    estado: str = Field(min_length=1, max_length=50)
    plataforma: str = Field(min_length=1, max_length=100)
    leads: Optional[int] = 0
    alcance: Optional[int] = 0
    interacciones: Optional[int] = 0
    ctr: Optional[float] = 0.0
    fecha_inicio: date
    fecha_fin: date
    presupuesto: float = Field(gt=0)
    auto_objetivo: str = Field(min_length=1, max_length=200)
    conversion: Optional[float] = 0.0
    cxc_porcentaje: Optional[float] = 0.0
    marca: str = Field(min_length=1, max_length=100)
    imagenes_json: Optional[str] = None

class CampanyaResponse(BaseModel):
    id: int
    nombre: str
    estado: str
    plataforma: str
    leads: int
    alcance: int
    interacciones: int
    ctr: float
    fecha_inicio: date
    fecha_fin: date
    presupuesto: float
    auto_objetivo: str
    conversion: float
    cxc_porcentaje: float
    marca: str
    imagenes_json: Optional[str]
    creado_por: str

@router.get("/", response_model=list[CampanyaResponse], status_code=status.HTTP_200_OK)
async def read_all_campanas(user: user_dependency, db: db_dependency,
                              marca: Optional[str] = Query(None),
                              estado: Optional[str] = Query(None),
                              plataforma: Optional[str] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(Campanas)
    
    if marca:
        query = query.filter(Campanas.marca == marca)
    if estado:
        query = query.filter(Campanas.estado == estado)
    if plataforma:
        query = query.filter(Campanas.plataforma == plataforma)
    
    # Ordenar por fecha_inicio desc, luego por fecha_creacion desc
    query = query.order_by(Campanas.fecha_inicio.desc(), Campanas.fecha_creacion.desc())
        
    campanas = query.all()
    return campanas

@router.get("/{campana_id}", response_model=CampanyaResponse, status_code=status.HTTP_200_OK)
async def read_campana(user: user_dependency, db: db_dependency, campana_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    campana = db.query(Campanas).filter(Campanas.id == campana_id).first()
    
    if campana is None:
        raise HTTPException(status_code=404, detail='Campaña no encontrada')
    
    return campana

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_campana(user: user_dependency, db: db_dependency, campana_request: CampanaRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    campana_model = Campanas(
        nombre=campana_request.nombre,
        estado=campana_request.estado,
        plataforma=campana_request.plataforma,
        leads=campana_request.leads,
        alcance=campana_request.alcance,
        interacciones=campana_request.interacciones,
        ctr=campana_request.ctr,
        fecha_inicio=campana_request.fecha_inicio,
        fecha_fin=campana_request.fecha_fin,
        presupuesto=campana_request.presupuesto,
        auto_objetivo=campana_request.auto_objetivo,
        conversion=campana_request.conversion,
        marca=campana_request.marca,
        imagenes_json=campana_request.imagenes_json,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )
    
    db.add(campana_model)
    db.commit()
    db.refresh(campana_model)
    
    return {"id": campana_model.id, "message": "Campaña creada exitosamente"}

@router.put("/{campana_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_campana(user: user_dependency, db: db_dependency, 
                         campana_request: CampanaRequest,
                         campana_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    campana_model = db.query(Campanas).filter(Campanas.id == campana_id).first()
    
    if campana_model is None:
        raise HTTPException(status_code=404, detail='Campaña no encontrada')
    
    campana_model.nombre = campana_request.nombre
    campana_model.estado = campana_request.estado
    campana_model.plataforma = campana_request.plataforma
    campana_model.leads = campana_request.leads
    campana_model.alcance = campana_request.alcance
    campana_model.interacciones = campana_request.interacciones
    campana_model.ctr = campana_request.ctr
    campana_model.fecha_inicio = campana_request.fecha_inicio
    campana_model.fecha_fin = campana_request.fecha_fin
    campana_model.presupuesto = campana_request.presupuesto
    campana_model.auto_objetivo = campana_request.auto_objetivo
    campana_model.conversion = campana_request.conversion
    campana_model.marca = campana_request.marca
    campana_model.imagenes_json = campana_request.imagenes_json
    
    db.commit()

@router.delete("/{campana_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campana(user: user_dependency, db: db_dependency, campana_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Solo administradores pueden eliminar
    if user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=403, detail='No tienes permisos para eliminar campañas')
    
    campana_model = db.query(Campanas).filter(Campanas.id == campana_id).first()
    
    if campana_model is None:
        raise HTTPException(status_code=404, detail='Campaña no encontrada')
    
    # Desasociar facturas relacionadas (poner campanya_id en NULL en lugar de eliminarlas)
    db.query(Facturas).filter(Facturas.campanya_id == campana_id).update({"campanya_id": None})
    
    db.delete(campana_model)
    db.commit()
