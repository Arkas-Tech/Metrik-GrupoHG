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
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables "
            "WHERE table_name = 'form_templates')"
        ))
        if result.scalar():
            print("Tabla form_templates ya existe, nada que hacer.")
            return

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
