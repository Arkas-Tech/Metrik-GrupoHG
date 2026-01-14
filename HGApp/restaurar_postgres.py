#!/usr/bin/env python3
"""
Script para restaurar un backup de PostgreSQL
Uso: python restaurar_postgres.py <ruta_al_backup>
"""

import os
import sys
import subprocess
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sgpme")

BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')

def listar_backups_disponibles():
    """Lista todos los backups disponibles"""
    backups = []
    
    for tipo in ['diarios', 'semanales', 'mensuales']:
        dir_path = os.path.join(BACKUP_DIR, tipo)
        if os.path.exists(dir_path):
            for archivo in os.listdir(dir_path):
                if archivo.endswith('.dump'):
                    ruta_completa = os.path.join(dir_path, archivo)
                    fecha_mod = datetime.fromtimestamp(os.path.getmtime(ruta_completa))
                    tamanio = os.path.getsize(ruta_completa) / (1024 * 1024)
                    backups.append({
                        'tipo': tipo,
                        'archivo': archivo,
                        'ruta': ruta_completa,
                        'fecha': fecha_mod,
                        'tamanio': tamanio
                    })
    
    backups.sort(key=lambda x: x['fecha'], reverse=True)
    return backups

def crear_backup_actual():
    """Crea un backup de seguridad antes de restaurar"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_seguridad = os.path.join(
        BACKUP_DIR, 
        f'pre_restauracion_{timestamp}.dump'
    )
    
    try:
        cmd = [
            'pg_dump',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-F', 'c',
            '-f', backup_seguridad,
            DB_NAME
        ]
        
        env = os.environ.copy()
        if os.getenv("DB_PASSWORD"):
            env['PGPASSWORD'] = os.getenv("DB_PASSWORD")
        
        subprocess.run(cmd, check=True, env=env, capture_output=True)
        print(f"✅ Backup de seguridad creado: {backup_seguridad}")
        return backup_seguridad
    except Exception as e:
        print(f"⚠️  No se pudo crear backup de seguridad: {e}")
        return None

def restaurar_backup(backup_path):
    """Restaura un backup usando pg_restore"""
    
    print("=" * 60)
    print("🔄 INICIANDO RESTAURACIÓN DE BACKUP")
    print("=" * 60)
    
    if not os.path.exists(backup_path):
        print(f"❌ Backup no encontrado: {backup_path}")
        return False
    
    print(f"📦 Backup a restaurar: {backup_path}")
    
    backup_seguridad = crear_backup_actual()
    
    respuesta = input("\n⚠️  ¿Estás seguro de restaurar este backup? Esto ELIMINARÁ todos los datos actuales. (escribe 'SI' para confirmar): ")
    if respuesta != 'SI':
        print("❌ Restauración cancelada")
        return False
    
    try:
        print("\n🗑️  Eliminando base de datos actual...")
        cmd_drop = [
            'psql',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-d', 'postgres',
            '-c', f'DROP DATABASE IF EXISTS {DB_NAME};'
        ]
        
        env = os.environ.copy()
        if os.getenv("DB_PASSWORD"):
            env['PGPASSWORD'] = os.getenv("DB_PASSWORD")
        
        subprocess.run(cmd_drop, check=True, env=env, capture_output=True)
        
        print("🗄️  Creando nueva base de datos...")
        cmd_create = [
            'psql',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-d', 'postgres',
            '-c', f'CREATE DATABASE {DB_NAME};'
        ]
        subprocess.run(cmd_create, check=True, env=env, capture_output=True)
        
        print("📥 Restaurando backup...")
        cmd_restore = [
            'pg_restore',
            '-U', DB_USER,
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-d', DB_NAME,
            '-v',
            backup_path
        ]
        subprocess.run(cmd_restore, check=True, env=env)
        
        print("\n✅ Base de datos restaurada exitosamente")
        if backup_seguridad:
            print(f"💾 Backup de seguridad guardado en: {backup_seguridad}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al restaurar backup: {e}")
        if backup_seguridad:
            print("⚠️  Para revertir, restaura el backup de seguridad manualmente")
        return False

def main():
    if len(sys.argv) > 1:
        backup_path = sys.argv[1]
        restaurar_backup(backup_path)
    else:
        print("=" * 60)
        print("📋 BACKUPS DISPONIBLES")
        print("=" * 60)
        
        backups = listar_backups_disponibles()
        
        if not backups:
            print("❌ No hay backups disponibles")
            return
        
        for i, backup in enumerate(backups, 1):
            print(f"\n{i}. [{backup['tipo'].upper()}] {backup['archivo']}")
            print(f"   Fecha: {backup['fecha'].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"   Tamaño: {backup['tamanio']:.2f} MB")
            print(f"   Ruta: {backup['ruta']}")
        
        print("\n" + "=" * 60)
        print("\nPara restaurar un backup, ejecuta:")
        print("python restaurar_postgres.py <ruta_completa_del_backup>")
        print("\nEjemplo:")
        print(f"python restaurar_postgres.py {backups[0]['ruta']}")

if __name__ == "__main__":
    main()
