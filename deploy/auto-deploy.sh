#!/bin/bash
# ============================================================================
# CANNACONVERT - DEPLOY AUTOMÁTICO
# ============================================================================
# Script executado no servidor para deploy completo

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# ============================================================================
# 1. VERIFICAR SISTEMA
# ============================================================================
log_info "Verificando sistema..."

if ! command -v curl &> /dev/null; then
    log_info "Instalando curl..."
    apt-get update && apt-get install -y curl
fi

# ============================================================================
# 2. INSTALAR DOCKER (se não tiver)
# ============================================================================
if ! command -v docker &> /dev/null; then
    log_info "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log_success "Docker instalado"
else
    log_success "Docker já está instalado"
fi

# ============================================================================
# 3. INSTALAR DOCKER COMPOSE
# ============================================================================
if ! command -v docker-compose &> /dev/null; then
    log_info "Instalando Docker Compose..."
    apt-get install -y docker-compose-plugin
    log_success "Docker Compose instalado"
else
    log_success "Docker Compose já está instalado"
fi

# ============================================================================
# 4. CLONAR/ATUALIZAR REPOSITÓRIO
# ============================================================================
log_info "Preparando código..."

mkdir -p /opt/cannaconvert

if [ -d "/opt/cannaconvert/.git" ]; then
    log_info "Atualizando repositório existente..."
    cd /opt/cannaconvert
    git fetch origin
    git checkout deploy/production
    git pull origin deploy/production
else
    log_info "Clonando repositório..."
    git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git /opt/cannaconvert
    cd /opt/cannaconvert
fi

log_success "Código atualizado"

# ============================================================================
# 5. CRIAR .env
# ============================================================================
log_info "Configurando variáveis de ambiente..."

if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store

JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

DATABASE_URL=sqlite://./data/production.db
REDIS_URL=redis://localhost:6379
REDIS_DB=0

CORS_ORIGIN=https://cannaconvert.store,https://www.cannaconvert.store
ALLOWED_ORIGINS=https://cannaconvert.store,https://www.cannaconvert.store

RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

LOG_LEVEL=info
ENVEOF
    log_success ".env criado"
else
    log_success ".env já existe"
fi

# ============================================================================
# 6. CRIAR DIRETÓRIOS NECESSÁRIOS
# ============================================================================
log_info "Criando diretórios..."

mkdir -p /opt/cannaconvert/data
mkdir -p /opt/cannaconvert/uploads
mkdir -p /opt/cannaconvert/logs

log_success "Diretórios criados"

# ============================================================================
# 7. INICIAR COM DOCKER COMPOSE
# ============================================================================
log_info "Iniciando aplicação com Docker..."

cd /opt/cannaconvert

# Parar containers antigos
docker compose -f docker-compose.production.yml down 2>/dev/null || true
sleep 2

# Iniciar novos
docker compose -f docker-compose.production.yml up -d

log_success "Containers iniciados"

# ============================================================================
# 8. AGUARDAR INICIALIZAÇÃO
# ============================================================================
log_info "Aguardando aplicação iniciar..."

for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "✅ Aplicação online!"
        break
    fi
    echo -n "."
    sleep 1
done

# ============================================================================
# 9. INSTALAR E CONFIGURAR NGINX (SE NÃO TIVER)
# ============================================================================
if ! command -v nginx &> /dev/null; then
    log_info "Instalando NGINX..."
    apt-get install -y nginx
    
    # Criar configuração básica
    cat > /etc/nginx/sites-available/cannaconvert << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name cannaconvert.store www.cannaconvert.store;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
    
    ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t && systemctl restart nginx
    log_success "NGINX configurado"
else
    log_success "NGINX já está instalado"
fi

# ============================================================================
# 10. RESUMO FINAL
# ============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📍 URLs:"
echo -e "   ${BLUE}Local:    http://localhost:3000${NC}"
echo -e "   ${BLUE}Produção: https://cannaconvert.store${NC}"
echo ""
echo "📊 Comandos úteis:"
echo "   Ver logs:      docker compose -f docker-compose.production.yml logs -f"
echo "   Parar:         docker compose -f docker-compose.production.yml down"
echo "   Reiniciar:     docker compose -f docker-compose.production.yml restart"
echo ""

log_success "Aplicação está ONLINE!"

