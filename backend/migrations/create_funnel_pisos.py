"""
Migración: Crear tablas funnel_pisos y funnel_pisos_historial
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import FunnelPisos, FunnelPisosHistorial

def run():
    FunnelPisos.__table__.create(bind=engine, checkfirst=True)
    FunnelPisosHistorial.__table__.create(bind=engine, checkfirst=True)
    print("✅ Tablas funnel_pisos y funnel_pisos_historial creadas")

if __name__ == "__main__":
    run()
