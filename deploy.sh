#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  METRIK - Zero-Downtime Deployment Script
#  
#  Flujo:
#  1. Git pull (código nuevo)
#  2. Sync archivos a backend/ y frontend/
#  3. Build frontend EN BACKGROUND (usuarios NO afectados)
#  4. PM2 graceful reload (rolling restart, 1 worker a la vez)
#  5. Health checks
#  6. Rollback automático si algo falla
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── CONFIGURACIÓN ─────────────────────────────────────────
APP_DIR="/home/sgpme/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/deploy.log"
BUILD_LOG="$LOG_DIR/build.log"
LOCK_FILE="/tmp/metrik-deploy.lock"
MAX_BUILD_TIME=300
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=3

# ─── FUNCIONES UTILITARIAS ─────────────────────────────────
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# ─── LOCK: Evitar deploys simultáneos ──────────────────────
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo "0")))
    if [ "$LOCK_AGE" -lt 600 ]; then
        log "⚠️  Deploy ya en progreso (lock age: ${LOCK_AGE}s). Saltando."
        exit 0
    else
        log "🔓 Lock viejo detectado (${LOCK_AGE}s). Limpiando."
        rm -f "$LOCK_FILE"
    fi
fi
echo $$ > "$LOCK_FILE"

log "══════════════════════════════════════════════"
log "  🚀 STARTING ZERO-DOWNTIME DEPLOYMENT"
log "══════════════════════════════════════════════"

# ─── 1. GIT PULL ──────────────────────────────────────────
cd "$APP_DIR"

if [[ -n $(git status -s 2>/dev/null) ]]; then
    log "📌 Stashing local changes..."
    git stash --quiet
fi

