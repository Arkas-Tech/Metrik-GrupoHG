"""Migración: agregar imagenes_json y cumplimiento_json a embajadores."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Verificar que la tabla existe
        result = conn.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_name = 'embajadores'"
        ))
        if not result.fetchone():
            conn.execute(text("""
                CREATE TABLE embajadores (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR NOT NULL,
                    plataformas_json TEXT,
                    presupuesto FLOAT DEFAULT 0,
                    leads INTEGER DEFAULT 0,
                    audiencia INTEGER DEFAULT 0,
                    marca VARCHAR,
                    imagenes_json TEXT,
                    cumplimiento_json TEXT,
                    fecha_creacion TIMESTAMP DEFAULT NOW(),
                    creado_por VARCHAR
                )
            """))
            conn.commit()
            print("✅ Tabla embajadores creada con columnas nuevas.")
            return

        # imagenes_json
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'embajadores' AND column_name = 'imagenes_json'"
        ))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE embajadores ADD COLUMN imagenes_json TEXT"))
            print("✅ Columna imagenes_json agregada a embajadores.")
        else:
            print("✅ Columna imagenes_json ya existe.")

        # cumplimiento_json
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'embajadores' AND column_name = 'cumplimiento_json'"
        ))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE embajadores ADD COLUMN cumplimiento_json TEXT"))
            print("✅ Columna cumplimiento_json agregada a embajadores.")
        else:
            print("✅ Columna cumplimiento_json ya existe.")

        conn.commit()

if __name__ == "__main__":
    migrate()
