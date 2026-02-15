"""
Migración para agregar el campo gasto_actual a la tabla campanyas
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar si la columna ya existe
        result = conn.execute(text("PRAGMA table_info(campanyas)"))
        columns = [row[1] for row in result]
        
        if 'gasto_actual' not in columns:
            print("Agregando columna gasto_actual a campanyas...")
            conn.execute(text(
                "ALTER TABLE campanyas ADD COLUMN gasto_actual FLOAT DEFAULT 0.0"
            ))
            conn.commit()
            print("✅ Columna gasto_actual agregada exitosamente")
        else:
            print("✅ La columna gasto_actual ya existe")
        
        # Verificar el resultado
        result = conn.execute(text("SELECT id, nombre, presupuesto, gasto_actual FROM campanyas LIMIT 10"))
        print("\nPrimeras campañas:")
        for row in result:
            print(f"  ID: {row[0]}, Nombre: {row[1]}, Presupuesto: {row[2]}, Gasto Actual: {row[3]}")

if __name__ == "__main__":
    migrate()
