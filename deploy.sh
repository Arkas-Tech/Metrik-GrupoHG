#!/bin/bash

# Deployment script for Metrik application
# This script is called by the webhook server when a push to main is detected

set -e  # Exit on any error

# Configuration
APP_DIR="/home/sgpme/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_FILE="$APP_DIR/logs/deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to check if file changed in last commit
file_changed() {
    local file=$1
    git diff HEAD@{1} HEAD --name-only | grep -q "$file"
    return $?
}

log "====== Starting deployment ======"
log "Triggered by: ${GITHUB_ACTOR:-webhook}"

cd "$APP_DIR" || { log "ERROR: Cannot cd to $APP_DIR"; exit 1; }

# Stash any local changes (shouldn't be any, but just in case)
log "Checking for local changes..."
if [[ -n $(git status -s) ]]; then
    log "Stashing local changes..."
    git stash
fi

# Fetch and pull latest changes from main
log "Pulling latest changes from main..."
BEFORE_COMMIT=$(git rev-parse HEAD)
git fetch origin main
git reset --hard origin/main
AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    log "No new changes detected. Deployment cancelled."
    exit 0
fi

log "Updated from $BEFORE_COMMIT to $AFTER_COMMIT"

# Check if backend dependencies changed
if file_changed "backend/requirements.txt"; then
    log "Backend dependencies changed. Installing..."
    cd "$BACKEND_DIR"
    ./venv/bin/pip install -r requirements.txt >> "$LOG_FILE" 2>&1
    log "Backend dependencies installed"
    cd "$APP_DIR"
fi

# Check if frontend dependencies changed
if file_changed "frontend/package.json" || file_changed "frontend/package-lock.json"; then
    log "Frontend dependencies changed. Installing..."
    cd "$FRONTEND_DIR"
    npm ci >> "$LOG_FILE" 2>&1
    log "Frontend dependencies installed"
    
    log "Rebuilding frontend..."
    npm run build >> "$LOG_FILE" 2>&1
    log "Frontend rebuilt"
    cd "$APP_DIR"
fi

# Reload PM2 processes (zero-downtime reload)
log "Reloading PM2 processes..."
pm2 reload ecosystem.config.js >> "$LOG_FILE" 2>&1

# Wait a moment for services to stabilize
sleep 3

# Verify services are online
log "Verifying services..."
PM2_STATUS=$(pm2 jlist)
BACKEND_STATUS=$(echo "$PM2_STATUS" | grep -o '"name":"metrik-backend".*"status":"[^"]*"' | grep -o 'status":"[^"]*' | cut -d'"' -f3)
FRONTEND_STATUS=$(echo "$PM2_STATUS" | grep -o '"name":"metrik-frontend".*"status":"[^"]*"' | grep -o 'status":"[^"]*' | cut -d'"' -f3)

if [ "$BACKEND_STATUS" = "online" ] && [ "$FRONTEND_STATUS" = "online" ]; then
    log "✅ Deployment successful! All services online."
    log "   Backend: $BACKEND_STATUS"
    log "   Frontend: $FRONTEND_STATUS"
    
    # Test endpoints
    BACKEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/docs || echo "000")
    FRONTEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030 || echo "000")
    
    log "   Backend HTTP: $BACKEND_HTTP"
    log "   Frontend HTTP: $FRONTEND_HTTP"
    
    if [ "$BACKEND_HTTP" = "200" ] && [ "$FRONTEND_HTTP" = "200" ]; then
        log "✅ Health checks passed"
    else
        log "⚠️  Warning: Some services not responding correctly"
    fi
else
    log "❌ ERROR: Deployment failed! Services not online."
    log "   Backend: $BACKEND_STATUS"
    log "   Frontend: $FRONTEND_STATUS"
    exit 1
fi

log "====== Deployment completed ======"
exit 0
