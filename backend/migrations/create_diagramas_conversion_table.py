"""Migración: crear tabla diagramas_conversion. Ejecutar: python migrations/create_diagramas_conversion_table.py"""
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
            "WHERE table_name = 'diagramas_conversion'"
        ))
        if result.fetchone():
            print("✅ La tabla diagramas_conversion ya existe.")
            return
        conn.execute(text("""
            CREATE TABLE diagramas_conversion (
                id SERIAL PRIMARY KEY,
                marca VARCHAR NOT NULL,
                modelo VARCHAR NOT NULL,
                mes INTEGER NOT NULL,
                anio INTEGER NOT NULL,
                canal_proyeccion VARCHAR,
                canal_conversion VARCHAR,
                departamento VARCHAR,
                anuncio VARCHAR,
                tipo VARCHAR,
                preguntas TEXT,
                objetivo VARCHAR,
                tipo_destino VARCHAR,
                destino VARCHAR,
                notas TEXT,
                fecha_creacion TIMESTAMP DEFAULT NOW(),
                fecha_modificacion TIMESTAMP DEFAULT NOW(),
                creado_por VARCHAR
            )
        """))
        conn.commit()
        print("✅ Tabla diagramas_conversion creada.")

if __name__ == "__main__":
    migrate()
