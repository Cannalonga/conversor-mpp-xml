#!/bin/bash

#############################################################################
# 🚀 DEPLOY & PRODUCTION SETUP SCRIPT - Conversor MPP para XML
# 
# Uso: ./deploy-production.sh [start|stop|restart|status|logs|monitor]
# 
# Exemplos:
#   ./deploy-production.sh start      # Iniciar servidor em produção
#   ./deploy-production.sh stop       # Parar servidor
#   ./deploy-production.sh restart    # Reiniciar
#   ./deploy-production.sh logs       # Ver logs em tempo real
#   ./deploy-production.sh monitor    # Monitoramento em tempo real
#############################################################################

set -e

# Configurações
APP_NAME="mpp-converter"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=${PORT:-3000}
ENV=${NODE_ENV:-production}
LOG_DIR="${APP_DIR}/logs"
PM2_CONFIG="${APP_DIR}/ecosystem.config.js"
BACKUP_DIR="${APP_DIR}/backups"
METRICS_PORT=${METRICS_PORT:-9090}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Verificar Node.js
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale Node.js v16+ primeiro."
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    log_info "Node.js versão: $NODE_VERSION"
}

# Verificar PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 não instalado. Instalando globalmente..."
        npm install -g pm2
    fi
}

# Função de instalação
install() {
    log_info "Instalando dependências..."
    cd "$APP_DIR"
    npm install --production
    log_success "Dependências instaladas"
}

# Função de backup
backup_current() {
    BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    mkdir -p "$BACKUP_DIR"
    
    log_info "Criando backup em: $BACKUP_FILE"
    tar -czf "$BACKUP_FILE" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=uploads \
        .
    log_success "Backup criado"
}

# Função de inicialização
start() {
    log_info "Iniciando aplicação em modo produção..."
    check_nodejs
    check_pm2
    
    cd "$APP_DIR"
    
    # Criar diretórios necessários
    mkdir -p "$LOG_DIR" logs/audit logs/disputes uploads/{incoming,processing,converted,expired,quarantine}
    
    # Verificar se já está rodando
    if pm2 info "$APP_NAME" > /dev/null 2>&1; then
        log_warning "Aplicação já está rodando. Use 'restart' para reiniciar."
        return 1
    fi
    
    # Iniciar com PM2
    export NODE_ENV=production
    export PORT=$PORT
    
    pm2 start ecosystem.config.js --env production --name "$APP_NAME"
    
    log_success "Aplicação iniciada (PID salvo)"
    
    # Esperar um pouco e verificar saúde
    sleep 3
    check_health
}

# Função de parada
stop() {
    log_info "Parando aplicação..."
    
    if pm2 info "$APP_NAME" > /dev/null 2>&1; then
        pm2 stop "$APP_NAME"
        log_success "Aplicação parada"
    else
        log_warning "Aplicação não está rodando"
    fi
}

# Função de reinicialização
restart() {
    log_info "Reiniciando aplicação..."
    
    if pm2 info "$APP_NAME" > /dev/null 2>&1; then
        pm2 restart "$APP_NAME"
        sleep 3
        check_health
        log_success "Aplicação reiniciada"
    else
        start
    fi
}

# Verificar saúde da aplicação
check_health() {
    log_info "Verificando saúde da aplicação..."
    
    for i in {1..10}; do
        HEALTH=$(curl -s http://localhost:$PORT/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "$HEALTH" ]; then
            case $HEALTH in
                HEALTHY)
                    log_success "Status: $HEALTH ✓"
                    return 0
                    ;;
                DEGRADED)
                    log_warning "Status: $HEALTH (funcionando com avisos)"
                    return 0
                    ;;
                CRITICAL|OFFLINE)
                    log_error "Status: $HEALTH"
                    return 1
                    ;;
            esac
        fi
        
        if [ $i -lt 10 ]; then
            sleep 1
        fi
    done
    
    log_warning "Não foi possível verificar saúde"
    return 1
}

# Status da aplicação
status() {
    log_info "Status da aplicação:"
    
    if pm2 info "$APP_NAME" > /dev/null 2>&1; then
        pm2 info "$APP_NAME"
        echo ""
        check_health
    else
        log_warning "Aplicação não está rodando"
    fi
    
    # Mostrar métricas
    log_info "Métricas do sistema:"
    if [ -f "${LOG_DIR}/app-*.log" ]; then
        tail -5 $(ls -t logs/app-*.log | head -1)
    fi
}

