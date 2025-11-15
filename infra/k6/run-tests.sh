#!/bin/bash

# Script de Execução dos Testes de Carga K6
# Configuração e execução automatizada dos cenários de teste

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 K6 Load Testing Suite - Conversor MPP XML${NC}"
echo -e "${BLUE}================================================${NC}"

# Criar diretório de resultados
mkdir -p "$RESULTS_DIR"

# Verificar se K6 está instalado
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ K6 não está instalado!${NC}"
    echo -e "${YELLOW}💡 Instale com: https://k6.io/docs/getting-started/installation/${NC}"
    exit 1
fi

# Verificar se API está online
echo -e "${BLUE}🔍 Verificando disponibilidade da API...${NC}"
if ! curl -s --head "$BASE_URL/health" | head -n 1 | grep -q "200 OK"; then
    echo -e "${RED}❌ API não está disponível em $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Execute 'npm start' ou 'docker-compose up' primeiro${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API disponível${NC}"

# Função para executar teste específico
run_test() {
    local test_name=$1
    local scenario=$2
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}"
    
    echo -e "\n${BLUE}📊 Executando: $test_name${NC}"
    echo -e "${BLUE}Cenário: $scenario${NC}"
    echo -e "${BLUE}Resultado: $output_file${NC}"
    
    # Executar K6 com cenário específico
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$output_file.json" \
        --out csv="$output_file.csv" \
        --scenario "$scenario" \
        --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
        load-test.js
        
    echo -e "${GREEN}✅ $test_name completado${NC}"
    
    # Extrair métricas principais
    extract_key_metrics "$output_file.json" "$test_name"
}

# Função para extrair métricas principais
extract_key_metrics() {
    local json_file=$1
    local test_name=$2
    
    echo -e "\n${YELLOW}📈 Métricas Principais - $test_name:${NC}"
    
    # Usar jq se disponível para parsing JSON
    if command -v jq &> /dev/null; then
        echo "🔸 HTTP Request Duration (P95): $(jq -r '.metrics.http_req_duration.values.p95' "$json_file" 2>/dev/null || echo 'N/A')ms"
        echo "🔸 HTTP Request Failed Rate: $(jq -r '.metrics.http_req_failed.values.rate' "$json_file" 2>/dev/null || echo 'N/A')"
        echo "🔸 Upload Duration (P95): $(jq -r '.metrics.upload_duration.values.p95' "$json_file" 2>/dev/null || echo 'N/A')ms"
        echo "🔸 Processing Duration (P95): $(jq -r '.metrics.processing_duration.values.p95' "$json_file" 2>/dev/null || echo 'N/A')ms"
        echo "🔸 Total Requests: $(jq -r '.metrics.http_reqs.values.count' "$json_file" 2>/dev/null || echo 'N/A')"
        echo "🔸 Virtual Users (Max): $(jq -r '.metrics.vus_max.values.max' "$json_file" 2>/dev/null || echo 'N/A')"
    else
        echo "💡 Instale 'jq' para análise detalhada das métricas"
        echo "📁 Arquivo JSON salvo em: $json_file"
    fi
}

# Menu de seleção de teste
echo -e "\n${YELLOW}🎯 Selecione o tipo de teste:${NC}"
echo "1. Teste Rápido (smoke test - 5 minutos)"
echo "2. Carga Normal (normal load - 20 minutos)"
echo "3. Teste de Pico (spike test - 10 minutos)"
echo "4. Teste de Stress (stress test - 20 minutos)"
echo "5. Suite Completa (todos os testes - 60 minutos)"
echo "6. Teste Customizado"

read -p "Digite sua escolha (1-6): " choice

case $choice in
    1)
        echo -e "${BLUE}🔬 Executando Smoke Test...${NC}"
        k6 run --vus 10 --duration 5m --env BASE_URL="$BASE_URL" load-test.js
        ;;
    2)
        echo -e "${BLUE}📈 Executando Teste de Carga Normal...${NC}"
        run_test "normal_load" "normal_load"
        ;;
    3)
        echo -e "${BLUE}⚡ Executando Teste de Pico...${NC}"
        run_test "spike_test" "spike_test"
        ;;
    4)
        echo -e "${BLUE}🔥 Executando Teste de Stress...${NC}"
        run_test "stress_test" "stress_test"
        ;;
    5)
        echo -e "${BLUE}🎯 Executando Suite Completa...${NC}"
        
        echo -e "\n${YELLOW}⏰ Iniciando em 10 segundos... (Ctrl+C para cancelar)${NC}"
        sleep 10
        
        run_test "normal_load" "normal_load"
        echo -e "\n${YELLOW}⏸️  Pausa de 2 minutos entre testes...${NC}"
        sleep 120
        
        run_test "spike_test" "spike_test"
        echo -e "\n${YELLOW}⏸️  Pausa de 2 minutos entre testes...${NC}"
        sleep 120
        
        run_test "stress_test" "stress_test"
        
        echo -e "\n${GREEN}🎉 Suite completa finalizada!${NC}"
        ;;
    6)
        echo -e "${YELLOW}🛠️  Teste Customizado${NC}"
        read -p "VUs máximos: " max_vus
        read -p "Duração (ex: 10m, 30s): " duration
        
        echo -e "${BLUE}🔧 Executando teste customizado...${NC}"
        k6 run --vus "$max_vus" --duration "$duration" --env BASE_URL="$BASE_URL" load-test.js
        ;;
    *)
        echo -e "${RED}❌ Opção inválida!${NC}"
        exit 1
        ;;
esac

# Gerar relatório final
echo -e "\n${BLUE}📊 Gerando Relatório Final...${NC}"

# Listar todos os arquivos de resultado
echo -e "\n${YELLOW}📁 Arquivos de Resultado Gerados:${NC}"
find "$RESULTS_DIR" -name "*${TIMESTAMP}*" -type f | while read file; do
    echo "  📄 $(basename "$file")"
done

# Instruções para análise
echo -e "\n${YELLOW}💡 Próximos Passos:${NC}"
echo "1. Analise os arquivos CSV/JSON em $RESULTS_DIR"
echo "2. Importe no Grafana para visualização detalhada"
echo "3. Compare com métricas do Prometheus durante os testes"
echo "4. Verifique logs de aplicação para correlação"

# Sugestões de otimização baseadas em falhas
echo -e "\n${YELLOW}🔧 Dicas de Otimização:${NC}"
echo "• Se P95 > 500ms: Considere cache ou otimização de DB"
echo "• Se erro > 5%: Verifique capacidade do worker"
echo "• Se timeout: Aumente recursos ou implemente circuit breaker"
echo "• Se memória alta: Configure garbage collection"

echo -e "\n${GREEN}✅ Teste de carga finalizado!${NC}"