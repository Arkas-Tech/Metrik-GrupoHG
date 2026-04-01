"""
Migración: Agregar campos horario, audiencia_esperada, demografia, nse a eventos
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        columns_to_add = [
            ("horario", "VARCHAR"),
            ("audiencia_esperada", "INTEGER"),
            ("demografia", "TEXT"),
            ("nse", "VARCHAR"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE eventos ADD COLUMN {col_name} {col_type}"))
                print(f"✅ Columna '{col_name}' agregada exitosamente")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"ℹ️  Columna '{col_name}' ya existe, saltando...")
                else:
                    print(f"❌ Error agregando '{col_name}': {e}")
        
        conn.commit()
        print("\n✅ Migración completada")

if __name__ == "__main__":
    migrate()
