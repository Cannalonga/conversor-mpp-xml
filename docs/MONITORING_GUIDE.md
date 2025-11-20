# 📊 Guia de Monitoramento - Conversor MPP para XML

## Visão Geral

O sistema de monitoramento oferece três endpoints principais para acompanhar a saúde, desempenho e métricas da aplicação em tempo real.

## 🏥 Endpoint de Health Check: `/health`

### Descrição
Retorna um diagnóstico completo do sistema, incluindo status de API, disco, memória, processo e logs.

### Exemplo de Requisição
```bash
curl http://localhost:3000/health
```

### Resposta (Status 200)
```json
{
    "status": "HEALTHY",
    "timestamp": "2025-11-18T19:24:50.123Z",
    "checks": {
        "api": {
            "status": "HEALTHY",
            "responseTime": "immediate",
            "endpoint": "/health"
        },
        "disk": {
            "status": "HEALTHY",
            "totalGB": "236.65",
            "usedGB": "186.83",
            "freeGB": "49.83",
            "usagePercent": "78.94"
        },
        "memory": {
            "status": "DEGRADED",
            "heapUsedMB": "9.38",
            "heapTotalMB": "10.38",
            "externalMB": "2.19",
            "heapUsagePercent": "90.41",
            "rss": "51.18"
        },
        "process": {
            "status": "HEALTHY",
            "pid": 76624,
            "uptimeSeconds": 18,
            "uptimeHours": "0.01",
            "cpuUserMs": 359000,
            "cpuSystemMs": 109000,
            "nodeVersion": "v25.2.0",
            "platform": "win32",
            "arch": "x64",
            "availableCores": 12
        },
        "logs": {
            "status": "HEALTHY",
            "totalSizeMB": "0.23",
            "files": {
                "app-2025-11-18.log": {
                    "sizeMB": "0.01",
                    "modifiedAt": "2025-11-18T19:22:49.559Z"
                }
            }
        }
    },
    "warnings": ["Memory usage WARNING: 90.41%"],
    "errors": [],
    "duration": 2
}
```

### Interpretação de Status

| Status | Significado | Ação |
|--------|-------------|------|
| `HEALTHY` | ✅ Todos os sistemas operando normalmente | Nenhuma ação necessária |
| `DEGRADED` | ⚠️ Alguns sistemas com problemas, mas ainda funcional | Monitorar, investigar alertas |
| `CRITICAL` | 🚨 Problemas sérios, pode impactar serviço | Ação imediata necessária |
| `OFFLINE` | ❌ Serviço indisponível | Reiniciar servidor |

### Limiares de Alerta

- **Disco**: WARNING > 80%, CRITICAL > 90%
- **Memória**: WARNING > 85%, CRITICAL > 95%
- **Arquivos de log**: WARNING > 500MB, CRITICAL > 1GB

---

## 📊 Endpoint de Métricas JSON: `/metrics/json`

### Descrição
Retorna métricas da aplicação em formato JSON, incluindo conversões, pagamentos, fila de jobs e recursos do sistema.

### Exemplo de Requisição
```bash
curl http://localhost:3000/metrics/json
```

### Resposta (Status 200)
```json
{
    "timestamp": "2025-11-18T19:24:46.884Z",
    "uptime": {
        "seconds": "19",
        "minutes": "0.31",
        "hours": "0.01"
    },
    "conversions": {
        "total": 150,
        "successful": 145,
        "failed": 5,
        "successRate": "96.67%",
        "avgDurationSeconds": "2.341"
    },
    "payments": {
        "total": 145,
        "successful": 142,
        "failed": 3,
        "totalRevenueR$": "1420.00"
    },
    "queue": {
        "total": 200,
        "completed": 195,
        "failed": 5,
        "retried": 8
    },
    "memory": {
        "rss_mb": "51.02",
        "heap_used_mb": "9.40",
        "heap_total_mb": "10.13"
    },
    "disk": {
        "used_gb": "186.83",
        "free_gb": "49.83",
        "total_gb": "236.65"
    }
}
```

### Métricas Disponíveis

#### Conversões
- `conversions_total`: Total de conversões tentadas
- `conversions_successful`: Conversões concluídas com sucesso
- `conversions_failed`: Conversões que falharam
- `conversions_success_rate`: Taxa de sucesso em percentual
- `conversion_duration_avg`: Duração média em segundos

#### Pagamentos
- `payments_total`: Total de pagamentos processados
- `payments_successful`: Pagamentos confirmados
- `payments_failed`: Pagamentos falhados
- `totalRevenueR$`: Receita total em reais (R$)

#### Fila de Jobs
- `queue_jobs_total`: Total de jobs processados
- `queue_jobs_completed`: Jobs completados com sucesso
- `queue_jobs_failed`: Jobs que falharam
- `queue_jobs_retried`: Jobs que foram retentados

#### Recursos
- `memory.rss_mb`: Memória RSS do processo em MB
- `memory.heap_used_mb`: Heap JavaScript usado em MB
- `memory.heap_total_mb`: Heap JavaScript total em MB
- `disk.used_gb`: Espaço em disco usado em GB
- `disk.free_gb`: Espaço em disco livre em GB

---

## 📈 Endpoint de Métricas Prometheus: `/metrics`

### Descrição
Retorna métricas em formato Prometheus TEXT (0.0.4). Ideal para integração com Prometheus, Grafana e outras ferramentas de monitoramento.

### Exemplo de Requisição
```bash
curl http://localhost:3000/metrics
```

