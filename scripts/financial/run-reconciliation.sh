#!/bin/bash

# Script de Execução da Conciliação Financeira
# Executa automaticamente via crontab todos os dias às 8h
# Gera relatórios e envia alertas se necessário

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_DIR="$PROJECT_DIR/logs"
REPORTS_DIR="$PROJECT_DIR/reports/financial"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Data para conciliação (padrão: ontem)
TARGET_DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}

echo -e "${BLUE}💰 Iniciando Conciliação Financeira${NC}"
echo -e "${BLUE}Data: $TARGET_DATE${NC}"
echo -e "${BLUE}Horário: $(date)${NC}"

# Criar diretórios se não existirem
mkdir -p "$LOG_DIR"
mkdir -p "$REPORTS_DIR"

# Log file para esta execução
LOG_FILE="$LOG_DIR/reconciliation_$TARGET_DATE.log"

# Função de log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

log "🚀 Iniciando conciliação para $TARGET_DATE"

# Verificar se Node.js está disponível
if ! command -v node &> /dev/null; then
    log "❌ Node.js não encontrado!"
    exit 1
fi

# Verificar variáveis de ambiente
if [[ -z "$DATABASE_URL" || -z "$MERCADOPAGO_ACCESS_TOKEN" ]]; then
    log "❌ Variáveis de ambiente não configuradas"
    exit 1
fi

# Executar conciliação
log "📊 Executando script de conciliação..."

cd "$PROJECT_DIR"

# Executar o script Node.js
if node scripts/financial/reconciliation.js "$TARGET_DATE" >> "$LOG_FILE" 2>&1; then
    log "✅ Conciliação executada com sucesso"
    
    # Verificar se foram gerados arquivos de discrepâncias
    DISCREPANCY_FILES=$(find "$REPORTS_DIR" -name "discrepancies_${TARGET_DATE}_*.csv" -newerct "1 hour ago")
    
    if [[ -n "$DISCREPANCY_FILES" ]]; then
        # Verificar se há discrepâncias críticas
        for file in $DISCREPANCY_FILES; do
            if [[ $(wc -l < "$file") -gt 1 ]]; then  # Mais que só o header
                log "⚠️ Discrepâncias encontradas em $file"
                
                # Enviar alerta por email se configurado
                if [[ -n "$ALERT_EMAIL" ]]; then
                    send_alert_email "$file" "$TARGET_DATE"
                fi
                
                # Enviar para Slack se configurado
                if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
                    send_slack_alert "$file" "$TARGET_DATE"
                fi
            fi
        done
    else
        log "✅ Nenhuma discrepância encontrada"
    fi
    
    # Gerar resumo do dia
    generate_daily_summary "$TARGET_DATE"
    
else
    log "❌ Falha na execução da conciliação"
    exit 1
fi

# Limpeza de arquivos antigos (manter últimos 30 dias)
log "🧹 Limpando arquivos antigos..."
find "$REPORTS_DIR" -name "*.csv" -mtime +30 -delete
find "$REPORTS_DIR" -name "*.json" -mtime +30 -delete
find "$LOG_DIR" -name "reconciliation_*.log" -mtime +30 -delete

log "✅ Conciliação finalizada"

echo -e "${GREEN}✅ Conciliação Financeira Finalizada${NC}"
echo -e "${GREEN}📊 Relatórios gerados em: $REPORTS_DIR${NC}"
echo -e "${GREEN}📋 Log completo em: $LOG_FILE${NC}"

# Funções auxiliares

send_alert_email() {
    local discrepancy_file=$1
    local date=$2
    
    if command -v mail &> /dev/null; then
        local subject="⚠️ Discrepâncias Financeiras Detectadas - $date"
        local body="Foram detectadas discrepâncias na conciliação financeira de $date.

Arquivo de discrepâncias: $discrepancy_file

Por favor, verifique o arquivo anexo e tome as ações necessárias.

Atenciosamente,
Sistema de Conciliação Financeira"

        echo "$body" | mail -s "$subject" -A "$discrepancy_file" "$ALERT_EMAIL"
        log "📧 Alerta enviado por email para $ALERT_EMAIL"
    fi
}

send_slack_alert() {
    local discrepancy_file=$1
    local date=$2
    
    local discrepancy_count=$(tail -n +2 "$discrepancy_file" | wc -l)
    
    local payload=$(cat << EOF
{
    "text": "⚠️ Discrepâncias Financeiras Detectadas",
    "blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*🚨 Alerta de Conciliação Financeira*\n\n*Data:* $date\n*Discrepâncias:* $discrepancy_count encontrada(s)\n*Arquivo:* \`$(basename "$discrepancy_file")\`"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Por favor, verifique as discrepâncias e tome as ações necessárias."
            }
        }
    ]
}
EOF
    )

    if curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1; then
        log "💬 Alerta enviado para Slack"
    else
        log "❌ Falha ao enviar alerta para Slack"
    fi
}

generate_daily_summary() {
    local date=$1
    local summary_file="$REPORTS_DIR/summary_${date}_latest.json"
    
    if [[ -f "$summary_file" ]]; then
        log "📋 Resumo do dia:"
        
        # Extrair métricas principais usando jq se disponível
        if command -v jq &> /dev/null; then
            local total_orders=$(jq -r '.metrics.totalOrders' "$summary_file")
            local paid_orders=$(jq -r '.metrics.paidOrders' "$summary_file")
            local total_revenue=$(jq -r '.metrics.totalRevenue' "$summary_file")
            local net_revenue=$(jq -r '.metrics.netRevenue' "$summary_file")
            local discrepancies=$(jq -r '.metrics.discrepancies | length' "$summary_file")
            
            log "   📊 Total de pedidos: $total_orders"
            log "   💰 Pedidos pagos: $paid_orders"
            log "   💵 Receita bruta: R$ $total_revenue"
            log "   💸 Receita líquida: R$ $net_revenue"
            log "   ⚠️ Discrepâncias: $discrepancies"
        else
            log "   📄 Resumo salvo em $summary_file"
        fi
    fi
}

# Verificar se é uma execução manual ou automática
if [[ -t 1 ]]; then
    # Execução manual - mostrar opções adicionais
    echo ""
    echo -e "${YELLOW}💡 Opções adicionais:${NC}"
    echo "• Ver relatório resumido: cat $REPORTS_DIR/summary_${TARGET_DATE}_latest.json"
    echo "• Ver discrepâncias: ls -la $REPORTS_DIR/discrepancies_${TARGET_DATE}_*.csv"
    echo "• Ver log completo: cat $LOG_FILE"
fi