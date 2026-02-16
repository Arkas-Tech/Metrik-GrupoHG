"""
Migración para agregar campos de aprobación a proyecciones
Fecha: 2026-01-27
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Usar base de datos SQLite local
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sgpme.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"Usando base de datos: {DB_PATH}")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def migrate():
    """Agregar columnas de aprobación a la tabla proyecciones"""
    try:
        # Para SQLite, verificar columnas existentes
        result = session.execute(text("PRAGMA table_info(proyecciones)"))
        existing_columns = [row[1] for row in result]
        
        print(f"Columnas existentes: {existing_columns}")
        
        # Agregar columnas si no existen (SQLite no soporta ADD COLUMN si existe)
        if 'autorizada_por' not in existing_columns:
            print("Agregando columna 'autorizada_por'...")
            session.execute(text("""
                ALTER TABLE proyecciones 
                ADD COLUMN autorizada_por VARCHAR
            """))
            session.commit()
        
        if 'fecha_autorizacion' not in existing_columns:
            print("Agregando columna 'fecha_autorizacion'...")
            session.execute(text("""
                ALTER TABLE proyecciones 
                ADD COLUMN fecha_autorizacion TIMESTAMP
            """))
            session.commit()
        
        if 'excede_presupuesto' not in existing_columns:
            print("Agregando columna 'excede_presupuesto'...")
            session.execute(text("""
                ALTER TABLE proyecciones 
                ADD COLUMN excede_presupuesto BOOLEAN DEFAULT 0
            """))
            session.commit()
        
        # Actualizar proyecciones existentes
        print("Actualizando registros existentes...")
        session.execute(text("""
            UPDATE proyecciones 
            SET estado = 'pendiente' 
            WHERE estado IS NULL OR estado = 'Activo'
        """))
        
        session.execute(text("""
            UPDATE proyecciones 
            SET excede_presupuesto = 0 
            WHERE excede_presupuesto IS NULL
        """))
        
        session.commit()
        print("✓ Migración completada exitosamente")
        
    except Exception as e:
        session.rollback()
        print(f"✗ Error en migración: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("Iniciando migración de campos de aprobación...")
    migrate()
