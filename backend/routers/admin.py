from typing import Annotated
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path
from starlette import status
from models import Marcas, Users
from database import SessionLocal
from .auth import CreateUserRequest, get_current_user, bcrypt_context


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
    return db.query(Users).all()

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


