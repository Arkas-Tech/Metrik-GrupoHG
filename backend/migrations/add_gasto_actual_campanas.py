"""
Migración para agregar el campo gasto_actual a la tabla campanyas
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    # Conectar a la base de datos PostgreSQL
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sgpme"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        port=os.getenv("DB_PORT", "5432")
    )
    
    cursor = conn.cursor()
    
    try:
        # Agregar columna gasto_actual a campanyas
        print("Agregando columna gasto_actual a campanyas...")
        cursor.execute("""
            ALTER TABLE campanyas 
            ADD COLUMN IF NOT EXISTS gasto_actual FLOAT DEFAULT 0.0;
        """)
        
        conn.commit()
        print("✓ Columna gasto_actual agregada exitosamente")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error en la migración: {e}")
        raise
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
