#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  METRIK - Zero-Downtime Deployment Script v2
#  
#  Flujo REAL zero-downtime:
#  1. Git pull (código nuevo — sgpme_app/ es directorio regular)
#  2. Detectar cambios (backend, frontend)
#  3. Frontend: BUILD EN STAGING (directorio separado)
#     → PM2 sigue sirviendo versión vieja SIN INTERRUPCIÓN
#  4. Swap atómico: .next/ nuevo → directorio live
#  5. PM2 graceful reload (rolling restart)
#  6. Health checks + rollback automático si falla
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── CONFIGURACIÓN ─────────────────────────────────────────
APP_DIR="/home/sgpme/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"          # Directorio LIVE (PM2 sirve desde aquí)
STAGING_DIR="$APP_DIR/frontend-staging"   # Directorio de BUILD (temporal)
SOURCE_DIR="$APP_DIR/sgpme_app"           # Fuente del código frontend (del repo)
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/deploy.log"
BUILD_LOG="$LOG_DIR/build.log"
LOCK_FILE="/tmp/metrik-deploy.lock"
MAX_BUILD_TIME=600                        # 10 min timeout para build
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

mkdir -p "$LOG_DIR"
echo "" > "$BUILD_LOG"

log "══════════════════════════════════════════════"
log "  🚀 STARTING ZERO-DOWNTIME DEPLOYMENT v2"
log "══════════════════════════════════════════════"

# ─── 1. GIT PULL ──────────────────────────────────────────
cd "$APP_DIR"

if [[ -n $(git status -s 2>/dev/null) ]]; then
    log "📌 Stashing local changes..."
    git stash --quiet 2>/dev/null || true
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
DEPLOY_SCRIPT_CHANGED=false

