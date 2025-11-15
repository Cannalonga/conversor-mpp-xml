# Conversor MPP-XML - Scripts de Automação

Este diretório contém scripts de automação para deploy, monitoramento e verificações de saúde do sistema.

## 🏥 Health Check Scripts

### 1. Health Check Completo (`health_check.py`)
Script Python completo para verificação detalhada de todos os componentes:

```bash
# Verificação completa produção
python scripts/health_check.py --env prod --format table

# Verificação staging com output JSON
python scripts/health_check.py --env staging --format json

# Salvar relatório em arquivo
python scripts/health_check.py --env prod --save health_report.txt
```

**Componentes verificados:**
- ✅ App health endpoint
- ✅ Workers ativos e taxa de erro
- ✅ Status da fila Redis
- ✅ Reconciliação de pagamentos
- ✅ Conexão banco de dados
- ✅ Storage MinIO
- ✅ Alertas ativos Alertmanager

**Exit codes:**
- `0` = OK (todos sistemas operacionais)
- `1` = WARNING (alguns problemas)
- `2` = ERROR (problemas significativos)
- `3` = CRITICAL (ação imediata necessária)

### 2. Quick Check (`quick_check.sh`)
Script Bash rápido para verificação básica:

```bash
# Check rápido produção
./scripts/quick_check.sh prod

# Check staging
./scripts/quick_check.sh staging
```

**Verificações básicas:**
- Health endpoint (< 2s response time)
- Queue length (< 50 items)
- Workers ativos
- Database/Storage/Redis connectivity
- Alertas ativos

## 🚀 Launch Day Automation (`launch_day.py`)

Script completo de automação para dia de lançamento:

```bash
# Automação completa produção
python scripts/launch_day.py --env prod

# Automação staging sem testes funcionais
python scripts/launch_day.py --env staging --skip-tests
```

**Executa sequencialmente:**
1. Health checks completos
2. Verificação CI/CD GitHub Actions
3. Testes de funcionalidade core
4. Verificação monitoramento (Prometheus/Grafana)
5. Validação secrets e configurações
6. Checklist final de lançamento
7. Geração relatório completo

**Output:** Relatório detalhado salvo em `launch_report_{env}_{timestamp}.txt`

## 📋 Comandos de Uso Prático

### Verificação Pré-Deploy
```bash
# Antes de qualquer deploy
python scripts/health_check.py --env staging
./scripts/quick_check.sh staging

# Se tudo OK, deploy staging
gh workflow run deploy-staging.yml
```

### Verificação Pós-Deploy
```bash
# Após deploy, aguardar 2-3 min e verificar
python scripts/health_check.py --env staging --save post_deploy_staging.txt

# Se OK, repetir para produção
python scripts/health_check.py --env prod --save post_deploy_prod.txt
```

### Launch Day Complete
```bash
# Execução completa dia do lançamento
python scripts/launch_day.py --env prod

# Monitoramento contínuo (loop a cada 5 min)
while true; do
    ./scripts/quick_check.sh prod
    sleep 300
done
```

### Emergency Diagnostics
```bash
# Diagnóstico rápido em emergência
./scripts/quick_check.sh prod

# Detalhes completos para troubleshooting
python scripts/health_check.py --env prod --format json | jq .
```

## 🛠️ Setup Requirements

### Python Dependencies
```bash
pip install requests python-dotenv
```

### System Dependencies
```bash
# GitHub CLI (para verificações CI/CD)
winget install GitHub.cli

# jq (para parsing JSON)
winget install jqlang.jq

# curl (para health checks)
# Já incluído no Windows 10+
```

### Environment Variables (opcional)
```bash
# Para autenticação Grafana/Prometheus (se protegido)
export GRAFANA_API_KEY="eyJ..."
export PROMETHEUS_USER="admin"
export PROMETHEUS_PASS="password"
```

## 📊 Integração com CI/CD

### GitHub Actions
Adicione step de health check nos workflows:

```yaml
- name: Post-deploy health check
  run: |
    python scripts/health_check.py --env staging --format json > health_check.json
    cat health_check.json
```

### Cron Jobs para Monitoramento
```bash
# Adicionar ao crontab para checks regulares
# Cada 5 minutos
*/5 * * * * cd /path/to/project && ./scripts/quick_check.sh prod >> /var/log/health_check.log 2>&1

# Relatório diário completo
0 6 * * * cd /path/to/project && python scripts/health_check.py --env prod --save daily_health_$(date +\%Y\%m\%d).txt
```

## 🚨 Troubleshooting

### Script não executa
```bash
# Verificar permissões
chmod +x scripts/*.sh

# Verificar Python path
which python3
python3 --version
```

### Timeout em health checks
```bash
# Verificar conectividade
curl -v https://conversormpp.com/health

# Verificar DNS
nslookup conversormpp.com
```

### GitHub CLI issues
```bash
# Login GitHub CLI
gh auth login

# Verificar acesso repo
gh repo view Cannalonga/conversor-mpp-xml
```

## 📈 Interpretação de Resultados

### Status OK
- Todos sistemas operacionais
- Continuar operação normal
- Monitoramento de rotina

### Status WARNING
- Alguns componentes com problemas menores
- Monitorar mais frequentemente
- Preparar para intervenção se necessário

### Status ERROR/CRITICAL
- Problemas significativos identificados
- Investigação imediata necessária
- Considerar rollback se em deploy
- Executar runbooks de emergência

## 🔄 Automation Workflows

### Deploy Workflow
```bash
1. python scripts/health_check.py --env staging
2. gh workflow run deploy-staging.yml
3. sleep 120
4. python scripts/health_check.py --env staging
5. if [OK] then gh workflow run deploy-production.yml
```

### Monitoring Loop
```bash
while true; do
    ./scripts/quick_check.sh prod
    if [CRITICAL]; then 
        # Send alert
        # Run emergency procedures
    fi
    sleep 300
done
```