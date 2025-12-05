# 🚀 CANNACONVERT - GUIA DE DEPLOY PARA PRODUÇÃO
## Ubuntu 24.04 LTS + Docker + NGINX + SSL

**Versão:** 1.0.0  
**Data:** Dezembro 2024  
**Sistema Operacional:** Ubuntu 24.04 LTS (Noble Numbat)

---

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configuração Inicial do Servidor](#2-configuração-inicial-do-servidor)
3. [Instalação do Docker](#3-instalação-do-docker)
4. [Configuração do Firewall (UFW)](#4-configuração-do-firewall-ufw)
5. [Instalação do NGINX](#5-instalação-do-nginx)
6. [Configuração do SSL (Let's Encrypt)](#6-configuração-do-ssl-lets-encrypt)
7. [Deploy da Aplicação](#7-deploy-da-aplicação)
8. [Configuração do Banco de Dados](#8-configuração-do-banco-de-dados)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)
10. [Compatibilidade NextAuth e Mercado Pago](#10-compatibilidade-nextauth-e-mercado-pago)
11. [Monitoramento e Logs](#11-monitoramento-e-logs)
12. [Backup e Recuperação](#12-backup-e-recuperação)
13. [Rollback](#13-rollback)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Pré-requisitos

### 1.1 Requisitos de Hardware (Mínimo Recomendado)

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disco | 40 GB SSD | 80 GB SSD |
| Rede | 100 Mbps | 1 Gbps |

### 1.2 Requisitos de Software

- Ubuntu 24.04 LTS (fresh install)
- Acesso root ou usuário com sudo
- Domínio configurado apontando para o IP do servidor
- Chave SSH configurada

### 1.3 Informações Necessárias

Antes de começar, tenha em mãos:

- [ ] IP do servidor
- [ ] Domínio (ex: `cannaconvert.com.br`)
- [ ] Credenciais do Mercado Pago (Production)
- [ ] Senha do banco de dados PostgreSQL
- [ ] Chave SSH para deploy

---

## 2. Configuração Inicial do Servidor

### 2.1 Conectar ao Servidor

```bash
ssh root@SEU_IP_DO_SERVIDOR
```

### 2.2 Atualizar Sistema

```bash
# Atualizar lista de pacotes e sistema
apt update && apt upgrade -y

# Instalar pacotes essenciais
apt install -y \
    curl \
    wget \
    git \
    htop \
    vim \
    unzip \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release \
    fail2ban
```

### 2.3 Criar Usuário de Deploy (Não usar root!)

```bash
# Criar usuário
adduser cannaconvert --disabled-password --gecos ""

# Adicionar ao grupo sudo
usermod -aG sudo cannaconvert

# Configurar sudo sem senha (para automação)
echo "cannaconvert ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/cannaconvert

# Copiar chaves SSH
mkdir -p /home/cannaconvert/.ssh
cp ~/.ssh/authorized_keys /home/cannaconvert/.ssh/
chown -R cannaconvert:cannaconvert /home/cannaconvert/.ssh
chmod 700 /home/cannaconvert/.ssh
chmod 600 /home/cannaconvert/.ssh/authorized_keys
```

### 2.4 Configurar Timezone

```bash
timedatectl set-timezone America/Sao_Paulo
```

### 2.5 Configurar Hostname

```bash
hostnamectl set-hostname cannaconvert-prod
echo "127.0.0.1 cannaconvert-prod" >> /etc/hosts
```

---

## 3. Instalação do Docker

### 3.1 Instalar Docker Engine (Ubuntu 24.04)

```bash
# Remover versões antigas (se existirem)
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    apt remove -y $pkg 2>/dev/null || true
done

# Adicionar repositório oficial do Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
usermod -aG docker cannaconvert

# Verificar instalação
docker --version
docker compose version
```

### 3.2 Configurar Docker para Produção

```bash
# Criar arquivo de configuração do Docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF

# Reiniciar Docker
systemctl restart docker
systemctl enable docker
```

---

## 4. Configuração do Firewall (UFW)

### 4.1 Configurar Regras

```bash
# Resetar regras (cuidado em produção!)
ufw --force reset

# Política padrão: negar entrada, permitir saída
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH (IMPORTANTE: fazer isso primeiro!)
ufw allow ssh
ufw allow 22/tcp

# Permitir HTTP e HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Permitir porta do Docker (interno apenas)
# NÃO expor portas do Docker diretamente!

# Ativar firewall
ufw --force enable

# Verificar status
ufw status verbose
```

### 4.2 Configurar Fail2Ban

```bash
# Criar configuração do fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
EOF

# Reiniciar fail2ban
systemctl restart fail2ban
systemctl enable fail2ban
```

---

## 5. Instalação do NGINX

### 5.1 Instalar NGINX

```bash
# Instalar NGINX
apt install -y nginx

# Verificar versão
nginx -v

# Habilitar no boot
systemctl enable nginx
```

### 5.2 Criar Configuração do Site

```bash
# Criar arquivo de configuração
cat > /etc/nginx/sites-available/cannaconvert.conf << 'EOF'
# ============================================================================
# CANNACONVERT - NGINX CONFIGURATION
# Ubuntu 24.04 LTS - Production
# ============================================================================

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Upstream para o frontend (Next.js)
upstream frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Upstream para o backend (Node.js API)
upstream backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name cannaconvert.com.br www.cannaconvert.com.br;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cannaconvert.com.br www.cannaconvert.com.br;

    # SSL Configuration (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/cannaconvert.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cannaconvert.com.br/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/cannaconvert.com.br/chain.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    
    # HSTS (descomentar após confirmar que SSL funciona)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Logging
    access_log /var/log/nginx/cannaconvert_access.log;
    error_log /var/log/nginx/cannaconvert_error.log;

    # Max upload size (for file conversions)
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 60s;

    # Proxy timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;

    # Root location
    root /var/www/cannaconvert;

    # API Routes (Backend)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Disable buffering for streaming responses
        proxy_buffering off;
    }

    # Webhook Routes (Mercado Pago) - sem rate limit agressivo
    location /api/webhooks/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /api/health {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Next.js Static files
    location /_next/static/ {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Cache static assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Public static files
    location /images/ {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Favicon
    location = /favicon.ico {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 30d;
        access_log off;
    }

    # All other routes (Next.js)
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
```

### 5.3 Ativar Configuração

```bash
# Criar diretório para certbot
mkdir -p /var/www/certbot

# Criar diretório para a aplicação
mkdir -p /var/www/cannaconvert

# Remover site default
rm -f /etc/nginx/sites-enabled/default

# Criar link simbólico
ln -sf /etc/nginx/sites-available/cannaconvert.conf /etc/nginx/sites-enabled/

# Testar configuração (vai falhar por falta do SSL - ok por enquanto)
nginx -t

# Para teste inicial sem SSL, comentar as linhas ssl_* e usar apenas HTTP
```

---

## 6. Configuração do SSL (Let's Encrypt)

### 6.1 Instalar Certbot

```bash
# Instalar Certbot com plugin NGINX
apt install -y certbot python3-certbot-nginx
```

### 6.2 Obter Certificado

```bash
# IMPORTANTE: Antes de executar, certifique-se que:
# 1. O DNS está apontando para o servidor
# 2. O NGINX está rodando (mesmo que sem SSL)
# 3. As portas 80 e 443 estão abertas

# Temporariamente, usar configuração HTTP only
cat > /etc/nginx/sites-available/cannaconvert-temp.conf << 'EOF'
server {
    listen 80;
    server_name cannaconvert.com.br www.cannaconvert.com.br;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'CannaConvert - Aguardando SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cannaconvert-temp.conf /etc/nginx/sites-enabled/cannaconvert.conf
nginx -t && systemctl reload nginx

# Obter certificado
certbot certonly --webroot \
    -w /var/www/certbot \
    -d cannaconvert.com.br \
    -d www.cannaconvert.com.br \
    --email seu-email@exemplo.com \
    --agree-tos \
    --no-eff-email

# Após sucesso, restaurar configuração completa
ln -sf /etc/nginx/sites-available/cannaconvert.conf /etc/nginx/sites-enabled/cannaconvert.conf
nginx -t && systemctl reload nginx
```

### 6.3 Configurar Renovação Automática

```bash
# Testar renovação
certbot renew --dry-run

# Certbot já instala timer automático no Ubuntu 24.04
# Verificar:
systemctl list-timers | grep certbot

# Se não existir, criar cron job:
echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" >> /etc/crontab
```

---

## 7. Deploy da Aplicação

### 7.1 Preparar Diretório

```bash
# Logar como usuário cannaconvert
su - cannaconvert

# Criar estrutura de diretórios
mkdir -p /opt/cannaconvert/{app,backups,logs,uploads,temp}
cd /opt/cannaconvert
```

### 7.2 Clonar Repositório

```bash
# Clonar repositório
git clone https://github.com/Cannalonga/conversor-mpp-xml.git app
cd app

# Checkout da branch de produção
git checkout main
```

### 7.3 Configurar Variáveis de Ambiente

```bash
# Copiar template e editar
cp deploy/production/.env.production.template .env

# IMPORTANTE: Editar o arquivo com valores reais
nano .env

# Verificar se todas as variáveis obrigatórias estão preenchidas
grep -E "^[^#].*=.+" .env | grep -v "CHANGE_ME"
```

### 7.4 Deploy com Docker Compose

```bash
# Ir para o diretório da aplicação
cd /opt/cannaconvert/app

# Fazer login no GitHub Container Registry (se usando imagens privadas)
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Pull das imagens
docker compose -f docker-compose.production.yml pull

# Iniciar serviços
docker compose -f docker-compose.production.yml up -d

# Verificar status
docker compose -f docker-compose.production.yml ps

# Ver logs
docker compose -f docker-compose.production.yml logs -f
```

### 7.5 Executar Migrações

```bash
# Executar migrações do Prisma
docker compose -f docker-compose.production.yml exec frontend npx prisma migrate deploy

# Verificar banco de dados
docker compose -f docker-compose.production.yml exec frontend npx prisma db push --accept-data-loss
```

---

## 8. Configuração do Banco de Dados

### 8.1 PostgreSQL via Docker

O PostgreSQL já está incluído no `docker-compose.production.yml`. Para gerenciar:

```bash
# Acessar PostgreSQL
docker compose -f docker-compose.production.yml exec postgres psql -U cannaconvert -d cannaconvert_prod

# Backup do banco
docker compose -f docker-compose.production.yml exec postgres pg_dump -U cannaconvert cannaconvert_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
cat backup.sql | docker compose -f docker-compose.production.yml exec -T postgres psql -U cannaconvert -d cannaconvert_prod
```

### 8.2 PostgreSQL Externo (Managed Database)

Se preferir usar um banco gerenciado (recomendado para produção):

1. Crie um banco PostgreSQL 15+ no seu provedor (AWS RDS, DigitalOcean, etc.)
2. Configure a `DATABASE_URL` no `.env`
3. Certifique-se de usar `?sslmode=require` na connection string
4. Configure as regras de firewall para permitir conexão do seu servidor

---

## 9. Variáveis de Ambiente

### 9.1 Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `production` |
| `NEXTAUTH_URL` | URL da aplicação | `https://cannaconvert.com.br` |
| `NEXTAUTH_SECRET` | Segredo do NextAuth | `openssl rand -base64 32` |
| `DATABASE_URL` | Conexão PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token MP Produção | `APP_USR-xxx` |

### 9.2 Variáveis Opcionais

| Variável | Descrição | Default |
|----------|-----------|---------|
| `REDIS_URL` | Conexão Redis | `redis://localhost:6379` |
| `LOG_LEVEL` | Nível de log | `info` |
| `RATE_LIMIT_MAX` | Limite de requisições | `100` |

### 9.3 Gerar Secrets

```bash
# Gerar NEXTAUTH_SECRET
openssl rand -base64 32

# Gerar JWT_SECRET
openssl rand -hex 32

# Gerar API_SECRET_KEY
openssl rand -hex 64
```

---

## 10. Compatibilidade NextAuth e Mercado Pago

### 10.1 Configuração NextAuth para Produção

O NextAuth requer configurações específicas para produção:

```env
# .env - NextAuth Production
NEXTAUTH_URL=https://cannaconvert.com.br
NEXTAUTH_SECRET=<seu-secret-gerado>
```

**Importante:**
- `NEXTAUTH_URL` deve ser a URL completa com HTTPS
- Sem barra no final
- Deve corresponder exatamente ao domínio configurado

### 10.2 Configuração Mercado Pago

#### Webhook URL

Configure no painel do Mercado Pago:
1. Acesse https://www.mercadopago.com.br/developers/panel/app
2. Vá em "Webhooks"
3. Configure a URL: `https://cannaconvert.com.br/api/webhooks/mercadopago`
4. Selecione eventos: `payment`, `merchant_order`

#### Variáveis de Ambiente

```env
# Mercado Pago - PRODUÇÃO
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADO_PAGO_WEBHOOK_SECRET=<webhook-secret>
```

### 10.3 URLs de Callback

Certifique-se que as URLs de callback estão configuradas corretamente:

```env
# Callback após pagamento aprovado
MERCADO_PAGO_SUCCESS_URL=https://cannaconvert.com.br/payment/success

# Callback após pagamento pendente
MERCADO_PAGO_PENDING_URL=https://cannaconvert.com.br/payment/pending

# Callback após pagamento recusado
MERCADO_PAGO_FAILURE_URL=https://cannaconvert.com.br/payment/failure
```

### 10.4 CORS

O NGINX já está configurado para permitir as origens necessárias. Se precisar ajustar, edite o backend:

```javascript
// api/server.js ou similar
const corsOptions = {
  origin: [
    'https://cannaconvert.com.br',
    'https://www.cannaconvert.com.br',
    'https://api.mercadopago.com'
  ],
  credentials: true
};
```

---

## 11. Monitoramento e Logs

### 11.1 Logs da Aplicação

```bash
# Logs do Docker Compose
docker compose -f docker-compose.production.yml logs -f

# Logs específicos do frontend
docker compose -f docker-compose.production.yml logs -f frontend

# Logs do NGINX
tail -f /var/log/nginx/cannaconvert_access.log
tail -f /var/log/nginx/cannaconvert_error.log
```

### 11.2 Monitoramento de Recursos

```bash
# Uso de CPU/RAM dos containers
docker stats

# Uso de disco
df -h

# Monitoramento geral
htop
```

### 11.3 Health Checks

```bash
# Health check da aplicação
curl -s https://cannaconvert.com.br/api/health | jq

# Status dos containers
docker compose -f docker-compose.production.yml ps
```

---

## 12. Backup e Recuperação

### 12.1 Script de Backup Automático

```bash
# Criar script de backup
cat > /opt/cannaconvert/backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/cannaconvert/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Backup do banco de dados
docker compose -f /opt/cannaconvert/app/docker-compose.production.yml exec -T postgres \
    pg_dump -U cannaconvert cannaconvert_prod | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /opt/cannaconvert/app/uploads/

# Backup do .env
cp /opt/cannaconvert/app/.env "$BACKUP_DIR/env_$DATE.bak"

# Remover backups antigos
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/cannaconvert/backup.sh
```

### 12.2 Agendar Backup Diário

```bash
# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/cannaconvert/backup.sh >> /var/log/cannaconvert-backup.log 2>&1") | crontab -
```

---

## 13. Rollback

### 13.1 Rollback Rápido (Docker)

```bash
# Listar imagens disponíveis
docker images | grep cannaconvert

# Parar containers atuais
cd /opt/cannaconvert/app
docker compose -f docker-compose.production.yml down

# Editar docker-compose.production.yml para usar tag anterior
# Ex: image: ghcr.io/cannalonga/conversor-mpp-xml:20241205.123456

# Subir com imagem anterior
docker compose -f docker-compose.production.yml up -d
```

### 13.2 Rollback de Código (Git)

```bash
cd /opt/cannaconvert/app

# Ver commits recentes
git log --oneline -10

# Voltar para commit específico
git checkout <commit-hash>

# Rebuild se necessário
docker compose -f docker-compose.production.yml up -d --build
```

### 13.3 Rollback de Banco de Dados

```bash
# Restaurar backup
gunzip -c /opt/cannaconvert/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
    docker compose -f docker-compose.production.yml exec -T postgres \
    psql -U cannaconvert -d cannaconvert_prod
```

---

## 14. Troubleshooting

### 14.1 Container não inicia

```bash
# Ver logs detalhados
docker compose -f docker-compose.production.yml logs frontend

# Verificar recursos
docker system df
df -h

# Limpar recursos não utilizados
docker system prune -af
```

### 14.2 Erro 502 Bad Gateway

```bash
# Verificar se container está rodando
docker compose -f docker-compose.production.yml ps

# Verificar se porta está aberta
ss -tlnp | grep 3000

# Testar conectividade interna
curl http://localhost:3000/api/health
```

### 14.3 SSL não funciona

```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --force-renewal

# Testar configuração NGINX
nginx -t
```

### 14.4 Mercado Pago webhook não chega

```bash
# Verificar logs da aplicação
docker compose -f docker-compose.production.yml logs -f backend | grep webhook

# Testar endpoint manualmente
curl -X POST https://cannaconvert.com.br/api/webhooks/mercadopago \
    -H "Content-Type: application/json" \
    -d '{"action": "test"}'

# Verificar firewall
ufw status
```

---

## 📞 Suporte

Em caso de problemas críticos:

1. Verifique os logs: `docker compose logs -f`
2. Verifique o status: `docker compose ps`
3. Consulte este guia de troubleshooting
4. Abra uma issue no GitHub

---

**Documento gerado para CannaConvert - Dezembro 2024**
