"""
Migración para agregar contactos_json a la tabla proveedores.
Permite almacenar múltiples contactos por proveedor en formato JSON.
"""

import os
import sys
from pathlib import Path

current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

DB_TYPE = os.getenv('DB_TYPE', 'sqlite')


def upgrade():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        try:
            if DB_TYPE == 'postgresql':
                conn.execute(text("""
                    ALTER TABLE proveedores
                    ADD COLUMN IF NOT EXISTS contactos_json TEXT
                """))
                print("✅ Columna contactos_json agregada (PostgreSQL)")
            else:
                result = conn.execute(text("PRAGMA table_info(proveedores)"))
                columns = [row[1] for row in result]
                if 'contactos_json' not in columns:
                    conn.execute(text("""
                        ALTER TABLE proveedores
                        ADD COLUMN contactos_json TEXT
                    """))
                    print("✅ Columna contactos_json agregada (SQLite)")
                else:
                    print("ℹ️  Columna contactos_json ya existe")
            conn.commit()
        except Exception as e:
            print(f"❌ Error en migración: {e}")
            raise


if __name__ == "__main__":
    upgrade()
