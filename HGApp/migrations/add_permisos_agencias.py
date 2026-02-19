"""
Migración para agregar columna permisos_agencias a la tabla users.
Almacena los permisos de agencias como JSON string.
Compatible con SQLite y PostgreSQL.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text, inspect

def migrate():
    db = SessionLocal()
    try:
        # Detectar tipo de base de datos
        db_type = engine.dialect.name
        print(f"🔧 Detectada base de datos: {db_type}")
        
        # Verificar si la columna ya existe usando inspector de SQLAlchemy
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'permisos_agencias' not in columns:
            # Usar ALTER TABLE compatible con ambas bases de datos
            if db_type == 'postgresql':
                db.execute(text("ALTER TABLE users ADD COLUMN permisos_agencias TEXT"))
            else:  # sqlite
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
