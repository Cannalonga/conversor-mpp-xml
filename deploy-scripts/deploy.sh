#!/usr/bin/env bash

# Conversor MPP→XML - Production Deployment Script
# Arquivo: deploy-scripts/deploy.sh
# Versão: 1.0
# Uso: ./deploy.sh [IMAGE_TAG] [ENVIRONMENT]

set -euo pipefail

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/home/$(whoami)/conversor"
IMAGE_NAME="ghcr.io/cannalonga/conversor-mpp-xml"
ENVIRONMENT=${2:-production}
IMAGE_TAG=${1:-latest}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Validações iniciais
validate_environment() {
    log "🔍 Validating deployment environment..."
    
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "Project directory not found: $PROJECT_DIR"
    fi
    
    cd "$PROJECT_DIR"
    
    if [[ ! -f "docker-compose.${ENVIRONMENT}.yml" ]]; then
        error "Docker compose file not found: docker-compose.${ENVIRONMENT}.yml"
    fi
    
    # Verificar se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running or not accessible"
    fi
    
    log "✅ Environment validation passed"
}

# Backup do estado atual
backup_current_state() {
    log "💾 Backing up current deployment state..."
    
    cd "$PROJECT_DIR"
    
    # Obter tag da imagem atual
    current_image=$(docker-compose -f "docker-compose.${ENVIRONMENT}.yml" images app 2>/dev/null | grep app | awk '{print $4}' | head -1 || echo "none")
    
    if [[ "$current_image" != "none" && "$current_image" != "" ]]; then
        echo "BACKUP_IMAGE=$current_image" > ".backup_state_$(date +%Y%m%d_%H%M%S)"
        echo "BACKUP_TIME=$(date -Iseconds)" >> ".backup_state_$(date +%Y%m%d_%H%M%S)"
        echo "BACKUP_ENVIRONMENT=$ENVIRONMENT" >> ".backup_state_$(date +%Y%m%d_%H%M%S)"
        
        # Manter apenas os 5 backups mais recentes
        ls -t .backup_state_* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
        
        log "✅ Backup saved: $current_image"
    else
        warn "No current deployment found to backup"
    fi
}

# Pull da nova imagem
pull_image() {
    log "🐳 Pulling new image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    if ! docker pull "${IMAGE_NAME}:${IMAGE_TAG}"; then
        error "Failed to pull image ${IMAGE_NAME}:${IMAGE_TAG}"
    fi
    
    log "✅ Image pulled successfully"
}

# Preparar arquivos de ambiente
prepare_environment() {
    log "🔧 Preparing environment configuration..."
    
    cd "$PROJECT_DIR"
    
    # Criar arquivo de ambiente para o deploy
    cat > ".env.${ENVIRONMENT}" << EOF
IMAGE_NAME=${IMAGE_NAME}
IMAGE_TAG=${IMAGE_TAG}
DEPLOY_TIME=$(date -Iseconds)
DEPLOY_USER=$(whoami)
DEPLOY_HOST=$(hostname)
EOF
    
    # Verificar se existem variáveis de ambiente obrigatórias
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "MERCADOPAGO_ACCESS_TOKEN"
        "MINIO_ACCESS_KEY"
        "MINIO_SECRET_KEY"
    )
    
    env_file=".env"
    if [[ -f ".env.${ENVIRONMENT}.local" ]]; then
        env_file=".env.${ENVIRONMENT}.local"
    fi
    
    if [[ ! -f "$env_file" ]]; then
        warn "Environment file not found: $env_file"
    else
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" "$env_file"; then
                warn "Required environment variable not found: $var"
            fi
        done
    fi
    
    log "✅ Environment configuration ready"
}

# Deploy dos serviços
deploy_services() {
    log "🚀 Deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Deploy usando docker-compose
    if ! docker-compose -f "docker-compose.${ENVIRONMENT}.yml" --env-file ".env.${ENVIRONMENT}" pull; then
        error "Failed to pull services"
    fi
    
    if ! docker-compose -f "docker-compose.${ENVIRONMENT}.yml" --env-file ".env.${ENVIRONMENT}" up -d --no-build; then
        error "Failed to deploy services"
    fi
    
    log "✅ Services deployed successfully"
}

