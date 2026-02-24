"""
Migración: Agrega columna datos_extra_json a presencia_tradicional
para almacenar los datos del formulario dinámico.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run():
    dialect = engine.dialect.name  # 'postgresql' or 'sqlite'
    with engine.connect() as conn:
        # Check if column already exists (dialect-aware)
        if dialect == 'sqlite':
            result = conn.execute(text("PRAGMA table_info(presencia_tradicional)"))
            cols = [row[1] for row in result.fetchall()]
            already_exists = 'datos_extra_json' in cols
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='presencia_tradicional' AND column_name='datos_extra_json'"
            ))
            already_exists = result.fetchone() is not None

        if already_exists:
            print("Columna datos_extra_json ya existe, nada que hacer.")
            return

        conn.execute(text(
            "ALTER TABLE presencia_tradicional ADD COLUMN datos_extra_json TEXT"
        ))
        conn.commit()
        print("✅ Columna datos_extra_json agregada a presencia_tradicional.")

if __name__ == "__main__":
    run()
