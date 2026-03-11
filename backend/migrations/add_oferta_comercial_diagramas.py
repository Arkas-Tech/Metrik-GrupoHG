"""add oferta_comercial column to diagramas_conversion"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text


def run():
    print("🔧 Agregando columna oferta_comercial a diagramas_conversion...")
    with engine.connect() as conn:
        try:
            conn.execute(
                text(
                    "ALTER TABLE diagramas_conversion "
                    "ADD COLUMN IF NOT EXISTS oferta_comercial VARCHAR"
                )
            )
            conn.commit()
            print("✅ Columna oferta_comercial agregada correctamente")
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    run()
