#!/bin/bash
"""
Script de backup automático para PostgreSQL
Ejecutar diariamente con cron para mantener backups rotativos
"""

import os
import sys
import subprocess
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sgpme")

BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
MAX_BACKUPS_DIARIOS = 7
MAX_BACKUPS_SEMANALES = 4
MAX_BACKUPS_MENSUALES = 6

def crear_directorio_backups():
    """Crea el directorio de backups si no existe"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(os.path.join(BACKUP_DIR, 'diarios'), exist_ok=True)
    os.makedirs(os.path.join(BACKUP_DIR, 'semanales'), exist_ok=True)
    os.makedirs(os.path.join(BACKUP_DIR, 'mensuales'), exist_ok=True)

def hacer_backup_pgdump(backup_path):
    """Realiza backup usando pg_dump"""
    try:
        cmd = [
            'pg_dump',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-F', 'c',
            '-b',
            '-v',
            '-f', backup_path,
            DB_NAME
        ]
        
        env = os.environ.copy()
        if os.getenv("DB_PASSWORD"):
            env['PGPASSWORD'] = os.getenv("DB_PASSWORD")
        
        subprocess.run(cmd, check=True, env=env, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error al hacer backup: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def hacer_backup_diario():
    """Realiza un backup diario"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"sgpme_backup_{timestamp}.dump"
    backup_path = os.path.join(BACKUP_DIR, 'diarios', backup_filename)
    
    print(f"📦 Creando backup diario: {backup_filename}")
    
    if hacer_backup_pgdump(backup_path):
        print(f"✅ Backup diario creado exitosamente")
        tamanio = os.path.getsize(backup_path) / (1024 * 1024)
        print(f"   Tamaño: {tamanio:.2f} MB")
        return backup_path
    return None

def hacer_backup_semanal():
    """Realiza un backup semanal (domingos)"""
    if datetime.now().weekday() == 6:
        timestamp = datetime.now().strftime('%Y%m%d')
        backup_filename = f"sgpme_semanal_{timestamp}.dump"
        backup_path = os.path.join(BACKUP_DIR, 'semanales', backup_filename)
        
        print(f"📦 Creando backup semanal: {backup_filename}")
        
        if hacer_backup_pgdump(backup_path):
            print(f"✅ Backup semanal creado exitosamente")
            tamanio = os.path.getsize(backup_path) / (1024 * 1024)
            print(f"   Tamaño: {tamanio:.2f} MB")
            return backup_path
    return None

def hacer_backup_mensual():
    """Realiza un backup mensual (primer día del mes)"""
    if datetime.now().day == 1:
        timestamp = datetime.now().strftime('%Y%m')
        backup_filename = f"sgpme_mensual_{timestamp}.dump"
        backup_path = os.path.join(BACKUP_DIR, 'mensuales', backup_filename)
        
        print(f"📦 Creando backup mensual: {backup_filename}")
        
        if hacer_backup_pgdump(backup_path):
            print(f"✅ Backup mensual creado exitosamente")
            tamanio = os.path.getsize(backup_path) / (1024 * 1024)
            print(f"   Tamaño: {tamanio:.2f} MB")
            return backup_path
    return None

def limpiar_backups_antiguos():
    """Elimina backups antiguos según la política de retención"""
    
    def limpiar_directorio(directorio, max_archivos):
        dir_path = os.path.join(BACKUP_DIR, directorio)
        archivos = sorted([
            os.path.join(dir_path, f) 
            for f in os.listdir(dir_path) 
            if f.endswith('.dump')
        ], key=os.path.getmtime, reverse=True)
        
        if len(archivos) > max_archivos:
            archivos_a_eliminar = archivos[max_archivos:]
            for archivo in archivos_a_eliminar:
                os.remove(archivo)
                print(f"🗑️  Eliminado backup antiguo: {os.path.basename(archivo)}")
    
    limpiar_directorio('diarios', MAX_BACKUPS_DIARIOS)
    limpiar_directorio('semanales', MAX_BACKUPS_SEMANALES)
    limpiar_directorio('mensuales', MAX_BACKUPS_MENSUALES)

def obtener_tamanio_db():
    """Obtiene el tamaño de la base de datos"""
    try:
        cmd = [
            'psql',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-d', DB_NAME,
            '-t',
            '-c', f"SELECT pg_size_pretty(pg_database_size('{DB_NAME}'));"
        ]
        
        env = os.environ.copy()
        if os.getenv("DB_PASSWORD"):
            env['PGPASSWORD'] = os.getenv("DB_PASSWORD")
        
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        return result.stdout.strip()
    except:
        return "Desconocido"

def main():
    print("=" * 60)
    print("🔄 INICIANDO PROCESO DE BACKUP POSTGRESQL")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    crear_directorio_backups()
    
    hacer_backup_diario()
    hacer_backup_semanal()
    hacer_backup_mensual()
    
    limpiar_backups_antiguos()
    
    tamanio_db = obtener_tamanio_db()
    print(f"\n📊 Tamaño de la base de datos: {tamanio_db}")
    print("=" * 60)
    print("✅ PROCESO DE BACKUP COMPLETADO")
    print("=" * 60)

if __name__ == "__main__":
    main()
