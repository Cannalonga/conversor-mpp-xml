#!/bin/bash
# ============================================================================
# CANNACONVERT - QUICK DEPLOY SCRIPT
# ============================================================================
# Script rápido para deploy em produção
# 
# Uso:
#   chmod +x deploy/quick-deploy.sh
#   ./deploy/quick-deploy.sh
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-cannaconvert.store}"
APP_DIR="/opt/cannaconvert"
REPO_URL="https://github.com/Cannalonga/conversor-mpp-xml.git"
BRANCH="deploy/production"

# ============================================================================
# FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_requirements() {
    log_info "Verificando pré-requisitos..."
    
    if ! command -v git &> /dev/null; then
        log_error "Git não está instalado"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    log_success "Todos os pré-requisitos OK"
}

clone_repo() {
    log_info "Clonando repositório..."
    
    if [ -d "$APP_DIR" ]; then
        log_warning "Diretório $APP_DIR já existe, pulando clone"
        cd "$APP_DIR"
        git pull origin $BRANCH
    else
        mkdir -p "$APP_DIR"
        git clone -b $BRANCH $REPO_URL "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    log_success "Repositório clonado/atualizado"
}

setup_env() {
    log_info "Configurando variáveis de ambiente..."
    
    if [ ! -f ".env" ]; then
        log_warning ".env não encontrado, criando a partir do template"
        
        cat > .env << 'EOF'
# ============================================================================
# PRODUÇÃO - CANNACONVERT
# ============================================================================

NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store

# ============================================================================
# SECURITY
# ============================================================================
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 32)

# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL=sqlite://./data/production.db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================================================
# REDIS
# ============================================================================
REDIS_URL=redis://localhost:6379
REDIS_DB=0
REDIS_TTL=3600

# ============================================================================
# CORS
# ============================================================================
CORS_ORIGIN=https://cannaconvert.store,https://www.cannaconvert.store
ALLOWED_ORIGINS=https://cannaconvert.store,https://www.cannaconvert.store

# ============================================================================
# RATE LIMITING
# ============================================================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=info

EOF
        log_success ".env criado com valores padrão"
    else
        log_success ".env já existe"
    fi
}

build_docker() {
    log_info "Construindo imagem Docker..."
    
    docker compose -f docker-compose.production.yml pull
    docker compose -f docker-compose.production.yml build
    
    log_success "Imagem Docker construída"
}

start_services() {
    log_info "Iniciando serviços..."
    
    docker compose -f docker-compose.production.yml down || true
    sleep 2
    docker compose -f docker-compose.production.yml up -d
    
    log_success "Serviços iniciados"
}

verify_deployment() {
    log_info "Verificando deployment..."
    
    sleep 5
    
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "✓ Servidor respondendo em http://localhost:3000"
    else
        log_warning "⚠ Health check não respondeu ainda, aguardando..."
        sleep 5
    fi
    
    log_info "Verificar logs com: docker compose -f docker-compose.production.yml logs -f"
}

# ============================================================================
# MAIN
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 CANNACONVERT - QUICK DEPLOY                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

check_requirements
clone_repo
setup_env
build_docker
start_services
verify_deployment

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ DEPLOY CONCLUÍDO COM SUCESSO!                             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📍 URLs:"
echo "   Local:  http://localhost:3000"
echo "   Domínio: https://$DOMAIN"
echo ""
echo "📊 Gerenciar serviços:"
echo "   Ver logs:      docker compose -f docker-compose.production.yml logs -f"
echo "   Parar:         docker compose -f docker-compose.production.yml down"
echo "   Reiniciar:     docker compose -f docker-compose.production.yml restart"
echo ""
