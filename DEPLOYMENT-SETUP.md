# Conversor MPP→XML - CI/CD & Deployment Setup Guide
# Arquivo: DEPLOYMENT-SETUP.md
# Versão: 1.0
# Data: 15/11/2025

## 🎯 Visão Geral do Pipeline

Este documento fornece instruções completas para configurar o pipeline CI/CD completo com:

- **CI Pipeline**: Lint, testes, build e push de imagens
- **Staging Deployment**: Deploy automático após CI bem-sucedido  
- **Production Canary**: Deploy controlado com aprovação manual e rollback automático

## 📋 Pré-requisitos

### 1. Infraestrutura Necessária
- **Servidor Staging**: Para testes automatizados
- **Servidor Production**: Para deploy final
- **Registry**: GitHub Container Registry (GHCR)
- **Monitoramento**: Grafana/Prometheus (opcional, mas recomendado)

### 2. Acessos e Permissões
- **GitHub Repository**: Admin access para configurar secrets e environments
- **Docker Registry**: Permissões de push no GHCR
- **Servidores**: SSH access com deploy user

## 🔐 Configuração de Secrets do GitHub

### Passo 1: Repository Secrets

Acesse: `GitHub Repository → Settings → Secrets and variables → Actions`

**Secrets obrigatórios:**

```bash
# Docker Registry
DOCKER_REGISTRY_USER=seu_username_github
DOCKER_REGISTRY_TOKEN=ghp_seu_personal_access_token

# SSH Access - Staging  
SSH_STAGING_HOST=staging.seudominio.com
SSH_STAGING_USER=deploy
SSH_STAGING_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
SSH_STAGING_PORT=22

# SSH Access - Production
SSH_PROD_HOST=seudominio.com
SSH_PROD_USER=deploy  
SSH_PROD_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
SSH_PROD_PORT=22

# Application Secrets
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-token-mercadopago
MINIO_ACCESS_KEY=seu-minio-access-key
MINIO_SECRET_KEY=seu-minio-secret-key
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0
WEBHOOK_SECRET=seu-webhook-secret-aleatorio
```

### Passo 2: GitHub Environments

Acesse: `GitHub Repository → Settings → Environments`

**Criar environments:**

1. **staging**
   - No protection rules needed
   - Auto-deploy after CI success

2. **production** 
   - ✅ Required reviewers: Adicionar pelo menos 1 reviewer
   - ✅ Wait timer: 0 minutes (opcional)
   - ✅ Deployment branches: Only protected branches

## 🛡️ Proteção de Branch

Acesse: `GitHub Repository → Settings → Branches → Add rule`

**Configurações para branch `main`:**
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `CI Pipeline / lint-and-test`
  - Select: `CI Pipeline / build-and-push`
- ✅ Require conversation resolution before merging
- ✅ Restrict pushes that create files to a maximum size: 100 MB
- ✅ Do not allow bypassing the above settings

## 🏗️ Configuração dos Servidores

### Estrutura de Diretórios no Servidor

**Staging e Production:**

```bash
# Como deploy user
mkdir -p /home/deploy/conversor/{logs,backups}
cd /home/deploy/conversor

# Clonar repositório (apenas configuração)
git clone https://github.com/SEU_USUARIO/conversor-mpp-xml.git .
```

### Docker Compose Files Necessários

**1. docker-compose.staging.yml**

```yaml
version: '3.8'

services:
  app:
    image: ${IMAGE_NAME}:${IMAGE_TAG}
    container_name: conversor_staging_app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MERCADOPAGO_ACCESS_TOKEN=${MERCADOPAGO_ACCESS_TOKEN}
    volumes:
      - /home/deploy/conversor/uploads:/app/uploads
    depends_on:
      - redis
      - postgres

  worker:
    image: ${IMAGE_NAME}:${IMAGE_TAG}
    container_name: conversor_staging_worker
    restart: unless-stopped
    command: python worker.py
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - /home/deploy/conversor/uploads:/app/uploads

  redis:
    image: redis:7-alpine
    container_name: conversor_staging_redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    container_name: conversor_staging_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=conversor_staging
      - POSTGRES_USER=conversor
      - POSTGRES_PASSWORD=seu-password-staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_staging_data:
```

**2. docker-compose.prod.yml**

```yaml
version: '3.8'

services:
  app:
    image: ${IMAGE_NAME}:${IMAGE_TAG}
    container_name: conversor_prod_app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MERCADOPAGO_ACCESS_TOKEN=${MERCADOPAGO_ACCESS_TOKEN}
    volumes:
      - /home/deploy/conversor/uploads:/app/uploads
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.conversor.rule=Host(\`seudominio.com\`)"
      - "traefik.http.routers.conversor.tls=true"
      - "traefik.http.routers.conversor.tls.certresolver=letsencrypt"
    depends_on:
      - redis
      - postgres

  worker:
    image: ${IMAGE_NAME}:${IMAGE_TAG}
    container_name: conversor_prod_worker
    restart: unless-stopped
    command: python worker.py
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - /home/deploy/conversor/uploads:/app/uploads

  redis:
    image: redis:7-alpine
    container_name: conversor_prod_redis
    restart: unless-stopped
    volumes:
      - redis_prod_data:/data

  postgres:
    image: postgres:15
    container_name: conversor_prod_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=conversor_production
      - POSTGRES_USER=conversor
      - POSTGRES_PASSWORD=seu-password-production
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data

volumes:
  postgres_prod_data:
  redis_prod_data:
```

**3. docker-compose.canary.yml**

