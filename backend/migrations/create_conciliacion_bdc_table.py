"""Migración: crear tabla conciliacion_bdc. Ejecutar: python migrations/create_conciliacion_bdc_table.py"""
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
            "WHERE table_name = 'conciliacion_bdc'"
        ))
        if result.fetchone():
            print("✅ La tabla conciliacion_bdc ya existe.")
            return
        conn.execute(text("""
            CREATE TABLE conciliacion_bdc (
                id SERIAL PRIMARY KEY,
                marca VARCHAR NOT NULL,
                semana_inicio DATE NOT NULL,
                semana_fin DATE NOT NULL,
                mes INTEGER NOT NULL,
                anio INTEGER NOT NULL,
                leads_activos TEXT,
                leads_cerrados TEXT,
                comparacion_medios TEXT,
                notas_generales TEXT,
                fecha_creacion TIMESTAMP DEFAULT NOW(),
                fecha_modificacion TIMESTAMP DEFAULT NOW(),
                creado_por VARCHAR
            )
        """))
        conn.commit()
        print("✅ Tabla conciliacion_bdc creada.")

if __name__ == "__main__":
    migrate()
