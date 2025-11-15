#!/usr/bin/env bash

# Conversor MPP→XML - Rollback Script
# Arquivo: deploy-scripts/rollback.sh
# Versão: 1.0
# Uso: ./rollback.sh [TARGET_IMAGE] [ENVIRONMENT]

set -euo pipefail

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/home/$(whoami)/conversor"
ENVIRONMENT=${2:-production}
TARGET_IMAGE=${1:-"auto"}

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

# Determinar imagem de rollback
determine_rollback_target() {
    log "🔍 Determining rollback target..."
    
    cd "$PROJECT_DIR"
    
    if [[ "$TARGET_IMAGE" == "auto" ]]; then
        # Tentar encontrar último backup automático
        if [[ -f ".last_successful_deployment" ]]; then
            TARGET_IMAGE=$(grep "^IMAGE=" ".last_successful_deployment" | cut -d'=' -f2)
            log "📋 Found last successful deployment: $TARGET_IMAGE"
        else
            # Tentar backup mais recente
            latest_backup=$(ls -t .backup_state_* 2>/dev/null | head -1 || echo "")
            if [[ -n "$latest_backup" ]]; then
                TARGET_IMAGE=$(grep "^BACKUP_IMAGE=" "$latest_backup" | cut -d'=' -f2)
                log "💾 Found backup state: $TARGET_IMAGE"
            else
                error "No automatic rollback target found. Please specify image manually."
            fi
        fi
    fi
    
    if [[ -z "$TARGET_IMAGE" || "$TARGET_IMAGE" == "auto" ]]; then
        error "Could not determine rollback target image"
    fi
    
    log "🎯 Rollback target: $TARGET_IMAGE"
}

# Validar imagem de rollback
validate_rollback_image() {
    log "🔍 Validating rollback image..."
    
    # Verificar se a imagem existe localmente ou no registry
    if ! docker image inspect "$TARGET_IMAGE" >/dev/null 2>&1; then
        warn "Image not found locally, attempting to pull..."
        if ! docker pull "$TARGET_IMAGE"; then
            error "Failed to pull rollback image: $TARGET_IMAGE"
        fi
    fi
    
    log "✅ Rollback image validated: $TARGET_IMAGE"
}

# Backup do estado atual antes do rollback
backup_current_state() {
    log "💾 Backing up current state before rollback..."
    
    cd "$PROJECT_DIR"
    
    current_image=$(docker-compose -f "docker-compose.${ENVIRONMENT}.yml" images app 2>/dev/null | grep app | awk '{print $4}' | head -1 || echo "unknown")
    
    cat > ".rollback_backup_$(date +%Y%m%d_%H%M%S)" << EOF
ROLLBACK_FROM_IMAGE=$current_image
ROLLBACK_TO_IMAGE=$TARGET_IMAGE
ROLLBACK_TIME=$(date -Iseconds)
ROLLBACK_ENVIRONMENT=$ENVIRONMENT
ROLLBACK_USER=$(whoami)
ROLLBACK_REASON=manual_rollback
EOF
    
    log "✅ Current state backed up"
}

# Parar serviços atuais gracefully
stop_current_services() {
    log "⏹️ Stopping current services..."
    
    cd "$PROJECT_DIR"
    
    # Parar serviços gracefully (30s timeout)
    if docker-compose -f "docker-compose.${ENVIRONMENT}.yml" stop --timeout 30; then
        log "✅ Services stopped gracefully"
    else
        warn "Graceful stop failed, forcing stop..."
        docker-compose -f "docker-compose.${ENVIRONMENT}.yml" kill
    fi
}

# Executar rollback
execute_rollback() {
    log "🔄 Executing rollback to: $TARGET_IMAGE"
    
    cd "$PROJECT_DIR"
    
    # Extrair informações da imagem
    image_name="${TARGET_IMAGE%:*}"
    image_tag="${TARGET_IMAGE#*:}"
    
    # Preparar ambiente para rollback
    cat > ".env.rollback" << EOF
IMAGE_NAME=$image_name
IMAGE_TAG=$image_tag
ROLLBACK_TIME=$(date -Iseconds)
ROLLBACK_USER=$(whoami)
EOF
    
    # Executar rollback
    log "🐳 Pulling rollback image..."
    docker pull "$TARGET_IMAGE" || warn "Pull failed, using local image"
    
    log "🚀 Starting services with rollback image..."
    if ! docker-compose -f "docker-compose.${ENVIRONMENT}.yml" --env-file ".env.rollback" up -d --force-recreate; then
        error "Rollback deployment failed"
    fi
    
    log "✅ Rollback deployment completed"
}

# Health check pós-rollback
post_rollback_health_check() {
    log "🏥 Performing post-rollback health checks..."
    
    local max_attempts=20
    local attempt=1
    local health_url="http://localhost:8080/health"
    
    # Configurar URL baseado no ambiente
    if [[ "$ENVIRONMENT" == "production" ]]; then
        health_url="https://conversormpp.com/health"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        health_url="https://staging.conversormpp.com/health"
    fi
    
    # Aguardar serviços iniciarem
    log "⏳ Waiting for services to start..."
    sleep 45
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$health_url" | grep -q "200"; then
            log "✅ Health check passed (attempt $attempt)"
            
            # Verificar resposta JSON
            response=$(curl -s "$health_url" 2>/dev/null || echo '{}')
            if echo "$response" | jq -e '.status == "ok"' >/dev/null 2>&1; then
                log "✅ Health response validation passed"
                break
            fi
        fi
        
        warn "Health check failed (attempt $attempt/$max_attempts)"
        if [ $attempt -eq $max_attempts ]; then
            error "Post-rollback health check failed after $max_attempts attempts"
        fi
        sleep 15
        attempt=$((attempt + 1))
    done
    
    log "✅ Post-rollback health checks passed"
}

# Smoke tests básicos
run_smoke_tests() {
    log "🧪 Running post-rollback smoke tests..."
    
    local base_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        base_url="https://conversormpp.com"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        base_url="https://staging.conversormpp.com"
    else
        base_url="http://localhost:8080"
    fi
    
    # Teste 1: Endpoint principal
    if curl -f -s "$base_url/" >/dev/null; then
        log "✅ Main endpoint test passed"
    else
        warn "Main endpoint test failed"
    fi
    
    # Teste 2: Health endpoint
    health_response=$(curl -s "$base_url/health" 2>/dev/null || echo '{}')
    if echo "$health_response" | jq -e '.status == "ok"' >/dev/null 2>&1; then
        log "✅ Health endpoint test passed"
    else
        warn "Health endpoint test failed"
    fi
    
    # Teste 3: Static assets
    if curl -f -s -o /dev/null "$base_url/css/style.css"; then
        log "✅ Static assets test passed"
    else
        warn "Static assets test failed"
    fi
    
    log "✅ Smoke tests completed"
}

# Limpeza pós-rollback
cleanup_rollback() {
    log "🧹 Cleaning up rollback artifacts..."
    
    cd "$PROJECT_DIR"
    
    # Remover imagens órfãs
    docker image prune -f >/dev/null 2>&1 || true
    
    # Remover containers parados
    docker container prune -f >/dev/null 2>&1 || true
    
    # Manter apenas os 10 logs de rollback mais recentes
    ls -t .rollback_backup_* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Registrar rollback
log_rollback() {
    log "📝 Logging rollback information..."
    
    cd "$PROJECT_DIR"
    
    # Atualizar arquivo de último deployment
    cat > ".last_successful_deployment" << EOF
IMAGE=$TARGET_IMAGE
ENVIRONMENT=$ENVIRONMENT
DEPLOY_TIME=$(date -Iseconds)
DEPLOY_USER=$(whoami)
DEPLOY_HOST=$(hostname)
COMMIT_SHA=${TARGET_IMAGE#*:}
STATUS=rollback_success
EOF
    
    # Log histórico
    echo "$(date -Iseconds) | ${ENVIRONMENT} | ${TARGET_IMAGE#*:} | rollback_success | $(whoami)" >> "deploy_history.log"
    
    # Log específico de rollback
    echo "$(date -Iseconds) | ROLLBACK | FROM: current TO: $TARGET_IMAGE | $(whoami) | success" >> "rollback_history.log"
    
    log "✅ Rollback logged successfully"
}

# Verificar se rollback é necessário
check_rollback_necessity() {
    log "🔍 Checking if rollback is necessary..."
    
    cd "$PROJECT_DIR"
    
    # Verificar se há um deployment atual
    if ! docker-compose -f "docker-compose.${ENVIRONMENT}.yml" ps | grep -q "Up"; then
        warn "No running services found, proceeding with rollback as recovery"
        return 0
    fi
    
    # Verificar health do deployment atual
    local health_url="http://localhost:8080/health"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        health_url="https://conversormpp.com/health"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        health_url="https://staging.conversormpp.com/health"
    fi
    
    if curl -f -s -o /dev/null "$health_url"; then
        warn "Current deployment appears to be healthy"
        echo -e "${YELLOW}Are you sure you want to proceed with rollback? (y/N):${NC}"
        read -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    log "✅ Proceeding with rollback"
}

# Função principal
main() {
    local start_time=$(date +%s)
    
    log "🚨 Starting rollback process..."
    log "Environment: ${ENVIRONMENT}"
    log "Target image: ${TARGET_IMAGE}"
    log "User: $(whoami)"
    log "Host: $(hostname)"
    
    echo -e "${RED}⚠️  WARNING: This will rollback the current deployment!${NC}"
    echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
    
    # Validações e execução
    check_rollback_necessity
    determine_rollback_target
    validate_rollback_image
    backup_current_state
    stop_current_services
    execute_rollback
    post_rollback_health_check
    run_smoke_tests
    cleanup_rollback
    log_rollback
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "🎉 Rollback completed successfully!"
    log "⏱️ Total time: ${duration} seconds"
    
    # Resumo final
    echo ""
    echo -e "${BLUE}=== ROLLBACK SUMMARY ===${NC}"
    echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
    echo -e "${GREEN}Rolled back to:${NC} ${TARGET_IMAGE}"
    echo -e "${GREEN}Duration:${NC} ${duration}s"
    echo -e "${GREEN}Status:${NC} ✅ Success"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${GREEN}Production URL:${NC} https://conversormpp.com"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        echo -e "${GREEN}Staging URL:${NC} https://staging.conversormpp.com"
    fi
    
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Verify application functionality"
    echo "2. Check logs for any issues"
    echo "3. Investigate original deployment failure"
    echo "4. Plan next deployment with fixes"
}

# Tratamento de erros
trap 'error "Rollback failed at line $LINENO. Exit code: $?"' ERR

# Executar se script for chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi