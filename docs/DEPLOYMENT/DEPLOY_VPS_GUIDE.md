# ================================================================================
#                    CANNACONVERT - GUIA DE DEPLOY PARA VPS
# ================================================================================
#                         Contabo / DigitalOcean / Vultr
#                              Data: 05/12/2025
# ================================================================================

## 📋 PRÉ-REQUISITOS NO SERVIDOR

```bash
# Sistema: Ubuntu 22.04 LTS (recomendado)
# RAM mínima: 2GB
# Disco mínimo: 20GB SSD
# CPU: 2 vCPUs
```

---

# ================================================================================
# OPÇÃO 1: DEPLOY COM PM2 (Mais Simples)
# ================================================================================

## 1.1 Instalar Dependências

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node -v  # v20.x.x
npm -v   # 10.x.x

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (proxy reverso)
sudo apt install -y nginx

# Instalar Certbot (SSL gratuito)
sudo apt install -y certbot python3-certbot-nginx
```

## 1.2 Configurar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário (dentro do psql)
CREATE USER cannaconvert_user WITH PASSWORD 'SENHA_FORTE_AQUI';
CREATE DATABASE cannaconvert_prod OWNER cannaconvert_user;
GRANT ALL PRIVILEGES ON DATABASE cannaconvert_prod TO cannaconvert_user;
\q
```

## 1.3 Clonar e Configurar Projeto

```bash
# Criar diretório
sudo mkdir -p /var/www/cannaconvert
sudo chown $USER:$USER /var/www/cannaconvert

# Clonar repositório
cd /var/www/cannaconvert
git clone https://github.com/Cannalonga/conversor-mpp-xml.git .

# Entrar no frontend
cd frontend

# Instalar dependências
npm ci --production=false

# Copiar e editar variáveis de ambiente
cp .env.production .env.local
nano .env.local  # Editar com valores reais

# Gerar NEXTAUTH_SECRET
openssl rand -hex 32  # Copiar output para .env.local

# Executar migrações do banco
npx prisma migrate deploy
npx prisma generate

# Build de produção
npm run build
```

## 1.4 Configurar PM2

```bash
# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cannaconvert',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/cannaconvert/frontend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: '/var/log/cannaconvert/error.log',
    out_file: '/var/log/cannaconvert/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Criar diretório de logs
sudo mkdir -p /var/log/cannaconvert
sudo chown $USER:$USER /var/log/cannaconvert

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração e habilitar auto-start
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
```

## 1.5 Configurar Nginx

```bash
# Criar configuração Nginx
sudo nano /etc/nginx/sites-available/cannaconvert
```

Conteúdo do arquivo:

```nginx
server {
    listen 80;
    server_name cannaconvert.com www.cannaconvert.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cannaconvert.com www.cannaconvert.com;

    # SSL será configurado pelo Certbot
    # ssl_certificate /etc/letsencrypt/live/cannaconvert.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/cannaconvert.com/privkey.pem;

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Upload máximo
    client_max_body_size 100M;

    # Proxy para Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Cache para arquivos estáticos
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /images {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar SSL com Certbot
sudo certbot --nginx -d cannaconvert.com -d www.cannaconvert.com

# Auto-renovação SSL
sudo systemctl enable certbot.timer
```

## 1.6 Comandos Úteis PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs cannaconvert

# Reiniciar
pm2 restart cannaconvert

# Atualizar após git pull
cd /var/www/cannaconvert/frontend
git pull
npm ci
npm run build
pm2 restart cannaconvert
```

---

# ================================================================================
# OPÇÃO 2: DEPLOY COM DOCKER (Recomendado para Escalabilidade)
# ================================================================================

## 2.1 Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin
```

## 2.2 Criar Dockerfile (se não existir)

```bash
cat > /var/www/cannaconvert/frontend/Dockerfile << 'EOF'
# ================================================================================
# CANNACONVERT - DOCKERFILE DE PRODUÇÃO
# ================================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
EOF
```

## 2.3 Build e Run Docker

```bash
# Build da imagem
cd /var/www/cannaconvert/frontend
docker build -t cannaconvert:latest .

# Rodar container
docker run -d \
  --name cannaconvert \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  cannaconvert:latest

# Ver logs
docker logs -f cannaconvert
```

