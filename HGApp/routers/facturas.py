from typing import Annotated, Optional, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from starlette import status
from models import Facturas, Proyecciones, FacturaArchivos, FacturaCotizaciones, Eventos, Campanas
from database import SessionLocal
from sqlalchemy import func
from .auth import get_current_user
from datetime import date
import base64
import io

def can_access_facturas(user_role: str) -> bool:
    """Determina si el usuario puede acceder a facturas según su rol"""
    # Todos los roles pueden acceder a las facturas
    return user_role in ['administrador', 'admin', 'coordinador', 'coor', 'auditor', 'aud']

def can_modify_facturas(user_role: str) -> bool:
    """Determina si el usuario puede modificar facturas según su rol"""
    # Solo administradores y coordinadores pueden modificar facturas
    return user_role in ['administrador', 'admin', 'coordinador', 'coor']

def can_delete_facturas(user_role: str) -> bool:
    """Determina si el usuario puede eliminar facturas según su rol"""
    # Administradores y coordinadores pueden eliminar facturas
    return user_role in ['administrador', 'admin', 'coordinador', 'coor']

def can_authorize_facturas(user_role: str) -> bool:
    """Determina si el usuario puede autorizar facturas según su rol"""
    # Solo administradores pueden autorizar facturas
    return user_role in ['administrador', 'admin']

def can_mark_paid_facturas(user_role: str) -> bool:
    """Determina si el usuario puede marcar facturas como pagadas según su rol"""
    # Administradores y coordinadores pueden marcar como pagadas
    return user_role in ['administrador', 'admin', 'coordinador', 'coor']

def get_facturas_query_for_user(query, user_role: str, user_id: int):
    """Aplica filtros a las facturas según el rol del usuario"""
    if user_role in ['administrador', 'admin']:
        # Los administradores ven todas las facturas
        return query
    elif user_role in ['coordinador', 'coor']:
        # Los coordinadores ven todas las facturas también
        return query
    elif user_role in ['auditor', 'aud']:
        # Los auditores ven todas las facturas también (solo lectura)
        return query
    else:
        # Usuarios sin rol definido solo ven sus propias facturas
        return query.filter(Facturas.user_id == user_id)

