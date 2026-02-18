"""
Migración: Separar campo dirección en múltiples campos en tabla proveedores
Fecha: 2026-02-18
"""

import os
import sys

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text, inspect

def agregar_campos_direccion():
    """Agregar campos separados de dirección a la tabla proveedores"""
    db = SessionLocal()
    
    try:
        # Detectar si es PostgreSQL o SQLite
        dialect = engine.dialect.name
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('proveedores')]
        
        print("🔍 Verificando campos existentes en tabla proveedores...")
        
        # Verificar qué campos nuevos necesitamos agregar
        nuevos_campos = {
            'calle': 'TEXT',
            'numero_exterior': 'VARCHAR(20)',
            'numero_interior': 'VARCHAR(20)',
            'colonia': 'VARCHAR(200)',
            'ciudad': 'VARCHAR(200)',
            'estado': 'VARCHAR(100)',
            'codigo_postal': 'VARCHAR(10)'
        }
        
        campos_a_agregar = []
        for campo, tipo in nuevos_campos.items():
            if campo not in existing_columns:
                campos_a_agregar.append((campo, tipo))
                print(f"  ➕ Campo '{campo}' no existe, se agregará")
            else:
                print(f"  ✓ Campo '{campo}' ya existe")
        
        if campos_a_agregar:
            print("\n🔄 Agregando campos de dirección separados...")
            
            for campo, tipo in campos_a_agregar:
                try:
                    if dialect == 'postgresql':
                        db.execute(text(f"""
                            ALTER TABLE proveedores
                            ADD COLUMN IF NOT EXISTS {campo} {tipo}
                        """))
                    else:  # SQLite
                        db.execute(text(f"""
                            ALTER TABLE proveedores
                            ADD COLUMN {campo} {tipo}
                        """))
                    print(f"  ✅ Campo '{campo}' agregado exitosamente")
                except Exception as e:
                    # En SQLite, si la columna ya existe, falla
                    if "duplicate column name" in str(e).lower():
                        print(f"  ℹ️  Campo '{campo}' ya existe")
                    else:
                        raise
            
            db.commit()
            print("\n✅ Campos de dirección agregados exitosamente")
        else:
            print("\nℹ️  Todos los campos de dirección ya existen")
        
        # Migrar datos existentes si hay algo en el campo 'direccion'
        print("\n🔄 Verificando si hay datos en el campo 'direccion' para migrar...")
        result = db.execute(text("""
            SELECT COUNT(*) as count FROM proveedores 
            WHERE direccion IS NOT NULL AND direccion != ''
        """))
        count = result.fetchone()[0]
        
        if count > 0:
            print(f"  ℹ️  Se encontraron {count} proveedores con dirección. Datos conservados en campo 'direccion'")
            print("  💡 NOTA: Puedes copiar manualmente las direcciones a los nuevos campos si es necesario")
        else:
            print("  ✓ No hay direcciones existentes para migrar")
            
    except Exception as e:
        print(f"\n❌ Error en la migración: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 Ejecutando migración: Separar campos de dirección en proveedores")
    print("=" * 70)
    agregar_campos_direccion()
    print("=" * 70)
    print("✅ Migración completada")
