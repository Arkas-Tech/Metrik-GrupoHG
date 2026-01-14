"""
Migración: Crear tabla presupuesto_anual
Fecha: 2026-01-12
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def upgrade():
    """Crear tabla presupuesto_anual"""
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS presupuesto_anual (
                    id SERIAL PRIMARY KEY,
                    año INTEGER UNIQUE NOT NULL,
                    monto FLOAT NOT NULL,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modificado_por VARCHAR(255)
                )
            """))
            print("✅ Tabla presupuesto_anual creada")
            
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
            conn.execute(text("""
                DROP TABLE IF EXISTS presupuesto_anual
            """))
            print("✅ Tabla presupuesto_anual eliminada")
            
            conn.commit()
            print("✅ Reversión completada exitosamente")
            
        except Exception as e:
            print(f"❌ Error en reversión: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("Ejecutando migración...")
    upgrade()
