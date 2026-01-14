from typing import Annotated, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Eventos, BriefsEventos, ActividadesEventos, CronogramasEventos, Users
from database import SessionLocal
from .auth import get_current_user
from datetime import date, datetime
import json

router = APIRouter(
    prefix='/eventos',
    tags=['eventos']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class EventoRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: Optional[str] = None
    tipo_evento: str = Field(min_length=1, max_length=50)
    fecha_inicio: date
    fecha_fin: date
    ubicacion: Optional[str] = None
    marca: str = Field(min_length=1, max_length=100)
    responsable: str = Field(min_length=1, max_length=100)
    estado: str = Field(min_length=1, max_length=50)
    objetivo: Optional[str] = None
    audiencia: Optional[str] = None
    presupuesto_estimado: Optional[float] = None
    presupuesto_real: Optional[float] = None
    observaciones: Optional[str] = None

class EventoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    tipo_evento: str
    fecha_inicio: date
    fecha_fin: date
    ubicacion: Optional[str]
    marca: str
    responsable: str
    estado: str
    objetivo: Optional[str]
    audiencia: Optional[str]
    presupuesto_estimado: Optional[float]
    presupuesto_real: Optional[float]
    observaciones: Optional[str]
    creado_por: str

class ActividadEventoRequest(BaseModel):
    nombre: str
    descripcion: str
    duracion: str
    responsable: str
    recursos: str
    orden: Optional[int] = 0

class CronogramaEventoRequest(BaseModel):
    actividad: str
    fecha_inicio: datetime
    fecha_fin: datetime
    responsable: str
    estado: Optional[str] = 'Pendiente'
    orden: Optional[int] = 0

class BriefEventoRequest(BaseModel):
    objetivo_especifico: str
    audiencia_detallada: str
    mensaje_clave: str
    actividades: Optional[list[ActividadEventoRequest]] = []
    cronograma: Optional[list[CronogramaEventoRequest]] = []
    requerimientos: Optional[str] = None
    proveedores: Optional[str] = None
    logistica: Optional[str] = None
    presupuesto_detallado: Optional[str] = None
    observaciones_especiales: Optional[str] = None  # JSON string
    aprobado_por: Optional[str] = None
    fecha_aprobacion: Optional[datetime] = None

class ActividadEventoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str
    duracion: str
    responsable: str
    recursos: str
    orden: int

class CronogramaEventoResponse(BaseModel):
    id: int
    actividad: str
    fecha_inicio: datetime
    fecha_fin: datetime
    responsable: str
    estado: str
    orden: int

class BriefEventoResponse(BaseModel):
    id: int
    evento_id: int
    objetivo_especifico: str
    audiencia_detallada: str
    mensaje_clave: str
    actividades: list[ActividadEventoResponse]
    cronograma: list[CronogramaEventoResponse]
    requerimientos: Optional[str]
    proveedores: Optional[str]
    logistica: Optional[str]
    presupuesto_detallado: Optional[str]
    observaciones_especiales: Optional[str]
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime]
    creado_por: str
    aprobado_por: Optional[str]
    fecha_aprobacion: Optional[datetime]

