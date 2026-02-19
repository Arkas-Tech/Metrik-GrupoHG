"""
Migración: Agregar campo permisos a la tabla users
Fecha: 2026-02-19
Descripción: Agrega columna permisos (TEXT) a users para almacenar permisos JSON
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrar():
    """Agregar columna permisos a users"""
    with engine.connect() as conn:
        try:
            # Verificar si la columna ya existe (funciona con SQLite y PostgreSQL)
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if 'permisos' in columns:
                print("✅ La columna 'permisos' ya existe en la tabla 'users'")
                return
            
            # Agregar columna permisos
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN permisos TEXT
            """))
            conn.commit()
            
            print("✅ Columna 'permisos' agregada exitosamente a la tabla 'users'")
            
            # Inicializar permisos por defecto para usuarios existentes
            default_permisos = '{"dashboard": true, "estrategia": true, "facturas": true, "eventos": true, "digital": true}'
            conn.execute(text("""
                UPDATE users 
                SET permisos = :permisos 
                WHERE permisos IS NULL
            """), {"permisos": default_permisos})
            conn.commit()
            
            print("✅ Permisos por defecto asignados a usuarios existentes")
            
        except Exception as e:
            print(f"❌ Error en migración: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("Iniciando migración: agregar campo permisos a users...")
    migrar()
    print("Migración completada!")
