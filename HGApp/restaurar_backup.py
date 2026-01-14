#!/usr/bin/env python3
"""
Script para restaurar un backup de la base de datos
Uso: python restaurar_backup.py <ruta_al_backup>
"""

import os
import shutil
import sqlite3
import sys
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'sgpme.db')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')

def listar_backups_disponibles():
    """Lista todos los backups disponibles"""
    backups = []
    
    for tipo in ['diarios', 'semanales', 'mensuales']:
        dir_path = os.path.join(BACKUP_DIR, tipo)
        if os.path.exists(dir_path):
            for archivo in os.listdir(dir_path):
                if archivo.endswith('.db'):
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

def verificar_backup(backup_path):
    """Verifica que el backup sea válido antes de restaurar"""
    try:
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        resultado = cursor.fetchone()
        conn.close()
        return resultado[0] == 'ok'
    except Exception as e:
        print(f"❌ Error al verificar backup: {e}")
        return False

def crear_backup_actual():
    """Crea un backup de seguridad de la BD actual antes de restaurar"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_seguridad = os.path.join(
        BACKUP_DIR, 
        f'pre_restauracion_{timestamp}.db'
    )
    
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, backup_seguridad)
        print(f"✅ Backup de seguridad creado: {backup_seguridad}")
        return backup_seguridad
    return None

def restaurar_backup(backup_path):
    """Restaura un backup"""
    
    print("=" * 60)
    print("🔄 INICIANDO RESTAURACIÓN DE BACKUP")
    print("=" * 60)
    
    if not os.path.exists(backup_path):
        print(f"❌ Backup no encontrado: {backup_path}")
        return False
    
    print(f"📦 Backup a restaurar: {backup_path}")
    
    if not verificar_backup(backup_path):
        print("❌ El backup está corrupto o no es válido")
        return False
    
    print("✅ Backup verificado correctamente")
    
    backup_seguridad = crear_backup_actual()
    
    respuesta = input("\n⚠️  ¿Estás seguro de restaurar este backup? (escribe 'SI' para confirmar): ")
    if respuesta != 'SI':
        print("❌ Restauración cancelada")
        return False
    
    try:
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        
        shutil.copy2(backup_path, DB_PATH)
        
        print("✅ Base de datos restaurada exitosamente")
        print(f"💾 Backup de seguridad guardado en: {backup_seguridad}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al restaurar backup: {e}")
        if backup_seguridad and os.path.exists(backup_seguridad):
            print("⚠️  Intentando restaurar backup de seguridad...")
            shutil.copy2(backup_seguridad, DB_PATH)
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
        print("python restaurar_backup.py <ruta_completa_del_backup>")
        print("\nEjemplo:")
        print(f"python restaurar_backup.py {backups[0]['ruta']}")

if __name__ == "__main__":
    main()
