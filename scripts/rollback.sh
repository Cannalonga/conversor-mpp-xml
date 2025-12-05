#!/bin/bash
# ============================================================================
# CANNACONVERT - SCRIPT DE ROLLBACK
# ============================================================================
# Uso:
#   ./rollback.sh                    # Rollback para versão anterior
#   ./rollback.sh v1.0.0             # Rollback para versão específica
#   ./rollback.sh --list             # Listar versões disponíveis
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/cannaconvert/app"
BACKUP_DIR="/opt/cannaconvert/backups"
COMPOSE_FILE="docker-compose.production.yml"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# List available versions
list_versions() {
    log_info "Versões disponíveis:"
    echo ""
    
    # Docker images
    echo "📦 Imagens Docker:"
    docker images | grep cannaconvert | head -10
    echo ""
    
    # Git commits
    echo "📝 Últimos commits:"
    cd $APP_DIR
    git log --oneline -10
    echo ""
    
    # Backup files
    echo "💾 Backups disponíveis:"
    ls -la $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -5 || echo "  Nenhum backup encontrado"
}

# Rollback Docker containers
rollback_docker() {
    local VERSION=${1:-"previous"}
    
    log_info "Iniciando rollback Docker..."
    
    cd $APP_DIR
    
    # Stop current containers
    log_info "Parando containers atuais..."
    docker compose -f $COMPOSE_FILE down --timeout 30
    
    if [[ "$VERSION" == "previous" ]]; then
        # Get previous image tag
        PREVIOUS_TAG=$(docker images --format "{{.Tag}}" | grep -v "latest" | head -1)
        if [[ -z "$PREVIOUS_TAG" ]]; then
            log_error "Nenhuma versão anterior encontrada"
        fi
        VERSION=$PREVIOUS_TAG
    fi
    
    log_info "Fazendo rollback para versão: $VERSION"
    
    # Update compose file with specific version
    sed -i "s/:latest/:$VERSION/g" $COMPOSE_FILE
    
    # Pull and start
    docker compose -f $COMPOSE_FILE pull
    docker compose -f $COMPOSE_FILE up -d
    
    # Wait for health check
    log_info "Aguardando health check..."
    sleep 10
    
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        log_success "Rollback concluído com sucesso!"
    else
        log_error "Health check falhou após rollback"
    fi
}

# Rollback Git
rollback_git() {
    local COMMIT=${1:-"HEAD~1"}
    
    log_info "Iniciando rollback Git para: $COMMIT"
    
    cd $APP_DIR
    
    # Store current commit
    CURRENT=$(git rev-parse HEAD)
    echo $CURRENT > $BACKUP_DIR/rollback_from_commit.txt
    
    # Checkout to specific commit
    git fetch origin
    git checkout $COMMIT
    
    # Rebuild containers
    log_info "Reconstruindo containers..."
    docker compose -f $COMPOSE_FILE down --timeout 30
    docker compose -f $COMPOSE_FILE build
    docker compose -f $COMPOSE_FILE up -d
    
    log_success "Rollback Git concluído!"
    log_info "Commit anterior salvo em: $BACKUP_DIR/rollback_from_commit.txt"
}

# Rollback database
rollback_database() {
    local BACKUP_FILE=$1
    
    if [[ -z "$BACKUP_FILE" ]]; then
        # Find latest backup
        BACKUP_FILE=$(ls -t $BACKUP_DIR/db_*.sql.gz 2>/dev/null | head -1)
        if [[ -z "$BACKUP_FILE" ]]; then
            log_error "Nenhum backup de banco encontrado"
        fi
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Arquivo de backup não encontrado: $BACKUP_FILE"
    fi
    
    log_warning "ATENÇÃO: Isso irá sobrescrever o banco de dados atual!"
    read -p "Continuar? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    log_info "Restaurando backup: $BACKUP_FILE"
    
    cd $APP_DIR
    
    # Restore
    gunzip -c "$BACKUP_FILE" | docker compose -f $COMPOSE_FILE exec -T postgres \
        psql -U cannaconvert -d cannaconvert_prod
    
    log_success "Banco de dados restaurado!"
}

# Show help
show_help() {
    echo "CannaConvert - Script de Rollback"
    echo ""
    echo "Uso:"
    echo "  $0                     Rollback containers para versão anterior"
    echo "  $0 --docker [version]  Rollback Docker para versão específica"
    echo "  $0 --git [commit]      Rollback Git para commit específico"
    echo "  $0 --db [backup_file]  Restaurar banco de dados"
    echo "  $0 --list              Listar versões disponíveis"
    echo "  $0 --help              Mostrar esta ajuda"
}

# Main
case "${1:-}" in
    --list)
        list_versions
        ;;
    --docker)
        rollback_docker "${2:-previous}"
        ;;
    --git)
        rollback_git "${2:-HEAD~1}"
        ;;
    --db)
        rollback_database "${2:-}"
        ;;
    --help)
        show_help
        ;;
    *)
        rollback_docker "${1:-previous}"
        ;;
esac