```yaml
version: '3.8'

services:
  app-canary:
    image: ${IMAGE_NAME}:${IMAGE_TAG}
    container_name: conversor_canary_app
    restart: unless-stopped
    ports:
      - "8081:8080"  # Different port for canary
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MERCADOPAGO_ACCESS_TOKEN=${MERCADOPAGO_ACCESS_TOKEN}
    volumes:
      - /home/deploy/conversor/uploads:/app/uploads
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.conversor-canary.rule=Host(\`seudominio.com\`) && Header(\`X-Canary-Test\`, \`true\`)"
      - "traefik.http.routers.conversor-canary.tls=true"
```

### Configurar Deploy Scripts

```bash
# No servidor, tornar scripts executáveis
chmod +x /home/deploy/conversor/deploy-scripts/*.sh

# Criar link simbólico para facilitar uso
ln -sf /home/deploy/conversor/deploy-scripts/deploy.sh /usr/local/bin/deploy-conversor
ln -sf /home/deploy/conversor/deploy-scripts/rollback.sh /usr/local/bin/rollback-conversor  
ln -sf /home/deploy/conversor/deploy-scripts/healthcheck.sh /usr/local/bin/health-conversor
```

## 🚀 Fluxo de Trabalho

### 1. Desenvolvimento e CI

```bash
# Desenvolvedor cria feature branch
git checkout -b feature/nova-funcionalidade

# Commits e push
git add .
git commit -m "feat: implementar nova funcionalidade"
git push origin feature/nova-funcionalidade

# Abre Pull Request
# GitHub executa CI automaticamente
```

### 2. Deploy para Staging (Automático)

```bash
# Após merge para main
git checkout main
git pull origin main
git merge feature/nova-funcionalidade
git push origin main

# GitHub Actions executará automaticamente:
# 1. CI Pipeline (lint, test, build, push image)
# 2. Deploy Staging (deploy automático para staging)
```

### 3. Deploy para Production (Manual)

**Via GitHub UI:**

1. Acesse: `GitHub Repository → Actions`
2. Selecione workflow: `Deploy Production (Canary)`
3. Click: `Run workflow`
4. Configure:
   - **environment**: production
   - **image_tag**: (deixe vazio para usar latest)
   - **canary_percentage**: 10 (para começar)
5. Click: `Run workflow`

**Via GitHub CLI:**

```bash
# Instalar GitHub CLI se não tiver
# https://cli.github.com

# Trigger production deployment
gh workflow run deploy-production.yml \
  -f environment=production \
  -f canary_percentage=10

# Monitorar deployment
gh run list --workflow=deploy-production.yml
```

### 4. Monitoramento e Promoção

**Monitorar canary (10%):**
```bash
# Via healthcheck script
./deploy-scripts/healthcheck.sh production --detailed

# Verificar métricas no Grafana
# https://monitor.seudominio.com/d/conversor-overview
```

**Promover para 100% (se métricas OK):**
```bash
gh workflow run deploy-production.yml \
  -f environment=production \
  -f canary_percentage=100
```

### 5. Rollback (Se Necessário)

**Rollback automático:** Acontece automaticamente se health checks falham

**Rollback manual:**
```bash
# No servidor production
ssh deploy@seudominio.com
cd /home/deploy/conversor
./deploy-scripts/rollback.sh

# Ou especificar imagem específica
./deploy-scripts/rollback.sh ghcr.io/seu-usuario/conversor-mpp-xml:abc1234 production
```

## ✅ Checklist de Validação

### Pré-Deploy
- [ ] Secrets configurados no GitHub
- [ ] Environments criados (staging, production)
- [ ] Branch protection habilitada
- [ ] Servidores configurados com Docker Compose files
- [ ] Deploy scripts executáveis nos servidores
- [ ] SSH keys funcionando

### Pós-Deploy
- [ ] CI pipeline passa (lint, test, build)
- [ ] Staging deployment automático funciona
- [ ] Health checks passam no staging
- [ ] Production deployment com aprovação funciona
- [ ] Canary deployment testado
- [ ] Rollback testado
- [ ] Monitoramento funcionando
- [ ] Alertas configurados

## 🚨 Troubleshooting

### CI Pipeline Falhando

```bash
# Verificar logs no GitHub Actions
# Problemas comuns:

# 1. Tests falhando
pytest -v  # Rodar localmente

# 2. Build falhando  
docker build . -t test  # Testar build local

# 3. Push falhando
# Verificar DOCKER_REGISTRY_TOKEN permissions
```

### Deploy Falhando

```bash
# 1. SSH connection issues
ssh -i ~/.ssh/deploy_key deploy@servidor.com

# 2. Docker issues no servidor
docker system info
docker-compose --version

# 3. Image pull failing
docker pull ghcr.io/seu-usuario/conversor-mpp-xml:latest
```

### Rollback Issues

```bash
# 1. Verificar se backup exists
ls -la .backup_state_*
cat .last_successful_deployment

# 2. Manual rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Suporte

**Logs importantes:**
- GitHub Actions: Repository → Actions → Failed runs
- Servidor: `/var/log/docker/` e `docker-compose logs`
- Application: Logs dentro dos containers

**Comandos úteis:**
```bash
# Status dos serviços
docker-compose ps

# Logs em tempo real  
docker-compose logs -f app

# Health check
curl -s https://seudominio.com/health | jq .

# Restart services
docker-compose restart app worker
```

---

**✅ Pipeline configurado e pronto para produção!**

Depois de seguir este guia, você terá um pipeline CI/CD completo com:
- ✅ Testes automatizados  
- ✅ Build e push de imagens
- ✅ Deploy automático para staging
- ✅ Deploy controlado para production com canary
- ✅ Rollback automático em caso de falhas
- ✅ Health checks e monitoramento