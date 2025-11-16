# 📊 GRAFANA DASHBOARD IMPORT GUIDE

## 🚀 Importação Imediata (5 minutos)

### 1. Importar Dashboard Principal
```bash
# 1. Abrir Grafana
# URL: http://localhost:3000 (ou sua URL do Grafana)
# Login: admin / admin123 (ou conforme configurado no docker-compose)

# 2. Navegar para Import
# Menu lateral (+) → Import → Upload JSON file

# 3. Arquivo para importar:
# monitoring/grafana/dashboard-configs/excel-converter-enterprise.json
```

### 2. Configuração de Datasource
- **Nome**: Prometheus (deve corresponder à variável DS_PROMETHEUS)
- **URL**: `http://prometheus:9090` (se usando Docker)
- **Access**: Server (proxy)

### 3. Ajustar Variáveis
- **price_per_conversion**: Ajustar para R$ 10 (ou seu valor)
- **DS_PROMETHEUS**: Selecionar seu datasource Prometheus

## 📈 DASHBOARD FEATURES

### 🎯 SLO Section
- **Success Rate Gauge**: Verde >99.5%, Amarelo 99-99.5%, Vermelho <99%
- **P95 Latency**: Verde <3s, Amarelo 3-8s, Vermelho >8s
- **Queue Depth**: Verde <20, Amarelo 20-50, Vermelho >50
- **Throughput**: Target >50 conversions/minute

### 📊 Analytics Section
- **Conversions by Format**: CSV, JSON, XML, TSV, Parquet
- **Latency by Format**: P95 e P50 por tipo de output
- **Success vs Error Rate**: Tendências de qualidade

### 👥 Workers Section  
- **Queue Depth**: Monitoramento em tempo real
- **Active Workers**: Capacidade atual
- **Success/Error Distribution**: Saúde operacional

### 🖥️ Resources Section
- **Memory Usage**: % de utilização (threshold 85%)
- **File Size Trends**: Padrões de workload

### 💰 Business Section
- **Rows Processed Rate**: Throughput de dados
- **Estimated Revenue**: Baseado em conversões × preço
- **Total Conversions**: Contador acumulado

### 🚨 Security Section
- **Error Types Distribution**: Categorização de falhas
- **Security Blocks**: Arquivos bloqueados por nível de risco

## 🎨 CUSTOMIZAÇÕES RÁPIDAS

### Alterar Thresholds
```json
"thresholds": {
  "mode": "absolute",
  "steps": [
    {"color": "green", "value": null},
    {"color": "yellow", "value": 20},    # Seu threshold warning
    {"color": "red", "value": 50}        # Seu threshold critical
  ]
}
```

### Adicionar Alertas Visuais
```json
"annotations": {
  "list": [
    {
      "datasource": "${DS_PROMETHEUS}",
      "expr": "ALERTS{alertname=~\"ExcelConverter.*\",alertstate=\"firing\"}",
      "iconColor": "red",
      "name": "Active Alerts"
    }
  ]
}
```

### Personalizar Métricas de Negócio
```javascript
// Receita estimada personalizada
"expr": "sum(increase(excel_conversions_total{status=\"success\"}[24h])) * ${price_per_conversion:raw}"

// Conversões por cliente (se tiver label)
"expr": "sum(rate(excel_conversions_total{status=\"success\"}[5m])) by (customer_id)"
```

## 🔗 LINKS ÚTEIS NO DASHBOARD

### Sentry Integration
- **URL**: `https://sentry.io/organizations/company/projects/excel-converter/`
- **Purpose**: Error tracking direto do dashboard

### Runbooks Integration  
- **URL**: `https://wiki.company.com/excel-converter/runbooks/`
- **Purpose**: Acesso rápido aos procedimentos de incidente

### API Documentation
- **URL**: `http://excel-converter-api:8000/docs`
- **Purpose**: Swagger UI para testes

## ⚡ QUICK ACTIONS

