from typing import Annotated, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Proyecciones
from database import SessionLocal
from .auth import get_current_user

def can_access_data(user_role: str) -> bool:
    """Determina si el usuario puede acceder a los datos según su rol"""
    # Todos los roles pueden acceder a los datos
    return user_role in ['administrador', 'admin', 'coordinador', 'coor', 'auditor', 'aud']

def can_modify_data(user_role: str) -> bool:
    """Determina si el usuario puede modificar datos según su rol"""
    # Solo administradores y coordinadores pueden modificar datos
    return user_role in ['administrador', 'admin', 'coordinador', 'coor']

def can_delete_data(user_role: str) -> bool:
    """Determina si el usuario puede eliminar datos según su rol"""
    # Administradores y coordinadores pueden eliminar datos
    return user_role in ['administrador', 'admin', 'coordinador', 'coor']

def get_query_for_user(query, user_role: str, user_id: int):
    """Aplica filtros según el rol del usuario"""
    if user_role in ['administrador', 'admin']:
        # Los administradores ven todo
        return query
    elif user_role in ['coordinador', 'coor']:
        # Los coordinadores ven todo también
        return query
    elif user_role in ['auditor', 'aud']:
        # Los auditores ven todo también (solo lectura)
        return query
    else:
        # Usuarios sin rol definido solo ven sus propios datos
        return query.filter(Proyecciones.user_id == user_id)

