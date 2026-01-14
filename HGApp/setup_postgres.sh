#!/bin/bash
# Script de setup completo para PostgreSQL

echo "================================================"
echo "🐘 CONFIGURACIÓN DE POSTGRESQL PARA SGPME"
echo "================================================"

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-sgpme}

echo ""
echo "📋 Configuración:"
echo "  Base de datos: $DB_NAME"
echo "  Usuario: $DB_USER"
echo ""

# Verificar que PostgreSQL esté corriendo
if ! pg_isready -q; then
    echo "❌ PostgreSQL no está corriendo"
    echo "Inicia PostgreSQL con:"
    echo "  macOS: brew services start postgresql@15"
    echo "  Linux: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL está corriendo"

# Crear base de datos si no existe
echo ""
echo "🗄️  Creando base de datos '$DB_NAME'..."
psql -U $DB_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME"

echo "✅ Base de datos lista"

# Inicializar tablas
echo ""
echo "📦 Inicializando tablas..."
python3 init_postgres.py

echo ""
echo "================================================"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "================================================"
echo ""
echo "Para iniciar el servidor:"
echo "  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