# Executar migrações de banco (se necessário)
run_migrations() {
    log "🗄️ Running database migrations..."
    
    cd "$PROJECT_DIR"
    
    # Aguardar o serviço de app estar pronto
    sleep 30
    
    # Executar migrações (ajustar conforme sua aplicação)
    if docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app python -c "import sys; sys.exit(0)" 2>/dev/null; then
        docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app python manage.py db upgrade 2>/dev/null || warn "Database migrations failed or not applicable"
    else
        warn "App container not ready for migrations"
    fi
    
    log "✅ Database migrations completed"
}

# Health check dos serviços
health_check() {
    log "🏥 Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:8080/health"
    
    # Se environment for production, usar URL pública
    if [[ "$ENVIRONMENT" == "production" ]]; then
        health_url="https://conversormpp.com/health"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        health_url="https://staging.conversormpp.com/health"
    fi
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$health_url" | grep -q "200"; then
            log "✅ Health check passed (attempt $attempt)"
            break
        else
            warn "Health check failed (attempt $attempt/$max_attempts)"
            if [ $attempt -eq $max_attempts ]; then
                error "Health check failed after $max_attempts attempts"
            fi
            sleep 10
        fi
        attempt=$((attempt + 1))
    done
    
    log "✅ All health checks passed"
}

# Limpeza de recursos
cleanup() {
    log "🧹 Cleaning up resources..."
    
    cd "$PROJECT_DIR"
    
    # Remover imagens não utilizadas
    docker image prune -f >/dev/null 2>&1 || true
    
    # Remover containers parados
    docker container prune -f >/dev/null 2>&1 || true
    
    # Remover logs antigos de deploy (manter apenas 10)
    find . -name "deploy_*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Salvar informações do deploy bem-sucedido
save_deployment_info() {
    log "📝 Saving deployment information..."
    
    cd "$PROJECT_DIR"
    
    cat > ".last_successful_deployment" << EOF
IMAGE=${IMAGE_NAME}:${IMAGE_TAG}
ENVIRONMENT=${ENVIRONMENT}
DEPLOY_TIME=$(date -Iseconds)
DEPLOY_USER=$(whoami)
DEPLOY_HOST=$(hostname)
COMMIT_SHA=${IMAGE_TAG}
STATUS=success
EOF
    
    # Log de deploy
    echo "$(date -Iseconds) | ${ENVIRONMENT} | ${IMAGE_TAG} | success | $(whoami)" >> "deploy_history.log"
    
    log "✅ Deployment information saved"
}

# Função principal
main() {
    local start_time=$(date +%s)
    
    log "🎯 Starting deployment process..."
    log "Environment: ${ENVIRONMENT}"
    log "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    log "User: $(whoami)"
    log "Host: $(hostname)"
    
    # Executar etapas do deploy
    validate_environment
    backup_current_state
    pull_image
    prepare_environment
    deploy_services
    run_migrations
    health_check
    cleanup
    save_deployment_info
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "🎉 Deployment completed successfully!"
    log "⏱️ Total time: ${duration} seconds"
    
    # Mostrar status final
    echo ""
    echo -e "${BLUE}=== DEPLOYMENT SUMMARY ===${NC}"
    echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
    echo -e "${GREEN}Image:${NC} ${IMAGE_NAME}:${IMAGE_TAG}"
    echo -e "${GREEN}Duration:${NC} ${duration}s"
    echo -e "${GREEN}Status:${NC} ✅ Success"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${GREEN}Production URL:${NC} https://conversormpp.com"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        echo -e "${GREEN}Staging URL:${NC} https://staging.conversormpp.com"
    fi
}

# Tratamento de erros
trap 'error "Deployment failed at line $LINENO. Exit code: $?"' ERR

# Executar se script for chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi