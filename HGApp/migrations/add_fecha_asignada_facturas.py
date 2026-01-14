"""
Migración: Agregar mes_asignado y año_asignado a facturas
Fecha: 2026-01-12
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def upgrade():
    """Agregar columnas mes_asignado y año_asignado a la tabla facturas"""
    with engine.connect() as conn:
        try:
            # Agregar columna mes_asignado
            conn.execute(text("""
                ALTER TABLE facturas 
                ADD COLUMN mes_asignado VARCHAR(50)
            """))
            print("✅ Columna mes_asignado agregada")
            
            # Agregar columna año_asignado
            conn.execute(text("""
                ALTER TABLE facturas 
                ADD COLUMN año_asignado INTEGER
            """))
            print("✅ Columna año_asignado agregada")
            
            conn.commit()
            print("✅ Migración completada exitosamente")
            
        except Exception as e:
            print(f"❌ Error en migración: {e}")
            conn.rollback()
            raise

def downgrade():
    """Revertir los cambios"""
    with engine.connect() as conn:
        try:
            # Eliminar columna año_asignado
            conn.execute(text("""
                ALTER TABLE facturas 
                DROP COLUMN año_asignado
            """))
            print("✅ Columna año_asignado eliminada")
            
            # Eliminar columna mes_asignado
            conn.execute(text("""
                ALTER TABLE facturas 
                DROP COLUMN mes_asignado
            """))
            print("✅ Columna mes_asignado eliminada")
            
            conn.commit()
            print("✅ Reversión completada exitosamente")
            
        except Exception as e:
            print(f"❌ Error en reversión: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("Ejecutando migración...")
    upgrade()
