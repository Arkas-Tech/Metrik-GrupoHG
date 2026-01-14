"""
Script de migración para agregar columna uso_cfdi a la tabla facturas
"""
import psycopg2
from psycopg2 import sql
import sys

def migrate_uso_cfdi():
    """Agrega la columna uso_cfdi a la tabla facturas si no existe"""
    
    # Configuración de la base de datos
    db_config = {
        'dbname': 'sgpme',
        'user': 'postgres',
        'password': '',  # Dejar vacío si no tiene contraseña
        'host': 'localhost',
        'port': '5432'
    }
    
    try:
        # Conectar a la base de datos
        print("Conectando a la base de datos...")
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Verificar si la columna ya existe
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='facturas' AND column_name='uso_cfdi'
        """)
        
        if cursor.fetchone():
            print("✓ La columna 'uso_cfdi' ya existe en la tabla facturas")
        else:
            # Agregar la columna uso_cfdi
            print("Agregando columna 'uso_cfdi' a la tabla facturas...")
            cursor.execute("""
                ALTER TABLE facturas 
                ADD COLUMN uso_cfdi VARCHAR(10)
            """)
            conn.commit()
            print("✓ Columna 'uso_cfdi' agregada exitosamente")
        
        # Verificar el resultado
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name='facturas' AND column_name='uso_cfdi'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"\nDetalles de la columna:")
            print(f"  Nombre: {result[0]}")
            print(f"  Tipo: {result[1]}")
            print(f"  Nullable: {result[2]}")
        
        cursor.close()
        conn.close()
        print("\n✓ Migración completada exitosamente")
        return True
        
    except psycopg2.Error as e:
        print(f"\n✗ Error durante la migración: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Error inesperado: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN: Agregar columna uso_cfdi a tabla facturas")
    print("=" * 60)
    
    success = migrate_uso_cfdi()
    sys.exit(0 if success else 1)
