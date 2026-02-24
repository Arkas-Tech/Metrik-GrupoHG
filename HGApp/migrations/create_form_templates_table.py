"""
Migración: Crea la tabla form_templates si no existe.
Esta tabla almacena las plantillas de formulario para cada subcategoría de presencia tradicional.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run():
    dialect = engine.dialect.name  # 'postgresql' or 'sqlite'
    with engine.connect() as conn:
        # Check if table already exists (dialect-aware)
        if dialect == 'sqlite':
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='form_templates'"
            ))
            already_exists = result.fetchone() is not None
        else:
            result = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables "
                "WHERE table_name = 'form_templates')"
            ))
            already_exists = result.scalar()

        if already_exists:
            print("Tabla form_templates ya existe, nada que hacer.")
            return

        if dialect == 'sqlite':
            conn.execute(text("""
                CREATE TABLE form_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subcategoria VARCHAR UNIQUE NOT NULL,
                    template_json TEXT NOT NULL,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
        else:
            conn.execute(text("""
                CREATE TABLE form_templates (
                    id SERIAL PRIMARY KEY,
                    subcategoria VARCHAR UNIQUE NOT NULL,
                    template_json TEXT NOT NULL,
                    fecha_creacion TIMESTAMP DEFAULT NOW(),
                    fecha_modificacion TIMESTAMP DEFAULT NOW()
                )
            """))
        conn.commit()
        print("✅ Tabla form_templates creada.")

if __name__ == "__main__":
    run()
