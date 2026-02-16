"""
Migración: Agregar columna subcategoria a facturas
Fecha: 2026-02-04
"""

from database import engine
from sqlalchemy import text
import os

def migrate():
    """Agregar columna subcategoria a la tabla facturas"""
    with engine.connect() as conn:
        # Detectar si es PostgreSQL o SQLite
        db_type = os.getenv('DB_TYPE', 'postgresql')
        is_postgres = db_type == 'postgresql'
        
        if is_postgres:
            # PostgreSQL: Verificar si la columna existe
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name='facturas' 
                AND column_name='subcategoria'
            """))
        else:
            # SQLite: Verificar si la columna existe
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM pragma_table_info('facturas') 
                WHERE name='subcategoria'
            """))
        
        exists = result.scalar() > 0
        
        if not exists:
            print("➕ Agregando columna 'subcategoria' a la tabla facturas...")
            conn.execute(text("""
                ALTER TABLE facturas 
                ADD COLUMN subcategoria TEXT
            """))
            conn.commit()
            print("✅ Columna 'subcategoria' agregada exitosamente")
        else:
            print("ℹ️  La columna 'subcategoria' ya existe en la tabla facturas")

if __name__ == "__main__":
    print("🔄 Ejecutando migración: Agregar subcategoria a facturas")
    migrate()
    print("✅ Migración completada")
