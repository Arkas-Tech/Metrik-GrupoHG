"""
Script de migración para agregar la columna fecha_ingresada a la tabla facturas
"""
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def run_migration():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        # Verificar si la columna ya existe
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='facturas' AND column_name='fecha_ingresada'
        """))
        
        if result.fetchone() is None:
            # Agregar la columna fecha_ingresada
            connection.execute(text("""
                ALTER TABLE facturas 
                ADD COLUMN fecha_ingresada DATE
            """))
            connection.commit()
            print("✓ Columna fecha_ingresada agregada exitosamente")
        else:
            print("✓ La columna fecha_ingresada ya existe")

if __name__ == "__main__":
    run_migration()
