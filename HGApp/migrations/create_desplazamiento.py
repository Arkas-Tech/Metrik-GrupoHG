"""
Migración para crear tabla desplazamiento
Almacena datos de desplazamiento mensual por categoría
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def run_migration():
    """Crear tabla desplazamiento"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # Crear tabla desplazamiento
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS desplazamiento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mes INTEGER NOT NULL,
            anio INTEGER NOT NULL,
            marca_id INTEGER NOT NULL,
            categoria VARCHAR NOT NULL,
            datos_json TEXT NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            modificado_por VARCHAR,
            FOREIGN KEY (marca_id) REFERENCES marcas (id),
            CONSTRAINT uq_desplazamiento_mes_anio_marca_categoria 
                UNIQUE (mes, anio, marca_id, categoria)
        );
        """
        
        conn.execute(text(create_table_sql))
        conn.commit()
        
        print("✅ Tabla desplazamiento creada exitosamente")

if __name__ == "__main__":
    run_migration()