BEFORE_COMMIT=$(git rev-parse --short HEAD)
git fetch origin main --quiet
git reset --hard origin/main --quiet
AFTER_COMMIT=$(git rev-parse --short HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    log "ℹ️  No hay cambios nuevos. Deploy cancelado."
    exit 0
fi

log "📦 Actualizado: $BEFORE_COMMIT → $AFTER_COMMIT"

# ─── 2. DETECTAR CAMBIOS ──────────────────────────────────
CHANGED_FILES=$(git diff --name-only "$BEFORE_COMMIT" "$AFTER_COMMIT" 2>/dev/null || echo "")
BACKEND_CHANGED=false
FRONTEND_CHANGED=false
FRONTEND_DEPS_CHANGED=false
FRONTEND_NEEDS_BUILD=false

for file in $CHANGED_FILES; do
    case "$file" in
        backend/*|HGApp/*)
            BACKEND_CHANGED=true
            ;;
        frontend/*|sgpme_app/*)
            FRONTEND_CHANGED=true
            case "$file" in
                *package.json|*package-lock.json)
                    FRONTEND_DEPS_CHANGED=true
                    FRONTEND_NEEDS_BUILD=true
                    ;;
                *next.config*|*tsconfig*)
                    FRONTEND_NEEDS_BUILD=true
                    ;;
                *.tsx|*.ts|*.jsx|*.js|*.css)
                    FRONTEND_NEEDS_BUILD=true
                    ;;
            esac
            ;;
    esac
done

log "   Backend changed: $BACKEND_CHANGED"
log "   Frontend changed: $FRONTEND_CHANGED"
log "   Frontend needs build: $FRONTEND_NEEDS_BUILD"

# ─── 3. SYNC ARCHIVOS ─────────────────────────────────────
SYNCED=0
for file in $CHANGED_FILES; do
    target_path=""
    
    case "$file" in
        backend/*)   target_path="$BACKEND_DIR/${file#backend/}" ;;
        HGApp/*)     target_path="$BACKEND_DIR/${file#HGApp/}" ;;
        frontend/*)  target_path="$FRONTEND_DIR/${file#frontend/}" ;;
        sgpme_app/*) target_path="$FRONTEND_DIR/${file#sgpme_app/}" ;;
        *)           continue ;;
    esac
    
    if [ -n "$target_path" ]; then
        if [ -f "$file" ]; then
            mkdir -p "$(dirname "$target_path")"
            cp "$file" "$target_path"
            SYNCED=$((SYNCED + 1))
        elif [ ! -e "$file" ]; then
            rm -f "$target_path" 2>/dev/null
        fi
    fi
done

log "📋 $SYNCED archivos sincronizados"

# ─── 4. BACKEND: Instalar deps si cambiaron ───────────────
if [ "$BACKEND_CHANGED" = true ]; then
    if echo "$CHANGED_FILES" | grep -q "requirements.txt"; then
        log "📦 Instalando dependencias backend..."
        cd "$BACKEND_DIR"
        ./venv/bin/pip install -r requirements.txt >> "$BUILD_LOG" 2>&1
        cd "$APP_DIR"
    fi
fi

# ─── 5. FRONTEND BUILD (usuarios NO afectados) ────────────
#    Los workers de PM2 SIGUEN sirviendo la versión vieja
#    mientras npm run build compila la nueva.
if [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    log "🔨 Building frontend (usuarios NO afectados)..."
    
    if [ "$FRONTEND_DEPS_CHANGED" = true ]; then
        log "   📦 Instalando dependencias frontend..."
        cd "$FRONTEND_DIR"
        npm ci --production=false >> "$BUILD_LOG" 2>&1
        cd "$APP_DIR"
    fi
    
    cd "$FRONTEND_DIR"
    BUILD_START=$(date +%s)
    
    if timeout $MAX_BUILD_TIME npm run build >> "$BUILD_LOG" 2>&1; then
        BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
        log "   ✅ Build completado en ${BUILD_DURATION}s"
    else
        BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
        log "   ❌ Build FALLÓ después de ${BUILD_DURATION}s"
        log "   ⚠️  Frontend sigue con versión anterior"
        
        if [ "$BACKEND_CHANGED" = false ]; then
            log "══════════════════════════════════════════════"
            log "  ❌ DEPLOY FAILED (build error, servicio NO interrumpido)"
            log "══════════════════════════════════════════════"
            exit 1
        fi
    fi
    cd "$APP_DIR"
fi

# ─── 6. PM2 GRACEFUL RELOAD (Rolling Restart) ─────────────
#    Con cluster mode (2 workers):
#    1. PM2 inicia Worker nuevo con build nuevo
#    2. Cuando está listo, recibe tráfico
#    3. PM2 mata Worker viejo (graceful: espera a terminar requests)
#    4. Repite con el siguiente worker
#    → NUNCA hay 0 workers activos
reload_service() {
    local service_name="$1"
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        log "   🔄 Reloading $service_name (intento $((retry + 1))/$max_retries)..."
        
        if pm2 reload "$service_name" --update-env >> "$BUILD_LOG" 2>&1; then
            sleep 5
            
            local online_count
            online_count=$(pm2 list 2>/dev/null | grep "$service_name" | grep -c "online" || echo "0")
            
            if [ "$online_count" -gt 0 ]; then
                log "   ✅ $service_name: $online_count worker(s) online"
                return 0
            fi
        fi
        
        retry=$((retry + 1))
        sleep 3
    done
    
    log "   ❌ $service_name: Failed after $max_retries retries"
    return 1
}

RELOAD_FAILED=false

if [ "$BACKEND_CHANGED" = true ]; then
    reload_service "metrik-backend" || RELOAD_FAILED=true
fi

if [ "$FRONTEND_CHANGED" = true ]; then
    reload_service "metrik-frontend" || RELOAD_FAILED=true
fi

# ─── 7. HEALTH CHECKS ─────────────────────────────────────
log "🏥 Verificando health checks..."
sleep 3

check_health() {
    local url="$1"
    local name="$2"
    local retries=$HEALTH_CHECK_RETRIES
    
    while [ $retries -gt 0 ]; do
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
        
        if [ "$status" = "200" ]; then
            log "   ✅ $name: HTTP $status"
            return 0
        fi
        
        retries=$((retries - 1))
        if [ $retries -gt 0 ]; then
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    log "   ❌ $name: HTTP $status (después de $HEALTH_CHECK_RETRIES intentos)"
    return 1
}

BACKEND_HEALTHY=true
FRONTEND_HEALTHY=true

check_health "http://127.0.0.1:8080/docs" "Backend" || BACKEND_HEALTHY=false
check_health "http://127.0.0.1:3030" "Frontend" || FRONTEND_HEALTHY=false

# ─── 8. ROLLBACK SI ES NECESARIO ──────────────────────────
if [ "$BACKEND_HEALTHY" = false ] || [ "$FRONTEND_HEALTHY" = false ] || [ "$RELOAD_FAILED" = true ]; then
    log "⚠️  Problemas detectados. Ejecutando rollback..."
    
    cd "$APP_DIR"
    git reset --hard "$BEFORE_COMMIT" --quiet
    
    if [ "$BACKEND_HEALTHY" = false ]; then
        pm2 reload metrik-backend --update-env >> "$BUILD_LOG" 2>&1
    fi
    if [ "$FRONTEND_HEALTHY" = false ]; then
        cd "$FRONTEND_DIR"
        npm run build >> "$BUILD_LOG" 2>&1
        cd "$APP_DIR"
        pm2 reload metrik-frontend >> "$BUILD_LOG" 2>&1
    fi
    
    sleep 5
    log "══════════════════════════════════════════════"
    log "  ⚠️  DEPLOY ROLLED BACK to $BEFORE_COMMIT"
    log "  ℹ️  Servicio restaurado"
    log "══════════════════════════════════════════════"
    exit 1
fi

# ─── 9. RESUMEN FINAL ─────────────────────────────────────
WORKER_COUNT=$(pm2 list 2>/dev/null | grep "metrik-frontend" | grep -c "online" || echo "0")

log "══════════════════════════════════════════════"
log "  ✅ ZERO-DOWNTIME DEPLOY EXITOSO"
log "  📦 Commit:   $BEFORE_COMMIT → $AFTER_COMMIT"
log "  🖥️  Workers:  $WORKER_COUNT frontend online"
log "  🏥 Backend:  healthy"
log "  🏥 Frontend: healthy"
log "══════════════════════════════════════════════"

exit 0
