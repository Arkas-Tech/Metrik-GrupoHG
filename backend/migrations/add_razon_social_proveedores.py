"""
Migración para agregar el campo razon_social a la tabla proveedores
"""

import os
import sys
from pathlib import Path

# Agregar el directorio padre al path para poder importar
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

# Determinar si estamos usando PostgreSQL o SQLite
DB_TYPE = os.getenv('DB_TYPE', 'sqlite')

def upgrade():
    """Agregar columna razon_social a proveedores"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            if DB_TYPE == 'postgresql':
                # PostgreSQL
                conn.execute(text("""
                    ALTER TABLE proveedores 
                    ADD COLUMN IF NOT EXISTS razon_social VARCHAR
                """))
                print("✅ Columna razon_social agregada exitosamente (PostgreSQL)")
            else:
                # SQLite
                # Verificar si la columna ya existe
                result = conn.execute(text("PRAGMA table_info(proveedores)"))
                columns = [row[1] for row in result]
                
                if 'razon_social' not in columns:
                    conn.execute(text("""
                        ALTER TABLE proveedores 
                        ADD COLUMN razon_social TEXT
                    """))
                    print("✅ Columna razon_social agregada exitosamente (SQLite)")
                else:
                    print("ℹ️  Columna razon_social ya existe")
            
            conn.commit()
        except Exception as e:
            print(f"❌ Error en migración: {e}")
            conn.rollback()
            raise

def downgrade():
    """Eliminar columna razon_social de proveedores"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            if DB_TYPE == 'postgresql':
                conn.execute(text("""
                    ALTER TABLE proveedores 
                    DROP COLUMN IF EXISTS razon_social
                """))
                print("✅ Columna razon_social eliminada (PostgreSQL)")
            else:
                # SQLite no soporta DROP COLUMN directamente
                print("⚠️  SQLite no soporta DROP COLUMN. Se requiere recrear la tabla.")
            
            conn.commit()
        except Exception as e:
            print(f"❌ Error al revertir migración: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("🔄 Ejecutando migración: Agregar razon_social a proveedores")
    upgrade()
    print("✅ Migración completada")
