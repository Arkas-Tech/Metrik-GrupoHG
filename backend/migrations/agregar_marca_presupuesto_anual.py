"""
Migración: Agregar campo marca_id a presupuesto_anual
Fecha: 2026-01-13
Descripción: 
- Agregar columna marca_id con foreign key a marcas
- Quitar constraint unique de anio
- Agregar constraint unique (anio, marca_id)
- Migrar datos existentes asignándolos a la primera marca disponible
"""

import sys
import os

# Agregar el directorio padre al path para importar database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run_migration():
    print("🚀 Iniciando migración: agregar marca_id a presupuesto_anual")
    
    with engine.connect() as conn:
        try:
            # 1. Verificar si la columna ya existe
            check_column = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'presupuesto_anual' 
                AND column_name = 'marca_id'
            """)
            
            result = conn.execute(check_column)
            if result.fetchone():
                print("⚠️  La columna marca_id ya existe. Saltando migración.")
                return
            
            # 2. Obtener la primera marca disponible para migrar datos existentes
            get_first_marca = text("SELECT id FROM marcas ORDER BY id LIMIT 1")
            primera_marca = conn.execute(get_first_marca).fetchone()
            
            if not primera_marca:
                print("❌ No hay marcas en la base de datos. Crea al menos una marca antes de ejecutar esta migración.")
                return
            
            primera_marca_id = primera_marca[0]
            print(f"📋 Primera marca encontrada: ID {primera_marca_id}")
            
            # 3. Agregar columna marca_id (nullable temporalmente)
            print("➕ Agregando columna marca_id...")
            add_column = text("""
                ALTER TABLE presupuesto_anual 
                ADD COLUMN marca_id INTEGER
            """)
            conn.execute(add_column)
            conn.commit()
            
            # 4. Actualizar registros existentes con la primera marca
            print(f"🔄 Migrando datos existentes a marca_id = {primera_marca_id}...")
            update_existing = text("""
                UPDATE presupuesto_anual 
                SET marca_id = :marca_id 
                WHERE marca_id IS NULL
            """)
            conn.execute(update_existing, {"marca_id": primera_marca_id})
            conn.commit()
            
            # 5. Hacer la columna NOT NULL
            print("🔒 Haciendo marca_id NOT NULL...")
            alter_not_null = text("""
                ALTER TABLE presupuesto_anual 
                ALTER COLUMN marca_id SET NOT NULL
            """)
            conn.execute(alter_not_null)
            conn.commit()
            
            # 6. Agregar foreign key
            print("🔗 Agregando foreign key a marcas...")
            add_fk = text("""
                ALTER TABLE presupuesto_anual 
                ADD CONSTRAINT fk_presupuesto_marca 
                FOREIGN KEY (marca_id) REFERENCES marcas(id) 
                ON DELETE CASCADE
            """)
            conn.execute(add_fk)
            conn.commit()
            
            # 7. Quitar constraint unique de anio (si existe)
            print("🗑️  Quitando constraint unique de anio...")
            try:
                # Buscar el nombre del constraint
                get_constraint = text("""
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'presupuesto_anual' 
                    AND constraint_type = 'UNIQUE'
                    AND constraint_name LIKE '%anio%'
                """)
                constraint_result = conn.execute(get_constraint).fetchone()
                
                if constraint_result:
                    constraint_name = constraint_result[0]
                    drop_constraint = text(f"""
                        ALTER TABLE presupuesto_anual 
                        DROP CONSTRAINT {constraint_name}
                    """)
                    conn.execute(drop_constraint)
                    conn.commit()
                    print(f"   ✓ Constraint {constraint_name} eliminado")
                else:
                    print("   ℹ️  No se encontró constraint unique en anio")
            except Exception as e:
                print(f"   ⚠️  Advertencia al quitar constraint: {e}")
            
            # 8. Agregar constraint unique (anio, marca_id)
            print("✨ Agregando constraint unique (anio, marca_id)...")
            add_unique = text("""
                ALTER TABLE presupuesto_anual 
                ADD CONSTRAINT uq_presupuesto_anio_marca 
                UNIQUE (anio, marca_id)
            """)
            conn.execute(add_unique)
            conn.commit()
            
            print("\n✅ Migración completada exitosamente!")
            print("📊 Verificando estructura final...")
            
            # Verificar estructura
            verify = text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'presupuesto_anual' 
                ORDER BY ordinal_position
            """)
            
            columns = conn.execute(verify).fetchall()
            print("\nColumnas de presupuesto_anual:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
                
        except Exception as e:
            print(f"\n❌ Error durante la migración: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    run_migration()
