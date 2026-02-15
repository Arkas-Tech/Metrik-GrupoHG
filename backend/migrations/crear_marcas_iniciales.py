"""
Script para crear marcas iniciales en la base de datos
"""

import sys
import os

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Marcas, Users

MARCAS_INICIALES = [
    "Toyota Chihuahua",
    "Toyota Delicias",
    "Toyota Cuauhtemoc",
    "Toyota Monclova",
    "Toyota Piedras Negras",
    "Kia Juventud",
    "Kia Juarez",
    "Subaru Chihuahua",
    "Subaru Juárez",
    "GWM Chihuahua",
    "GWM Juárez",
    "Seminuevos Chihuahua",
    "Seminuevos Juárez",
    "Seminuevos Monclova",
]

def crear_marcas():
    db = SessionLocal()
    try:
        print("🚀 Creando marcas iniciales...")
        
        # Verificar si ya existen marcas
        marcas_existentes = db.query(Marcas).count()
        if marcas_existentes > 0:
            print(f"⚠️  Ya existen {marcas_existentes} marcas en la base de datos")
            respuesta = input("¿Deseas agregar las marcas faltantes? (s/n): ")
            if respuesta.lower() != 's':
                print("Operación cancelada")
                return
        
        # Obtener el primer usuario para asignar como user_id
        primer_usuario = db.query(Users).first()
        if not primer_usuario:
            print("❌ No hay usuarios en la base de datos. Crea un usuario primero.")
            return
        
        print(f"📋 Usuario encontrado: {primer_usuario.email}")
        
        marcas_creadas = 0
        for nombre_marca in MARCAS_INICIALES:
            # Verificar si ya existe
            marca_existente = db.query(Marcas).filter(Marcas.cuenta == nombre_marca).first()
            if marca_existente:
                print(f"   ⏭️  {nombre_marca} ya existe")
                continue
            
            # Crear nueva marca
            nueva_marca = Marcas(
                cuenta=nombre_marca,
                coordinador="Sin asignar",
                administrador="Sin asignar",
                user_id=primer_usuario.id
            )
            db.add(nueva_marca)
            marcas_creadas += 1
            print(f"   ✅ {nombre_marca} creada")
        
        db.commit()
        
        total_marcas = db.query(Marcas).count()
        print(f"\n✅ Proceso completado!")
        print(f"📊 Marcas creadas: {marcas_creadas}")
        print(f"📊 Total de marcas en DB: {total_marcas}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    crear_marcas()
