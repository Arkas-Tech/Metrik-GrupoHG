from typing import Annotated
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path
from starlette import status
from models import Marcas
from database import SessionLocal
from .auth import get_current_user


router = APIRouter(
    prefix='/marcas',
    tags=['marcas']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class MarcaRequest(BaseModel):
    cuenta: str = Field(min_length=3)
    coordinador: str = Field(min_length=3, max_length=100)
    administrador: str = Field(min_length=3, max_length=100)


@router.get("/todas/", status_code=status.HTTP_200_OK)
async def read_all_marcas(user: user_dependency, db: db_dependency):
    """Obtener todas las marcas disponibles (sin filtro por usuario)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    return db.query(Marcas).all()


@router.get("/marca/", status_code=status.HTTP_200_OK)
async def read_all(user: user_dependency, db: db_dependency):
    """Obtener todas las marcas (necesario para filtros y selecciones)"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Retornar todas las marcas para todos los usuarios autenticados
    # Esto es necesario para presupuestos, filtros, y selecciones
    return db.query(Marcas).all()


@router.get("/marca/{marca_id}", status_code=status.HTTP_200_OK)
async def read_marca(user: user_dependency, db: db_dependency, marca_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    marca_model = db.query(Marcas).filter(Marcas.id == marca_id)\
        .filter(Marcas.user_id == user.get('id')).first()
    if marca_model is not None:
        return marca_model
    raise HTTPException(status_code=404, detail='No se encontró la Marca')


@router.post('/marca', status_code=status.HTTP_201_CREATED)
async def create_marca(user: user_dependency, 
                       db: db_dependency,
                        marca_request: MarcaRequest):
    if user is None or user.get('user_role') not in ['admin', 'coor']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    marca_model = Marcas(**marca_request.dict(), user_id=user.get('id'))

    db.add(marca_model)
    db.commit()

@router.put("/marca/{marca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_marca(user: user_dependency,
                       db: db_dependency, 
                       marca_request: MarcaRequest,
                       marca_id: int = Path(gt=0)):
    if user is None or user.get('user_role') not in ['admin', 'coor']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    marca_model = db.query(Marcas).filter(Marcas.id == marca_id)\
        .filter(Marcas.user_id == user.get('id')).first()
    if marca_model is None:
        raise HTTPException(status_code=404, detail='No se encontró la Marca')
    
    marca_model.cuenta = marca_request.cuenta
    marca_model.coordinador = marca_request.coordinador
    marca_model.administrador = marca_request.administrador

    db.add(marca_model)
    db.commit()

@router.delete("/marca/{marca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_marca(user: user_dependency, db: db_dependency, marca_id: int = Path(gt=0)):
    if user is None or user.get('user_role') not in ['admin', 'coor']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    marca_model = db.query(Marcas).filter(Marcas.id == marca_id)\
        .filter(Marcas.user_id == user.get('id')).first()
    if marca_model is None:
        raise HTTPException(status_code=404, detail='No se encontró la Marca')
    
    db.query(Marcas).filter(Marcas.id == marca_id).filter(Marcas.user_id == user.get('id')).delete()
    db.commit()