router = APIRouter(
    prefix='/facturas',
    tags=['facturas']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

def actualizar_monto_real_proyeccion(db: Session, proyeccion_id: int):
    """Actualiza el monto_real de una proyección sumando todas las facturas asociadas"""
    total_facturas = db.query(func.sum(Facturas.monto)).filter(
        Facturas.proyeccion_id == proyeccion_id
    ).scalar() or 0
    
    proyeccion = db.query(Proyecciones).filter(Proyecciones.id == proyeccion_id).first()
    if proyeccion:
        proyeccion.monto_real = total_facturas
        db.commit()

class ArchivoResponse(BaseModel):
    id: int
    nombre_archivo: str
    tipo_archivo: str
    tamaño_archivo: int
    fecha_subida: str

class CotizacionResponse(BaseModel):
    id: int
    proveedor: str
    monto: float
    nombre_archivo: str
    tamaño_archivo: int
    fecha_subida: str
    observaciones: Optional[str]

class FacturaRequest(BaseModel):
    numero_factura: str = Field(min_length=1, max_length=100)
    proveedor: str = Field(min_length=1, max_length=200)
    subtotal: Optional[float] = None
    iva: Optional[float] = None
    monto: float = Field(gt=0)
    fecha_factura: date
    fecha_vencimiento: date
    fecha_ingresada: Optional[date] = None
    estado: str = Field(min_length=1, max_length=50)
    marca: str = Field(min_length=1, max_length=100)
    categoria: Optional[str] = Field(None, min_length=1, max_length=100)  # Hacerlo opcional
    descripcion: Optional[str] = None
    autorizada: Optional[bool] = False
    fecha_pago: Optional[date] = None
    metodo_pago: Optional[str] = None
    uso_cfdi: Optional[str] = None
    orden_compra: Optional[str] = None
    observaciones: Optional[str] = None
    proyeccion_id: Optional[int] = None
    evento_id: Optional[int] = None
    campanya_id: Optional[int] = None
    mes_asignado: Optional[str] = None
    año_asignado: Optional[int] = None

class FacturaResponse(BaseModel):
    id: int
    numero_factura: str
    proveedor: str
    subtotal: Optional[float]
    iva: Optional[float]
    monto: float
    total: Optional[float] = None  # Para compatibilidad con frontend
    fecha_factura: date
    fecha_vencimiento: date
    fecha_ingresada: Optional[date] = None
    estado: str
    marca: str
    categoria: Optional[str]
    descripcion: Optional[str]
    autorizada: bool
    fecha_pago: Optional[date]
    metodo_pago: Optional[str]
    uso_cfdi: Optional[str]
    orden_compra: Optional[str]
    observaciones: Optional[str]
    proyeccion_id: Optional[int]
    evento_id: Optional[int] = None
    eventoId: Optional[int] = None  # Para compatibilidad camelCase con frontend
    evento_nombre: Optional[str] = None
    campanya_id: Optional[int] = None
    campanya_nombre: Optional[str] = None
    mes_asignado: Optional[str] = None
    año_asignado: Optional[int] = None
    creado_por: str
    archivos: List[ArchivoResponse] = []
    cotizaciones: List[CotizacionResponse] = []

# Modelos para eventos y campañas disponibles
class EventoDisponible(BaseModel):
    id: int
    nombre: str
    fecha_inicio: date

class CampanyaDisponible(BaseModel):
    id: int
    nombre: str
    fecha_inicio: date

@router.get("/eventos-disponibles", response_model=List[EventoDisponible], status_code=status.HTTP_200_OK)
async def get_eventos_disponibles(user: user_dependency, db: db_dependency):
    """Obtiene todos los eventos disponibles"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a facturas')
    
    from models import Eventos
    
    # Obtener todos los eventos
    eventos = db.query(Eventos).order_by(Eventos.fecha_inicio.desc()).all()
    
    return [
        EventoDisponible(
            id=evento.id,
            nombre=evento.nombre,
            fecha_inicio=evento.fecha_inicio
        )
        for evento in eventos
    ]

@router.get("/campanyas-disponibles", response_model=List[CampanyaDisponible], status_code=status.HTTP_200_OK)
async def get_campanyas_disponibles(user: user_dependency, db: db_dependency):
    """Obtiene todas las campañas disponibles"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a facturas')
    
    from models import Campanas
    
    # Obtener todas las campañas
    campanyas = db.query(Campanas).order_by(Campanas.fecha_inicio.desc()).all()
    
    return [
        CampanyaDisponible(
            id=campanya.id,
            nombre=campanya.nombre,
            fecha_inicio=campanya.fecha_inicio
        )
        for campanya in campanyas
    ]

@router.get("/", response_model=list[FacturaResponse], status_code=status.HTTP_200_OK)
async def read_all_facturas(user: user_dependency, db: db_dependency,
                           marca: Optional[str] = Query(None),
                           estado: Optional[str] = Query(None),
                           categoria: Optional[str] = Query(None),
                           autorizada: Optional[bool] = Query(None)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a facturas')
    
    query = db.query(Facturas)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    if marca:
        query = query.filter(Facturas.marca == marca)
    if estado:
        query = query.filter(Facturas.estado == estado)
    if categoria:
        query = query.filter(Facturas.categoria == categoria)
    if autorizada is not None:
        query = query.filter(Facturas.autorizada == autorizada)
        
    facturas = query.all()
    
    # Agregar archivos y cotizaciones a cada factura
    facturas_con_archivos = []
    for factura in facturas:
        # Obtener archivos
        archivos = db.query(FacturaArchivos).filter(FacturaArchivos.factura_id == factura.id).all()
        archivos_response = [
            ArchivoResponse(
                id=archivo.id,
                nombre_archivo=archivo.nombre_archivo,
                tipo_archivo=archivo.tipo_archivo,
                tamaño_archivo=archivo.tamaño_archivo,
                fecha_subida=archivo.fecha_subida.strftime("%Y-%m-%d %H:%M:%S")
            ) for archivo in archivos
        ]
        
        # Obtener cotizaciones
        cotizaciones = db.query(FacturaCotizaciones).filter(FacturaCotizaciones.factura_id == factura.id).all()
        cotizaciones_response = [
            CotizacionResponse(
                id=cotizacion.id,
                proveedor=cotizacion.proveedor,
                monto=cotizacion.monto,
                nombre_archivo=cotizacion.nombre_archivo,
                tamaño_archivo=cotizacion.tamaño_archivo,
                fecha_subida=cotizacion.fecha_subida.strftime("%Y-%m-%d %H:%M:%S"),
                observaciones=cotizacion.observaciones
            ) for cotizacion in cotizaciones
        ]
        
        # Obtener nombre del evento si existe
        evento_nombre = None
        if factura.evento_id:
            evento = db.query(Eventos).filter(Eventos.id == factura.evento_id).first()
            if evento:
                evento_nombre = evento.nombre
        
        # Obtener nombre de la campaña si existe
        campanya_nombre = None
        if factura.campanya_id:
            campanya = db.query(Campanas).filter(Campanas.id == factura.campanya_id).first()
            if campanya:
                campanya_nombre = campanya.nombre
        
        facturas_con_archivos.append(FacturaResponse(
            id=factura.id,
            numero_factura=factura.numero_factura,
            proveedor=factura.proveedor,
            subtotal=factura.subtotal,
            iva=factura.iva,
            monto=factura.monto,
            total=factura.monto,  # Para compatibilidad con frontend
            fecha_factura=factura.fecha_factura,
            fecha_vencimiento=factura.fecha_vencimiento,
            fecha_ingresada=factura.fecha_ingresada,
            estado=factura.estado,
            marca=factura.marca,
            categoria=factura.categoria,
            descripcion=factura.descripcion,
            autorizada=factura.autorizada,
            fecha_pago=factura.fecha_pago,
            metodo_pago=factura.metodo_pago,
            uso_cfdi=factura.uso_cfdi,
            orden_compra=factura.orden_compra,
            observaciones=factura.observaciones,
            proyeccion_id=factura.proyeccion_id,
            evento_id=factura.evento_id,
            eventoId=factura.evento_id,  # camelCase para frontend
            evento_nombre=evento_nombre,
            campanya_id=factura.campanya_id,
            campanya_nombre=campanya_nombre,
            mes_asignado=factura.mes_asignado,
            año_asignado=factura.año_asignado,
            creado_por=factura.creado_por,
            archivos=archivos_response,
            cotizaciones=cotizaciones_response
        ))
    
    return facturas_con_archivos

@router.get("/{factura_id}", response_model=FacturaResponse, status_code=status.HTTP_200_OK)
async def read_factura(user: user_dependency, db: db_dependency, factura_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')

    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para acceder a facturas')

    query = db.query(Facturas).filter(Facturas.id == factura_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    factura = query.first()
    
    if factura is None:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    
    # Obtener archivos
    archivos = db.query(FacturaArchivos).filter(FacturaArchivos.factura_id == factura.id).all()
    archivos_response = [
        ArchivoResponse(
            id=archivo.id,
            nombre_archivo=archivo.nombre_archivo,
            tipo_archivo=archivo.tipo_archivo,
            tamaño_archivo=archivo.tamaño_archivo,
            fecha_subida=archivo.fecha_subida.strftime("%Y-%m-%d %H:%M:%S")
        ) for archivo in archivos
    ]
    
    # Obtener cotizaciones
    cotizaciones = db.query(FacturaCotizaciones).filter(FacturaCotizaciones.factura_id == factura.id).all()
    cotizaciones_response = [
        CotizacionResponse(
            id=cotizacion.id,
            proveedor=cotizacion.proveedor,
            monto=cotizacion.monto,
            nombre_archivo=cotizacion.nombre_archivo,
            tamaño_archivo=cotizacion.tamaño_archivo,
            fecha_subida=cotizacion.fecha_subida.strftime("%Y-%m-%d %H:%M:%S"),
            observaciones=cotizacion.observaciones
        ) for cotizacion in cotizaciones
    ]
    
    # Obtener nombre del evento si existe
    evento_nombre = None
    if factura.evento_id:
        evento = db.query(Eventos).filter(Eventos.id == factura.evento_id).first()
        if evento:
            evento_nombre = evento.nombre
    
    # Obtener nombre de la campaña si existe
    campanya_nombre = None
    if factura.campanya_id:
        campanya = db.query(Campanas).filter(Campanas.id == factura.campanya_id).first()
        if campanya:
            campanya_nombre = campanya.nombre
    
    return FacturaResponse(
        id=factura.id,
        numero_factura=factura.numero_factura,
        proveedor=factura.proveedor,
        subtotal=factura.subtotal,
        iva=factura.iva,
        monto=factura.monto,
        total=factura.monto,  # Para compatibilidad con frontend
        fecha_factura=factura.fecha_factura,
        fecha_vencimiento=factura.fecha_vencimiento,
        fecha_ingresada=factura.fecha_ingresada,
        estado=factura.estado,
        marca=factura.marca,
        categoria=factura.categoria,
        descripcion=factura.descripcion,
        autorizada=factura.autorizada,
        fecha_pago=factura.fecha_pago,
        metodo_pago=factura.metodo_pago,
        uso_cfdi=factura.uso_cfdi,
        orden_compra=factura.orden_compra,
        observaciones=factura.observaciones,
        proyeccion_id=factura.proyeccion_id,
        evento_id=factura.evento_id,
        eventoId=factura.evento_id,  # camelCase para frontend
        evento_nombre=evento_nombre,
        campanya_id=factura.campanya_id,
        campanya_nombre=campanya_nombre,
        mes_asignado=factura.mes_asignado,
        año_asignado=factura.año_asignado,
        creado_por=factura.creado_por,
        archivos=archivos_response,
        cotizaciones=cotizaciones_response
    )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_factura(user: user_dependency, db: db_dependency, factura_request: FacturaRequest):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    print(f"🔧 DEBUG - Creando nueva factura:")
    print(f"   mes_asignado recibido: {factura_request.mes_asignado}")
    print(f"   año_asignado recibido: {factura_request.año_asignado}")
    
    user_role = user.get('role', '')
    if not can_modify_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para crear facturas')

    factura_model = Facturas(
        numero_factura=factura_request.numero_factura,
        proveedor=factura_request.proveedor,
        subtotal=factura_request.subtotal,
        iva=factura_request.iva,
        monto=factura_request.monto,
        fecha_factura=factura_request.fecha_factura,
        fecha_vencimiento=factura_request.fecha_vencimiento,
        estado=factura_request.estado,
        marca=factura_request.marca,
        categoria=factura_request.categoria,
        descripcion=factura_request.descripcion,
        autorizada=factura_request.autorizada,
        fecha_pago=factura_request.fecha_pago,
        metodo_pago=factura_request.metodo_pago,
        uso_cfdi=factura_request.uso_cfdi,
        orden_compra=factura_request.orden_compra,
        observaciones=factura_request.observaciones,
        proyeccion_id=factura_request.proyeccion_id,
        evento_id=factura_request.evento_id,
        campanya_id=factura_request.campanya_id,
        mes_asignado=factura_request.mes_asignado,
        año_asignado=factura_request.año_asignado,
        creado_por=user.get('username'),
        user_id=user.get('id')
    )

    db.add(factura_model)
    db.commit()
    
    # Actualizar monto real de la proyección si está asociada
    if factura_request.proyeccion_id:
        actualizar_monto_real_proyeccion(db, factura_request.proyeccion_id)
    
    db.refresh(factura_model)
    return factura_model

@router.post("/{factura_id}/archivos", status_code=status.HTTP_201_CREATED)
async def subir_archivos_factura(
    factura_id: int,
    user: user_dependency,
    db: db_dependency,
    archivos: List[UploadFile] = File(...)
):
    """Subir archivos (PDF/XML) a una factura"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_modify_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para subir archivos')
    
    # Verificar que la factura existe
    factura = db.query(Facturas).filter(Facturas.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    
    archivos_guardados = []
    
    for archivo in archivos:
        # Validar tipo de archivo
        if not archivo.filename.lower().endswith(('.pdf', '.xml')):
            raise HTTPException(status_code=400, detail=f'Archivo {archivo.filename}: Solo se permiten archivos PDF y XML')
        
        # Leer contenido del archivo
        contenido = await archivo.read()
        
        # Determinar tipo de archivo
        tipo_archivo = 'PDF' if archivo.filename.lower().endswith('.pdf') else 'XML'
        
        # Crear registro en base de datos
        archivo_modelo = FacturaArchivos(
            factura_id=factura_id,
            nombre_archivo=archivo.filename,
            tipo_archivo=tipo_archivo,
            contenido_archivo=contenido,
            tamaño_archivo=len(contenido),
            subido_por=user.get('username')
        )
        
        db.add(archivo_modelo)
        archivos_guardados.append({
            'nombre': archivo.filename,
            'tipo': tipo_archivo,
            'tamaño': len(contenido)
        })
    
    db.commit()
    
    return {
        'message': f'Se guardaron {len(archivos_guardados)} archivo(s)',
        'archivos': archivos_guardados
    }

@router.post("/{factura_id}/cotizaciones", status_code=status.HTTP_201_CREATED)
async def subir_cotizaciones_factura(
    factura_id: int,
    user: user_dependency,
    db: db_dependency,
    proveedor: str = Form(...),
    monto: float = Form(...),
    observaciones: Optional[str] = Form(None),
    archivo: UploadFile = File(...)
):
    """Subir cotización (PDF) a una factura"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_modify_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para subir cotizaciones')
    
    # Verificar que la factura existe
    factura = db.query(Facturas).filter(Facturas.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    
    # Validar tipo de archivo (solo PDF para cotizaciones)
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Las cotizaciones deben ser archivos PDF')
    
    # Leer contenido del archivo
    contenido = await archivo.read()
    
    # Crear registro en base de datos
    cotizacion_modelo = FacturaCotizaciones(
        factura_id=factura_id,
        proveedor=proveedor,
        monto=monto,
        nombre_archivo=archivo.filename,
        contenido_archivo=contenido,
        tamaño_archivo=len(contenido),
        observaciones=observaciones,
        subido_por=user.get('username')
    )
    
    db.add(cotizacion_modelo)
    db.commit()
    
    return {
        'message': 'Cotización guardada exitosamente',
        'cotizacion': {
            'proveedor': proveedor,
            'monto': monto,
            'archivo': archivo.filename,
            'tamaño': len(contenido)
        }
    }

@router.get("/{factura_id}/archivos/{archivo_id}/descargar")
async def descargar_archivo_factura(
    factura_id: int,
    archivo_id: int,
    user: user_dependency,
    db: db_dependency
):
    """Descargar archivo de factura"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para descargar archivos')
    
    # Buscar el archivo
    archivo = db.query(FacturaArchivos).filter(
        FacturaArchivos.id == archivo_id,
        FacturaArchivos.factura_id == factura_id
    ).first()
    
    if not archivo:
        raise HTTPException(status_code=404, detail='Archivo no encontrado')
    
    # Preparar el archivo para descarga
    media_type = "application/pdf" if archivo.tipo_archivo == "PDF" else "application/xml"
    
    return StreamingResponse(
        io.BytesIO(archivo.contenido_archivo),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={archivo.nombre_archivo}"}
    )

@router.get("/{factura_id}/cotizaciones/{cotizacion_id}/descargar")
async def descargar_cotizacion_factura(
    factura_id: int,
    cotizacion_id: int,
    user: user_dependency,
    db: db_dependency
):
    """Descargar cotización de factura"""
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_access_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para descargar cotizaciones')
    
    # Buscar la cotización
    cotizacion = db.query(FacturaCotizaciones).filter(
        FacturaCotizaciones.id == cotizacion_id,
        FacturaCotizaciones.factura_id == factura_id
    ).first()
    
    if not cotizacion:
        raise HTTPException(status_code=404, detail='Cotización no encontrada')
    
    # Preparar el archivo para descarga
    return StreamingResponse(
        io.BytesIO(cotizacion.contenido_archivo),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={cotizacion.nombre_archivo}"}
    )

@router.put("/{factura_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_factura(user: user_dependency, db: db_dependency, 
                        factura_request: FacturaRequest, factura_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_modify_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para editar facturas')

    query = db.query(Facturas).filter(Facturas.id == factura_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    factura = query.first()
    
    if factura is None:
        raise HTTPException(status_code=404, detail='Factura no encontrada')

    factura.numero_factura = factura_request.numero_factura
    factura.proveedor = factura_request.proveedor
    factura.subtotal = factura_request.subtotal
    factura.iva = factura_request.iva
    factura.monto = factura_request.monto
    factura.fecha_factura = factura_request.fecha_factura
    factura.fecha_vencimiento = factura_request.fecha_vencimiento
    factura.estado = factura_request.estado
    factura.marca = factura_request.marca
    factura.categoria = factura_request.categoria
    factura.descripcion = factura_request.descripcion
    factura.autorizada = factura_request.autorizada
    factura.fecha_pago = factura_request.fecha_pago
    factura.metodo_pago = factura_request.metodo_pago
    factura.uso_cfdi = factura_request.uso_cfdi
    factura.orden_compra = factura_request.orden_compra
    factura.observaciones = factura_request.observaciones
    
    # Guardar proyección anterior para actualizar
    proyeccion_anterior = factura.proyeccion_id
    factura.proyeccion_id = factura_request.proyeccion_id
    factura.evento_id = factura_request.evento_id
    factura.campanya_id = factura_request.campanya_id
    factura.mes_asignado = factura_request.mes_asignado
    factura.año_asignado = factura_request.año_asignado
    
    print(f"🔧 DEBUG - Actualizando factura {factura_id}:")
    print(f"   mes_asignado recibido: {factura_request.mes_asignado}")
    print(f"   año_asignado recibido: {factura_request.año_asignado}")

    db.add(factura)
    db.commit()
    
    # Actualizar montos reales de ambas proyecciones (anterior y nueva)
    if proyeccion_anterior:
        actualizar_monto_real_proyeccion(db, proyeccion_anterior)
    if factura_request.proyeccion_id:
        actualizar_monto_real_proyeccion(db, factura_request.proyeccion_id)

@router.delete("/{factura_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factura(user: user_dependency, db: db_dependency, factura_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_delete_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para eliminar facturas')

    query = db.query(Facturas).filter(Facturas.id == factura_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    factura = query.first()
    
    if factura is None:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    
    # Guardar proyección para actualizar después de eliminar
    proyeccion_id = factura.proyeccion_id

    # Eliminar archivos asociados primero
    db.query(FacturaArchivos).filter(FacturaArchivos.factura_id == factura_id).delete()
    
    # Eliminar cotizaciones asociadas
    db.query(FacturaCotizaciones).filter(FacturaCotizaciones.factura_id == factura_id).delete()

    # Ahora eliminar la factura
    db.delete(factura)
    db.commit()
    
    # Actualizar monto real de la proyección si estaba asociada
    if proyeccion_id:
        actualizar_monto_real_proyeccion(db, proyeccion_id)

@router.patch("/{factura_id}/autorizar", status_code=status.HTTP_200_OK)
async def autorizar_factura(user: user_dependency, db: db_dependency, factura_id: int = Path(gt=0)):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_authorize_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para autorizar facturas')

    query = db.query(Facturas).filter(Facturas.id == factura_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    factura = query.first()
    
    if factura is None:
        raise HTTPException(status_code=404, detail='Factura no encontrada')

    factura.autorizada = True
    factura.estado = "Autorizada"  # Cambiar el estado además del booleano
    # Marcar fecha de ingreso al autorizar
    if not factura.fecha_ingresada:
        from datetime import date as date_type
        factura.fecha_ingresada = date_type.today()
    db.add(factura)
    db.commit()
    
    return {"mensaje": "Factura autorizada exitosamente"}

@router.patch("/{factura_id}/marcar-pagada", status_code=status.HTTP_200_OK)
async def marcar_pagada(user: user_dependency, db: db_dependency, 
                       factura_id: int = Path(gt=0),
                       fecha_pago: date = None,
                       metodo_pago: str = None):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_role = user.get('role', '')
    if not can_mark_paid_facturas(user_role):
        raise HTTPException(status_code=403, detail='No tienes permisos para marcar facturas como pagadas')

    query = db.query(Facturas).filter(Facturas.id == factura_id)
    
    # Aplicar filtros según el rol del usuario
    query = get_facturas_query_for_user(query, user_role, user.get('id'))
    
    factura = query.first()
    
    if factura is None:
        raise HTTPException(status_code=404, detail='Factura no encontrada')

    factura.estado = "Pagada"
    # Marcar fecha de ingreso si no la tiene
    if not factura.fecha_ingresada:
        from datetime import date as date_type
        factura.fecha_ingresada = date_type.today()
    if fecha_pago:
        factura.fecha_pago = fecha_pago
    if metodo_pago:
        factura.metodo_pago = metodo_pago
        
    db.add(factura)
    db.commit()