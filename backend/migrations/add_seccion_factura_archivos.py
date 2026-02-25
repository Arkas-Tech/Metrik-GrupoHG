"""
Migración: Agregar columna 'seccion' a factura_archivos
Fecha: 25 de Febrero, 2026
Descripción: Permite distinguir archivos de la sección 'general' vs 'productos'
"""

import os
import sys

# Soporte SQLite (local) y PostgreSQL (producción)
USE_POSTGRES = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

def migrar_postgres():
    import psycopg2
    conn_string = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='factura_archivos' AND column_name='seccion'
        """)
        if cursor.fetchone():
            print("ℹ️ La columna 'seccion' ya existe en factura_archivos")
            return True
        cursor.execute("ALTER TABLE factura_archivos ADD COLUMN seccion VARCHAR DEFAULT NULL")
        conn.commit()
        print("✅ Columna 'seccion' agregada a factura_archivos (PostgreSQL)")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()


def migrar_sqlite():
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sgpme.db')
    if not os.path.exists(db_path):
        print(f"❌ No se encontró la base de datos en: {db_path}")
        return False
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(factura_archivos)")
        columnas = [col[1] for col in cursor.fetchall()]
        if 'seccion' in columnas:
            print("ℹ️ La columna 'seccion' ya existe en factura_archivos")
            return True
        cursor.execute("ALTER TABLE factura_archivos ADD COLUMN seccion TEXT")
        conn.commit()
        print("✅ Columna 'seccion' agregada a factura_archivos (SQLite)")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def migrar():
    if USE_POSTGRES:
        return migrar_postgres()
    return migrar_sqlite()


if __name__ == "__main__":
    ok = migrar()
    sys.exit(0 if ok else 1)
