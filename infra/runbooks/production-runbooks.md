# 📋 RUNBOOKS - Conversor MPP → XML Production
# Guias de resolução de problemas para cada alerta crítico

## 🚨 BUSINESS ALERTS

### 📉 RevenueDropAlert

**Descrição:** Receita caiu significativamente em relação ao mesmo período de ontem.

**Impacto:** Alto - Afeta diretamente o faturamento

**Passos de investigação:**
1. Verificar se há problemas no gateway de pagamento (Mercado Pago)
   ```bash
   curl -H "Authorization: Bearer $MP_ACCESS_TOKEN" https://api.mercadopago.com/v1/payments/search
   ```

2. Verificar status da aplicação
   ```bash
   kubectl get pods -n production
   docker-compose ps  # ou equivalente
   ```

3. Verificar logs de erro nos últimos 2h
   ```bash
   kubectl logs -n production deployment/conversor-app --since=2h | grep ERROR
   ```

4. Verificar métricas de conversão no Grafana
   - Acessar dashboard "Business Metrics"
   - Comparar uploads vs payments
   - Verificar tempo médio de conversão

**Ações de mitigação:**
- Se problema no MP: Contatar suporte Mercado Pago
- Se problema na aplicação: Reiniciar pods/containers
- Se alto volume de erro: Investigar logs e fazer rollback se necessário

**Contatos de escalação:**
- Tech Lead: +55 11 99999-9999
- Business Owner: business@conversor.com
- Mercado Pago Suporte: suporte@mercadopago.com

---

### 💳 NoPaymentsAlert

**Descrição:** Nenhum pagamento foi recebido em 2 horas durante horário comercial.

**Impacto:** Crítico - Possível falha total no sistema de pagamentos

**Passos de investigação:**
1. Verificar status do Mercado Pago
   ```bash
   # Status público da API
   curl https://api.mercadopago.com/status
   ```

2. Verificar webhooks
   ```bash
   # Verificar últimos webhooks recebidos
   grep "webhook" /var/log/conversor/app.log | tail -20
   ```

3. Testar pagamento manual
   - Acessar ambiente de staging
   - Fazer teste de pagamento completo

**Ações imediatas:**
1. Verificar configuração do webhook no painel do MP
2. Reiniciar serviços de pagamento
3. Se necessário, ativar modo de emergência (processar pagamentos offline)

---

## ⚙️ TECHNICAL ALERTS

### 🚨 HighErrorRateAlert

**Descrição:** Taxa de erro HTTP 5xx acima de 5%

**Impacto:** Alto - Usuários experimentando falhas

**Investigação:**
1. Identificar endpoints com mais erros
   ```bash
   # Prometheus query
   sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
   ```

2. Verificar logs detalhados
   ```bash
   kubectl logs -n production deployment/conversor-app --since=10m | grep "500\|502\|503\|504"
   ```

3. Verificar recursos do sistema
   ```bash
   kubectl top nodes
   kubectl top pods -n production
   ```

**Ações de correção:**
1. Se problema de memória: Aumentar recursos ou reiniciar pods
2. Se problema de banco de dados: Verificar conexões PostgreSQL/Redis
3. Se problema de código: Preparar rollback

**Rollback de emergência:**
```bash
# Kubernetes
kubectl rollout undo deployment/conversor-app -n production

# Docker Compose
docker-compose down
git checkout <last-stable-commit>
docker-compose up -d
```

---

### 🔴 ApplicationDownAlert

**Descrição:** Aplicação não está respondendo aos health checks

**Impacto:** Crítico - Serviço completamente indisponível

**Ações imediatas (tempo limite: 5 minutos):**

1. **Verificar status dos containers**
   ```bash
   # Kubernetes
   kubectl get pods -n production
   kubectl describe pod <pod-name> -n production
   
   # Docker
   docker ps
   docker logs <container-id>
   ```

2. **Reiniciar aplicação**
   ```bash
   # Kubernetes
   kubectl rollout restart deployment/conversor-app -n production
   
   # Docker Compose
   docker-compose restart conversor-app
   ```

3. **Se reinício falhar, fazer rollback**
   ```bash
   kubectl rollout undo deployment/conversor-app -n production
   ```

4. **Verificar dependências**
   ```bash
   # PostgreSQL
   pg_isready -h localhost -p 5432
   
   # Redis
   redis-cli ping
   
   # MinIO
   curl -f http://localhost:9000/minio/health/live
   ```

---

### 📈 QueueBacklogAlert

**Descrição:** Fila de conversão com mais de 100 jobs pendentes

**Impacto:** Médio - Usuários experimentando lentidão na conversão

**Investigação:**
1. Verificar workers ativos
   ```bash
   kubectl get pods -l app=conversor-worker -n production
   ```

2. Verificar performance dos workers
   ```bash
   # Prometheus query
   rate(conversor_conversions_total[5m])
   ```

3. Verificar logs dos workers
   ```bash
   kubectl logs -l app=conversor-worker -n production --since=30m
   ```

**Ações de correção:**

1. **Escalar workers horizontalmente**
   ```bash
   kubectl scale deployment conversor-worker --replicas=8 -n production
   ```

2. **Verificar se workers estão travados**
   ```bash
   # Se workers não estão processando, reiniciar
   kubectl rollout restart deployment/conversor-worker -n production
   ```

3. **Limpar jobs corrompidos**
   ```bash
   # Conectar ao Redis
   redis-cli
   > LLEN conversion:queue
   > LRANGE conversion:queue 0 10  # Verificar primeiros jobs
   # Se necessário, limpar jobs corrompidos manualmente
   ```

---

### 💾 DiskSpaceLowAlert

**Descrição:** Espaço em disco abaixo de 15%

