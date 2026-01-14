#!/usr/bin/env python3
"""
Script de backup automático de la base de datos
Ejecutar diariamente con cron para mantener backups rotativos
"""

import os
import shutil
import sqlite3
from datetime import datetime, timedelta
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), 'sgpme.db')
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

def backup_sqlite(db_path, backup_path):
    """Realiza backup de la base de datos SQLite usando el método oficial"""
    try:
        source = sqlite3.connect(db_path)
        dest = sqlite3.connect(backup_path)
        
        with dest:
            source.backup(dest)
        
        source.close()
        dest.close()
        return True
    except Exception as e:
        print(f"❌ Error al hacer backup: {e}")
        return False

def hacer_backup_diario():
    """Realiza un backup diario"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"sgpme_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, 'diarios', backup_filename)
    
    print(f"📦 Creando backup diario: {backup_filename}")
    
    if backup_sqlite(DB_PATH, backup_path):
        print(f"✅ Backup diario creado exitosamente")
        return backup_path
    return None

def hacer_backup_semanal():
    """Realiza un backup semanal (domingos)"""
    if datetime.now().weekday() == 6:
        timestamp = datetime.now().strftime('%Y%m%d')
        backup_filename = f"sgpme_semanal_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, 'semanales', backup_filename)
        
        print(f"📦 Creando backup semanal: {backup_filename}")
        
        if backup_sqlite(DB_PATH, backup_path):
            print(f"✅ Backup semanal creado exitosamente")
            return backup_path
    return None

def hacer_backup_mensual():
    """Realiza un backup mensual (primer día del mes)"""
    if datetime.now().day == 1:
        timestamp = datetime.now().strftime('%Y%m')
        backup_filename = f"sgpme_mensual_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, 'mensuales', backup_filename)
        
        print(f"📦 Creando backup mensual: {backup_filename}")
        
        if backup_sqlite(DB_PATH, backup_path):
            print(f"✅ Backup mensual creado exitosamente")
            return backup_path
    return None

def limpiar_backups_antiguos():
    """Elimina backups antiguos según la política de retención"""
    
    def limpiar_directorio(directorio, max_archivos):
        dir_path = os.path.join(BACKUP_DIR, directorio)
        archivos = sorted([
            os.path.join(dir_path, f) 
            for f in os.listdir(dir_path) 
            if f.endswith('.db')
        ], key=os.path.getmtime, reverse=True)
        
        if len(archivos) > max_archivos:
            archivos_a_eliminar = archivos[max_archivos:]
            for archivo in archivos_a_eliminar:
                os.remove(archivo)
                print(f"🗑️  Eliminado backup antiguo: {os.path.basename(archivo)}")
    
    limpiar_directorio('diarios', MAX_BACKUPS_DIARIOS)
    limpiar_directorio('semanales', MAX_BACKUPS_SEMANALES)
    limpiar_directorio('mensuales', MAX_BACKUPS_MENSUALES)

def verificar_integridad(backup_path):
    """Verifica que el backup sea válido"""
    try:
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        resultado = cursor.fetchone()
        conn.close()
        return resultado[0] == 'ok'
    except Exception as e:
        print(f"❌ Error al verificar integridad: {e}")
        return False

def main():
    print("=" * 60)
    print("🔄 INICIANDO PROCESO DE BACKUP")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Base de datos no encontrada: {DB_PATH}")
        sys.exit(1)
    
    crear_directorio_backups()
    
    backup_path = hacer_backup_diario()
    if backup_path and verificar_integridad(backup_path):
        print("✅ Backup verificado correctamente")
    
    hacer_backup_semanal()
    hacer_backup_mensual()
    
    limpiar_backups_antiguos()
    
    tamanio_db = os.path.getsize(DB_PATH) / (1024 * 1024)
    print(f"\n📊 Tamaño de la base de datos: {tamanio_db:.2f} MB")
    print("=" * 60)
    print("✅ PROCESO DE BACKUP COMPLETADO")
    print("=" * 60)

if __name__ == "__main__":
    main()
