# 📋 MASTER COMMANDS REFERENCE - v0.1.1-security
**Status**: Ready to Execute  
**Date**: December 2, 2025  

---

## ⚡ QUICK START (Copy & Paste Everything)

### Se você só tem 5 minutos:
```bash
# Apenas verifique se está tudo pronto
chmod +x ./deploy-master.sh
./deploy-master.sh check

# Resultado esperado: ✓ All checks passed
```

### Se você tem 30 minutos (Staging):
```bash
# Deploy em staging
chmod +x ./deploy-master.sh
./deploy-master.sh staging

# Resultado esperado: ✓ Staging deployment complete
# Próximo: Monitore 24-48 horas
```

### Se você tem 2 horas (Production):
```bash
# Deploy em produção (APÓS staging OK por 24-48h)
chmod +x ./deploy-master.sh
./deploy-master.sh production

# Resultado esperado: ✓ Production deployment complete
```

---

## 🔧 DETAILED COMMANDS (By Phase)

### PHASE A: Sincronizar Branch Remoto

```bash
# Garantir branch local pronto
cd /srv/cannaconverter

git checkout fix/rate-limit-20251202
git pull origin fix/rate-limit-20251202 || true
git push -u origin fix/rate-limit-20251202

# Esperado: Branch sincronizado com origin
```

### PHASE B: Criar / Abrir PR (GitHub CLI)

```bash
# Opção 1: Via GitHub CLI (recomendado)
gh pr create --base main --head fix/rate-limit-20251202 \
  --title "fix(security): rate-limiter, enhanced error handler, logger rotation, worker timeout" \
  --body-file PR_BODY_fix_rate_limit.md

# Resultado: PR #1 criada
# Link: https://github.com/Cannalonga/conversor-mpp-xml/pull/1
```

### PHASE C: Merge PR (Após CI Verde + Aprovação)

```bash
# Opção 1: Via GitHub CLI
gh pr merge 1 --merge --admin

# Opção 2: Via Git (se CLI não disponível)
git checkout main
git pull origin main
git merge --no-ff fix/rate-limit-20251202
git push origin main

# Resultado: PR mergida, main atualizado
```

### PHASE D: Deploy para Staging (Via Master Script)

```bash
# Mais recomendado - usa script master
chmod +x ./deploy-master.sh
./deploy-master.sh staging

# Alternativa manual:
cd /srv/cannaconverter
git fetch origin
git checkout staging
git reset --hard origin/main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# Resultado: Containers rodando em staging
```

### PHASE E: Smoke Tests Automatizados

```bash
# Opção 1: Executar checklist manual (recomendado para primeira vez)
# Abra: STAGING_SMOKE_TESTS.md
# Execute cada teste manualmente

# Opção 2: K6 Load Test (se tiver k6 instalado)
brew install k6  # macOS
# ou: https://k6.io/docs/get-started/installation/

k6 run k6-smoke-test.js --vus 20 --duration 30s --base-url https://staging.cannaconverter.com

# Resultado esperado:
# ✓ All metrics passed
# ✓ No 500 errors
# ✓ Rate limiting working (429 responses seen)
```

### PHASE F: Verificações Manuais (Recomendado)

```bash
# 1. Health Check
curl -fsS https://staging.cannaconverter.com/api/health | jq .

# Esperado: {"status":"ok","timestamp":"..."}

# 2. Upload Test
echo "test" > /tmp/test.mpp
curl -s -F "file=@/tmp/test.mpp" https://staging.cannaconverter.com/api/upload | jq .

# Esperado: {"success":true,"fileId":"..."}

# 3. Rate Limiting Test (70 requests)
for i in {1..70}; do 
  curl -s -o /dev/null -w "%{http_code}\n" https://staging.cannaconverter.com/api/health
done | tail -20

# Esperado: Últimos ~10 responses = 429

# 4. Logs Rotation
docker exec cannaconverter ls -lh logs/

# Esperado: Arquivos diários (app.log, error.log, *.gz files)

# 5. End-to-End Flow
# Fazer upload → pagar PIX → download → verificar arquivo
```

### PHASE G: Monitoramento Staging (24-48 horas)

