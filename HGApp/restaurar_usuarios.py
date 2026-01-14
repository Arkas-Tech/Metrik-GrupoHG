#!/usr/bin/env python3

"""
Script para restaurar usuarios del sistema
"""

from passlib.context import CryptContext
import sqlite3

# Contexto para hashear contraseñas
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

conn = sqlite3.connect('sgpme.db')
cursor = conn.cursor()

# Usuarios adicionales del sistema original
usuarios_adicionales = [
    {
        'username': 'phaddad',
        'email': 'phaddad@grupohg.com.mx',
        'full_name': 'Pablo Haddad',
        'password': 'test123',
        'role': 'administrador'
    },
    {
        'username': 'rcamacho',
        'email': 'gtemercadotecnia@grupohg.com.mx',
        'full_name': 'Rodrigo Camacho',
        'password': 'test123',
        'role': 'coordinador'
    },
    {
        'username': 'auditor_test',
        'email': 'auditor@test.com',
        'full_name': 'Usuario Auditor',
        'password': 'test123',
        'role': 'auditor'
    },
    {
        'username': 'admin_test',
        'email': 'admin@test.com',
        'full_name': 'Usuario Admin Test',
        'password': 'test123',
        'role': 'administrador'
    },
    {
        'username': 'coordinador_test',
        'email': 'coordinador@test.com',
        'full_name': 'Usuario Coordinador Test',
        'password': 'test123',
        'role': 'coordinador'
    }
]

print('Agregando usuarios adicionales...')
for usuario in usuarios_adicionales:
    # Verificar si ya existe
    cursor.execute('SELECT id FROM users WHERE username = ?', (usuario['username'],))
    if not cursor.fetchone():
        hashed_password = bcrypt_context.hash(usuario['password'])
        cursor.execute('''
            INSERT INTO users (email, username, full_name, hashed_password, role) 
            VALUES (?, ?, ?, ?, ?)
        ''', (usuario['email'], usuario['username'], usuario['full_name'], hashed_password, usuario['role']))
        print(f'✅ Agregado: {usuario["username"]} ({usuario["role"]})')
    else:
        print(f'⏭️ Ya existe: {usuario["username"]}')

conn.commit()

print('\n=== TODOS LOS USUARIOS EN EL SISTEMA ===')
cursor.execute('SELECT id, username, email, full_name, role FROM users ORDER BY id')
users = cursor.fetchall()
for user in users:
    print(f'ID: {user[0]}, User: {user[1]}, Email: {user[2]}, Nombre: {user[3]}, Rol: {user[4]}')

conn.close()
print(f'✅ Total usuarios: {len(users)}')