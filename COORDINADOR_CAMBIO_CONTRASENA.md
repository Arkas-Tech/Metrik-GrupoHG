# 🔐 Funcionalidad de Cambio de Contraseña para Coordinadores

## ✅ Implementación Completada

Se ha implementado exitosamente la funcionalidad para que los **coordinadores** puedan:

- Acceder a su perfil personal
- Cambiar su contraseña de forma segura
- Editar su información personal

---

## 🎯 Características Implementadas

### Para Coordinadores:

#### 1. **Menú Lateral Exclusivo**

- Los coordinadores ahora tienen acceso a un menú lateral (ConfigSidebarCoordinador)
- Se abre haciendo clic en el ícono de hamburguesa (☰) en la esquina superior izquierda
- Opciones disponibles:
  - 👤 **Mi Perfil**: Editar información personal
  - 🔑 **Cambiar Contraseña**: Actualizar contraseña de acceso

#### 2. **Cambio de Contraseña Seguro**

- Formulario dedicado con validaciones:
  - ✓ Requiere contraseña actual (verificación de identidad)
  - ✓ Nueva contraseña (mínimo 6 caracteres)
  - ✓ Confirmación de nueva contraseña
  - ✓ Validación de coincidencia de contraseñas
  - ✓ Botones para mostrar/ocultar contraseñas
- Mensajes de error claros y específicos
- Consejos de seguridad incluidos

#### 3. **Gestión de Perfil**

- Ver y editar:
  - Nombre completo
  - Usuario
  - Email
  - Contraseña (opcional)

---

## 🚀 Cómo Usar (Como Coordinador)

### Acceder al Menú:

1. Inicia sesión como coordinador
2. Haz clic en el ícono de hamburguesa (☰) en la parte superior izquierda
3. Se abrirá el panel "Mi Panel" con las opciones disponibles

### Cambiar Contraseña:

1. En el menú lateral, selecciona **"Cambiar Contraseña"**
2. Aparecerá un modal con el formulario
3. Completa los campos:
   - **Contraseña actual**: Tu contraseña actual
   - **Nueva contraseña**: Tu nueva contraseña (mínimo 6 caracteres)
   - **Confirmar nueva contraseña**: Repite la nueva contraseña
4. Haz clic en **"Cambiar Contraseña"**
5. Recibirás una confirmación de éxito

### Editar Perfil:

1. En el menú lateral, selecciona **"Mi Perfil"**
2. Edita tu información:
   - Nombre completo
   - Usuario
   - Email
   - Nueva contraseña (opcional)
3. Haz clic en **"Guardar cambios"**

---

## 🔧 Componentes Creados/Modificados

### Nuevos Componentes:

1. **`CambiarContrasenaCoordinador.tsx`**
   - Formulario especializado para cambio de contraseña
   - Validaciones en tiempo real
   - Interfaz amigable con consejos de seguridad

### Componentes Modificados:

2. **`ConfigSidebarCoordinador.tsx`**
   - Agregada opción "Cambiar Contraseña" con ícono de llave (🔑)
3. **`LayoutDashboard.tsx`**

   - Soporte para menú de coordinadores
   - Renderizado condicional de sidebars según rol
   - Manejo de navegación para coordinadores

4. **`GestionPerfilCoordinador.tsx`**
   - Corregido endpoint del backend
   - Usa `/auth/users/{user_id}` correctamente

---

## 🔒 Seguridad Implementada

### Backend (auth.py):

- ✅ Endpoint: `POST /auth/change-password`
- ✅ Requiere autenticación (token JWT)
- ✅ Verifica contraseña actual antes del cambio
- ✅ Valida longitud mínima de contraseña (6 caracteres)
- ✅ Hash seguro con bcrypt
- ✅ Cada usuario solo puede cambiar su propia contraseña

### Frontend:

- ✅ Validación de formulario antes de enviar
- ✅ Confirmación de contraseña (debe coincidir)
- ✅ Mensajes de error específicos
- ✅ Campos de contraseña con opción de mostrar/ocultar
- ✅ Feedback visual durante el proceso

---

## 📊 Flujo de Usuario

```
Coordinador → Clic en ☰ → "Mi Panel" se abre
                            ↓
                    [Mi Perfil] o [Cambiar Contraseña]
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
   Cambiar Contraseña                    Editar Perfil
        ↓                                       ↓
1. Contraseña actual                1. Nombre completo
2. Nueva contraseña                 2. Usuario
3. Confirmar contraseña             3. Email
        ↓                           4. Nueva contraseña (opcional)
   Validación                              ↓
        ↓                              Guardar cambios
   Guardar                                 ↓
        ↓                              Confirmación
   Confirmación
```

---

## 🧪 Pruebas

### Usuario de Prueba (Coordinador):

- **Email**: `yosmar.chavez.aram@gmail.com`
- **Password**: `ay123`
- **Rol**: coordinador

### Pasos para Probar:

1. Inicia sesión con las credenciales del coordinador
2. Verifica que aparezca el ícono de menú (☰)
3. Abre el menú y verifica las opciones:
   - Mi Perfil
   - Cambiar Contraseña
4. Prueba cambiar la contraseña:
   - Usa una contraseña incorrecta → debe mostrar error
   - Usa contraseñas que no coinciden → debe mostrar error
   - Usa una contraseña muy corta → debe mostrar error
   - Usa datos correctos → debe funcionar
5. Verifica que puedas iniciar sesión con la nueva contraseña

---

## 🎨 Diseño Visual

### Colores:

- **Primario**: Azul (#3B82F6)
- **Secundario**: Gris
- **Éxito**: Verde
- **Error**: Rojo
- **Advertencia**: Amarillo

### Iconos:

- 👤 Mi Perfil (UserCircleIcon)
- 🔑 Cambiar Contraseña (KeyIcon)
- 👁️ Mostrar/Ocultar contraseña (EyeIcon/EyeSlashIcon)

---

## 📝 Notas Importantes

1. **Solo coordinadores y administradores** ven el menú lateral
2. **Administradores** ven su menú completo con gestión de accesos
3. **Coordinadores** solo ven opciones de su perfil personal
4. La contraseña se valida en el backend antes de cambiarla
5. El token JWT tiene una duración de 8 horas
6. No es necesario cerrar sesión después de cambiar contraseña

---

## 🐛 Solución de Problemas

### El menú no aparece:

- Verifica que estés autenticado como coordinador
- Limpia el localStorage y vuelve a iniciar sesión

### Error al cambiar contraseña:

- Verifica que la contraseña actual sea correcta
- Asegúrate de que la nueva contraseña tenga al menos 6 caracteres
- Verifica que las contraseñas coincidan

### Error de conexión:

- Verifica que el backend esté corriendo en `http://localhost:8000`
- Revisa la consola del navegador para más detalles

---

## 🚀 Próximas Mejoras Sugeridas

1. **Agregar indicador de fortaleza de contraseña**

   - Visual con colores (rojo/amarillo/verde)
   - Mensaje sobre la seguridad de la contraseña

2. **Historial de cambios**

   - Registro de cuándo se cambió la contraseña por última vez

3. **Autenticación de dos factores (2FA)**

   - Para mayor seguridad

4. **Notificación por email**

   - Enviar email cuando se cambie la contraseña

5. **Política de contraseñas más estricta**
   - Requerir mayúsculas, números, caracteres especiales
   - Evitar contraseñas previamente usadas
