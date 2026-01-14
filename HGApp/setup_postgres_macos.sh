#!/bin/bash
# Script para instalar PostgreSQL en macOS (desarrollo)

echo "================================================"
echo "🐘 Instalando PostgreSQL"
echo "================================================"

# Verificar si Homebrew está instalado
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew no está instalado"
    echo "Instala Homebrew desde: https://brew.sh"
    exit 1
fi

# Instalar PostgreSQL
echo "📦 Instalando PostgreSQL..."
brew install postgresql@15

# Iniciar servicio PostgreSQL
echo "🚀 Iniciando PostgreSQL..."
brew services start postgresql@15

# Esperar a que inicie
sleep 3

# Crear base de datos
echo "🗄️  Creando base de datos 'sgpme'..."
createdb sgpme

echo ""
echo "================================================"
echo "✅ PostgreSQL instalado y configurado"
echo "================================================"
echo ""
echo "Para verificar:"
echo "  psql -d sgpme"
echo ""
echo "Para detener:"
echo "  brew services stop postgresql@15"
echo ""
echo "Para iniciar:"
echo "  brew services start postgresql@15"
echo ""
