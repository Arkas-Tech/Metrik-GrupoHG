from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import json
from models import Desplazamiento, Users, Marcas
from routers.auth import get_current_user, get_db

router = APIRouter(
    prefix="/desplazamiento",
    tags=["desplazamiento"]
)

# Schemas
class ItemDesplazamiento(BaseModel):
    unidad: str
    porcentaje: str
    oc: str
    pdf: Optional[str] = None
    pdfNombre: Optional[str] = None

class DesplazamientoData(BaseModel):
    mes: int
    anio: int
    marca_id: int
    mayorExistencia: List[ItemDesplazamiento] = []
    mas90Dias: List[ItemDesplazamiento] = []
    demos: List[ItemDesplazamiento] = []
    otros: List[ItemDesplazamiento] = []

class DesplazamientoResponse(BaseModel):
    mes: int
    anio: int
    marca_id: int
    mayorExistencia: List[Dict[str, Any]]
    mas90Dias: List[Dict[str, Any]]
    demos: List[Dict[str, Any]]
    otros: List[Dict[str, Any]]

    class Config:
        from_attributes = True

# Endpoints
@router.post("/guardar", status_code=status.HTTP_200_OK)
def guardar_desplazamiento(
    data: DesplazamientoData,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Guardar o actualizar datos de desplazamiento para un mes/año/marca específicos"""
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == data.marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    
    usuario_nombre = current_user.get('username', 'desconocido')
    
    # Guardar cada categoría por separado
    categorias = {
        'mayorExistencia': data.mayorExistencia,
        'mas90Dias': data.mas90Dias,
        'demos': data.demos,
        'otros': data.otros
    }
    
    for categoria_nombre, items in categorias.items():
        # Buscar si ya existe un registro para esta combinación
        registro_existente = db.query(Desplazamiento).filter(
            Desplazamiento.mes == data.mes,
            Desplazamiento.anio == data.anio,
            Desplazamiento.marca_id == data.marca_id,
            Desplazamiento.categoria == categoria_nombre
        ).first()
        
        # Convertir items a JSON
        items_dict = [item.dict() for item in items]
        datos_json = json.dumps(items_dict, ensure_ascii=False)
        
        if registro_existente:
            # Actualizar registro existente
            registro_existente.datos_json = datos_json
            registro_existente.modificado_por = usuario_nombre
        else:
            # Crear nuevo registro
            nuevo_registro = Desplazamiento(
                mes=data.mes,
                anio=data.anio,
                marca_id=data.marca_id,
                categoria=categoria_nombre,
                datos_json=datos_json,
                modificado_por=usuario_nombre
            )
            db.add(nuevo_registro)
    
    db.commit()
    
    return {"message": "Datos guardados exitosamente"}

@router.get("/obtener/{mes}/{anio}/{marca_id}", response_model=DesplazamientoResponse)
def obtener_desplazamiento(
    mes: int,
    anio: int,
    marca_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtener datos de desplazamiento para un mes/año/marca específicos"""
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    
    # Obtener datos de todas las categorías
    categorias = ['mayorExistencia', 'mas90Dias', 'demos', 'otros']
    resultado = {
        'mes': mes,
        'anio': anio,
        'marca_id': marca_id,
        'mayorExistencia': [],
        'mas90Dias': [],
        'demos': [],
        'otros': []
    }
    
    for categoria_nombre in categorias:
        registro = db.query(Desplazamiento).filter(
            Desplazamiento.mes == mes,
            Desplazamiento.anio == anio,
            Desplazamiento.marca_id == marca_id,
            Desplazamiento.categoria == categoria_nombre
        ).first()
        
        if registro and registro.datos_json:
            try:
                datos = json.loads(registro.datos_json)
                resultado[categoria_nombre] = datos
            except json.JSONDecodeError:
                resultado[categoria_nombre] = []
        else:
            resultado[categoria_nombre] = []
    
    return resultado

@router.get("/obtener-anio/{anio}/{marca_id}")
def obtener_desplazamiento_anio(
    anio: int,
    marca_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtener todos los datos de desplazamiento de un año completo para una marca"""
    
    # Verificar que la marca existe
    marca = db.query(Marcas).filter(Marcas.id == marca_id).first()
    if not marca:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    
    # Obtener todos los registros del año
    registros = db.query(Desplazamiento).filter(
        Desplazamiento.anio == anio,
        Desplazamiento.marca_id == marca_id
    ).all()
    
    # Organizar por mes
    resultado = {}
    for registro in registros:
        mes = registro.mes
        if mes not in resultado:
            resultado[mes] = {
                'mayorExistencia': [],
                'mas90Dias': [],
                'demos': [],
                'otros': []
            }
        
        if registro.datos_json:
            try:
                datos = json.loads(registro.datos_json)
                resultado[mes][registro.categoria] = datos
            except json.JSONDecodeError:
                pass
    
    return resultado
