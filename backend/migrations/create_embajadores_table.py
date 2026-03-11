"""Migración: crear tabla embajadores. Ejecutar: python migrations/create_embajadores_table.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_name = 'embajadores'"
        ))
        if result.fetchone():
            print("✅ La tabla embajadores ya existe.")
            return
        conn.execute(text("""
            CREATE TABLE embajadores (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR NOT NULL,
                plataformas_json TEXT,
                presupuesto FLOAT DEFAULT 0,
                leads INTEGER DEFAULT 0,
                audiencia INTEGER DEFAULT 0,
                marca VARCHAR,
                fecha_creacion TIMESTAMP DEFAULT NOW(),
                creado_por VARCHAR
            )
        """))
        conn.commit()
        print("✅ Tabla embajadores creada.")

if __name__ == "__main__":
    migrate()
