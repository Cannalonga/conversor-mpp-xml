#!/usr/bin/env bash

# Conversor MPP→XML - Health Check Script
# Arquivo: deploy-scripts/healthcheck.sh
# Versão: 1.0
# Uso: ./healthcheck.sh [ENVIRONMENT] [--detailed]

set -euo pipefail

# Configurações
ENVIRONMENT=${1:-production}
DETAILED=${2:-""}
TIMEOUT=30
MAX_RETRIES=5

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs por ambiente
case "$ENVIRONMENT" in
    "production"|"prod")
        BASE_URL="https://conversormpp.com"
        ;;
    "staging"|"stage")
        BASE_URL="https://staging.conversormpp.com"
        ;;
    "local"|"localhost")
        BASE_URL="http://localhost:8080"
        ;;
    *)
        echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
        echo "Valid options: production, staging, local"
        exit 1
        ;;
esac

# Logging
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

# Função para fazer requisições com retry
http_check() {
    local url=$1
    local expected_code=${2:-200}
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo "000")
        
        if [[ "$response_code" == "$expected_code" ]]; then
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            sleep 2
        fi
    done
    
    echo "$response_code"
    return 1
}

# Teste básico de conectividade
test_basic_connectivity() {
    log "🔗 Testing basic connectivity to $BASE_URL"
    
    if http_check "$BASE_URL" 200 >/dev/null; then
        success "Basic connectivity test passed"
        return 0
    else
        local code=$(http_check "$BASE_URL" 200)
        error "Basic connectivity failed (HTTP $code)"
        return 1
    fi
}

# Teste do endpoint de health
test_health_endpoint() {
    log "🏥 Testing health endpoint..."
    
    local health_url="$BASE_URL/health"
    local response
    
    if response=$(curl -s --connect-timeout $TIMEOUT "$health_url" 2>/dev/null); then
        if echo "$response" | jq -e '.status == "ok"' >/dev/null 2>&1; then
            success "Health endpoint returned OK status"
            
            if [[ "$DETAILED" == "--detailed" ]]; then
                echo -e "${BLUE}Health response:${NC}"
                echo "$response" | jq .
            fi
            return 0
        else
            error "Health endpoint returned invalid status"
            echo "Response: $response"
            return 1
        fi
    else
        error "Health endpoint unreachable"
        return 1
    fi
}

# Teste de endpoints críticos
test_critical_endpoints() {
    log "🎯 Testing critical endpoints..."
    
    local endpoints=(
        "/ (main page)"
        "/upload (upload endpoint)"
        "/css/style.css (static assets)"
    )
    
    local failed=0
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d' ' -f1)
        local description=$(echo "$endpoint_info" | sed 's/^[^ ]* //')
        
        local full_url="$BASE_URL$endpoint"
        
        if [[ "$endpoint" == "/upload" ]]; then
            # Upload endpoint deve retornar 405 (Method Not Allowed) para GET
            if http_check "$full_url" 405 >/dev/null; then
                success "$description accessible"
            else
                warn "$description test failed"
                failed=$((failed + 1))
            fi
        else
            if http_check "$full_url" 200 >/dev/null; then
                success "$description accessible"
            else
                warn "$description test failed"
                failed=$((failed + 1))
            fi
        fi
    done
    
    if [ $failed -eq 0 ]; then
        success "All critical endpoints accessible"
        return 0
    else
        warn "$failed critical endpoint(s) failed"
        return 1
    fi
}

# Teste de performance básica
test_performance() {
    log "⚡ Testing response performance..."
    
    local url="$BASE_URL/health"
    local total_time
    
    total_time=$(curl -s -w "%{time_total}" -o /dev/null "$url" 2>/dev/null || echo "999")
    
    if (( $(echo "$total_time < 5.0" | bc -l 2>/dev/null || echo "0") )); then
        success "Response time: ${total_time}s (acceptable)"
        return 0
    else
        warn "Response time: ${total_time}s (slow)"
        return 1
    fi
}

# Teste de SSL/TLS (apenas para HTTPS)
test_ssl() {
    if [[ "$BASE_URL" == https* ]]; then
        log "🔒 Testing SSL/TLS configuration..."
        
        local domain=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|/.*||')
        
        if echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | grep -q "Verify return code: 0"; then
            success "SSL certificate valid"
            return 0
        else
            warn "SSL certificate validation failed"
            return 1
        fi
    else
        log "🔓 Skipping SSL test (HTTP environment)"
        return 0
    fi
}

