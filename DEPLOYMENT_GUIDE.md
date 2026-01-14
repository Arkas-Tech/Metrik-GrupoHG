# Guía de Deployment para SGPME

## Resumen de Cambios Realizados

### Backend (HGApp/)

1. **Endpoint de cambio de contraseña** (`/auth/change-password`)

   - Permite a coordinadores y administradores cambiar su propia contraseña
   - Requiere contraseña actual para validación
   - Mínimo 6 caracteres

2. **CORS actualizado** en `main.py`
   - Agregadas las IPs del servidor: `http://72.62.161.61:3000` y `http://72.62.161.61`

### Frontend (sgpme_app/)

1. **Componentes nuevos:**

   - `CambiarContrasenaCoordinador.tsx`: UI para cambio de contraseña
   - Actualizado `ConfigSidebarCoordinador.tsx`: Menú con "Mi Perfil" y "Cambiar Contraseña"
   - Actualizado `ConfigSidebar.tsx`: Menú de admin con las mismas opciones
   - Actualizado `GestionPerfilCoordinador.tsx`: Removido campo de contraseña
   - Actualizado `GestionAccesos.tsx`: Solo permite ver, agregar y eliminar usuarios (no editar)

2. **Autenticación mejorada:**

   - Tokens con expiración de 8 horas
   - Limpieza de localStorage en login
   - Removido fallback a datos locales obsoletos

3. **Archivo `.env.production` creado:**
   ```
   NEXT_PUBLIC_API_URL=http://72.62.161.61:8000
   ```

## Deployment Manual

### Opción 1: Usar el script automático

```bash
cd /Users/YOSMARCH/Desktop/sgpme
chmod +x deploy.sh
./deploy.sh
```

### Opción 2: Deployment manual paso a paso

#### 1. Subir archivos al servidor

```bash
# Desde tu máquina local
cd /Users/YOSMARCH/Desktop/sgpme

# Subir backend
rsync -avz --exclude '__pycache__' --exclude '*.pyc' --exclude 'venv' --exclude '*.db' \
  HGApp/*.py HGApp/routers/ \
  root@72.62.161.61:/home/sgpme/app/backend/

# Subir frontend (código fuente)
rsync -avz --exclude 'node_modules' --exclude '.next' \
  sgpme_app/src/ sgpme_app/package.json sgpme_app/.env.production \
  root@72.62.161.61:/home/sgpme/app/frontend/
```

#### 2. Conectarse al servidor

```bash
ssh root@72.62.161.61
```

#### 3. Actualizar y reiniciar el backend

```bash
# Detener procesos existentes
pkill -f "uvicorn main:app" || true

# Ir al directorio del backend
cd /home/sgpme/app/backend

# Activar entorno virtual e instalar/actualizar dependencias
source venv/bin/activate
pip install -r requirements.txt

# Iniciar el backend
nohup /home/sgpme/app/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

# Verificar que está corriendo
ps aux | grep uvicorn | grep -v grep
tail -20 backend.log
```

#### 4. Actualizar y reiniciar el frontend

```bash
# Detener procesos existentes
pkill -f "next start" || true

# Ir al directorio del frontend
cd /home/sgpme/app/frontend

# Si no existe el build o hubo cambios mayores, reconstruir
# npm install
# npm run build

# Iniciar el frontend
export NODE_ENV=production
nohup npm start > frontend.log 2>&1 &

# Verificar que está corriendo
ps aux | grep "node.*next" | grep -v grep
tail -20 frontend.log
```

#### 5. Verificar servicios

```bash
# Ver procesos
ps aux | grep -E "(uvicorn|node.*next)" | grep -v grep

# Ver puertos
ss -tlnp | grep -E ":(3000|8000)"

# Probar endpoints
curl http://localhost:8000/docs
curl http://localhost:3000
```

## URLs de Acceso

