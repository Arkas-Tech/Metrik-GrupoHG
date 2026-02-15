import sqlite3
from datetime import datetime

conn = sqlite3.connect('sgpme.db')
cursor = conn.cursor()

# Verificar si ya existen las campañas
cursor.execute("SELECT COUNT(*) FROM campanyas")
count = cursor.fetchone()[0]
print(f"Campañas existentes: {count}")

if count == 0:
    # Insertar las 3 campañas
    campanas = [
        (1, 'K3 OC', 'Activa', 'Meta Ads', 200, 20, 10, 10.0, '2026-01-01', '2026-01-31', 
         4000.0, 0.0, 'K3', 0.0, 10.0, 'Grupo HG', None, datetime.now(), datetime.now(), 'admin', None),
        (2, 'Seltos AO', 'Activa', 'Meta Ads', 0, 0, 0, 0.0, '2026-01-01', '2026-01-31', 
         8000.0, 0.0, 'Seltos', 0.0, 50.0, 'Grupo HG', None, datetime.now(), datetime.now(), 'admin', None),
        (3, 'K3 AO', 'Activa', 'Meta Ads', 30, 15000, 320, 0.0, '2025-01-12', '2025-12-31', 
         8000.0, 0.0, 'K3', 0.0, 10.0, 'Grupo HG', None, datetime.now(), datetime.now(), 'admin', None),
    ]
    
    cursor.executemany('''
        INSERT INTO campanyas (id, nombre, estado, plataforma, leads, alcance, interacciones, ctr,
                              fecha_inicio, fecha_fin, presupuesto, gasto_actual, auto_objetivo,
                              conversion, cxc_porcentaje, marca, imagenes_json, fecha_creacion,
                              fecha_modificacion, creado_por, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', campanas)
    
    conn.commit()
    print("✅ Campañas insertadas")
else:
    print("Las campañas ya existen")

# Verificar
cursor.execute('SELECT id, nombre, presupuesto, gasto_actual FROM campanyas')
print("\nCampañas en la base de datos:")
for row in cursor:
    print(f"  ID {row[0]}: {row[1]} - Presupuesto: ${row[2]} - Gasto: ${row[3]}")

conn.close()
