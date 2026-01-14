# Endpoint de Cambio de Contraseña

## Descripción

Se ha implementado un nuevo endpoint que permite a **todos los usuarios** (incluyendo coordinadores) cambiar su propia contraseña de forma segura.

## Detalles del Endpoint

### URL

```
POST /auth/change-password
```

### Autenticación

Requiere un token JWT válido en el header `Authorization`.

### Request Body

```json
{
  "current_password": "contraseña_actual",
  "new_password": "nueva_contraseña"
}
```

### Validaciones

- ✅ El usuario debe estar autenticado
- ✅ La contraseña actual debe ser correcta
- ✅ La nueva contraseña debe tener al menos 6 caracteres
- ✅ Cada usuario solo puede cambiar su propia contraseña

### Respuestas

#### Éxito (200 OK)

```json
{
  "message": "Contraseña actualizada exitosamente",
  "username": "nombre_usuario"
}
```

#### Error: No autenticado (401)

```json
{
  "detail": "No autenticado"
}
```

#### Error: Contraseña incorrecta (400)

```json
{
  "detail": "La contraseña actual es incorrecta"
}
```

#### Error: Contraseña débil (400)

```json
{
  "detail": "La nueva contraseña debe tener al menos 6 caracteres"
}
```

## Ejemplo de Uso con cURL

```bash
# 1. Primero, obtener el token de autenticación
TOKEN=$(curl -s -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=usuario@example.com&password=password123" \
  | jq -r '.access_token')

# 2. Cambiar la contraseña
curl -X POST "http://localhost:8000/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "password123",
    "new_password": "nueva_password456"
  }'
```

## Ejemplo de Uso con JavaScript/TypeScript (Frontend)

```typescript
async function changePassword(currentPassword: string, newPassword: string) {
  const token = localStorage.getItem("token"); // Obtener token del storage

  try {
    const response = await fetch("http://localhost:8000/auth/change-password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data.message); // "Contraseña actualizada exitosamente"
      return { success: true, message: data.message };
    } else {
      const error = await response.json();
      return { success: false, error: error.detail };
    }
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// Uso
const result = await changePassword("password_viejo", "password_nuevo123");
if (result.success) {
  alert("Contraseña cambiada exitosamente");
} else {
  alert(`Error: ${result.error}`);
}
```

## Seguridad

- ✅ **Validación de contraseña actual**: Se verifica que el usuario conozca su contraseña actual antes de permitir el cambio
- ✅ **Hash seguro**: Las contraseñas se almacenan usando bcrypt
- ✅ **Autenticación requerida**: Solo usuarios autenticados pueden usar este endpoint
- ✅ **Autoservicio**: Los usuarios solo pueden cambiar su propia contraseña
- ✅ **Validación de longitud**: Se requiere un mínimo de 6 caracteres

## Script de Prueba

Se ha incluido un script de prueba interactivo en `/test_change_password.py` que permite:

- Iniciar sesión con credenciales existentes
- Cambiar la contraseña
- Verificar que la nueva contraseña funciona
- Restaurar la contraseña original (opcional)

Para ejecutarlo:

```bash
cd /Users/YOSMARCH/Desktop/sgpme
source sgpme_env/bin/activate
python test_change_password.py
```

## Próximos Pasos para el Frontend

Para implementar esto en el frontend de Next.js:

1. **Crear un componente de cambio de contraseña** en `src/components/CambiarContrasena.tsx`
2. **Agregar una página o modal** donde los coordinadores puedan cambiar su contraseña
3. **Validar el formulario** en el cliente antes de enviar (longitud mínima, confirmación, etc.)
4. **Mostrar mensajes de error/éxito** claros al usuario
5. **Considerar agregar** requisitos adicionales de contraseña (mayúsculas, números, caracteres especiales)

## Notas Adicionales

- El endpoint está disponible para **todos los roles** (administrador, coordinador, etc.)
- No hay límite de intentos por el momento (considerar agregar rate limiting en producción)
- La sesión actual se mantiene activa después del cambio (no se invalida el token)
- Se recomienda implementar una política de contraseñas más robusta en producción
