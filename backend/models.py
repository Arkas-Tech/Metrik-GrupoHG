from database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, Float, Date, Text, Boolean, DateTime, LargeBinary, UniqueConstraint
from sqlalchemy.sql import func

class Users(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True)
    username = Column(String, unique=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String)
    permisos = Column(Text, nullable=True)  # JSON con permisos de navegación
    permisos_agencias = Column(Text, nullable=True)  # JSON con permisos por agencia


class Marcas(Base):
    __tablename__ = 'marcas'

    id = Column(Integer, primary_key=True, index=True)
    cuenta = Column(String)
    coordinador = Column(String)
    administrador = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class Eventos(Base):
    __tablename__ = 'eventos'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    descripcion = Column(Text)
    tipo_evento = Column(String)
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)
    ubicacion = Column(String)
    marca = Column(String)
    responsable = Column(String)
    estado = Column(String)
    objetivo = Column(Text)
    audiencia = Column(Text)
    presupuesto_estimado = Column(Float)
    presupuesto_real = Column(Float)
    observaciones = Column(Text)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class Facturas(Base):
    __tablename__ = 'facturas'

    id = Column(Integer, primary_key=True, index=True)
    numero_factura = Column(String)
    proveedor = Column(String)
    subtotal = Column(Float, nullable=True)
    iva = Column(Float, nullable=True)
    monto = Column(Float)
    fecha_factura = Column(Date)
    fecha_vencimiento = Column(Date)
    fecha_ingresada = Column(Date, nullable=True)
    estado = Column(String)
    marca = Column(String)
    categoria = Column(String)
    subcategoria = Column(String, nullable=True)
    descripcion = Column(Text)
    autorizada = Column(Boolean, default=False)
    fecha_pago = Column(Date, nullable=True)
    metodo_pago = Column(String, nullable=True)
    uso_cfdi = Column(String, nullable=True)
    orden_compra = Column(String, nullable=True)
    productos = Column(Text, nullable=True)
    observaciones = Column(Text)
    proyeccion_id = Column(Integer, ForeignKey('proyecciones.id'), nullable=True)
    evento_id = Column(Integer, ForeignKey('eventos.id'), nullable=True)
    campanya_id = Column(Integer, ForeignKey('campanyas.id'), nullable=True)
    mes_asignado = Column(String, nullable=True)
    año_asignado = Column(Integer, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class FacturaArchivos(Base):
    __tablename__ = 'factura_archivos'

    id = Column(Integer, primary_key=True, index=True)
    factura_id = Column(Integer, ForeignKey('facturas.id'))
    nombre_archivo = Column(String)
    tipo_archivo = Column(String)  # 'PDF', 'XML'
    contenido_archivo = Column(LargeBinary)  # Archivo en base64
    tamaño_archivo = Column(Integer)  # Tamaño en bytes
    fecha_subida = Column(DateTime, server_default=func.now())
    subido_por = Column(String)


class FacturaCotizaciones(Base):
    __tablename__ = 'factura_cotizaciones'

    id = Column(Integer, primary_key=True, index=True)
    factura_id = Column(Integer, ForeignKey('facturas.id'))
    proveedor = Column(String)
    monto = Column(Float)
    nombre_archivo = Column(String)
    contenido_archivo = Column(LargeBinary)  # PDF de cotización
    tamaño_archivo = Column(Integer)
    fecha_subida = Column(DateTime, server_default=func.now())
    observaciones = Column(Text)
    subido_por = Column(String)


class Proyecciones(Base):
    __tablename__ = 'proyecciones'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    marca = Column(String)
    periodo = Column(String)
    año = Column(Integer)
    mes = Column(Integer, nullable=True)
    trimestre = Column(Integer, nullable=True)
    categoria = Column(String)
    monto_proyectado = Column(Float)
    monto_real = Column(Float, nullable=True)
    descripcion = Column(Text)
    estado = Column(String, default='pendiente')  # 'pendiente' o 'aprobada'
    partidas_json = Column(Text)  # Campo para almacenar partidas como JSON
    autorizada_por = Column(String, nullable=True)  # Usuario que aprobó
    fecha_autorizacion = Column(DateTime, nullable=True)  # Fecha de aprobación
    excede_presupuesto = Column(Boolean, default=False)  # Si excede el presupuesto mensual
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class Proveedores(Base):
    __tablename__ = 'proveedores'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    razon_social = Column(String, nullable=True)
    contacto = Column(String)
    email = Column(String)
    rfc = Column(String, unique=True, nullable=False)  # Ahora obligatorio
    telefono = Column(String)
    # Campo antiguo mantenido por compatibilidad
    direccion = Column(Text, nullable=True)
    # Nuevos campos de dirección separados
    calle = Column(Text, nullable=True)
    numero_exterior = Column(String(20), nullable=True)
    numero_interior = Column(String(20), nullable=True)
    colonia = Column(String(200), nullable=True)
    ciudad = Column(String(200), nullable=True)
    estado = Column(String(100), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    # Campos de control
    categoria = Column(String)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class BriefsEventos(Base):
    __tablename__ = 'briefs_eventos'

    id = Column(Integer, primary_key=True, index=True)
    evento_id = Column(Integer, ForeignKey('eventos.id'))
    objetivo_especifico = Column(Text)
    audiencia_detallada = Column(Text)
    mensaje_clave = Column(Text)
    requerimientos = Column(Text)
    proveedores = Column(Text)
    logistica = Column(Text)
    presupuesto_detallado = Column(Text)
    observaciones_especiales = Column(Text)  # JSON con testimonios, imágenes, etc.
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    aprobado_por = Column(String, nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))


class ActividadesEventos(Base):
    __tablename__ = 'actividades_eventos'

    id = Column(Integer, primary_key=True, index=True)
    brief_id = Column(Integer, ForeignKey('briefs_eventos.id'))
    nombre = Column(String)
    descripcion = Column(Text)
    duracion = Column(String)
    responsable = Column(String)
    recursos = Column(Text)
    orden = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey('users.id'))


