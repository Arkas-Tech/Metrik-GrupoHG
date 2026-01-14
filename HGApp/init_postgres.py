#!/usr/bin/env python3
"""
Script para inicializar la base de datos PostgreSQL
Crea todas las tablas y el usuario administrador inicial
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from database import Base, engine, SessionLocal
from models import Users
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    """Inicializa la base de datos PostgreSQL"""
    
    print("=" * 60)
    print("🚀 INICIALIZANDO BASE DE DATOS POSTGRESQL")
    print("=" * 60)
    
    try:
        print("\n📦 Creando tablas...")
        Base.metadata.create_all(bind=engine)
        print("✅ Todas las tablas creadas exitosamente")
        
        db = SessionLocal()
        
        admin_existe = db.query(Users).filter(Users.username == "admin").first()
        
        if not admin_existe:
            print("\n👤 Creando usuario administrador...")
            admin = Users(
                username="admin",
                email="admin@sgpme.com",
                hashed_password=pwd_context.hash("admin123"),
                role="administrador",
                full_name="Administrador del Sistema"
            )
            db.add(admin)
            db.commit()
            print("✅ Usuario administrador creado")
            print("   Username: admin")
            print("   Password: admin123")
            print("   ⚠️  CAMBIA ESTA CONTRASEÑA EN PRODUCCIÓN")
        else:
            print("\n✅ Usuario administrador ya existe")
        
        db.close()
        
        print("\n" + "=" * 60)
        print("✅ BASE DE DATOS INICIALIZADA CORRECTAMENTE")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error al inicializar base de datos: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if init_database():
        sys.exit(0)
    else:
        sys.exit(1)