for file in $CHANGED_FILES; do
    case "$file" in
        backend/*|HGApp/*)
            BACKEND_CHANGED=true
            ;;
        sgpme_app/package.json|sgpme_app/package-lock.json)
            FRONTEND_CHANGED=true
            FRONTEND_DEPS_CHANGED=true
            FRONTEND_NEEDS_BUILD=true
            ;;
        sgpme_app/next.config*|sgpme_app/tsconfig*)
            FRONTEND_CHANGED=true
            FRONTEND_NEEDS_BUILD=true
            ;;
        sgpme_app/src/*|sgpme_app/public/*)
            FRONTEND_CHANGED=true
            FRONTEND_NEEDS_BUILD=true
            ;;
        sgpme_app/*)
            FRONTEND_CHANGED=true
            ;;
        deploy.sh|ecosystem.config.js|webhook-server.js)
            DEPLOY_SCRIPT_CHANGED=true
            ;;
    esac
done

log "   Backend changed:  $BACKEND_CHANGED"
log "   Frontend changed: $FRONTEND_CHANGED"
log "   Frontend deps:    $FRONTEND_DEPS_CHANGED"
log "   Needs build:      $FRONTEND_NEEDS_BUILD"
log "   Deploy scripts:   $DEPLOY_SCRIPT_CHANGED"

# ─── 3. BACKEND ───────────────────────────────────────────
if [ "$BACKEND_CHANGED" = true ]; then
    log "🔧 Procesando cambios de backend..."
    
    SYNCED=0
    for file in $CHANGED_FILES; do
        target_path=""
        case "$file" in
            backend/*)  target_path="$BACKEND_DIR/${file#backend/}" ;;
            HGApp/*)    target_path="$BACKEND_DIR/${file#HGApp/}" ;;
            *)          continue ;;
        esac
        
        if [ -n "$target_path" ] && [ -f "$file" ]; then
            mkdir -p "$(dirname "$target_path")"
            cp "$file" "$target_path"
            SYNCED=$((SYNCED + 1))
        fi
    done
    log "   📋 $SYNCED archivos backend sincronizados"
    
    if echo "$CHANGED_FILES" | grep -q "requirements.txt"; then
        log "   📦 Instalando dependencias backend..."
        cd "$BACKEND_DIR"
        ./venv/bin/pip install -r requirements.txt >> "$BUILD_LOG" 2>&1
        cd "$APP_DIR"
    fi
    
    log "   🔄 Reloading backend..."
    pm2 reload metrik-backend --update-env >> "$BUILD_LOG" 2>&1
    sleep 3
    log "   ✅ Backend actualizado"
fi

# ─── 4. FRONTEND: BUILD EN STAGING (ZERO-DOWNTIME) ────────
#
#  ┌─────────────────────────────────────────────────┐
#  │  PM2 sigue sirviendo desde frontend/ (LIVE)     │
#  │  mientras el build se ejecuta en staging/        │
#  │                                                  │
#  │  frontend/          frontend-staging/            │
#  │  ├─ .next/ ← LIVE   ├─ src/ (código nuevo)      │
#  │  ├─ node_modules/   ├─ node_modules/ (hardlink)  │
#  │  ├─ src/ (viejo)    ├─ .next/ ← BUILD AQUÍ      │
#  │  └─ .env.local      └─ .env.local (copia)       │
#  │                                                  │
#  │  Cuando el build termina exitosamente:           │
#  │  1. Swap .next/ (staging → live)                 │
#  │  2. Sync source files (staging → live)           │
#  │  3. PM2 reload (rolling restart)                 │
#  └─────────────────────────────────────────────────┘
#
if [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    log "🔨 FRONTEND BUILD (zero-downtime staging)..."
    BUILD_START=$(date +%s)
    
    # ── 4a. Preparar staging ─────────────────────────
    log "   📂 Preparando directorio staging..."
    rm -rf "$STAGING_DIR"
    mkdir -p "$STAGING_DIR"
    
    # Copiar código nuevo desde sgpme_app/ (fuente del repo)
    rsync -a \
        --exclude '.git' \
        --exclude '.git_backup' \
        --exclude 'node_modules' \
        --exclude '.next' \
        "$SOURCE_DIR/" "$STAGING_DIR/"
    
    log "   ✅ Source sincronizado a staging"
    
    # Copiar .env files del directorio live
    for envfile in "$FRONTEND_DIR"/.env*; do
        [ -f "$envfile" ] && cp "$envfile" "$STAGING_DIR/"
    done
    
    # ── 4b. Manejar node_modules ─────────────────────
    if [ "$FRONTEND_DEPS_CHANGED" = true ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log "   📦 Instalando dependencias (deps cambiaron)..."
        cd "$STAGING_DIR"
        npm ci --production=false >> "$BUILD_LOG" 2>&1
        log "   ✅ Dependencias instaladas"
    else
        log "   🔗 Reusando node_modules (hardlink copy)..."
        cp -al "$FRONTEND_DIR/node_modules" "$STAGING_DIR/node_modules" 2>/dev/null || {
            log "   ⚠️  Hardlink falló, instalando deps..."
            cd "$STAGING_DIR"
            npm ci --production=false >> "$BUILD_LOG" 2>&1
        }
    fi
    
    # ── 4c. Build en staging ─────────────────────────
    log "   🏗️  Ejecutando next build en staging..."
    cd "$STAGING_DIR"
    
    if timeout $MAX_BUILD_TIME npm run build >> "$BUILD_LOG" 2>&1; then
        BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
        log "   ✅ Build completado en ${BUILD_DURATION}s"
    else
        BUILD_DURATION=$(( $(date +%s) - BUILD_START ))
        log "   ❌ Build FALLÓ después de ${BUILD_DURATION}s"
        log "   ⚠️  Frontend sigue con versión anterior (sin interrupción)"
        rm -rf "$STAGING_DIR"
        
        if [ "$BACKEND_CHANGED" = false ]; then
            log "══════════════════════════════════════════════"
            log "  ❌ DEPLOY FAILED (build error)"
            log "  ℹ️  Servicio NO fue interrumpido"
            log "══════════════════════════════════════════════"
            exit 1
        else
            log "   ℹ️  Backend actualizado, frontend sin cambios"
            FRONTEND_NEEDS_BUILD=false
        fi
    fi
    cd "$APP_DIR"
fi

# ─── 5. SWAP ATÓMICO + PM2 RELOAD ─────────────────────────
if [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    log "🔄 Swap atómico: staging → live..."
    
    # Backup del .next actual (para rollback)
    if [ -d "$FRONTEND_DIR/.next" ]; then
        rm -rf "$FRONTEND_DIR/.next.rollback"
        mv "$FRONTEND_DIR/.next" "$FRONTEND_DIR/.next.rollback"
    fi
    
    # Mover .next del staging al live
    mv "$STAGING_DIR/.next" "$FRONTEND_DIR/.next"
    
    # Sincronizar source files y node_modules al live
    rsync -a --delete \
        --exclude '.next' \
        --exclude '.next.rollback' \
        --exclude '.git' \
        --exclude '.env*' \
        "$STAGING_DIR/" "$FRONTEND_DIR/"
    
    log "   ✅ Archivos swapped a live"
    
    # PM2 graceful reload (rolling restart)
    log "   🔄 PM2 reload (rolling restart)..."
    pm2 reload metrik-frontend --update-env >> "$BUILD_LOG" 2>&1
    sleep 5
    
    ONLINE_COUNT=$(pm2 list 2>/dev/null | grep "metrik-frontend" | grep -c "online" || echo "0")
    log "   ✅ PM2: $ONLINE_COUNT worker(s) online"
    
    # Limpiar staging
    rm -rf "$STAGING_DIR"
    
elif [ "$FRONTEND_CHANGED" = true ] && [ "$FRONTEND_NEEDS_BUILD" = false ]; then
    log "📋 Sincronizando archivos frontend (sin rebuild)..."
    rsync -a \
        --exclude '.git' \
        --exclude '.git_backup' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.env*' \
        "$SOURCE_DIR/" "$FRONTEND_DIR/"
    log "   ✅ Archivos sincronizados"
fi

# ─── 6. HEALTH CHECKS ─────────────────────────────────────
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

if [ "$BACKEND_CHANGED" = true ]; then
    check_health "http://127.0.0.1:8080/docs" "Backend" || BACKEND_HEALTHY=false
fi

check_health "http://127.0.0.1:3030" "Frontend" || FRONTEND_HEALTHY=false

# ─── 7. ROLLBACK SI ES NECESARIO ──────────────────────────
if [ "$FRONTEND_HEALTHY" = false ]; then
    log "⚠️  Frontend unhealthy! Intentando rollback..."
    
    if [ -d "$FRONTEND_DIR/.next.rollback" ]; then
        mv "$FRONTEND_DIR/.next" "$FRONTEND_DIR/.next.failed" 2>/dev/null || true
        mv "$FRONTEND_DIR/.next.rollback" "$FRONTEND_DIR/.next"
        pm2 reload metrik-frontend --update-env >> "$BUILD_LOG" 2>&1
        sleep 5
        
        if check_health "http://127.0.0.1:3030" "Frontend (rollback)"; then
            log "   ✅ Rollback exitoso — versión anterior restaurada"
            rm -rf "$FRONTEND_DIR/.next.failed"
        else
            log "   ❌ Rollback también falló"
        fi
    fi
    
    log "══════════════════════════════════════════════"
    log "  ⚠️  DEPLOY ROLLED BACK"
    log "══════════════════════════════════════════════"
    rm -rf "$STAGING_DIR"
    exit 1
fi

if [ "$BACKEND_HEALTHY" = false ]; then
    log "⚠️  Backend unhealthy, haciendo rollback..."
    cd "$APP_DIR"
    git checkout "$BEFORE_COMMIT" -- backend/ HGApp/ 2>/dev/null || true
    pm2 reload metrik-backend --update-env >> "$BUILD_LOG" 2>&1
    log "══════════════════════════════════════════════"
    log "  ⚠️  BACKEND ROLLED BACK to $BEFORE_COMMIT"
    log "══════════════════════════════════════════════"
    exit 1
fi

# ─── 8. LIMPIEZA ──────────────────────────────────────────
rm -rf "$FRONTEND_DIR/.next.rollback" "$STAGING_DIR"

# ─── 9. RESUMEN FINAL ─────────────────────────────────────
WORKER_COUNT=$(pm2 list 2>/dev/null | grep "metrik-frontend" | grep -c "online" || echo "0")

log "══════════════════════════════════════════════"
log "  ✅ ZERO-DOWNTIME DEPLOY EXITOSO"
log "  📦 Commit:   $BEFORE_COMMIT → $AFTER_COMMIT"
log "  🖥️  Workers:  $WORKER_COUNT frontend online"
if [ "$BACKEND_CHANGED" = true ]; then
    log "  🔧 Backend:  actualizado"
fi
if [ "$FRONTEND_NEEDS_BUILD" = true ]; then
    log "  🏗️  Frontend: rebuild completado"
fi
log "══════════════════════════════════════════════"

exit 0
