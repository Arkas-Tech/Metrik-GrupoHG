"""
Migración para agregar columna permisos_agencias a la tabla users.
Almacena los permisos de agencias como JSON string.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # Verificar si la columna ya existe
        result = db.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'permisos_agencias' not in columns:
            db.execute(text("ALTER TABLE users ADD COLUMN permisos_agencias TEXT"))
            db.commit()
            print("✅ Columna 'permisos_agencias' agregada exitosamente a la tabla users")
        else:
            print("ℹ️  La columna 'permisos_agencias' ya existe en la tabla users")
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
