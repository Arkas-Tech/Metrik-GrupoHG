"""
Migración: Agregar columna 'marca' a la tabla briefs_eventos
Para permitir múltiples reportes por evento (uno por agencia)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # Verificar si la columna ya existe
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'briefs_eventos' AND column_name = 'marca'
        """))
        if result.fetchone():
            print("✅ La columna 'marca' ya existe en briefs_eventos")
            return

        # Agregar la columna marca
        db.execute(text("ALTER TABLE briefs_eventos ADD COLUMN marca VARCHAR"))
        db.commit()
        print("✅ Columna 'marca' agregada a briefs_eventos")

        # Asignar marca del evento a briefs existentes
        db.execute(text("""
            UPDATE briefs_eventos 
            SET marca = (
                SELECT CASE 
                    WHEN e.marca LIKE '%|%' THEN SPLIT_PART(e.marca, '|', 1)
                    ELSE e.marca
                END
                FROM eventos e WHERE e.id = briefs_eventos.evento_id
            )
            WHERE marca IS NULL
        """))
        db.commit()
        print("✅ Marca asignada a briefs existentes desde sus eventos")

    except Exception as e:
        db.rollback()
        print(f"❌ Error en migración: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