# Teste de containers Docker (apenas local)
test_docker_containers() {
    if [[ "$ENVIRONMENT" == "local" || "$ENVIRONMENT" == "localhost" ]]; then
        log "🐳 Testing Docker containers..."
        
        if command -v docker >/dev/null 2>&1; then
            local compose_file="docker-compose.${ENVIRONMENT}.yml"
            if [[ "$ENVIRONMENT" == "local" || "$ENVIRONMENT" == "localhost" ]]; then
                compose_file="docker-compose.yml"
            fi
            
            if [[ -f "$compose_file" ]]; then
                local running_containers=$(docker-compose -f "$compose_file" ps -q | wc -l)
                local healthy_containers=$(docker-compose -f "$compose_file" ps | grep -c "Up" || echo "0")
                
                if [[ "$running_containers" -gt 0 && "$healthy_containers" -gt 0 ]]; then
                    success "Docker containers running ($healthy_containers up)"
                    return 0
                else
                    warn "Docker containers not running properly"
                    return 1
                fi
            else
                warn "Docker compose file not found: $compose_file"
                return 1
            fi
        else
            warn "Docker not available for container check"
            return 1
        fi
    else
        log "🐳 Skipping Docker test (remote environment)"
        return 0
    fi
}

# Teste de banco de dados (via API)
test_database_connectivity() {
    log "🗄️ Testing database connectivity..."
    
    # Teste indireto via endpoint que usa banco
    local health_url="$BASE_URL/health"
    local response
    
    if response=$(curl -s --connect-timeout $TIMEOUT "$health_url" 2>/dev/null); then
        if echo "$response" | jq -e '.database == "connected"' >/dev/null 2>&1; then
            success "Database connectivity OK"
            return 0
        elif echo "$response" | jq -e '.status == "ok"' >/dev/null 2>&1; then
            # Se não há campo database, assumir OK se health pass
            success "Database connectivity assumed OK"
            return 0
        else
            warn "Database connectivity unclear"
            return 1
        fi
    else
        warn "Cannot test database connectivity (health endpoint failed)"
        return 1
    fi
}

# Relatório detalhado
detailed_report() {
    if [[ "$DETAILED" == "--detailed" ]]; then
        log "📊 Generating detailed report..."
        
        echo -e "\n${BLUE}=== DETAILED HEALTH REPORT ===${NC}"
        echo "Environment: $ENVIRONMENT"
        echo "Base URL: $BASE_URL"
        echo "Timestamp: $(date -Iseconds)"
        echo "Timeout: ${TIMEOUT}s"
        echo "Max retries: $MAX_RETRIES"
        
        # Response headers
        echo -e "\n${BLUE}Response Headers:${NC}"
        curl -s -I "$BASE_URL/health" 2>/dev/null | head -10 || echo "Could not fetch headers"
        
        # DNS resolution
        echo -e "\n${BLUE}DNS Resolution:${NC}"
        local domain=$(echo "$BASE_URL" | sed 's|https\?://||' | sed 's|/.*||')
        nslookup "$domain" 2>/dev/null | head -10 || echo "Could not resolve DNS"
        
        # Timing breakdown
        echo -e "\n${BLUE}Timing Breakdown:${NC}"
        curl -s -w "DNS lookup: %{time_namelookup}s\nConnect: %{time_connect}s\nSSL handshake: %{time_appconnect}s\nRedirect: %{time_redirect}s\nTotal: %{time_total}s\n" -o /dev/null "$BASE_URL/health" 2>/dev/null || echo "Could not get timing data"
    fi
}

# Resumo final
summary_report() {
    local total_tests=7
    local passed_tests=$1
    local failed_tests=$((total_tests - passed_tests))
    local success_rate=$((passed_tests * 100 / total_tests))
    
    echo -e "\n${BLUE}=== HEALTH CHECK SUMMARY ===${NC}"
    echo -e "Environment: ${BLUE}$ENVIRONMENT${NC}"
    echo -e "URL: ${BLUE}$BASE_URL${NC}"
    echo -e "Tests passed: ${GREEN}$passed_tests${NC}/${total_tests}"
    echo -e "Success rate: ${GREEN}$success_rate%${NC}"
    
    if [[ $failed_tests -eq 0 ]]; then
        echo -e "Overall status: ${GREEN}✅ HEALTHY${NC}"
        return 0
    elif [[ $failed_tests -le 2 ]]; then
        echo -e "Overall status: ${YELLOW}⚠️ WARNING${NC}"
        return 1
    else
        echo -e "Overall status: ${RED}❌ UNHEALTHY${NC}"
        return 2
    fi
}

# Função principal
main() {
    local passed_tests=0
    local start_time=$(date +%s)
    
    echo -e "${BLUE}🏥 Health Check for $ENVIRONMENT environment${NC}"
    echo -e "Target: $BASE_URL"
    echo -e "Started at: $(date)"
    echo ""
    
    # Executar testes
    test_basic_connectivity && passed_tests=$((passed_tests + 1))
    test_health_endpoint && passed_tests=$((passed_tests + 1))
    test_critical_endpoints && passed_tests=$((passed_tests + 1))
    test_performance && passed_tests=$((passed_tests + 1))
    test_ssl && passed_tests=$((passed_tests + 1))
    test_docker_containers && passed_tests=$((passed_tests + 1))
    test_database_connectivity && passed_tests=$((passed_tests + 1))
    
    # Relatórios
    detailed_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo -e "\nCompleted in: ${duration}s"
    summary_report $passed_tests
}

# Tratamento de sinais
trap 'echo -e "\n${YELLOW}Health check interrupted${NC}"; exit 130' INT TERM

# Executar se script for chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi