"""
Script de migración manual para cambiar "Relaciones Públicas" a "Eventos"
en todas las tablas relacionadas
"""

import sys
import os

# Agregar el directorio padre al path para poder importar los módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Facturas, Proyecciones, PresupuestoMensual
import json

def migrar_categoria():
    db = SessionLocal()
    try:
        nombre_anterior = "Relaciones Públicas"
        nombre_nuevo = "Eventos"
        
        stats = {
            "facturas_actualizadas": 0,
            "proyecciones_actualizadas": 0,
            "proyecciones_campo_categoria": 0,
            "partidas_actualizadas": 0,
            "presupuestos_mensuales_actualizados": 0
        }
        
        # 1. Actualizar facturas
        print(f"Actualizando facturas de '{nombre_anterior}' a '{nombre_nuevo}'...")
        facturas = db.query(Facturas).filter(Facturas.categoria == nombre_anterior).all()
        for factura in facturas:
            factura.categoria = nombre_nuevo
            stats["facturas_actualizadas"] += 1
        print(f"  ✓ {stats['facturas_actualizadas']} facturas actualizadas")
        
        # 2. Actualizar proyecciones - campo categoria directo
        print(f"\nActualizando proyecciones (campo categoria)...")
        proyecciones = db.query(Proyecciones).filter(Proyecciones.categoria == nombre_anterior).all()
        for proyeccion in proyecciones:
            proyeccion.categoria = nombre_nuevo
            stats["proyecciones_campo_categoria"] += 1
        print(f"  ✓ {stats['proyecciones_campo_categoria']} proyecciones actualizadas (campo categoria)")
        
        # 3. Actualizar partidas_json en proyecciones
        print(f"\nActualizando partidas_json en proyecciones...")
        todas_proyecciones = db.query(Proyecciones).all()
        for proyeccion in todas_proyecciones:
            if proyeccion.partidas_json:
                try:
                    partidas = json.loads(proyeccion.partidas_json)
                    actualizado = False
                    
                    for partida in partidas:
                        if partida.get('categoria') == nombre_anterior:
                            partida['categoria'] = nombre_nuevo
                            actualizado = True
                            stats["partidas_actualizadas"] += 1
                    
                    if actualizado:
                        proyeccion.partidas_json = json.dumps(partidas)
                        stats["proyecciones_actualizadas"] += 1
                except Exception as e:
                    print(f"  ⚠ Error en proyección {proyeccion.id}: {e}")
        print(f"  ✓ {stats['partidas_actualizadas']} partidas actualizadas")
        print(f"  ✓ {stats['proyecciones_actualizadas']} proyecciones con partidas actualizadas")
        
        # 4. Actualizar presupuestos mensuales
        print(f"\nActualizando presupuestos mensuales...")
        presupuestos = db.query(PresupuestoMensual).filter(
            PresupuestoMensual.categoria == nombre_anterior
        ).all()
        for presupuesto in presupuestos:
            presupuesto.categoria = nombre_nuevo
            stats["presupuestos_mensuales_actualizados"] += 1
        print(f"  ✓ {stats['presupuestos_mensuales_actualizados']} presupuestos mensuales actualizados")
        
        # Commit de todos los cambios
        print(f"\nGuardando cambios...")
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
        print(f"{'='*60}")
        print(f"Resumen:")
        print(f"  - Facturas: {stats['facturas_actualizadas']}")
        print(f"  - Proyecciones (campo): {stats['proyecciones_campo_categoria']}")
        print(f"  - Proyecciones (partidas): {stats['proyecciones_actualizadas']}")
        print(f"  - Partidas: {stats['partidas_actualizadas']}")
        print(f"  - Presupuestos mensuales: {stats['presupuestos_mensuales_actualizados']}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"\n❌ ERROR durante la migración: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("MIGRACIÓN: Relaciones Públicas → Eventos")
    print("="*60)
    print("\n⚠️  Este script actualizará todas las referencias de")
    print("   'Relaciones Públicas' a 'Eventos' en la base de datos.\n")
    
    respuesta = input("¿Deseas continuar? (si/no): ")
    if respuesta.lower() in ['si', 's', 'yes', 'y']:
        migrar_categoria()
    else:
        print("\n❌ Migración cancelada")
