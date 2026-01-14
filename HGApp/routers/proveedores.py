from typing import Annotated, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Proveedores
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(
    prefix='/proveedores',
    tags=['proveedores']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class ProveedorRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    contacto: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=100)
    rfc: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    categoria: str = Field(min_length=1, max_length=100)
    activo: Optional[bool] = True

class ProveedorResponse(BaseModel):
    id: int
    nombre: str
    contacto: str
    email: str
    rfc: Optional[str]
    telefono: Optional[str]
    direccion: Optional[str]
    categoria: str
    activo: bool
    creado_por: str

@router.get("/rfc/{rfc}", response_model=ProveedorResponse, status_code=status.HTTP_200_OK)
async def get_proveedor_by_rfc(user: user_dependency, db: db_dependency, rfc: str):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    proveedor = db.query(Proveedores).filter(
        Proveedores.rfc == rfc,
        Proveedores.user_id == user.get('id')
    ).first()
    
    if proveedor is None:
        raise HTTPException(status_code=404, detail='Proveedor no encontrado')
    
    return proveedor

@router.get("/", response_model=list[ProveedorResponse], status_code=status.HTTP_200_OK)
async def read_all_proveedores(user: user_dependency, db: db_dependency,
                              categoria: Optional[str] = Query(None),
                              activo: Optional[bool] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Mostrar TODOS los proveedores para sincronización entre usuarios
    query = db.query(Proveedores)
    
    if categoria:
        query = query.filter(Proveedores.categoria == categoria)
    if activo is not None:
        query = query.filter(Proveedores.activo == activo)
        
    return query.all()

@router.get("/{proveedor_id}", response_model=ProveedorResponse, status_code=status.HTTP_200_OK)
async def read_proveedor(user: user_dependency, db: db_dependency, proveedor_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    # Permitir acceso a cualquier proveedor para sincronización
    proveedor = db.query(Proveedores).filter(Proveedores.id == proveedor_id).first()
    
    if proveedor is None:
        raise HTTPException(status_code=404, detail='Proveedor no encontrado')
    
    return proveedor

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_proveedor(user: user_dependency, db: db_dependency, proveedor_request: ProveedorRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    proveedor_model = Proveedores(
        nombre=proveedor_request.nombre,
        contacto=proveedor_request.contacto,
        email=proveedor_request.email,
        rfc=proveedor_request.rfc,
        telefono=proveedor_request.telefono,
        direccion=proveedor_request.direccion,
        categoria=proveedor_request.categoria,
        activo=proveedor_request.activo,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )

    db.add(proveedor_model)
    db.commit()
    db.refresh(proveedor_model)
    return proveedor_model

@router.put("/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_proveedor(user: user_dependency, db: db_dependency, 
                          proveedor_request: ProveedorRequest, proveedor_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    # Permitir editar cualquier proveedor para gestión compartida
    proveedor = db.query(Proveedores).filter(Proveedores.id == proveedor_id).first()
    
    if proveedor is None:
        raise HTTPException(status_code=404, detail='Proveedor no encontrado')

    proveedor.nombre = proveedor_request.nombre
    proveedor.contacto = proveedor_request.contacto
    proveedor.email = proveedor_request.email
    proveedor.rfc = proveedor_request.rfc
    proveedor.telefono = proveedor_request.telefono
    proveedor.direccion = proveedor_request.direccion
    proveedor.categoria = proveedor_request.categoria
    proveedor.activo = proveedor_request.activo

    db.add(proveedor)
    db.commit()

@router.delete("/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proveedor(user: user_dependency, db: db_dependency, proveedor_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    # Permitir eliminar cualquier proveedor para gestión compartida
    proveedor = db.query(Proveedores).filter(Proveedores.id == proveedor_id).first()
    
    if proveedor is None:
        raise HTTPException(status_code=404, detail='Proveedor no encontrado')

    db.delete(proveedor)
    db.commit()

@router.patch("/{proveedor_id}/toggle-activo", status_code=status.HTTP_200_OK)
async def toggle_activo_proveedor(user: user_dependency, db: db_dependency, proveedor_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    # Permitir toggle de cualquier proveedor para gestión compartida
    proveedor = db.query(Proveedores).filter(Proveedores.id == proveedor_id).first()
    
    if proveedor is None:
        raise HTTPException(status_code=404, detail='Proveedor no encontrado')

    proveedor.activo = not proveedor.activo
    db.add(proveedor)
    db.commit()
    
    estado = "activado" if proveedor.activo else "desactivado"
    return {"mensaje": f"Proveedor {estado} exitosamente"}