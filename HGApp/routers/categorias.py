"""
Router para gestión de categorías y subcategorías del sistema
"""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Categorias, Facturas, Proyecciones, PresupuestoMensual, PresupuestoAnual
from routers.auth import get_current_user
import json

router = APIRouter(
    prefix='/categorias',
    tags=['categorias']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class CategoriaRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    subcategorias: list[str] = Field(default_factory=list)
    activo: bool = True
    orden: int = 0


class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    subcategorias: list[str]
    activo: bool
    orden: int


@router.get("/", response_model=list[CategoriaResponse], status_code=status.HTTP_200_OK)
async def get_categorias(
    user: user_dependency,
    db: db_dependency,
    activo: Optional[bool] = Query(None)
):
    """Obtener todas las categorías, opcionalmente filtradas por estado"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    query = db.query(Categorias).order_by(Categorias.orden, Categorias.nombre)
    
    if activo is not None:
        query = query.filter(Categorias.activo == activo)
    
    categorias = query.all()
    
    # Convertir subcategorias de JSON string a lista
    result = []
    for cat in categorias:
        subcats = []
        if cat.subcategorias:
            try:
                subcats = json.loads(cat.subcategorias)
            except:
                subcats = []
        
        result.append(CategoriaResponse(
            id=cat.id,
            nombre=cat.nombre,
            subcategorias=subcats,
            activo=cat.activo,
            orden=cat.orden
        ))
    
    return result


@router.get("/{categoria_id}", response_model=CategoriaResponse, status_code=status.HTTP_200_OK)
async def get_categoria(
    user: user_dependency,
    db: db_dependency,
    categoria_id: int = Path(gt=0)
):
    """Obtener una categoría específica por ID"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    categoria = db.query(Categorias).filter(Categorias.id == categoria_id).first()
    
    if categoria is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    
    subcats = []
    if categoria.subcategorias:
        try:
            subcats = json.loads(categoria.subcategorias)
        except:
            subcats = []
    
    return CategoriaResponse(
        id=categoria.id,
        nombre=categoria.nombre,
        subcategorias=subcats,
        activo=categoria.activo,
        orden=categoria.orden
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_categoria(
    user: user_dependency,
    db: db_dependency,
    categoria_request: CategoriaRequest
):
    """Crear una nueva categoría"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    # Verificar que no exista una categoría con el mismo nombre
    existing = db.query(Categorias).filter(
        Categorias.nombre == categoria_request.nombre
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f'Ya existe una categoría "{categoria_request.nombre}"'
        )
    
    # Convertir subcategorias a JSON string
    subcats_json = json.dumps(categoria_request.subcategorias)
    
    categoria_model = Categorias(
        nombre=categoria_request.nombre,
        subcategorias=subcats_json,
        activo=categoria_request.activo,
        orden=categoria_request.orden,
        user_id=user.get('id')
    )
    
    db.add(categoria_model)
    db.commit()
    db.refresh(categoria_model)
    
    return {
        "message": "Categoría creada exitosamente",
        "id": categoria_model.id
    }


@router.put("/{categoria_id}", status_code=status.HTTP_200_OK)
async def update_categoria(
    user: user_dependency,
    db: db_dependency,
    categoria_request: CategoriaRequest,
    categoria_id: int = Path(gt=0)
):
    """Actualizar una categoría existente y migrar todos los datos relacionados"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    categoria = db.query(Categorias).filter(Categorias.id == categoria_id).first()
    
    if categoria is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    
    # Verificar que no exista otra categoría con el mismo nombre
    existing = db.query(Categorias).filter(
        Categorias.nombre == categoria_request.nombre,
        Categorias.id != categoria_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f'Ya existe otra categoría "{categoria_request.nombre}"'
        )
    
    # Guardar nombre anterior para migración
    nombre_anterior = categoria.nombre
    nombre_nuevo = categoria_request.nombre
    
    # Preparar subcategorías anteriores y nuevas para migración
    subcats_anteriores = []
    if categoria.subcategorias:
        try:
            subcats_anteriores = json.loads(categoria.subcategorias)
        except:
            subcats_anteriores = []
    
    subcats_nuevas = categoria_request.subcategorias
    
    # Crear mapeo de subcategorías (si cambiaron nombres)
    # Por ahora, solo actualizamos subcategorías que ya no existen
    subcats_eliminadas = [s for s in subcats_anteriores if s not in subcats_nuevas]
    
    # MIGRACIÓN DE DATOS
    stats = {
        "facturas_actualizadas": 0,
        "proyecciones_actualizadas": 0,
        "partidas_actualizadas": 0,
        "presupuestos_mensuales_actualizados": 0,
        "presupuestos_anuales_actualizados": 0
    }
    
    # 1. Actualizar facturas con la categoría
    if nombre_anterior != nombre_nuevo:
        facturas = db.query(Facturas).filter(Facturas.categoria == nombre_anterior).all()
        for factura in facturas:
            factura.categoria = nombre_nuevo
            stats["facturas_actualizadas"] += 1
    
    # 2. Actualizar subcategorías en facturas (si se eliminaron)
    if subcats_eliminadas:
        for subcat in subcats_eliminadas:
            facturas_subcat = db.query(Facturas).filter(
                Facturas.categoria == nombre_nuevo,
                Facturas.subcategoria == subcat
            ).all()
            for factura in facturas_subcat:
                factura.subcategoria = None  # O asignar a "Otros" si existe
                stats["facturas_actualizadas"] += 1
    
    # 3. Actualizar proyecciones - necesitamos actualizar el campo partidas_json Y el campo categoria
    proyecciones = db.query(Proyecciones).all()
    for proyeccion in proyecciones:
        # Actualizar campo categoria directo
        if proyeccion.categoria == nombre_anterior:
            proyeccion.categoria = nombre_nuevo
            stats["proyecciones_actualizadas"] += 1
        
        # Actualizar partidas_json
        if proyeccion.partidas_json:
            try:
                partidas = json.loads(proyeccion.partidas_json)
                actualizado = False
                
                for partida in partidas:
                    # Actualizar nombre de categoría en partidas
                    if partida.get('categoria') == nombre_anterior:
                        partida['categoria'] = nombre_nuevo
                        actualizado = True
                        stats["partidas_actualizadas"] += 1
                    
                    # Actualizar subcategorías eliminadas
                    if (partida.get('categoria') == nombre_nuevo and 
                        partida.get('subcategoria') in subcats_eliminadas):
                        partida['subcategoria'] = None
                        actualizado = True
                        stats["partidas_actualizadas"] += 1
                
                if actualizado:
                    proyeccion.partidas_json = json.dumps(partidas)
                    if stats["proyecciones_actualizadas"] == 0:
                        stats["proyecciones_actualizadas"] = 1
            except:
                pass
    
    # 4. Actualizar presupuestos mensuales
    if nombre_anterior != nombre_nuevo:
        presupuestos_mensuales = db.query(PresupuestoMensual).filter(
            PresupuestoMensual.categoria == nombre_anterior
        ).all()
        for presupuesto in presupuestos_mensuales:
            presupuesto.categoria = nombre_nuevo
            stats["presupuestos_mensuales_actualizados"] += 1
    
    # Nota: PresupuestoAnual no tiene columna categoria, solo tiene monto total por año/marca
    # No es necesario actualizar presupuestos anuales
    
    # Actualizar la categoría
    categoria.nombre = categoria_request.nombre
    categoria.subcategorias = json.dumps(categoria_request.subcategorias)
    categoria.activo = categoria_request.activo
    categoria.orden = categoria_request.orden
    
    db.commit()
    
    return {
        "message": "Categoría actualizada exitosamente",
        "migracion": stats
    }


@router.delete("/{categoria_id}", status_code=status.HTTP_200_OK)
async def delete_categoria(
    user: user_dependency,
    db: db_dependency,
    categoria_id: int = Path(gt=0)
):
    """Eliminar (desactivar) una categoría"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    categoria = db.query(Categorias).filter(Categorias.id == categoria_id).first()
    
    if categoria is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    
    # En lugar de eliminar, desactivamos
    categoria.activo = False
    db.commit()
    
    return {"message": "Categoría desactivada exitosamente"}


@router.post("/{categoria_id}/restore", status_code=status.HTTP_200_OK)
async def restore_categoria(
    user: user_dependency,
    db: db_dependency,
    categoria_id: int = Path(gt=0)
):
    """Restaurar (activar) una categoría desactivada"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    categoria = db.query(Categorias).filter(Categorias.id == categoria_id).first()
    
    if categoria is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    
    categoria.activo = True
    db.commit()
    
    return {"message": "Categoría restaurada exitosamente"}
