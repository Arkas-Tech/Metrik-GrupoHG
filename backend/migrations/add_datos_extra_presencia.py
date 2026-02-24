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
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='presencia_tradicional' AND column_name='datos_extra_json'"
        ))
        if result.fetchone():
            print("Columna datos_extra_json ya existe, nada que hacer.")
            return

        conn.execute(text(
            "ALTER TABLE presencia_tradicional ADD COLUMN datos_extra_json TEXT"
        ))
        conn.commit()
        print("✅ Columna datos_extra_json agregada a presencia_tradicional.")

if __name__ == "__main__":
    run()