```bash
# Abrir logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f api

# Ou acompanhar métrica por métrica
# A cada 6 horas:

# - Health
curl -fs https://staging.cannaconverter.com/api/health

# - Queue depth
docker exec redis redis-cli LLEN bull_queue

# - Error count (last hour)
docker exec cannaconverter grep -i error logs/app.log | wc -l

# - Disk usage
df -h

# - Docker stats
docker stats --no-stream

# Monitorar por: Disk cheio, memory leak, CPU spike, error spike
```

### PHASE H: Deploy para Production (Após 24-48h OK)

```bash
# Mais recomendado - usa script master
chmod +x ./deploy-master.sh
./deploy-master.sh production

# Alternativa manual:
cd /srv/cannaconverter
git fetch origin
git checkout main
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# Resultado: Production rodando com v0.1.1
```

### PHASE I: Criar Tag & Release

```bash
# Via Master Script (recomendado)
# O script já faz isso ao rodar: ./deploy-master.sh production

# Manual:
cd /srv/cannaconverter

git tag -a v0.1.1-security \
  -m "v0.1.1 — Security hardening (rate limit, logger, worker timeout)"

git push origin v0.1.1-security

# Criar GitHub Release (requer gh CLI)
gh release create v0.1.1-security \
  --title "v0.1.1 — Security Hardening" \
  --notes-file RELEASE_NOTES_v0.1.1.md

# Resultado: Release criada em GitHub
```

### PHASE J: Rollback (Se Critical Issue)

```bash
# Opção 1: Script Rollback Automático (RECOMENDADO)
chmod +x ./rollback.sh
./rollback.sh

# Opção 2: Manual Rápido
cd /srv/cannaconverter
docker-compose -f docker-compose.prod.yml down
git reset --hard HEAD~1
docker-compose -f docker-compose.prod.yml up -d --build

# Resultado: Revertido para versão anterior
```

---

## 🔐 ENVIRONMENT VARIABLES (.env)

Adicione ao arquivo `.env` do servidor:

```env
# ═══════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MS=300000

# ═══════════════════════════════════════════════════════════════
# WORKER TIMEOUT
# ═══════════════════════════════════════════════════════════════
JOB_TIMEOUT_MS=300000
JOB_LOCK_DURATION_MS=30000
JOB_LOCK_RENEW_MS=15000
JOB_STALLED_TIMEOUT_MS=60000

# ═══════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════
LOG_LEVEL=info

# ═══════════════════════════════════════════════════════════════
# PRODUCTION
# ═══════════════════════════════════════════════════════════════
NODE_ENV=production
```

**Verificar .env**:
```bash
cd /srv/cannaconverter
cat .env | grep -E "RATE_LIMIT|JOB_TIMEOUT|LOG_LEVEL"

# Esperado: Todas as variáveis presentes
```

---

## 📊 MONITORING COMMANDS

### Real-Time Logging
```bash
# Logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f api

# Logs apenas de erro
docker-compose -f docker-compose.prod.yml logs api | grep -i error

# Últimas 100 linhas
docker-compose -f docker-compose.prod.yml logs api --tail=100
```

### Container Status
```bash
# Status dos containers
docker-compose -f docker-compose.prod.yml ps

# Recursos utilizados
docker stats --no-stream

# Histórico de restart
docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -E "exited|restarting"
```

### Queue Monitoring
```bash
# Profundidade da fila
docker exec redis redis-cli LLEN bull_queue

# Monitorar continuamente (a cada 5 seg)
watch -n 5 'docker exec redis redis-cli LLEN bull_queue'

# Redis info
docker exec redis redis-cli INFO memory
```

### Disk & Performance
```bash
# Uso de disco
df -h

# Tamanho de diretórios
du -sh /srv/cannaconverter/uploads/*
du -sh /srv/cannaconverter/logs/

# Limpeza de uploads expirados
find /srv/cannaconverter/uploads/expired -mtime +7 -delete

# Performance I/O
iostat -x 1
```

---

## ⚠️ TROUBLESHOOTING QUICK FIXES

### Se API não responde
```bash
# Reiniciar container
docker-compose restart api

# Ver logs de erro
docker-compose logs api --tail=50

# Verificar .env
docker-compose config | grep -E "RATE_LIMIT|JOB_TIMEOUT"

# Reiniciar tudo
docker-compose down
docker-compose up -d
```