### Resposta (Status 200, Content-Type: text/plain)
```
# HELP conversions_total Total file conversions attempted
# TYPE conversions_total counter
conversions_total 150

# HELP conversions_successful Total successful conversions
# TYPE conversions_successful counter
conversions_successful 145

# HELP conversion_success_rate Conversion success rate percentage
# TYPE conversion_success_rate gauge
conversion_success_rate 96.67

# HELP uptime_seconds Application uptime in seconds
# TYPE uptime_seconds gauge
uptime_seconds 3600

# HELP process_memory_rss_bytes Process RSS memory in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes 53516288

# HELP process_heap_used_bytes Process heap used in bytes
# TYPE process_heap_used_bytes gauge
process_heap_used_bytes 9861120

# HELP disk_used_bytes Disk used in bytes
# TYPE disk_used_bytes gauge
disk_used_bytes 201326592000

# ... mais métricas ...
```

### Integração com Prometheus

#### Configuração do `prometheus.yml`
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mpp-converter'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Integração com Grafana
1. Adicione Prometheus como data source
2. Crie dashboard com queries como:
   ```
   conversions_successful (total de conversões bem-sucedidas)
   conversion_success_rate (taxa de sucesso)
   uptime_seconds (tempo ativo)
   process_memory_rss_bytes (memória usada)
   ```

---

## 📋 Endpoint de Resumo: `/metrics/summary`

### Descrição
Retorna um resumo compacto das métricas principais, ideal para dashboards rápidos.

### Exemplo de Requisição
```bash
curl http://localhost:3000/metrics/summary
```

### Resposta (Status 200)
```json
{
    "status": "ok",
    "timestamp": "2025-11-18T19:24:55.076Z",
    "summary": {
        "uptime_hours": "0.01",
        "conversions_successful": 145,
        "conversions_success_rate": "96.67%",
        "payments_total": "R$ 1420.00",
        "queue_jobs_completed": 195,
        "memory_usage_mb": "51.54"
    }
}
```

---

## 🔍 Monitoramento em Tempo Real

### Script de Monitoramento (PowerShell)
```powershell
# Verificar health a cada 30 segundos
while ($true) {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health"
    $time = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$time] Status: $($health.status) | Disco: $($health.checks.disk.usagePercent)% | Memória: $($health.checks.memory.heapUsagePercent)%"
    
    if ($health.warnings.Count -gt 0) {
        Write-Host "⚠️  Avisos: $($health.warnings -join ', ')" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 30
}
```

### Script de Monitoramento (Bash/Linux)
```bash
#!/bin/bash

while true; do
    TIME=$(date '+%H:%M:%S')
    HEALTH=$(curl -s http://localhost:3000/health)
    STATUS=$(echo $HEALTH | jq -r '.status')
    DISK=$(echo $HEALTH | jq -r '.checks.disk.usagePercent')
    MEMORY=$(echo $HEALTH | jq -r '.checks.memory.heapUsagePercent')
    
    echo "[$TIME] Status: $STATUS | Disco: ${DISK}% | Memória: ${MEMORY}%"
    
    sleep 30
done
```

---

## 🚨 Alertas Recomendados

### Por Email/Slack (via Prometheus Alertmanager)

```yaml
groups:
- name: mpp-converter
  rules:
  # Alerta de memória crítica
  - alert: HighMemoryUsage
    expr: process_memory_rss_bytes > 100000000  # > 100MB
    for: 5m
    annotations:
      summary: "Uso de memória crítico"
      description: "Memória RSS acima de 100MB por 5 minutos"

  # Alerta de disco cheio
  - alert: HighDiskUsage
    expr: disk_used_bytes / disk_total_bytes > 0.9
    for: 5m
    annotations:
      summary: "Disco com pouco espaço"
      description: "Mais de 90% do disco usado"

  # Alerta de taxa de falha alta
  - alert: HighConversionFailureRate
    expr: (conversions_failed / conversions_total) > 0.1
    for: 10m
    annotations:
      summary: "Taxa de falha de conversão acima de 10%"
      description: "Mais de 10% das conversões falhando"

  # Alerta de downtime
  - alert: ServiceDown
    expr: up{job="mpp-converter"} == 0
    for: 1m
    annotations:
      summary: "Serviço MPP Converter offline"
      description: "O serviço está indisponível"
```

---

## 📝 Checklist de Monitoramento

- ✅ Health check retorna status "HEALTHY"
- ✅ Disco com menos de 80% de uso
- ✅ Memória heap abaixo de 85%
- ✅ Taxa de sucesso de conversão acima de 95%
- ✅ Nenhum alerta ativo no Prometheus
- ✅ Uptime do servidor acima de 99%
- ✅ Logs sendo rotacionados corretamente
- ✅ Fila de jobs processando normalmente

---

## 🔧 Troubleshooting

### "Memory usage WARNING: 90%+"
**Solução**: Reinicie o servidor ou aumente o heap disponível via `NODE_OPTIONS="--max-old-space-size=512"`

### "Disk usage CRITICAL: >90%"
**Solução**: Limpe arquivos antigos em `/uploads/expired` ou aumente espaço em disco

### "Health check status is OFFLINE"
**Solução**: Verifique se o servidor está rodando com `Get-Process node` (Windows) ou `ps aux | grep node` (Linux)

### Logs crescendo muito rápido
**Solução**: Os logs rodam automaticamente a cada 50MB. Verifique se há muitos erros em `logs/app-*.log`

---

## 📚 Referências

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
