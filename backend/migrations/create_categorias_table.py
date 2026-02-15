"""
Migración: Crear tabla categorias
Descripción: Tabla para gestionar categorías y subcategorías del sistema (únicas para todo el sistema)
Fecha: 2026-02-04
"""

import os
import sys
from pathlib import Path

# Agregar el directorio padre al path para importar módulos
sys.path.append(str(Path(__file__).parent.parent))

from database import engine, SessionLocal
from sqlalchemy import text
import json

# Detectar el tipo de base de datos
DB_TYPE = os.getenv('DB_TYPE', 'sqlite').lower()

def run_migration():
    """Ejecuta la migración para crear la tabla categorias"""
    
    session = SessionLocal()
    
    try:
        print(f"🔧 Usando {'PostgreSQL' if DB_TYPE == 'postgresql' else 'SQLite'}: {engine.url}")
        print("🔄 Ejecutando migración: Crear tabla categorias")
        
        if DB_TYPE == 'postgresql':
            # PostgreSQL
            session.execute(text("""
                CREATE TABLE IF NOT EXISTS categorias (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR NOT NULL UNIQUE,
                    subcategorias TEXT,
                    activo BOOLEAN DEFAULT TRUE,
                    orden INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER REFERENCES users(id)
                );
            """))
            print("✅ Tabla categorias creada (PostgreSQL)")
            
            # Verificar si ya existen categorías
            result = session.execute(text("SELECT COUNT(*) FROM categorias"))
            count = result.scalar()
            
            if count == 0:
                # Insertar categorías por defecto (únicas para todo el sistema)
                categorias_default = [
                    ("Social Media", json.dumps(["Meta", "Facebook", "Instagram", "TikTok", "Pinterest", "LinkedIn", "Otros"]), 1),
                    ("Digital", json.dumps(["Google Search", "Google Display", "WEB", "Youtube", "Mailing", "WhatsApp Business", "Otros"]), 2),
                    ("Medios Tradicionales", json.dumps(["Espectaculares", "TV", "Radio", "Periodico", "Revistas", "Publicidad Movil", "Otros"]), 3),
                    ("Marketing de Contenido", json.dumps(["Produccion de Contenido", "Influencers", "Otros"]), 4),
                    ("Relaciones Públicas", json.dumps(["Eventos en Agencia", "Eventos Privados", "Eventos Masivos", "Eventos Planta", "Eventos para Clientes", "Lanzamientos", "Otros"]), 5),
                    ("Imagen Corporativa", json.dumps(["Comunicacion Interna", "Comunicacion Planta", "Rotulacion Demos"]), 6),
                    ("Plataformas", json.dumps(["CRM", "WEB", "Otras Plataformas"]), 7),
                ]
                
                for nombre, subcategorias, orden in categorias_default:
                    session.execute(text("""
                        INSERT INTO categorias (nombre, subcategorias, activo, orden)
                        VALUES (:nombre, :subcategorias, TRUE, :orden)
                    """), {"nombre": nombre, "subcategorias": subcategorias, "orden": orden})
                
                print("✅ Categorías por defecto insertadas")
            else:
                print("ℹ️  Categorías ya existen, omitiendo inserción")
            
        else:
            # SQLite
            session.execute(text("""
                CREATE TABLE IF NOT EXISTS categorias (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    subcategorias TEXT,
                    activo INTEGER DEFAULT 1,
                    orden INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            print("✅ Tabla categorias creada (SQLite)")
            
            # Verificar si ya existen categorías
            result = session.execute(text("SELECT COUNT(*) FROM categorias"))
            count = result.scalar()
            
            if count == 0:
                # Insertar categorías por defecto (únicas para todo el sistema)
                categorias_default = [
                    ("Social Media", json.dumps(["Meta", "Facebook", "Instagram", "TikTok", "Pinterest", "LinkedIn", "Otros"]), 1),
                    ("Digital", json.dumps(["Google Search", "Google Display", "WEB", "Youtube", "Mailing", "WhatsApp Business", "Otros"]), 2),
                    ("Medios Tradicionales", json.dumps(["Espectaculares", "TV", "Radio", "Periodico", "Revistas", "Publicidad Movil", "Otros"]), 3),
                    ("Marketing de Contenido", json.dumps(["Produccion de Contenido", "Influencers", "Otros"]), 4),
                    ("Relaciones Públicas", json.dumps(["Eventos en Agencia", "Eventos Privados", "Eventos Masivos", "Eventos Planta", "Eventos para Clientes", "Lanzamientos", "Otros"]), 5),
                    ("Imagen Corporativa", json.dumps(["Comunicacion Interna", "Comunicacion Planta", "Rotulacion Demos"]), 6),
                    ("Plataformas", json.dumps(["CRM", "WEB", "Otras Plataformas"]), 7),
                ]
                
                for nombre, subcategorias, orden in categorias_default:
                    session.execute(text(
                        'INSERT INTO categorias (nombre, subcategorias, activo, orden) VALUES (:nombre, :subcategorias, 1, :orden)'
                    ), {"nombre": nombre, "subcategorias": subcategorias, "orden": orden})
                
                print("✅ Categorías por defecto insertadas")
            else:
                print("ℹ️  Categorías ya existen, omitiendo inserción")
        
        session.commit()
        print("✅ Migración completada")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error en migración: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    run_migration()