router = APIRouter(
    prefix='/proyecciones',
    tags=['proyecciones']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class ProyeccionRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    marca: str = Field(min_length=1, max_length=100)
    periodo: Optional[str] = Field(None, min_length=1, max_length=50)  # "mensual", "trimestral", "anual"
    año: Optional[int] = Field(None, ge=2020, le=2050)
    ano: Optional[int] = Field(None, ge=2020, le=2050)  # Alternativa sin tilde
    mes: Optional[int] = Field(None, ge=1, le=12)
    trimestre: Optional[int] = Field(None, ge=1, le=4)
    categoria: Optional[str] = Field(None, min_length=1, max_length=100)
    monto_proyectado: Optional[float] = Field(None, gt=0)
    monto_real: Optional[float] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = Field(None, min_length=1, max_length=50)
    partidas_json: Optional[str] = None  # JSON string para partidas

class ProyeccionResponse(BaseModel):
    id: int
    nombre: str
    marca: str
    periodo: Optional[str]
    año: Optional[int]
    mes: Optional[int]
    trimestre: Optional[int]
    categoria: Optional[str]
    monto_proyectado: float
    monto_real: Optional[float]
    descripcion: Optional[str]
    estado: str
    creado_por: str
    partidas_json: Optional[str] = None
@router.get("/simple", status_code=status.HTTP_200_OK)
async def get_proyecciones_simple(user: user_dependency, db: db_dependency):
    """Endpoint simple para obtener proyecciones para selects (sin partidas_json)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a proyecciones')
    
    query = db.query(Proyecciones.id, Proyecciones.nombre, Proyecciones.marca, 
                    Proyecciones.año, Proyecciones.mes, Proyecciones.monto_proyectado,
                    Proyecciones.monto_real).filter(Proyecciones.estado == "Activo")
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    proyecciones = query.all()
    
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "marca": p.marca,
            "año": p.año,
            "mes": p.mes,
            "monto_proyectado": p.monto_proyectado,
            "monto_real": p.monto_real or 0
        }
        for p in proyecciones
    ]
@router.get("/", response_model=list[ProyeccionResponse], status_code=status.HTTP_200_OK)
async def read_all_proyecciones(user: user_dependency, db: db_dependency,
                               marca: Optional[str] = Query(None),
                               año: Optional[int] = Query(None),
                               periodo: Optional[str] = Query(None),
                               categoria: Optional[str] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a proyecciones')
    
    query = db.query(Proyecciones)
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    if marca:
        query = query.filter(Proyecciones.marca == marca)
    if año:
        query = query.filter(Proyecciones.año == año)
    if periodo:
        query = query.filter(Proyecciones.periodo == periodo)
    if categoria:
        query = query.filter(Proyecciones.categoria == categoria)
        
    return query.all()

@router.get("/{proyeccion_id}", response_model=ProyeccionResponse, status_code=status.HTTP_200_OK)
async def read_proyeccion(user: user_dependency, db: db_dependency, proyeccion_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    user_role = user.get('role', '')
    if not can_access_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a proyecciones')

    query = db.query(Proyecciones).filter(Proyecciones.id == proyeccion_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    proyeccion = query.first()
    
    if proyeccion is None:
        raise HTTPException(status_code=404, detail='Proyección no encontrada')
    
    return proyeccion

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_proyeccion(user: user_dependency, db: db_dependency, proyeccion_request: ProyeccionRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_modify_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para crear proyecciones')

    # Validar que no exista una proyección para el mismo mes, año y marca
    proyeccion_existente = db.query(Proyecciones).filter(
        Proyecciones.año == proyeccion_request.año,
        Proyecciones.mes == proyeccion_request.mes,
        Proyecciones.marca == proyeccion_request.marca
    ).first()
    
    if proyeccion_existente:
        raise HTTPException(
            status_code=400, 
            detail=f'Ya existe una proyección para {proyeccion_request.marca} en el mes {proyeccion_request.mes} del año {proyeccion_request.año}'
        )

    proyeccion_model = Proyecciones(
        nombre=proyeccion_request.nombre,
        marca=proyeccion_request.marca,
        periodo=proyeccion_request.periodo,
        año=proyeccion_request.año,
        mes=proyeccion_request.mes,
        trimestre=proyeccion_request.trimestre,
        categoria=proyeccion_request.categoria,
        monto_proyectado=proyeccion_request.monto_proyectado,
        monto_real=proyeccion_request.monto_real,
        descripcion=proyeccion_request.descripcion,
        estado=proyeccion_request.estado,
        partidas_json=proyeccion_request.partidas_json,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )

    db.add(proyeccion_model)
    db.commit()
    db.refresh(proyeccion_model)
    return proyeccion_model

@router.put("/{proyeccion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_proyeccion(user: user_dependency, db: db_dependency, 
                           proyeccion_request: ProyeccionRequest, proyeccion_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_modify_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para editar proyecciones')

    query = db.query(Proyecciones).filter(Proyecciones.id == proyeccion_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    proyeccion = query.first()
    
    if proyeccion is None:
        raise HTTPException(status_code=404, detail='Proyección no encontrada')

    # Validar que no exista otra proyección con el mismo mes, año y marca (excepto la actual)
    proyeccion_duplicada = db.query(Proyecciones).filter(
        Proyecciones.id != proyeccion_id,
        Proyecciones.año == proyeccion_request.año,
        Proyecciones.mes == proyeccion_request.mes,
        Proyecciones.marca == proyeccion_request.marca
    ).first()
    
    if proyeccion_duplicada:
        raise HTTPException(
            status_code=400,
            detail=f'Ya existe otra proyección para {proyeccion_request.marca} en el mes {proyeccion_request.mes} del año {proyeccion_request.año}'
        )

    proyeccion.nombre = proyeccion_request.nombre
    proyeccion.marca = proyeccion_request.marca
    proyeccion.periodo = proyeccion_request.periodo
    proyeccion.año = proyeccion_request.año
    proyeccion.mes = proyeccion_request.mes
    proyeccion.trimestre = proyeccion_request.trimestre
    proyeccion.categoria = proyeccion_request.categoria
    proyeccion.monto_proyectado = proyeccion_request.monto_proyectado
    proyeccion.monto_real = proyeccion_request.monto_real
    proyeccion.descripcion = proyeccion_request.descripcion
    proyeccion.estado = proyeccion_request.estado
    proyeccion.partidas_json = proyeccion_request.partidas_json

    db.add(proyeccion)
    db.commit()

@router.delete("/{proyeccion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proyeccion(user: user_dependency, db: db_dependency, proyeccion_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_delete_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para eliminar proyecciones')

    query = db.query(Proyecciones).filter(Proyecciones.id == proyeccion_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    proyeccion = query.first()
    
    if proyeccion is None:
        raise HTTPException(status_code=404, detail='Proyección no encontrada')

    db.delete(proyeccion)
    db.commit()

@router.get("/resumen/por-marca", status_code=status.HTTP_200_OK)
async def resumen_por_marca(user: user_dependency, db: db_dependency, año: int = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_data(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a proyecciones')
    
    query = db.query(Proyecciones)
    
    # Aplicar filtros según el rol del usuario
    query = get_query_for_user(query, user_role, user.get('id'))
    
    if año:
        query = query.filter(Proyecciones.año == año)
    
    proyecciones = query.all()
    
    # Agrupar por marca
    resumen = {}
    for proyeccion in proyecciones:
        if proyeccion.marca not in resumen:
            resumen[proyeccion.marca] = {
                'marca': proyeccion.marca,
                'monto_proyectado_total': 0,
                'monto_real_total': 0,
                'proyecciones_count': 0
            }
        
        resumen[proyeccion.marca]['monto_proyectado_total'] += proyeccion.monto_proyectado
        if proyeccion.monto_real:
            resumen[proyeccion.marca]['monto_real_total'] += proyeccion.monto_real
        resumen[proyeccion.marca]['proyecciones_count'] += 1
    
    return list(resumen.values())