@router.get("/", response_model=list[EventoResponse], status_code=status.HTTP_200_OK)
async def read_all_eventos(user: user_dependency, db: db_dependency, 
                          marca: Optional[str] = Query(None),
                          estado: Optional[str] = Query(None),
                          fecha_inicio: Optional[date] = Query(None),
                          fecha_fin: Optional[date] = Query(None),
                          responsable: Optional[str] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(Eventos)
    
    if marca:
        query = query.filter(Eventos.marca == marca)
    if estado:
        query = query.filter(Eventos.estado == estado)
    if fecha_inicio:
        query = query.filter(Eventos.fecha_inicio >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Eventos.fecha_fin <= fecha_fin)
    if responsable:
        query = query.filter(Eventos.responsable.ilike(f'%{responsable}%'))
        
    return query.order_by(Eventos.fecha_inicio.desc()).all()

@router.get("/{evento_id}", response_model=EventoResponse, status_code=status.HTTP_200_OK)
async def read_evento(user: user_dependency, db: db_dependency, evento_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    
    return evento

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_evento(user: user_dependency, db: db_dependency, evento_request: EventoRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    evento_model = Eventos(
        nombre=evento_request.nombre,
        descripcion=evento_request.descripcion,
        tipo_evento=evento_request.tipo_evento,
        fecha_inicio=evento_request.fecha_inicio,
        fecha_fin=evento_request.fecha_fin,
        ubicacion=evento_request.ubicacion,
        marca=evento_request.marca,
        responsable=evento_request.responsable,
        estado=evento_request.estado,
        objetivo=evento_request.objetivo,
        audiencia=evento_request.audiencia,
        presupuesto_estimado=evento_request.presupuesto_estimado,
        presupuesto_real=evento_request.presupuesto_real,
        observaciones=evento_request.observaciones,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )

    db.add(evento_model)
    db.commit()
    db.refresh(evento_model)
    return evento_model

@router.put("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_evento(user: user_dependency, db: db_dependency, 
                       evento_request: EventoRequest, evento_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')

    evento.nombre = evento_request.nombre
    evento.descripcion = evento_request.descripcion
    evento.tipo_evento = evento_request.tipo_evento
    evento.fecha_inicio = evento_request.fecha_inicio
    evento.fecha_fin = evento_request.fecha_fin
    evento.ubicacion = evento_request.ubicacion
    evento.marca = evento_request.marca
    evento.responsable = evento_request.responsable
    evento.estado = evento_request.estado
    evento.objetivo = evento_request.objetivo
    evento.audiencia = evento_request.audiencia
    evento.presupuesto_estimado = evento_request.presupuesto_estimado
    evento.presupuesto_real = evento_request.presupuesto_real
    evento.observaciones = evento_request.observaciones

    db.add(evento)
    db.commit()

@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evento(user: user_dependency, db: db_dependency, evento_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')

    # Buscar el brief asociado al evento
    brief = db.query(BriefsEventos).filter(BriefsEventos.evento_id == evento_id).first()
    
    if brief:
        # Eliminar actividades del brief
        db.query(ActividadesEventos).filter(ActividadesEventos.brief_id == brief.id).delete()
        
        # Eliminar cronogramas del brief
        db.query(CronogramasEventos).filter(CronogramasEventos.brief_id == brief.id).delete()
        
        # Eliminar el brief
        db.delete(brief)
    
    # Eliminar el evento
    db.delete(evento)
    db.commit()

# ENDPOINTS PARA BRIEFS

@router.post("/{evento_id}/brief", response_model=BriefEventoResponse, status_code=status.HTTP_201_CREATED)
async def create_brief(user: user_dependency, db: db_dependency, 
                      evento_id: int, brief_request: BriefEventoRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Verificar que el evento existe
    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    
    # Verificar si ya existe un brief para este evento
    existing_brief = db.query(BriefsEventos).filter(BriefsEventos.evento_id == evento_id).first()
    if existing_brief:
        raise HTTPException(status_code=400, detail='Ya existe un brief para este evento')
    
    # Crear el brief
    brief_model = BriefsEventos(
        evento_id=evento_id,
        objetivo_especifico=brief_request.objetivo_especifico,
        audiencia_detallada=brief_request.audiencia_detallada,
        mensaje_clave=brief_request.mensaje_clave,
        requerimientos=brief_request.requerimientos,
        proveedores=brief_request.proveedores,
        logistica=brief_request.logistica,
        presupuesto_detallado=brief_request.presupuesto_detallado,
        observaciones_especiales=brief_request.observaciones_especiales,
        creado_por=user.get('username'),
        aprobado_por=brief_request.aprobado_por,
        fecha_aprobacion=brief_request.fecha_aprobacion,
        user_id=user.get('id')
    )
    
    db.add(brief_model)
    db.commit()
    db.refresh(brief_model)
    
    # Agregar actividades
    actividades_response = []
    for actividad_request in brief_request.actividades:
        actividad_model = ActividadesEventos(
            brief_id=brief_model.id,
            nombre=actividad_request.nombre,
            descripcion=actividad_request.descripcion,
            duracion=actividad_request.duracion,
            responsable=actividad_request.responsable,
            recursos=actividad_request.recursos,
            orden=actividad_request.orden,
            user_id=user.get('id')
        )
        db.add(actividad_model)
        db.commit()
        db.refresh(actividad_model)
        
        actividades_response.append(ActividadEventoResponse(
            id=actividad_model.id,
            nombre=actividad_model.nombre,
            descripcion=actividad_model.descripcion,
            duracion=actividad_model.duracion,
            responsable=actividad_model.responsable,
            recursos=actividad_model.recursos,
            orden=actividad_model.orden
        ))
    
    # Agregar cronograma
    cronograma_response = []
    for cronograma_request in brief_request.cronograma:
        cronograma_model = CronogramasEventos(
            brief_id=brief_model.id,
            actividad=cronograma_request.actividad,
            fecha_inicio=cronograma_request.fecha_inicio,
            fecha_fin=cronograma_request.fecha_fin,
            responsable=cronograma_request.responsable,
            estado=cronograma_request.estado,
            orden=cronograma_request.orden,
            user_id=user.get('id')
        )
        db.add(cronograma_model)
        db.commit()
        db.refresh(cronograma_model)
        
        cronograma_response.append(CronogramaEventoResponse(
            id=cronograma_model.id,
            actividad=cronograma_model.actividad,
            fecha_inicio=cronograma_model.fecha_inicio,
            fecha_fin=cronograma_model.fecha_fin,
            responsable=cronograma_model.responsable,
            estado=cronograma_model.estado,
            orden=cronograma_model.orden
        ))
    
    return BriefEventoResponse(
        id=brief_model.id,
        evento_id=brief_model.evento_id,
        objetivo_especifico=brief_model.objetivo_especifico,
        audiencia_detallada=brief_model.audiencia_detallada,
        mensaje_clave=brief_model.mensaje_clave,
        actividades=actividades_response,
        cronograma=cronograma_response,
        requerimientos=brief_model.requerimientos,
        proveedores=brief_model.proveedores,
        logistica=brief_model.logistica,
        presupuesto_detallado=brief_model.presupuesto_detallado,
        observaciones_especiales=brief_model.observaciones_especiales,
        fecha_creacion=brief_model.fecha_creacion,
        fecha_modificacion=brief_model.fecha_modificacion,
        creado_por=brief_model.creado_por,
        aprobado_por=brief_model.aprobado_por,
        fecha_aprobacion=brief_model.fecha_aprobacion
    )

@router.get("/{evento_id}/brief", response_model=BriefEventoResponse, status_code=status.HTTP_200_OK)
async def get_brief(user: user_dependency, db: db_dependency, evento_id: int):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Verificar que el evento existe
    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    
    # Obtener el brief con join a Users para obtener el nombre completo
    brief = db.query(BriefsEventos).filter(BriefsEventos.evento_id == evento_id).first()
    if brief is None:
        raise HTTPException(status_code=404, detail='Brief no encontrado')
    
    # Obtener nombre completo del creador
    creado_por_nombre = brief.creado_por  # Default al username
    if brief.user_id:
        usuario = db.query(Users).filter(Users.id == brief.user_id).first()
        if usuario and usuario.full_name:
            creado_por_nombre = usuario.full_name
    
    # Obtener actividades
    actividades = db.query(ActividadesEventos).filter(ActividadesEventos.brief_id == brief.id)\
        .order_by(ActividadesEventos.orden).all()
    
    actividades_response = [
        ActividadEventoResponse(
            id=actividad.id,
            nombre=actividad.nombre,
            descripcion=actividad.descripcion,
            duracion=actividad.duracion,
            responsable=actividad.responsable,
            recursos=actividad.recursos,
            orden=actividad.orden
        ) for actividad in actividades
    ]
    
    # Obtener cronograma
    cronograma = db.query(CronogramasEventos).filter(CronogramasEventos.brief_id == brief.id)\
        .order_by(CronogramasEventos.orden).all()
    
    cronograma_response = [
        CronogramaEventoResponse(
            id=crono.id,
            actividad=crono.actividad,
            fecha_inicio=crono.fecha_inicio,
            fecha_fin=crono.fecha_fin,
            responsable=crono.responsable,
            estado=crono.estado,
            orden=crono.orden
        ) for crono in cronograma
    ]
    
    return BriefEventoResponse(
        id=brief.id,
        evento_id=brief.evento_id,
        objetivo_especifico=brief.objetivo_especifico,
        audiencia_detallada=brief.audiencia_detallada,
        mensaje_clave=brief.mensaje_clave,
        actividades=actividades_response,
        cronograma=cronograma_response,
        requerimientos=brief.requerimientos,
        proveedores=brief.proveedores,
        logistica=brief.logistica,
        presupuesto_detallado=brief.presupuesto_detallado,
        observaciones_especiales=brief.observaciones_especiales,
        fecha_creacion=brief.fecha_creacion,
        fecha_modificacion=brief.fecha_modificacion,
        creado_por=creado_por_nombre,  # Usar nombre completo en lugar de username
        aprobado_por=brief.aprobado_por,
        fecha_aprobacion=brief.fecha_aprobacion
    )

@router.put("/{evento_id}/brief", response_model=BriefEventoResponse, status_code=status.HTTP_200_OK)
async def update_brief(user: user_dependency, db: db_dependency, 
                      evento_id: int, brief_request: BriefEventoRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Verificar que el evento existe
    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    
    # Obtener el brief existente
    brief = db.query(BriefsEventos).filter(BriefsEventos.evento_id == evento_id).first()
    if brief is None:
        raise HTTPException(status_code=404, detail='Brief no encontrado')
    
    # Actualizar el brief
    brief.objetivo_especifico = brief_request.objetivo_especifico
    brief.audiencia_detallada = brief_request.audiencia_detallada
    brief.mensaje_clave = brief_request.mensaje_clave
    brief.requerimientos = brief_request.requerimientos
    brief.proveedores = brief_request.proveedores
    brief.logistica = brief_request.logistica
    brief.presupuesto_detallado = brief_request.presupuesto_detallado
    brief.observaciones_especiales = brief_request.observaciones_especiales
    brief.aprobado_por = brief_request.aprobado_por
    brief.fecha_aprobacion = brief_request.fecha_aprobacion
    
    db.add(brief)
    db.commit()
    
    # Eliminar actividades existentes y crear nuevas
    db.query(ActividadesEventos).filter(ActividadesEventos.brief_id == brief.id).delete()
    db.commit()
    
    actividades_response = []
    for actividad_request in brief_request.actividades:
        actividad_model = ActividadesEventos(
            brief_id=brief.id,
            nombre=actividad_request.nombre,
            descripcion=actividad_request.descripcion,
            duracion=actividad_request.duracion,
            responsable=actividad_request.responsable,
            recursos=actividad_request.recursos,
            orden=actividad_request.orden,
            user_id=user.get('id')
        )
        db.add(actividad_model)
        db.commit()
        db.refresh(actividad_model)
        
        actividades_response.append(ActividadEventoResponse(
            id=actividad_model.id,
            nombre=actividad_model.nombre,
            descripcion=actividad_model.descripcion,
            duracion=actividad_model.duracion,
            responsable=actividad_model.responsable,
            recursos=actividad_model.recursos,
            orden=actividad_model.orden
        ))
    
    # Eliminar cronograma existente y crear nuevo
    db.query(CronogramasEventos).filter(CronogramasEventos.brief_id == brief.id).delete()
    db.commit()
    
    cronograma_response = []
    for cronograma_request in brief_request.cronograma:
        cronograma_model = CronogramasEventos(
            brief_id=brief.id,
            actividad=cronograma_request.actividad,
            fecha_inicio=cronograma_request.fecha_inicio,
            fecha_fin=cronograma_request.fecha_fin,
            responsable=cronograma_request.responsable,
            estado=cronograma_request.estado,
            orden=cronograma_request.orden,
            user_id=user.get('id')
        )
        db.add(cronograma_model)
        db.commit()
        db.refresh(cronograma_model)
        
        cronograma_response.append(CronogramaEventoResponse(
            id=cronograma_model.id,
            actividad=cronograma_model.actividad,
            fecha_inicio=cronograma_model.fecha_inicio,
            fecha_fin=cronograma_model.fecha_fin,
            responsable=cronograma_model.responsable,
            estado=cronograma_model.estado,
            orden=cronograma_model.orden
        ))
    
    return BriefEventoResponse(
        id=brief.id,
        evento_id=brief.evento_id,
        objetivo_especifico=brief.objetivo_especifico,
        audiencia_detallada=brief.audiencia_detallada,
        mensaje_clave=brief.mensaje_clave,
        actividades=actividades_response,
        cronograma=cronograma_response,
        requerimientos=brief.requerimientos,
        proveedores=brief.proveedores,
        logistica=brief.logistica,
        presupuesto_detallado=brief.presupuesto_detallado,
        observaciones_especiales=brief.observaciones_especiales,
        fecha_creacion=brief.fecha_creacion,
        fecha_modificacion=brief.fecha_modificacion,
        creado_por=brief.creado_por,
        aprobado_por=brief.aprobado_por,
        fecha_aprobacion=brief.fecha_aprobacion
    )

@router.delete("/{evento_id}/brief", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brief(user: user_dependency, db: db_dependency, evento_id: int):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Verificar que el evento existe
    evento = db.query(Eventos).filter(Eventos.id == evento_id).first()
    
    if evento is None:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    
    # Obtener el brief
    brief = db.query(BriefsEventos).filter(BriefsEventos.evento_id == evento_id).first()
    if brief is None:
        raise HTTPException(status_code=404, detail='Brief no encontrado')
    
    # Eliminar actividades y cronograma relacionados
    db.query(ActividadesEventos).filter(ActividadesEventos.brief_id == brief.id).delete()
    db.query(CronogramasEventos).filter(CronogramasEventos.brief_id == brief.id).delete()
    
    # Eliminar el brief
    db.delete(brief)
    db.commit()

@router.get("/estadisticas", status_code=status.HTTP_200_OK)
async def get_estadisticas_eventos(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    eventos = db.query(Eventos).all()
    
    # Calcular estadísticas
    estadisticas = {
        "realizados": sum(1 for e in eventos if e.estado == "Realizado"),
        "prospectados": sum(1 for e in eventos if e.estado == "Prospectado"),
        "confirmados": sum(1 for e in eventos if e.estado == "Confirmado"),
        "porSuceder": sum(1 for e in eventos if e.estado == "Por Suceder"),
        "cancelados": sum(1 for e in eventos if e.estado == "Cancelado"),
        "total": len(eventos),
        "presupuestoTotal": sum(e.presupuesto_estimado or 0 for e in eventos),
        "presupuestoReal": sum(e.presupuesto_real or 0 for e in eventos),
        "marcas": list(set(e.marca for e in eventos if e.marca)),
        "responsables": list(set(e.responsable for e in eventos if e.responsable))
    }
    
    # Calcular diferencia
    estadisticas["diferencia"] = estadisticas["presupuestoTotal"] - estadisticas["presupuestoReal"]
    
    return estadisticas