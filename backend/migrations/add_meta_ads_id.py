"""
Migración: agregar columna meta_ads_id a la tabla campanyas.
Ejecutar: python migrations/add_meta_ads_id.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Verificar si la columna ya existe
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'campanyas' AND column_name = 'meta_ads_id'"
        ))
        if result.fetchone():
            print("✅ La columna meta_ads_id ya existe.")
            return
        conn.execute(text("ALTER TABLE campanyas ADD COLUMN meta_ads_id VARCHAR NULL"))
        conn.commit()
        print("✅ Columna meta_ads_id agregada a campanyas.")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    migrate()
