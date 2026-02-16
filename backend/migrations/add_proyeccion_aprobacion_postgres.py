"""
Migración para agregar campos de aprobación a proyecciones (PostgreSQL)
Fecha: 2026-01-27
"""

import psycopg2
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def migrate():
    """Agregar columnas de aprobación a la tabla proyecciones"""
    try:
        # Conectar a PostgreSQL
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'sgpme'),
            user=os.getenv('DB_USER', 'sgpme_user'),
            password=os.getenv('DB_PASSWORD'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432')
        )
        cur = conn.cursor()
        
        # Verificar columnas existentes
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='proyecciones' 
            AND column_name IN ('autorizada_por', 'fecha_autorizacion', 'excede_presupuesto')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        
        print(f"Columnas existentes: {existing_columns}")
        
        # Agregar columnas si no existen
        if 'autorizada_por' not in existing_columns:
            print("Agregando columna 'autorizada_por'...")
            cur.execute("ALTER TABLE proyecciones ADD COLUMN autorizada_por VARCHAR")
            conn.commit()
        
        if 'fecha_autorizacion' not in existing_columns:
            print("Agregando columna 'fecha_autorizacion'...")
            cur.execute("ALTER TABLE proyecciones ADD COLUMN fecha_autorizacion TIMESTAMP")
            conn.commit()
        
        if 'excede_presupuesto' not in existing_columns:
            print("Agregando columna 'excede_presupuesto'...")
            cur.execute("ALTER TABLE proyecciones ADD COLUMN excede_presupuesto BOOLEAN DEFAULT FALSE")
            conn.commit()
        
        # Actualizar registros existentes
        print("Actualizando registros existentes...")
        cur.execute("""
            UPDATE proyecciones 
            SET estado = 'pendiente' 
            WHERE estado IS NULL OR estado = 'Activo'
        """)
        
        cur.execute("""
            UPDATE proyecciones 
            SET excede_presupuesto = FALSE 
            WHERE excede_presupuesto IS NULL
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("✓ Migración completada exitosamente")
        
    except Exception as e:
        print(f"✗ Error en migración: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    print("Iniciando migración de campos de aprobación (PostgreSQL)...")
    migrate()
