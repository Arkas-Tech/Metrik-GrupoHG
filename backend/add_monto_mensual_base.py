#!/usr/bin/env python3
"""Script para agregar columna monto_mensual_base a la tabla presupuesto_mensual"""

from database import engine
from sqlalchemy import text, inspect

def main():
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('presupuesto_mensual')]
    
    if 'monto_mensual_base' not in columns:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE presupuesto_mensual 
                ADD COLUMN monto_mensual_base FLOAT DEFAULT 0.0
            """))
            conn.commit()
            print("✓ Columna monto_mensual_base agregada exitosamente")
    else:
        print("✓ Columna monto_mensual_base ya existe")

if __name__ == "__main__":
    main()
