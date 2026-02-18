"""
Migración: Agregar campo 'productos' a la tabla facturas
Fecha: 18 de Febrero, 2026
Descripción: Agrega un campo de texto para describir productos/servicios en cada factura
"""

import sqlite3
import os

def migrar():
    # Determinar ruta de la base de datos
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sgpme.db')
    
    if not os.path.exists(db_path):
        print(f"❌ No se encontró la base de datos en: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(facturas)")
        columnas = [col[1] for col in cursor.fetchall()]
        
        if 'productos' in columnas:
            print("ℹ️ La columna 'productos' ya existe en la tabla facturas")
            return True
        
        # Agregar columna
        cursor.execute("ALTER TABLE facturas ADD COLUMN productos TEXT")
        conn.commit()
        print("✅ Columna 'productos' agregada exitosamente a la tabla facturas")
        return True
        
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrar()