### Se rate limiting não funciona
```bash
# Verificar env var
docker exec cannaconverter env | grep RATE_LIMIT

# Verificar se middleware está carregando
docker logs cannaconverter 2>&1 | grep -i "rate.*limit"

# Testar manualmente
for i in {1..70}; do curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health; done
```

### Se logs não rotacionam
```bash
# Verificar se Winston está ativo
docker logs cannaconverter | grep -i "winston\|logger"

# Forçar rotação manualmente
docker exec cannaconverter npm run rotate-logs

# Verificar diretório logs
docker exec cannaconverter ls -lah logs/
```

### Se worker está travado
```bash
# Ver jobs em fila
docker exec redis redis-cli LLEN bull_queue

# Ver job stuck
docker exec redis redis-cli HGETALL bull_queue:job

# Resetar fila (CUIDADO!)
docker exec redis redis-cli FLUSHDB
```

---

## 🚨 EMERGENCY PROCEDURES

### Quick Rollback (< 2 min)
```bash
cd /srv/cannaconverter
docker-compose down
git checkout v0.1.0
docker-compose up -d --build
```

### Clear Logs (if disk full)
```bash
# Backup first
tar -czf /backups/logs-emergency-$(date +%s).tar.gz /srv/cannaconverter/logs/

# Clear
rm -f /srv/cannaconverter/logs/*

# Restart API
docker-compose restart api
```

### Reset Everything (NUCLEAR)
```bash
cd /srv/cannaconverter

# Stop everything
docker-compose down -v

# Clean up
rm -rf uploads/processing/* uploads/quarantine/*

# Start fresh
git checkout main
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 CHECKLIST FINAL

```
PRÉ-DEPLOY:
  [ ] PR #1 revisada e aprovada
  [ ] .env atualizado com variáveis
  [ ] Backup recente criado
  [ ] Team notificado

STAGING:
  [ ] ./deploy-master.sh staging executado
  [ ] Smoke tests passaram (10/10)
  [ ] Logs rotacionam
  [ ] Rate limiting funciona
  [ ] 24-48h de monitoramento OK
  [ ] Sem erros criticos no Sentry

PRODUCTION:
  [ ] ./deploy-master.sh production executado
  [ ] API responde /api/health
  [ ] Upload flow completo funciona
  [ ] Logs normais
  [ ] Team confirmou estabilidade
  [ ] Tag v0.1.1-security criada
  [ ] GitHub Release publicada

PÓS-DEPLOY:
  [ ] Monitorar 24h contínuos
  [ ] Verificar PIX transactions
  [ ] Verificar conversion success rate
  [ ] Backups estão sendo feitos
  [ ] Alertas configurados
```

---

## 🎯 TEMPO ESTIMADO

| Fase | Tempo | Comando |
|------|-------|---------|
| Checks | 5 min | `./deploy-master.sh check` |
| Staging | 20 min | `./deploy-master.sh staging` |
| Smoke Tests | 30 min | Manual ou `k6 run k6-smoke-test.js` |
| Monitor (24-48h) | Passivo | `docker-compose logs -f` |
| Production | 15 min | `./deploy-master.sh production` |
| Tag + Release | 5 min | Automático no production |
| **TOTAL** | **3-4 dias** | |

---

## 📞 CONTATOS

- **DevOps**: [Email/Slack]
- **Backend**: [Email/Slack]
- **Supervisor**: [Email/Slack]
- **On-Call**: [Phone]

---

## 📚 DOCUMENTOS DE REFERÊNCIA

- `deploy-master.sh` - Script master com todas as fases
- `STAGING_SMOKE_TESTS.md` - Checklist detalhado de testes
- `rollback.sh` - Script automático de rollback
- `k6-smoke-test.js` - Load test (se tiver k6)
- `DEPLOYMENT_ROADMAP.md` - Guia passo a passo
- `RELEASE_NOTES_v0.1.1.md` - Notas da release

---

**Prepared**: December 2, 2025  
**Status**: ✅ Ready to Execute  
**Version**: v0.1.1-security  
