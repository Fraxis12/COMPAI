#!/bin/bash
# Script de verificación del Backend Cleanup
# Ejecutar desde: /home/francis/Videos/asistente_backend

set -e  # Exit on error

echo "=========================================="
echo "🔍 VERIFICACIÓN DE BACKEND CLEANUP"
echo "=========================================="
echo ""

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de checks
PASSED=0
FAILED=0

check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description - $file"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description - $file NOT FOUND"
        ((FAILED++))
    fi
}

check_syntax() {
    local file=$1
    local description=$2
    if python3 -m py_compile "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Syntax - $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Syntax ERROR - $description"
        ((FAILED++))
    fi
}

check_contains() {
    local file=$1
    local pattern=$2
    local description=$3
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description NOT FOUND"
        ((FAILED++))
    fi
}

# ============================================
# SECTION 1: File Structure Verification
# ============================================
echo "📁 VERIFICACIÓN DE ESTRUCTURA..."
echo ""

check_file "app/main.py" "Main entry point"
check_file "app/core/database.py" "Database config"
check_file "app/core/config.py" "App settings"
check_file "app/core/auth.py" "Authentication module"
check_file "app/services/helpers.py" "Shared helpers (NEW)"
check_file ".env.example" "Environment template (UPDATED)"
check_file "BACKEND_CLEANUP_SUMMARY.md" "Cleanup summary (NEW)"

echo ""

# ============================================
# SECTION 2: Syntax Validation
# ============================================
echo "✅ VALIDACIÓN DE SINTAXIS..."
echo ""

check_syntax "app/main.py" "FastAPI app initialization"
check_syntax "app/core/database.py" "Database session & engine"
check_syntax "app/core/config.py" "Configuration settings"
check_syntax "app/core/auth.py" "API Key authentication"
check_syntax "app/services/helpers.py" "Helper functions"
check_syntax "app/services/usuario_service.py" "Usuario service (updated)"
check_syntax "app/seed.py" "Database seeder (updated)"

echo ""

# ============================================
# SECTION 3: Code Quality Checks
# ============================================
echo "🔧 VERIFICACIÓN DE CALIDAD DE CÓDIGO..."
echo ""

# Check for rollback in get_db
check_contains "app/core/database.py" "db.rollback()" "Session rollback en get_db()"

# Check for logging in main
check_contains "app/main.py" "import logging" "Logging import en main"
check_contains "app/main.py" "logger.info" "Logger.info calls"

# Check for logging in seed
check_contains "app/seed.py" "logger.info" "Logger.info reemplaza print()"
check_contains "app/seed.py" "import logging" "Logging import en seed"

# Check for error handling in usuario_service
check_contains "app/services/usuario_service.py" "try:" "Error handling en usuario_service"
check_contains "app/services/usuario_service.py" "db.rollback()" "Rollback en usuario_service"
check_contains "app/services/usuario_service.py" "IntegrityError" "Integrity error handling"

# Check for secure defaults
check_contains "app/core/config.py" "DEBUG.*False" "DEBUG=False (seguro)"
check_contains "app/core/config.py" "localhost" "CORS restringido a localhost"

# Check for API Key loading from env
check_contains "app/core/auth.py" "os.getenv" "API keys desde env vars"
check_contains "app/core/auth.py" "IOT_API_KEYS" "IOT_API_KEYS support"

# Check helpers module
check_contains "app/services/helpers.py" "def verificar_usuario" "verificar_usuario en helpers"
check_contains "app/services/helpers.py" "def verificar_curso" "verificar_curso en helpers"

echo ""

# ============================================
# SECTION 4: Breaking Changes Check
# ============================================
echo "⚠️  VERIFICACIÓN DE CAMBIOS QUE ROMPEN (Breaking Changes)..."
echo ""

if grep -q "ws://" "app/routes/sensores.py" 2>/dev/null; then
    # Check if it's still using old format
    if grep -q "api_key}" "app/routes/sensores.py"; then
        echo -e "${YELLOW}⚠${NC} WebSocket aún usa URL params (recomendado actualizar)"
        ((FAILED++))
    fi
else
    echo -e "${GREEN}✓${NC} No WebSocket breaking changes"
    ((PASSED++))
fi

# Check that sensor imports didn't break
if [ -f "app/models/sensor_data.py" ]; then
    check_syntax "app/models/sensor_data.py" "Sensor model syntax"
    check_contains "app/routes/sensores.py" "from app.services.sensor_data_service" "Sensor service imports"
fi

echo ""

# ============================================
# SECTION 5: Documentation Check
# ============================================
echo "📚 VERIFICACIÓN DE DOCUMENTACIÓN..."
echo ""

check_file ".env.example" "Archivo .env.example existe"
check_contains ".env.example" "DATABASE_URL" ".env.example tiene DATABASE_URL"
check_contains ".env.example" "IOT_API_KEYS" ".env.example documenta IOT_API_KEYS"
check_contains ".env.example" "DEBUG" ".env.example documenta DEBUG"

echo ""

# ============================================
# SECTION 6: Summary
# ============================================
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo ""
echo -e "${GREEN}✓ Pasados${NC}:  $PASSED"
echo -e "${RED}✗ Fallidos${NC}: $FAILED"
echo -e "Total:    $TOTAL"
echo ""
echo "Porcentaje de éxito: $PERCENTAGE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Crear .env desde .env.example:"
    echo "   cp .env.example .env"
    echo ""
    echo "2. Instalar dependencias:"
    echo "   pip install -r requirements.txt"
    echo ""
    echo "3. Iniciar backend:"
    echo "   python -m uvicorn app.main:app --reload"
    echo ""
    echo "4. Verificar Swagger:"
    echo "   http://localhost:8000/docs"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    echo ""
    echo "Por favor revisar los errores arriba."
    exit 1
fi
