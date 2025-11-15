# Docker Compose Configurations - Conversor MPP-XML

Este diretório contém as configurações Docker Compose para diferentes ambientes do projeto.

## 📋 Arquivos de Deploy

### 🧪 `docker-compose.staging.yml`
**Ambiente de staging/teste**
- Deploy automático via GitHub Actions
- Mercado Pago sandbox mode
- Logs debug habilitados
- Rate limiting desabilitado
- 1 worker, recursos reduzidos
- PostgreSQL staging separado

**Deploy:**
```bash
# Deploy manual staging
docker-compose -f docker-compose.staging.yml up -d

# Via GitHub Actions (automático)
git push origin main → triggers deploy-staging.yml
```

### 🐣 `docker-compose.canary.yml`
**Deploy canary produção (10% tráfego)**
- Testa novas versões com tráfego real limitado
- Infraestrutura compartilhada (Redis/Postgres)
- Monitoramento separado
- Rollback automático em falhas
- Usado pelo deploy-production.yml workflow

**Deploy:**
```bash
# Manual canary
IMAGE_TAG=v1.2.3 docker-compose -f docker-compose.canary.yml up -d

# Via GitHub Actions
gh workflow run deploy-production.yml
```

### 🚀 `docker-compose.prod.yml`
**Produção completa (100% tráfego)**
- Alta disponibilidade: 2 workers
- Load balancer Traefik com SSL
- Backup automático PostgreSQL
- Monitoramento completo Prometheus/Grafana
- Rate limiting rigoroso
- Otimizações de performance

**Deploy:**
```bash
# Deploy produção (após canary aprovado)
IMAGE_TAG=v1.2.3 docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Arquitetura por Ambiente

### Staging
```
Internet → Nginx → Node.js App → PostgreSQL
                ↓              ↓
              Worker        Redis (DB 2)
                ↓
           MinIO (staging bucket)
```

### Canary
```
Internet → Traefik (10%) → App Canary → Redis (DB 1)
                        ↓           ↓
                   Worker Canary  PostgreSQL
                        ↓
              Prometheus Canary
```

### Production
```
Internet → Traefik (SSL) → App Prod → Redis (DB 0)
                        ↓         ↓
                   Worker-1/2   PostgreSQL
                        ↓         ↓
                 MinIO (prod)  Backup
                        ↓
            Prometheus + Grafana
```

## 🔧 Configurações de Ambiente

### Environment Variables Required

**Essenciais (todos ambientes):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR_xxx
MP_PUBLIC_KEY=APP_USR_xxx
WEBHOOK_SECRET=random-secret

# Storage
MINIO_ENDPOINT=s3.exemplo.com
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Security
SESSION_SECRET=long-random-string
ADMIN_PASSWORD_HASH=$2b$10$xxx...
```

**Staging específicas:**
```bash
STAGING_DATABASE_URL=postgresql://staging_user:pass@host/staging_db
MP_TEST_ACCESS_TOKEN=TEST-xxx
STAGING_POSTGRES_PASSWORD=staging123
```

**Produção específicas:**
```bash
GRAFANA_ADMIN_PASSWORD=secure-password
REDIS_PASSWORD=redis-prod-password
POSTGRES_PASSWORD=secure-db-password
```

## 📊 Resource Allocation

### Staging (Total: ~2.5GB RAM, 2.5 CPU)
- App: 1GB RAM, 1 CPU
- Worker: 768MB RAM, 0.75 CPU
- PostgreSQL: 256MB RAM, 0.25 CPU
- Redis: 128MB RAM, 0.25 CPU
- Nginx: 64MB RAM, 0.25 CPU

### Canary (Total: ~1GB RAM, 1.5 CPU)
- App: 512MB RAM, 0.5 CPU
- Worker: 1GB RAM, 1 CPU

### Production (Total: ~6GB RAM, 6 CPU)
- App: 2GB RAM, 2 CPU
- Worker-1: 1.5GB RAM, 1.5 CPU
- Worker-2: 1.5GB RAM, 1.5 CPU
- PostgreSQL: 1GB RAM, 1 CPU
- Redis: 512MB RAM, 0.5 CPU
- Traefik: 256MB RAM, 0.5 CPU
- Prometheus: 512MB RAM, 0.5 CPU
- Grafana: 256MB RAM, 0.25 CPU

## 🚀 Deployment Workflows

### 1. Desenvolvimento → Staging
```bash
git push origin main
# Triggers: ci.yml → build → deploy-staging.yml
```

### 2. Staging → Canary
```bash
# Manual trigger after staging validation
gh workflow run deploy-production.yml
# Deploys canary (10%) → monitor → manual approval
```

### 3. Canary → Production
```bash
# Automatic promotion if canary healthy
# Or manual promotion in workflow
```

### 4. Emergency Rollback
```bash
# Via GitHub Actions
gh workflow run deploy-production.yml --rollback

# Manual server
ssh deploy@servidor "cd /app && ./rollback.sh"
```

## 🔍 Health Checks & Monitoring

### Health Endpoints por Ambiente
- Staging: `https://staging.exemplo.com/health`
- Canary: `https://exemplo.com/health` (com header `X-Canary-Test: true`)
- Prod: `https://exemplo.com/health`

### Monitoramento URLs
- Staging Prometheus: `http://staging.exemplo.com:9090`
- Canary Prometheus: `http://exemplo.com:9091`
- Prod Prometheus: `http://exemplo.com:9090`
- Prod Grafana: `http://exemplo.com:3000`

### Quick Health Verification
```bash
# Usar scripts de automação
python scripts/health_check.py --env staging
python scripts/health_check.py --env prod

# Quick check manual
curl -f https://exemplo.com/health | jq .
```

## 🔒 Security & Network

### Network Isolation
- **staging-network** (172.18.0.0/24): Staging environment
- **conversor-network** (172.19.0.0/24): Production/Canary apps
- **monitoring** (172.22.0.0/24): Prometheus/Grafana

### Security Features
- **Staging**: Basic auth admin, relaxed rate limits
- **Canary**: Same security as production
- **Production**: SSL termination, strict rate limits, security headers

### Secrets Management
- Environment variables via `.env` files
- GitHub Secrets for CI/CD
- No hardcoded credentials in configs

## 📝 Usage Examples

### Deploy nova versão staging
```bash
# Build e deploy automático
git tag v1.2.3
git push origin main --tags
```

### Deploy canary manual
```bash
export IMAGE_TAG=v1.2.3
export CANARY_PERCENTAGE=10
docker-compose -f docker-compose.canary.yml up -d
```

### Verificar logs production
```bash
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f worker-1 worker-2
```

### Backup database production
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U conversor conversor > backup_$(date +%Y%m%d).sql
```

## 🆘 Troubleshooting

### Containers não sobem
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs

# Verificar recursos
docker stats

# Verificar redes
docker network ls
```

### Performance issues
```bash
# Monitor recursos
docker-compose -f docker-compose.prod.yml top

# Verificar conexões DB
docker-compose -f docker-compose.prod.yml exec postgres psql -U conversor -c "SELECT * FROM pg_stat_activity;"
```

### Storage issues
```bash
# Verificar espaço em disco
df -h /var/lib/docker

# Limpar volumes órfãos
docker volume prune
```