# Visualizar logs
show_logs() {
    log_info "Exibindo logs (Ctrl+C para sair)..."
    
    if pm2 info "$APP_NAME" > /dev/null 2>&1; then
        pm2 logs "$APP_NAME"
    else
        # Se PM2 não está usando, mostrar arquivo de log
        if [ -f "$(ls -t logs/app-*.log 2>/dev/null | head -1)" ]; then
            tail -f "$(ls -t logs/app-*.log 2>/dev/null | head -1)"
        else
            log_error "Nenhum arquivo de log encontrado"
        fi
    fi
}

# Monitoramento em tempo real
monitor() {
    log_info "Iniciando monitoramento em tempo real (Ctrl+C para sair)..."
    echo ""
    
    while true; do
        clear
        echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║  Monitoramento - Conversor MPP para XML        ║${NC}"
        echo -e "${BLUE}║  $(date '+%Y-%m-%d %H:%M:%S')                              ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
        echo ""
        
        # Health Check
        HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null || echo '{"status":"OFFLINE"}')
        STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        case $STATUS in
            HEALTHY)
                STATUS_COLOR=$GREEN
                ;;
            DEGRADED)
                STATUS_COLOR=$YELLOW
                ;;
            *)
                STATUS_COLOR=$RED
                ;;
        esac
        
        echo -e "Status Geral:    ${STATUS_COLOR}$STATUS${NC}"
        
        # Métricas
        METRICS=$(curl -s http://localhost:$PORT/metrics/json 2>/dev/null || echo '{}')
        UPTIME=$(echo "$METRICS" | grep -o '"uptime":{[^}]*}' | grep -o '"hours":"[^"]*"' | cut -d'"' -f4)
        MEM=$(echo "$METRICS" | grep -o '"rss_mb":"[^"]*"' | cut -d'"' -f4)
        CONVERSIONS=$(echo "$METRICS" | grep -o '"successful":[0-9]*' | cut -d':' -f2)
        REVENUE=$(echo "$METRICS" | grep -o '"totalRevenueR\$":"[^"]*"' | cut -d'"' -f4)
        
        echo -e "Uptime:          ${UPTIME} horas"
        echo -e "Memória:         ${MEM} MB"
        echo -e "Conversões:      ${CONVERSIONS}"
        echo -e "Receita:         R\$ $(echo $REVENUE | cut -d'$' -f2)"
        
        # Processo PM2
        if pm2 info "$APP_NAME" > /dev/null 2>&1; then
            PM2_UPTIME=$(pm2 info "$APP_NAME" | grep "pm2 uptime" | cut -d':' -f2 | xargs)
            echo -e "PM2 Uptime:      $PM2_UPTIME"
        fi
        
        echo ""
        echo -e "${BLUE}Pressione Ctrl+C para sair...${NC}"
        sleep 5
    done
}

# Limpeza de logs antigos
cleanup_logs() {
    log_info "Limpando logs antigos..."
    
    # Remover logs com mais de 30 dias
    find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete
    
    # Remover arquivos expirados
    find "${APP_DIR}/uploads/expired" -type f -mtime +7 -delete
    
    log_success "Limpeza concluída"
}

# Função de ajuda
show_help() {
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  start          Iniciar servidor em produção"
    echo "  stop           Parar servidor"
    echo "  restart        Reiniciar servidor"
    echo "  status         Mostrar status e métricas"
    echo "  logs           Visualizar logs em tempo real"
    echo "  monitor        Monitoramento contínuo"
    echo "  health         Verificar saúde da aplicação"
    echo "  cleanup        Limpar logs e arquivos antigos"
    echo "  backup         Fazer backup da aplicação"
    echo "  install        Instalar dependências"
    echo "  help           Mostrar esta mensagem"
    echo ""
    echo "Exemplos:"
    echo "  $0 start                    # Iniciar servidor"
    echo "  $0 restart                  # Reiniciar servidor"
    echo "  $0 logs                     # Ver logs ao vivo"
    echo "  $0 monitor                  # Monitoramento em tempo real"
}

# Main
COMMAND=${1:-status}

case $COMMAND in
    start)
        install
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    logs)
        show_logs
        ;;
    monitor)
        monitor
        ;;
    health)
        check_health
        ;;
    cleanup)
        cleanup_logs
        ;;
    backup)
        backup_current
        ;;
    install)
        install
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Comando desconhecido: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0
