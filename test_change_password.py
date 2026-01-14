#!/usr/bin/env python3
"""
Script para probar el endpoint de cambio de contraseña.
Uso: Primero debe autenticarse un usuario y luego probar el cambio de contraseña.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def login(email, password):
    """Iniciar sesión y obtener token"""
    response = requests.post(
        f"{BASE_URL}/auth/token",
        data={
            "username": email,
            "password": password
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Error en login: {response.status_code}")
        print(response.json())
        return None

def change_password(token, current_password, new_password):
    """Cambiar contraseña del usuario autenticado"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "current_password": current_password,
        "new_password": new_password
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/change-password",
        headers=headers,
        json=data
    )
    
    return response.status_code, response.json()

def get_user_info(token):
    """Obtener información del usuario autenticado"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(
        f"{BASE_URL}/auth/user",
        headers=headers
    )
    return response.json()

if __name__ == "__main__":
    print("=" * 50)
    print("TEST: Endpoint de Cambio de Contraseña")
    print("=" * 50)
    
    # Solicitar credenciales
    email = input("\nEmail del usuario: ").strip()
    password = input("Contraseña actual: ").strip()
    
    print("\n1. Iniciando sesión...")
    token = login(email, password)
    
    if token:
        print("✓ Login exitoso")
        
        # Obtener información del usuario
        user_info = get_user_info(token)
        print(f"\nUsuario: {user_info['full_name']} ({user_info['role']})")
        
        # Solicitar nueva contraseña
        print("\n2. Cambio de contraseña:")
        new_password = input("Nueva contraseña: ").strip()
        
        print("\n3. Enviando solicitud de cambio...")
        status_code, response = change_password(token, password, new_password)
        
        if status_code == 200:
            print(f"\n✓ {response['message']}")
            print("\n4. Verificando login con nueva contraseña...")
            
            # Verificar que la nueva contraseña funciona
            new_token = login(email, new_password)
            if new_token:
                print("✓ Nueva contraseña verificada correctamente")
                
                # Restaurar la contraseña original
                restore = input("\n¿Restaurar contraseña original? (s/n): ").strip().lower()
                if restore == 's':
                    print("\n5. Restaurando contraseña original...")
                    status_code, response = change_password(new_token, new_password, password)
                    if status_code == 200:
                        print(f"✓ {response['message']}")
                    else:
                        print(f"✗ Error: {response}")
            else:
                print("✗ Error al verificar la nueva contraseña")
        else:
            print(f"\n✗ Error al cambiar contraseña: {response}")
    else:
        print("✗ No se pudo iniciar sesión")
    
    print("\n" + "=" * 50)
