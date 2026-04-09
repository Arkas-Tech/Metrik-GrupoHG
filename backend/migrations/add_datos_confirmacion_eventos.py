"""
Migración: Agrega columna datos_confirmacion a eventos
para almacenar la info del checkpoint de confirmación (asesores, objetivos).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run():
    dialect = engine.dialect.name  # 'postgresql' or 'sqlite'
    with engine.connect() as conn:
        if dialect == 'sqlite':
            result = conn.execute(text("PRAGMA table_info(eventos)"))
            cols = [row[1] for row in result.fetchall()]
            already_exists = 'datos_confirmacion' in cols
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='eventos' AND column_name='datos_confirmacion'"
            ))
            already_exists = result.fetchone() is not None

        if already_exists:
            print("Columna datos_confirmacion ya existe, nada que hacer.")
            return

        conn.execute(text("ALTER TABLE eventos ADD COLUMN datos_confirmacion TEXT"))
        conn.commit()
        print("✅ Columna datos_confirmacion agregada a eventos.")

if __name__ == "__main__":
    run()
