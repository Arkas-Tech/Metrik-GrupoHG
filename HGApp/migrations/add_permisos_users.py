"""
Migración: Agregar campo permisos a la tabla users
Fecha: 2026-02-19
Descripción: Agrega columna permisos (TEXT) a users para almacenar permisos JSON
Compatible con SQLite y PostgreSQL.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text, inspect

def migrar():
    """Agregar columna permisos a users"""
    db = SessionLocal()
    try:
        # Detectar tipo de base de datos
        db_type = engine.dialect.name
        print(f"🔧 Detectada base de datos: {db_type}")
        
        # Verificar si la columna ya existe usando inspector de SQLAlchemy
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'permisos' in columns:
            print("✅ La columna 'permisos' ya existe en la tabla 'users'")
            return
        
        # Agregar columna permisos (compatible con ambas bases de datos)
        db.execute(text("ALTER TABLE users ADD COLUMN permisos TEXT"))
        db.commit()
        
        print("✅ Columna 'permisos' agregada exitosamente a la tabla 'users'")
        
        # Inicializar permisos por defecto para usuarios existentes
        default_permisos = '{"dashboard": true, "estrategia": true, "facturas": true, "eventos": true, "digital": true}'
        db.execute(text("""
            UPDATE users 
            SET permisos = :permisos 
            WHERE permisos IS NULL
        """), {"permisos": default_permisos})
        db.commit()
        
        print("✅ Permisos por defecto asignados a usuarios existentes")
        
    except Exception as e:
        print(f"❌ Error en migración: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Iniciando migración: agregar campo permisos a users...")
    migrar()
    print("Migración completada!")