**Impacto:** Crítico - Pode causar falha da aplicação

**Ações imediatas:**

1. **Verificar uso do disco**
   ```bash
   df -h
   du -sh /var/log/* | sort -hr
   du -sh /tmp/* | sort -hr
   ```

2. **Limpar logs antigos**
   ```bash
   # Logs da aplicação (manter últimos 7 dias)
   find /var/log/conversor -name "*.log" -mtime +7 -delete
   
   # Logs do sistema
   journalctl --vacuum-time=7d
   
   # Logs do Docker
   docker system prune -f
   ```

3. **Limpar arquivos temporários**
   ```bash
   # Arquivos de upload expirados
   find /tmp/uploads -mtime +1 -delete
   
   # Arquivos convertidos antigos
   find /tmp/converted -mtime +7 -delete
   ```

4. **Emergência: Mover dados para storage externo**
   ```bash
   # Backup de logs críticos para S3/MinIO
   aws s3 cp /var/log/conversor s3://backup-bucket/logs/$(date +%Y%m%d) --recursive
   ```

---

## 🔐 SECURITY ALERTS

### 🔐 HighFailedAuthAttemptsAlert

**Descrição:** Muitas tentativas de autenticação falharam

**Impacto:** Médio - Possível ataque de força bruta

**Investigação:**
1. Identificar IPs suspeitos
   ```bash
   grep "auth failure" /var/log/conversor/app.log | awk '{print $X}' | sort | uniq -c | sort -nr
   ```

2. Verificar padrões de ataque
   ```bash
   # Analisar tentativas por minuto
   grep "auth failure" /var/log/conversor/app.log | grep $(date +%Y-%m-%d) | cut -d' ' -f2 | cut -d: -f1-2 | sort | uniq -c
   ```

**Ações de mitigação:**
1. **Bloquear IPs suspeitos temporariamente**
   ```bash
   # Via iptables
   iptables -A INPUT -s <IP_SUSPEITO> -j DROP
   
   # Via fail2ban (se configurado)
   fail2ban-client set conversor-auth banip <IP_SUSPEITO>
   ```

2. **Aumentar rate limiting temporariamente**
   ```bash
   # Editar configuração e reiniciar
   # Reduzir limite de tentativas por minuto
   ```

---

## 💳 FINANCIAL ALERTS

### 💳 PaymentGatewayIssueAlert

**Descrição:** Taxa de sucesso de pagamentos abaixo de 80%

**Impacto:** Alto - Perda de receita

**Investigação:**
1. Verificar status do Mercado Pago
   - Acessar https://status.mercadopago.com.br
   - Verificar se há incidentes reportados

2. Testar pagamento de ponta a ponta
   ```bash
   # Script de teste automatizado
   node scripts/test-payment-flow.js
   ```

3. Verificar configuração de webhooks
   ```bash
   curl -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
   https://api.mercadopago.com/v1/webhooks
   ```

**Ações de correção:**
1. Se problema no MP: Aguardar resolução ou usar método alternativo
2. Se problema interno: Verificar logs de integração
3. Comunicar usuários sobre instabilidade temporária

---

## 📞 CONTATOS DE EMERGÊNCIA

**Tech Lead / DevOps:**
- Nome: [Seu Nome]
- WhatsApp: +55 11 99999-9999
- Email: tech@conversor.com

**Business Owner:**
- Nome: [Nome do Responsável]
- WhatsApp: +55 11 88888-8888
- Email: business@conversor.com

**Suporte Mercado Pago:**
- Email: developers@mercadopago.com
- Portal: https://developers.mercadopago.com.br

**Infraestrutura (AWS/GCP):**
- Console: [Link do Console]
- Suporte: [Plano de suporte ativo]

---

## 🔧 COMANDOS ÚTEIS

### Kubernetes

```bash
# Status geral
kubectl get pods,svc,ingress -n production

# Logs em tempo real
kubectl logs -f deployment/conversor-app -n production

# Executar shell em pod
kubectl exec -it <pod-name> -n production -- /bin/bash

# Escalar deployment
kubectl scale deployment conversor-app --replicas=5 -n production

# Rollback
kubectl rollout undo deployment/conversor-app -n production
```

### Docker Compose

```bash
# Status
docker-compose ps

# Logs
docker-compose logs -f conversor-app

# Reiniciar serviço específico
docker-compose restart conversor-app

# Rebuild e restart
docker-compose up --build -d conversor-app
```

### Banco de Dados

```bash
# PostgreSQL
psql -h localhost -U conversor_user -d conversor_production

# Verificar conexões ativas
SELECT count(*) FROM pg_stat_activity;

# Verificar queries lentas
SELECT query, query_start, state FROM pg_stat_activity WHERE state != 'idle';

# Redis
redis-cli info
redis-cli monitor
```

### Métricas

```bash
# Prometheus queries úteis
# Taxa de erro atual
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Latência P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Jobs na fila
conversor_queue_length{queue="conversion"}

# Uptime da aplicação
up{job="conversor-app"}
```

---

## 📋 CHECKLIST DE INCIDENT RESPONSE

### Durante o Incidente

- [ ] Confirmar o alerta e impacto
- [ ] Comunicar no canal #incidents do Slack
- [ ] Executar steps de investigação do runbook
- [ ] Aplicar ações de mitigação
- [ ] Monitorar métricas para confirma resolução
- [ ] Comunicar resolução

### Pós-Incidente

- [ ] Documentar root cause
- [ ] Identificar melhorias de monitoramento
- [ ] Atualizar runbooks se necessário
- [ ] Agendar post-mortem se incidente crítico
- [ ] Implementar ações preventivas

---

**Última atualização:** $(date)
**Versão:** 1.0
**Responsável:** Tech Team