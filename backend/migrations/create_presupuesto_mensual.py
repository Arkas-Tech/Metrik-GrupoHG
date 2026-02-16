"""
Migración para crear tabla presupuesto_mensual
Convierte el sistema de presupuesto anual a mensual por categoría
"""

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def run_migration():
    """Crear tabla presupuesto_mensual"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # Crear tabla presupuesto_mensual
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS presupuesto_mensual (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mes INTEGER NOT NULL,
            anio INTEGER NOT NULL,
            categoria VARCHAR NOT NULL,
            marca_id INTEGER NOT NULL,
            monto FLOAT NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            modificado_por VARCHAR,
            FOREIGN KEY (marca_id) REFERENCES marcas (id),
            CONSTRAINT uq_presupuesto_mes_anio_categoria_agencia 
                UNIQUE (mes, anio, categoria, marca_id)
        );
        """
        
        conn.execute(text(create_table_sql))
        conn.commit()
        
        print("✅ Tabla presupuesto_mensual creada exitosamente")

if __name__ == "__main__":
    run_migration()