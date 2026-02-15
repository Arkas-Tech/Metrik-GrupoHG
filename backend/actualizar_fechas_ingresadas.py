"""
Script para actualizar fecha_ingresada en facturas autorizadas existentes
"""
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def actualizar_fechas():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        # Actualizar facturas autorizadas para que tengan fecha_ingresada
        # Usar la fecha_creacion como fecha_ingresada
        result = connection.execute(text("""
            UPDATE facturas 
            SET fecha_ingresada = DATE(fecha_creacion)
            WHERE autorizada = true 
            AND fecha_ingresada IS NULL
        """))
        connection.commit()
        
        rows_updated = result.rowcount
        print(f"✓ {rows_updated} facturas actualizadas con fecha_ingresada")

if __name__ == "__main__":
    actualizar_fechas()
