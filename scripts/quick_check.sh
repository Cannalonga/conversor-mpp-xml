#!/bin/bash
# Conversor MPP-XML - Quick Health Check Script
# Usage: ./scripts/quick_check.sh [staging|prod]

set -e

ENV=${1:-prod}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')

echo "🏥 QUICK HEALTH CHECK - $ENV"
echo "📅 $TIMESTAMP"
echo "=================================="

# Configuração por ambiente
if [ "$ENV" = "staging" ]; then
    APP_URL="https://staging.conversormpp.com"
    PROMETHEUS_URL="http://staging.conversormpp.com:9090"
else
    APP_URL="https://conversormpp.com"
    PROMETHEUS_URL="http://conversormpp.com:9090"
fi

# Função para status colorido
status_check() {
    local name="$1"
    local command="$2"
    
    printf "%-20s: " "$name"
    
    if eval "$command" >/dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAIL"
        return 1
    fi
}

# Função para métricas numéricas
metric_check() {
    local name="$1"
    local value="$2"
    local threshold="$3"
    local unit="$4"
    
    printf "%-20s: " "$name"
    
    if (( $(echo "$value <= $threshold" | bc -l) )); then
        echo "✅ ${value}${unit} (threshold: ≤${threshold}${unit})"
        return 0
    else
        echo "⚠️ ${value}${unit} (threshold: ≤${threshold}${unit})"
        return 1
    fi
}

FAILED=0

echo "🌐 APPLICATION HEALTH"
echo "-------------------"

# App health endpoint
if ! status_check "Health endpoint" "curl -sf '$APP_URL/health'"; then
    FAILED=$((FAILED + 1))
fi

# Response time check
RESPONSE_TIME=$(curl -sf -w "%{time_total}" -o /dev/null "$APP_URL/health" 2>/dev/null || echo "999")
if ! metric_check "Response time" "$RESPONSE_TIME" "2.0" "s"; then
    FAILED=$((FAILED + 1))
fi

echo ""
echo "⚙️ WORKERS & QUEUE"
echo "-------------------"

# Queue length via Prometheus
QUEUE_LENGTH=$(curl -sf "$PROMETHEUS_URL/api/v1/query?query=redis_list_length{list='conversions'}" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')
if ! metric_check "Queue length" "$QUEUE_LENGTH" "50" " items"; then
    FAILED=$((FAILED + 1))
fi

# Active workers
WORKERS=$(curl -sf "$PROMETHEUS_URL/api/v1/query?query=up{job='worker'}" 2>/dev/null | jq -r '.data.result | length')
if [ "$WORKERS" -gt 0 ]; then
    echo "Active workers      : ✅ $WORKERS running"
else
    echo "Active workers      : ❌ No workers active"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "💾 INFRASTRUCTURE"
echo "-------------------"

# Database connection
if ! status_check "Database" "curl -sf '$APP_URL/health/db'"; then
    FAILED=$((FAILED + 1))
fi

# Storage (MinIO)
if ! status_check "Storage (MinIO)" "curl -sf '$APP_URL/health/storage'"; then
    FAILED=$((FAILED + 1))
fi

# Redis connection
if ! status_check "Redis" "curl -sf '$APP_URL/health/redis'"; then
    FAILED=$((FAILED + 1))
fi

echo ""
echo "🚨 ALERTS & MONITORING"
echo "----------------------"

# Active alerts via Alertmanager
ALERTMANAGER_URL="${PROMETHEUS_URL/9090/9093}"
ACTIVE_ALERTS=$(curl -sf "$ALERTMANAGER_URL/api/v1/alerts" 2>/dev/null | jq -r '[.data[] | select(.status.state == "active")] | length' || echo "unknown")

if [ "$ACTIVE_ALERTS" = "0" ]; then
    echo "Active alerts       : ✅ None"
elif [ "$ACTIVE_ALERTS" = "unknown" ]; then
    echo "Active alerts       : ⚠️ Cannot check (Alertmanager unreachable)"
    FAILED=$((FAILED + 1))
else
    echo "Active alerts       : ⚠️ $ACTIVE_ALERTS active"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=================================="

# Summary
if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL SYSTEMS OPERATIONAL"
    echo "✅ Environment: $ENV"
    echo "✅ Status: HEALTHY"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo "⚠️ SOME ISSUES DETECTED"
    echo "🔍 Failed checks: $FAILED"
    echo "📋 Status: WARNING - Monitor closely"
    exit 1
else
    echo "🚨 CRITICAL ISSUES DETECTED" 
    echo "❌ Failed checks: $FAILED"
    echo "🆘 Status: CRITICAL - Immediate action required"
    exit 2
fi