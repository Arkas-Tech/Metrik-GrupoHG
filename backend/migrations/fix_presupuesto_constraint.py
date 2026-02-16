"""
Fix: Eliminar constraint viejo presupuesto_anual_año_key
Fecha: 2026-01-13
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def run_migration():
    print("🚀 Eliminando constraint viejo presupuesto_anual_año_key")
    
    with engine.connect() as conn:
        try:
            # Verificar si existe el constraint viejo
            check_constraint = text("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'presupuesto_anual' 
                AND constraint_name = 'presupuesto_anual_año_key'
            """)
            
            result = conn.execute(check_constraint).fetchone()
            
            if result:
                print(f"✅ Encontrado constraint: {result[0]}")
                
                # Eliminar el constraint viejo
                drop_constraint = text("""
                    ALTER TABLE presupuesto_anual 
                    DROP CONSTRAINT "presupuesto_anual_año_key"
                """)
                conn.execute(drop_constraint)
                conn.commit()
                
                print("✅ Constraint eliminado exitosamente!")
            else:
                print("⚠️  Constraint no encontrado, puede que ya esté eliminado")
            
            # Verificar constraints finales
            verify = text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints 
                WHERE table_name = 'presupuesto_anual'
            """)
            
            constraints = conn.execute(verify).fetchall()
            print("\n📋 Constraints actuales en presupuesto_anual:")
            for c in constraints:
                print(f"  - {c[0]}: {c[1]}")
                
        except Exception as e:
            print(f"\n❌ Error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    run_migration()