### Verificar Saúde do Sistema
1. **Success Rate** > 99.5% ✅
2. **P95 Latency** < 3s (small files) ✅
3. **Queue Depth** < 20 jobs ✅
4. **Memory Usage** < 85% ✅
5. **Error Rate** < 1% ✅

### Troubleshooting Views
- **High Queue**: Ver Workers Section → verificar Active Workers
- **High Latency**: Ver Analytics → identificar formato problemático  
- **High Errors**: Ver Error Tracking → categorizar por tipo
- **High Memory**: Ver Resources → tendência de crescimento

## 📱 MOBILE/TABLET OPTIMIZATION

O dashboard é **responsivo** e funciona bem em:
- **Desktop**: Layout completo 24 colunas
- **Tablet**: Layout adaptativo 12 colunas  
- **Mobile**: Layout empilhado 6 colunas

### Painéis Essenciais Mobile
1. Success Rate Gauge
2. P95 Latency
3. Queue Depth  
4. Active Workers
5. Error Rate

## 🔄 REFRESH INTERVALS

### Recomendados por Uso
- **Real-time Monitoring**: 5-10 segundos
- **Operational Review**: 30 segundos - 1 minuto
- **Business Analysis**: 5-15 minutos
- **Historical Analysis**: 1 hora+

### Auto-refresh Settings
```javascript
"refresh": "30s",           // Padrão operacional
"refresh_intervals": [      // Opções disponíveis
  "5s", "10s", "30s", 
  "1m", "5m", "15m", "1h"
]
```

## 📊 MÉTRICA QUERIES PERSONALIZADAS

### Success Rate Avançado
```promql
# Success rate por format
sum(rate(excel_conversions_total{status="success"}[5m])) by (format) 
/ 
sum(rate(excel_conversions_total[5m])) by (format)

# Success rate por compression
sum(rate(excel_conversions_total{status="success"}[5m])) by (compression) 
/ 
sum(rate(excel_conversions_total[5m])) by (compression)
```

### Latency Percentiles
```promql
# P50, P95, P99 latency  
histogram_quantile(0.50, sum(rate(excel_conversion_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(excel_conversion_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(excel_conversion_duration_seconds_bucket[5m])) by (le))
```

### Business Metrics Avançadas
```promql
# Conversões por hora do dia
sum(rate(excel_conversions_total{status="success"}[1h])) * 3600

# Receita por formato
sum(increase(excel_conversions_total{status="success"}[24h])) by (format) * 10

# Eficiência de worker (conversões por worker ativo)
sum(rate(excel_conversions_total{status="success"}[5m])) / excel_workers_active
```

## 🎯 ALERTAS VISUAIS

### Configurar Annotation Queries
```json
{
  "datasource": "${DS_PROMETHEUS}",
  "enable": true,
  "expr": "excel_queue_size > 20",
  "iconColor": "orange", 
  "name": "Queue Backlog Warning",
  "titleFormat": "⚠️ Queue: {{value}} jobs"
}
```

### Threshold Lines
```json
{
  "colorMode": "critical",
  "fill": "below",
  "line": true,
  "op": "GTEQ",
  "value": 0.995,
  "yaxis": "left"
}
```

## 📚 PRÓXIMOS PASSOS

### Pós-Import Checklist
- [ ] Verificar todas as métricas estão populando
- [ ] Ajustar time range para 1h e verificar dados
- [ ] Configurar alertas visuais personalizados  
- [ ] Testar links para Sentry e Runbooks
- [ ] Configurar refresh automático
- [ ] Adicionar dashboard aos favoritos

### Dashboards Complementares
1. **API Performance** (endpoints individuais)
2. **Error Deep Dive** (análise detalhada de erros)  
3. **Capacity Planning** (trends de crescimento)
4. **Customer Analytics** (métricas por cliente)

---

**🔥 Dashboard Pronto para Produção!** 

Importe agora e tenha **visibilidade completa** do Excel Converter em 5 minutos!