class CronogramasEventos(Base):
    __tablename__ = 'cronogramas_eventos'

    id = Column(Integer, primary_key=True, index=True)
    brief_id = Column(Integer, ForeignKey('briefs_eventos.id'))
    actividad = Column(String)
    fecha_inicio = Column(DateTime)
    fecha_fin = Column(DateTime)
    responsable = Column(String)
    estado = Column(String, default='Pendiente')  # Pendiente, En Progreso, Completada
    orden = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey('users.id'))


class Campanas(Base):
    __tablename__ = 'campanyas'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    estado = Column(String)  # Activa, Pausada, Completada
    plataforma = Column(String)  # Google Ads, Meta Ads
    leads = Column(Integer, default=0)
    alcance = Column(Integer, default=0)
    interacciones = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)
    presupuesto = Column(Float)
    gasto_actual = Column(Float, default=0.0)
    auto_objetivo = Column(String)  # Modelo de auto
    conversion = Column(Float, default=0.0)
    cxc_porcentaje = Column(Float, default=0.0)
    marca = Column(String)
    imagenes_json = Column(Text)  # JSON con array de imágenes
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class PresenciaTradicional(Base):
    __tablename__ = 'presencia_tradicional'

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String)  # Espectacular, Revista, Periódico
    nombre = Column(String)
    agencia = Column(String, nullable=True)
    marca = Column(String)
    ciudad = Column(String, nullable=True)
    campanya = Column(String, nullable=True)
    ubicacion = Column(String, nullable=True)
    contenido = Column(String, nullable=True)
    notas = Column(Text, nullable=True)
    fecha_instalacion = Column(Date)
    duracion = Column(String, nullable=True)
    cambio_lona = Column(Date, nullable=True)  # Solo para espectaculares
    vista = Column(String, nullable=True)
    iluminacion = Column(String, nullable=True)
    dimensiones = Column(String, nullable=True)
    proveedor = Column(String, nullable=True)
    codigo_proveedor = Column(String, nullable=True)
    costo_mensual = Column(Float, nullable=True)
    duracion_contrato = Column(String, nullable=True)
    inicio_contrato = Column(Date, nullable=True)
    termino_contrato = Column(Date, nullable=True)
    impresion = Column(String, nullable=True)
    costo_impresion = Column(Float, nullable=True)
    instalacion = Column(String, nullable=True)
    imagenes_json = Column(Text)  # JSON con array de imágenes (primera es vista previa)
    observaciones = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class Metricas(Base):
    __tablename__ = 'metricas'

    id = Column(Integer, primary_key=True, index=True)
    leads = Column(Integer, nullable=False, default=0)
    citas = Column(Integer, nullable=False, default=0)
    pisos = Column(Integer, nullable=False, default=0)
    utilidades = Column(Integer, nullable=False, default=0)
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False)  # 2024, 2025, etc
    marca = Column(String, nullable=False)  # Agencia requerida
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    creado_por = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))


class PresupuestoAnual(Base):
    __tablename__ = 'presupuesto_anual'
    __table_args__ = (
        # Unique constraint: un presupuesto por año y marca
        UniqueConstraint('anio', 'marca_id', name='uq_presupuesto_anio_marca'),
    )

    id = Column(Integer, primary_key=True, index=True)
    anio = Column(Integer, nullable=False)
    marca_id = Column(Integer, ForeignKey('marcas.id'), nullable=False)
    monto = Column(Float, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    modificado_por = Column(String)


class PresupuestoMensual(Base):
    __tablename__ = 'presupuesto_mensual'
    __table_args__ = (
        # Unique constraint: un presupuesto por mes, año, categoría y agencia
        UniqueConstraint('mes', 'anio', 'categoria', 'marca_id', name='uq_presupuesto_mes_anio_categoria_agencia'),
    )

    id = Column(Integer, primary_key=True, index=True)
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False)
    categoria = Column(String, nullable=False)
    marca_id = Column(Integer, ForeignKey('marcas.id'), nullable=False)
    monto = Column(Float, nullable=False)
    monto_mensual_base = Column(Float, nullable=True, default=0.0)  # Monto base usado para auto-rellenar
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    modificado_por = Column(String)


class PasswordResetCodes(Base):
    __tablename__ = 'password_reset_codes'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)


class Categorias(Base):
    __tablename__ = 'categorias'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True)
    subcategorias = Column(Text, nullable=True)  # JSON string con array de subcategorias
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=0)  # Para ordenar las categorías
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user_id = Column(Integer, ForeignKey('users.id'))


class Desplazamiento(Base):
    __tablename__ = 'desplazamiento'

    __table_args__ = (
        # Un registro único por mes, año, marca y categoría de desplazamiento
        UniqueConstraint('mes', 'anio', 'marca_id', 'categoria', name='uq_desplazamiento_mes_anio_marca_categoria'),
    )

    id = Column(Integer, primary_key=True, index=True)
    mes = Column(Integer, nullable=False)  # 1-12
    anio = Column(Integer, nullable=False)
    marca_id = Column(Integer, ForeignKey('marcas.id'), nullable=False)
    categoria = Column(String, nullable=False)  # 'mayorExistencia', 'mas90Dias', 'demos', 'otros'
    datos_json = Column(Text, nullable=False)  # JSON con array de registros {unidad, porcentaje, oc, pdf?, pdfNombre?}
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_modificacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    modificado_por = Column(String)
