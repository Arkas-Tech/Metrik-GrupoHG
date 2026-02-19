from typing import Annotated, Optional, Dict
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Body
from starlette import status
from models import Marcas, Users
from database import SessionLocal
from .auth import CreateUserRequest, get_current_user, bcrypt_context
import json


class UpdatePermisosRequest(BaseModel):
    permisos: Optional[Dict] = None
    permisos_agencias: Optional[Dict] = None


router = APIRouter(
    prefix='/admin',
    tags=['admin']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@router.get("/user", status_code=status.HTTP_200_OK)
async def read_all_users(user: user_dependency, db: db_dependency):
    if user is None or user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    users = db.query(Users).all()
    
    # Parsear JSON strings a objetos para permisos
    result = []
    for u in users:
        user_dict = {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'full_name': u.full_name,
            'role': u.role,
            'permisos': json.loads(u.permisos) if u.permisos else None,
            'permisos_agencias': json.loads(u.permisos_agencias) if u.permisos_agencias else None
        }
        result.append(user_dict)
    
    return result

@router.post("/user", status_code=status.HTTP_201_CREATED)
async def create_user(user: user_dependency,
                      db: db_dependency, 
                      create_user_request: CreateUserRequest):
    if user is None or user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    create_user_model = Users(
        email=create_user_request.email,
        username=create_user_request.username,
        full_name=create_user_request.full_name,
        hashed_password=bcrypt_context.hash(create_user_request.password),
        role=create_user_request.role
    )
    db.add(create_user_model)
    db.commit()


@router.delete("/user/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user: user_dependency,
                       db: db_dependency,
                       user_id: int = Path(gt=0)):
    if user is None or user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    user_model = db.query(Users).filter(Users.id == user_id).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail='No se encontró Usuario')
    db.query(Users).filter(Users.id == user_id).delete()
    db.commit()


@router.get("/marca", status_code=status.HTTP_200_OK)
async def read_all(user: user_dependency, db: db_dependency):
    if user is None or user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    return db.query(Marcas).all()


@router.put("/user/{user_id}/permisos", status_code=status.HTTP_200_OK)
async def update_user_permisos(
    user: user_dependency,
    db: db_dependency,
    user_id: int = Path(gt=0),
    permisos_data: UpdatePermisosRequest = Body(...)
):
    if user is None or user.get('role') not in ['administrador', 'admin']:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_model = db.query(Users).filter(Users.id == user_id).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    
    # Actualizar permisos de navegación si se proporcionan
    if permisos_data.permisos is not None:
        user_model.permisos = json.dumps(permisos_data.permisos)
    
    # Actualizar permisos de agencias si se proporcionan
    if permisos_data.permisos_agencias is not None:
        user_model.permisos_agencias = json.dumps(permisos_data.permisos_agencias)
    
    db.commit()
    db.refresh(user_model)
    
    return {
        'message': 'Permisos actualizados correctamente',
        'user_id': user_id,
        'permisos': json.loads(user_model.permisos) if user_model.permisos else None,
        'permisos_agencias': json.loads(user_model.permisos_agencias) if user_model.permisos_agencias else None
    }

