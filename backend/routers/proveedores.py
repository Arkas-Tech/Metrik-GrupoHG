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
    razon_social: Optional[str] = None
    contacto: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=100)
    rfc: str = Field(min_length=1, max_length=13)  # Ahora obligatorio
    telefono: Optional[str] = None
    # Campo antiguo de dirección (opcional para compatibilidad)
    direccion: Optional[str] = None
    # Nuevos campos de dirección separados
    calle: Optional[str] = None
    numero_exterior: Optional[str] = None
    numero_interior: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    # Campos de control
    categoria: str = Field(min_length=1, max_length=100)
    activo: Optional[bool] = True

class ProveedorResponse(BaseModel):
    id: int
    nombre: str
    razon_social: Optional[str]
    contacto: str
    email: str
    rfc: str  # Ahora obligatorio
    telefono: Optional[str]
    # Campo antiguo de dirección
    direccion: Optional[str]
    # Nuevos campos de dirección separados
    calle: Optional[str]
    numero_exterior: Optional[str]
    numero_interior: Optional[str]
    colonia: Optional[str]
    ciudad: Optional[str]
    estado: Optional[str]
    codigo_postal: Optional[str]
    # Campos de control
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
        razon_social=proveedor_request.razon_social,
        contacto=proveedor_request.contacto,
        email=proveedor_request.email,
        rfc=proveedor_request.rfc,
        telefono=proveedor_request.telefono,
        direccion=proveedor_request.direccion,
        calle=proveedor_request.calle,
        numero_exterior=proveedor_request.numero_exterior,
        numero_interior=proveedor_request.numero_interior,
        colonia=proveedor_request.colonia,
        ciudad=proveedor_request.ciudad,
        estado=proveedor_request.estado,
        codigo_postal=proveedor_request.codigo_postal,
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
    proveedor.razon_social = proveedor_request.razon_social
    proveedor.contacto = proveedor_request.contacto
    proveedor.email = proveedor_request.email
    proveedor.rfc = proveedor_request.rfc
    proveedor.telefono = proveedor_request.telefono
    proveedor.direccion = proveedor_request.direccion
    proveedor.calle = proveedor_request.calle
    proveedor.numero_exterior = proveedor_request.numero_exterior
    proveedor.numero_interior = proveedor_request.numero_interior
    proveedor.colonia = proveedor_request.colonia
    proveedor.ciudad = proveedor_request.ciudad
    proveedor.estado = proveedor_request.estado
    proveedor.codigo_postal = proveedor_request.codigo_postal
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