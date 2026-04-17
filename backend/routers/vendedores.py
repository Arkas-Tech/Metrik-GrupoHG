from typing import Annotated, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Vendedores
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/vendedores", tags=["vendedores"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class VendedorRequest(BaseModel):
    nombre: str
    marca: Optional[str] = None
    alcance: Optional[int] = 0
    leads: Optional[int] = 0
    ventas: Optional[int] = 0
    inversion_mensual: Optional[float] = 0.0
    publicaciones: Optional[int] = 0


class VendedorResponse(BaseModel):
    id: int
    nombre: str
    marca: Optional[str] = None
    alcance: int
    leads: int
    ventas: int
    inversion_mensual: float
    publicaciones: int
    creado_por: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[VendedorResponse], status_code=status.HTTP_200_OK)
async def read_all_vendedores(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    query = db.query(Vendedores)
    if marca:
        query = query.filter(Vendedores.marca == marca)
    return query.order_by(Vendedores.fecha_creacion.desc()).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vendedor(
    user: user_dependency, db: db_dependency, req: VendedorRequest
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = Vendedores(
        nombre=req.nombre,
        marca=req.marca,
        alcance=req.alcance or 0,
        leads=req.leads or 0,
        ventas=req.ventas or 0,
        inversion_mensual=req.inversion_mensual or 0.0,
        publicaciones=req.publicaciones or 0,
        creado_por=user.get("username"),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"id": obj.id, "message": "Vendedor creado correctamente"}


@router.put("/{vendedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_vendedor(
    user: user_dependency,
    db: db_dependency,
    req: VendedorRequest,
    vendedor_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = db.query(Vendedores).filter(Vendedores.id == vendedor_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    obj.nombre = req.nombre
    obj.marca = req.marca
    obj.alcance = req.alcance or 0
    obj.leads = req.leads or 0
    obj.ventas = req.ventas or 0
    obj.inversion_mensual = req.inversion_mensual or 0.0
    obj.publicaciones = req.publicaciones or 0
    db.commit()


@router.delete("/{vendedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendedor(
    user: user_dependency,
    db: db_dependency,
    vendedor_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    if user.get("role") not in ["administrador", "admin", "developer"]:
        raise HTTPException(
            status_code=403, detail="Solo administradores pueden eliminar vendedores"
        )
    obj = db.query(Vendedores).filter(Vendedores.id == vendedor_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    db.delete(obj)
    db.commit()
