from typing import Annotated, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from starlette import status
from models import Embajadores
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/embajadores", tags=["embajadores"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class EmbajadorRequest(BaseModel):
    nombre: str
    plataformas_json: Optional[str] = None  # JSON string
    presupuesto: Optional[float] = 0.0
    leads: Optional[int] = 0
    audiencia: Optional[int] = 0
    marca: Optional[str] = None


class EmbajadorResponse(BaseModel):
    id: int
    nombre: str
    plataformas_json: Optional[str] = None
    presupuesto: float
    leads: int
    audiencia: int
    marca: Optional[str] = None
    creado_por: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[EmbajadorResponse], status_code=status.HTTP_200_OK)
async def read_all_embajadores(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    query = db.query(Embajadores)
    if marca:
        query = query.filter(Embajadores.marca == marca)
    return query.order_by(Embajadores.fecha_creacion.desc()).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_embajador(
    user: user_dependency, db: db_dependency, req: EmbajadorRequest
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = Embajadores(
        nombre=req.nombre,
        plataformas_json=req.plataformas_json,
        presupuesto=req.presupuesto or 0.0,
        leads=req.leads or 0,
        audiencia=req.audiencia or 0,
        marca=req.marca,
        creado_por=user.get("username"),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"id": obj.id, "message": "Embajador creado correctamente"}


@router.put("/{embajador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_embajador(
    user: user_dependency,
    db: db_dependency,
    req: EmbajadorRequest,
    embajador_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    obj = db.query(Embajadores).filter(Embajadores.id == embajador_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Embajador no encontrado")
    obj.nombre = req.nombre
    obj.plataformas_json = req.plataformas_json
    obj.presupuesto = req.presupuesto or 0.0
    obj.leads = req.leads or 0
    obj.audiencia = req.audiencia or 0
    obj.marca = req.marca
    db.commit()


@router.delete("/{embajador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_embajador(
    user: user_dependency,
    db: db_dependency,
    embajador_id: int = Path(gt=0),
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    if user.get("role") not in ["administrador", "admin", "developer"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar embajadores")
    obj = db.query(Embajadores).filter(Embajadores.id == embajador_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Embajador no encontrado")
    db.delete(obj)
    db.commit()