- **Frontend:** http://72.62.161.61:3000
- **Backend API:** http://72.62.161.61:8000
- **API Documentation:** http://72.62.161.61:8000/docs
- **ReDoc:** http://72.62.161.61:8000/redoc

## Credenciales de Prueba

### Administrador

- Email: `admin@sgpme.com`
- Contraseña: `admin123`

### Coordinador

- Email: `yosmar.chavez.aram@gmail.com`
- Contraseña: `ay123`

## Funcionalidades Nuevas para Probar

### Para Coordinadores:

1. Hacer login con credenciales de coordinador
2. Click en el icono de menú (☰) en el header
3. Seleccionar "Mi Perfil" para editar información personal
4. Seleccionar "Cambiar Contraseña" para actualizar contraseña
5. Completar el formulario con contraseña actual, nueva y confirmación

### Para Administradores:

1. Hacer login con credenciales de admin
2. Click en el icono de menú (☰) en el header
3. Opciones disponibles:
   - **Accesos**: Ver, agregar y eliminar usuarios (SIN editar)
   - **Mi Perfil**: Editar su propia información
   - **Cambiar Contraseña**: Actualizar su propia contraseña
   - **Configuración**: Configuración del sistema

## Troubleshooting

### Backend no inicia:

```bash
# Ver el log completo
cat /home/sgpme/app/backend/backend.log

# Verificar variables de entorno
cat /home/sgpme/app/backend/.env

# Verificar que PostgreSQL está corriendo
systemctl status postgresql
```

### Frontend no inicia:

```bash
# Ver el log completo
cat /home/sgpme/app/frontend/frontend.log

# Verificar instalación de node_modules
cd /home/sgpme/app/frontend
npm install --legacy-peer-deps

# Reconstruir
npm run build
```

### Error de CORS:

```bash
# Verificar que main.py tiene las IPs correctas
grep -A 8 "allow_origins" /home/sgpme/app/backend/main.py
```

### Error de conexión a base de datos:

```bash
# Verificar credenciales en .env
cat /home/sgpme/app/backend/.env

# Probar conexión a PostgreSQL
psql -U sgpme_user -d sgpme -h localhost -W
```

## Archivos Modificados en este Deployment

### Backend:

- `HGApp/main.py` - CORS actualizado
- `HGApp/routers/auth.py` - Endpoint de cambio de contraseña

### Frontend:

- `sgpme_app/src/components/CambiarContrasenaCoordinador.tsx` - NUEVO
- `sgpme_app/src/components/ConfigSidebarCoordinador.tsx` - Actualizado
- `sgpme_app/src/components/ConfigSidebar.tsx` - Actualizado
- `sgpme_app/src/components/GestionPerfilCoordinador.tsx` - Actualizado
- `sgpme_app/src/components/GestionAccesos.tsx` - Actualizado
- `sgpme_app/src/app/dashboard/page.tsx` - Actualizado
- `sgpme_app/src/app/campanas/page.tsx` - Correcciones de TypeScript
- `sgpme_app/src/hooks/useAuthBackend.tsx` - Limpieza de localStorage
- `sgpme_app/src/hooks/useAuthUnified.tsx` - Removido fallback
- `sgpme_app/.env.production` - NUEVO

## Notas Importantes

1. **Seguridad:** Los usuarios solo pueden cambiar su PROPIA contraseña, no la de otros
2. **Validación:** Contraseña mínima de 6 caracteres
3. **Tokens:** Expiración extendida a 8 horas (antes 20 minutos)
4. **Gestión de usuarios:** Los administradores NO pueden editar otros usuarios desde la UI, solo agregar y eliminar
5. **Perfil propio:** Tanto admin como coordinadores pueden editar su propio perfil

## Próximos Pasos Recomendados

1. Configurar un firewall para proteger los puertos 3000 y 8000
2. Implementar HTTPS con certificados SSL/TLS
3. Configurar un reverse proxy (nginx) para manejar las peticiones
4. Implementar respaldos automáticos de la base de datos
5. Configurar monitoreo de servicios (systemd services)