---

# ================================================================================
# OPÇÃO 3: DOCKER COMPOSE COMPLETO (Produção Enterprise)
# ================================================================================

## 3.1 Criar docker-compose.prod.yml

```bash
cat > /var/www/cannaconvert/docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # ============================================
  # FRONTEND - Next.js
  # ============================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cannaconvert-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./frontend/.env.local
    depends_on:
      - postgres
      - redis
    networks:
      - cannaconvert-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # BACKEND - API de Conversão (Node.js)
  # ============================================
  backend:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: cannaconvert-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - ./api/.env
    volumes:
      - uploads:/app/uploads
      - temp:/app/temp
    depends_on:
      - postgres
      - redis
    networks:
      - cannaconvert-network

  # ============================================
  # DATABASE - PostgreSQL
  # ============================================
  postgres:
    image: postgres:15-alpine
    container_name: cannaconvert-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: cannaconvert_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: cannaconvert_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - cannaconvert-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cannaconvert_user -d cannaconvert_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # CACHE - Redis
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: cannaconvert-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - cannaconvert-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # PROXY REVERSO - Nginx
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: cannaconvert-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - cannaconvert-network

  # ============================================
  # SSL - Certbot
  # ============================================
  certbot:
    image: certbot/certbot
    container_name: cannaconvert-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  cannaconvert-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  uploads:
  temp:
EOF
```

## 3.2 Comandos Docker Compose

```bash
# Subir todos os serviços
docker compose -f docker-compose.prod.yml up -d

# Ver logs de todos
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker compose -f docker-compose.prod.yml logs -f frontend

# Parar todos
docker compose -f docker-compose.prod.yml down

# Rebuild após mudanças
docker compose -f docker-compose.prod.yml up -d --build

# Ver status
docker compose -f docker-compose.prod.yml ps
```

---

# ================================================================================
# CHECKLIST DE SMOKE-TEST PÓS-DEPLOY
# ================================================================================

## ✅ Testes Obrigatórios

```bash
# 1. Verificar se o site carrega
curl -I https://cannaconvert.com
# Esperado: HTTP/2 200

# 2. Verificar redirecionamento HTTP → HTTPS
curl -I http://cannaconvert.com
# Esperado: HTTP/1.1 301 Moved Permanently

# 3. Verificar SSL válido
curl -vI https://cannaconvert.com 2>&1 | grep "SSL certificate verify ok"

# 4. Testar API de health (se existir)
curl https://cannaconvert.com/api/health
# Esperado: {"status":"ok"}

# 5. Testar lista de conversores
curl https://cannaconvert.com/api/converters/list
# Esperado: {"success":true,"converters":[...]}
```

## ✅ Testes Manuais no Browser

1. [ ] Home page carrega corretamente
2. [ ] Logo aparece nítida
3. [ ] Login/Registro funcionam
4. [ ] Dashboard carrega após login
5. [ ] Grid de 20 ferramentas visível
6. [ ] Upload de arquivo funciona
7. [ ] Seleção de conversor funciona
8. [ ] Página de créditos carrega
9. [ ] QR Code PIX gera corretamente
10. [ ] Download de arquivo convertido funciona
11. [ ] Responsividade em mobile
12. [ ] Espaços de ADS visíveis

## ✅ Testes de Performance

```bash
# Lighthouse (requer Chrome)
npx lighthouse https://cannaconvert.com --view

# PageSpeed Insights
# Acesse: https://pagespeed.web.dev/
# Cole: https://cannaconvert.com
```

---

# ================================================================================
# COMANDOS DE MANUTENÇÃO
# ================================================================================

```bash
# Backup do banco de dados
pg_dump -U cannaconvert_user cannaconvert_prod > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U cannaconvert_user cannaconvert_prod < backup_20251205.sql

# Limpar logs antigos
pm2 flush

# Atualizar aplicação
cd /var/www/cannaconvert/frontend
git pull origin deploy/staging-setup
npm ci
npm run build
pm2 restart cannaconvert

# Verificar uso de disco
df -h

# Verificar uso de memória
free -m

# Verificar processos
htop
```

# ================================================================================
# FIM DO GUIA DE DEPLOY
# ================================================================================
