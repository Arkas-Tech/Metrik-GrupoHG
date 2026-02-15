"""
Script para revisar qué categorías existen en proyecciones y presupuestos
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal
from models import Facturas, Proyecciones, PresupuestoMensual, Categorias
import json

def revisar_categorias():
    db = SessionLocal()
    try:
        print("="*60)
        print("REVISIÓN DE CATEGORÍAS EN LA BASE DE DATOS")
        print("="*60)
        
        # 1. Categorías activas en la tabla Categorias
        print("\n1. CATEGORÍAS ACTIVAS:")
        categorias = db.query(Categorias).filter(Categorias.activo == True).order_by(Categorias.orden).all()
        for cat in categorias:
            print(f"   - {cat.nombre} (ID: {cat.id}, Orden: {cat.orden})")
        
        # 2. Categorías en Proyecciones (campo directo)
        print("\n2. CATEGORÍAS EN PROYECCIONES (campo categoria):")
        cats_proyecciones = db.query(Proyecciones.categoria, func.count(Proyecciones.id)).group_by(Proyecciones.categoria).all()
        for cat, count in cats_proyecciones:
            print(f"   - {cat}: {count} proyecciones")
        
        # 3. Categorías en partidas_json
        print("\n3. CATEGORÍAS EN PARTIDAS (partidas_json):")
        categorias_partidas = {}
        proyecciones = db.query(Proyecciones).all()
        for proy in proyecciones:
            if proy.partidas_json:
                try:
                    partidas = json.loads(proy.partidas_json)
                    for partida in partidas:
                        cat = partida.get('categoria', 'Sin categoría')
                        categorias_partidas[cat] = categorias_partidas.get(cat, 0) + 1
                except:
                    pass
        for cat, count in sorted(categorias_partidas.items()):
            print(f"   - {cat}: {count} partidas")
        
        # 4. Categorías en Presupuestos Mensuales
        print("\n4. CATEGORÍAS EN PRESUPUESTOS MENSUALES:")
        cats_presupuesto = db.query(PresupuestoMensual.categoria, func.count(PresupuestoMensual.id)).group_by(PresupuestoMensual.categoria).all()
        for cat, count in cats_presupuesto:
            print(f"   - {cat}: {count} registros")
        
        # 5. Categorías en Facturas
        print("\n5. CATEGORÍAS EN FACTURAS:")
        cats_facturas = db.query(Facturas.categoria, func.count(Facturas.id)).group_by(Facturas.categoria).all()
        for cat, count in cats_facturas:
            print(f"   - {cat}: {count} facturas")
        
        print("\n" + "="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    revisar_categorias()
