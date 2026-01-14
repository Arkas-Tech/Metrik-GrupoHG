#!/bin/bash

# Script de deployment para SGPME
# Uso: ./deploy.sh

SERVER="root@72.62.161.61"
REMOTE_PATH="/home/sgpme/app/backend"

echo "=== Deployment SGPME ==="
echo "Servidor: $SERVER"
echo ""

# Función para verificar conexión
check_connection() {
    ssh -o ConnectTimeout=5 $SERVER "echo 'Conexión OK'" 2>/dev/null
    return $?
}

# Verificar conexión
echo "Verificando conexión al servidor..."
if ! check_connection; then
    echo "❌ No se puede conectar al servidor"
    echo "Por favor verifica:"
    echo "  - Que el servidor esté encendido"
    echo "  - Que tengas conectividad de red"
    echo "  - Que el puerto SSH (22) esté abierto"
    exit 1
fi
echo "✅ Conexión establecida"
echo ""

# Detener servicios actuales
echo "Deteniendo servicios actuales..."
ssh $SERVER << 'ENDSSH'
pkill -f "uvicorn main:app" || true
pkill -f "next start" || true
echo "Servicios detenidos"
ENDSSH

# Sincronizar archivos del backend
echo ""
echo "Subiendo archivos del backend..."
rsync -avz --progress \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'venv' \
  --exclude '*.db' \
  --exclude 'backups' \
  /Users/YOSMARCH/Desktop/sgpme/HGApp/*.py \
  /Users/YOSMARCH/Desktop/sgpme/HGApp/routers/ \
  $SERVER:$REMOTE_PATH/

# Verificar y actualizar dependencias
echo ""
echo "Actualizando dependencias del backend..."
ssh $SERVER << 'ENDSSH'
cd /home/sgpme/app/backend
source venv/bin/activate
pip install -q -r requirements.txt
echo "Dependencias actualizadas"
ENDSSH

# Iniciar el backend
echo ""
echo "Iniciando backend..."
ssh $SERVER << 'ENDSSH'
cd /home/sgpme/app/backend
nohup /home/sgpme/app/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado con PID: $BACKEND_PID"
sleep 3

# Verificar que está corriendo
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend corriendo correctamente"
    echo "Log:"
    tail -10 backend.log
else
    echo "❌ Backend falló al iniciar"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi
ENDSSH

# Subir archivos del frontend
echo ""
echo "Subiendo archivos del frontend..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  /Users/YOSMARCH/Desktop/sgpme/sgpme_app/src/ \
  /Users/YOSMARCH/Desktop/sgpme/sgpme_app/package.json \
  /Users/YOSMARCH/Desktop/sgpme/sgpme_app/.env.production \
  $SERVER:/home/sgpme/app/frontend/

# Iniciar el frontend
echo ""
echo "Iniciando frontend..."
ssh $SERVER << 'ENDSSH'
cd /home/sgpme/app/frontend

# Verificar que .next existe
if [ ! -d ".next" ]; then
    echo "⚠️  Build de Next.js no encontrado, construyendo..."
    npm run build
fi

# Iniciar frontend
export NODE_ENV=production
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend iniciado con PID: $FRONTEND_PID"
sleep 3

# Verificar que está corriendo
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend corriendo correctamente"
else
    echo "❌ Frontend falló al iniciar"
    echo "Últimas líneas del log:"
    tail -20 frontend.log
    exit 1
fi
ENDSSH

# Verificar servicios
echo ""
echo "=== Verificación final ==="
ssh $SERVER << 'ENDSSH'
echo "Procesos corriendo:"
ps aux | grep -E "(uvicorn|node.*next)" | grep -v grep

echo ""
echo "Puertos abiertos:"
ss -tlnp | grep -E ":(3000|8000)"

echo ""
echo "✅ Deployment completado"
echo ""
echo "URLs de acceso:"
echo "  Frontend: http://72.62.161.61:3000"
echo "  Backend:  http://72.62.161.61:8000"
echo "  API Docs: http://72.62.161.61:8000/docs"
ENDSSH

echo ""
echo "=== Deployment finalizado exitosamente ==="
