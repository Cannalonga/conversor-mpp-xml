#!/bin/bash
# Cole este script inteiro no Terminal SSH do Hostinger
# Ele fará o deploy completo automaticamente

set -e

echo "🚀 CANNACONVERT - DEPLOY AUTOMÁTICO"
echo "===================================="

# 1. Atualizar sistema
echo "1️⃣  Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Instalar dependências
echo "2️⃣  Instalando dependências..."
apt-get install -y -qq git curl wget build-essential > /dev/null 2>&1

# 3. Instalar Docker
echo "3️⃣  Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    usermod -aG docker root
else
    echo "   Docker já instalado ✓"
fi

# 4. Instalar Docker Compose
echo "4️⃣  Instalando Docker Compose..."
apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1

# 5. Clonar código
echo "5️⃣  Clonando código..."
rm -rf /opt/cannaconvert 2>/dev/null || true
mkdir -p /opt/cannaconvert
git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git /opt/cannaconvert --depth=1 --quiet
cd /opt/cannaconvert

# 6. Criar .env
echo "6️⃣  Configurando variáveis..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite://./data/production.db
REDIS_URL=redis://localhost:6379
REDIS_DB=0
CORS_ORIGIN=https://cannaconvert.store,https://www.cannaconvert.store
ALLOWED_ORIGINS=https://cannaconvert.store,https://www.cannaconvert.store
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
LOG_LEVEL=info
ENVEOF

# 7. Criar diretórios
echo "7️⃣  Criando diretórios..."
mkdir -p data uploads logs
chmod 755 data uploads logs

# 8. Iniciar Docker
echo "8️⃣  Iniciando aplicação..."
docker compose -f docker-compose.production.yml down 2>/dev/null || true
sleep 2
docker compose -f docker-compose.production.yml up -d

# 9. Aguardar inicialização
echo "9️⃣  Aguardando aplicação iniciar..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "   ✅ Aplicação online!"
        break
    fi
    echo -n "."
    sleep 1
done

# 10. Configurar NGINX
echo "🔟 Configurando NGINX..."
apt-get install -y -qq nginx > /dev/null 2>&1

cat > /etc/nginx/sites-available/cannaconvert << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name cannaconvert.store www.cannaconvert.store;

    client_max_body_size 100M;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        access_log off;
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
NGINXEOF

# Ativar configuração
ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar
nginx -t && systemctl restart nginx

# 11. Resumo final
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 PRÓXIMAS AÇÕES:"
echo "   1. Aguarde 2-3 minutos para propagação DNS"
echo "   2. Acesse: https://cannaconvert.store"
echo "   3. Se não funcionar, execute:"
echo "      docker compose -f /opt/cannaconvert/docker-compose.production.yml logs"
echo ""
echo "📊 COMANDOS ÚTEIS:"
echo "   Ver logs:      docker compose -f /opt/cannaconvert/docker-compose.production.yml logs -f"
echo "   Parar:         docker compose -f /opt/cannaconvert/docker-compose.production.yml down"
echo "   Reiniciar:     docker compose -f /opt/cannaconvert/docker-compose.production.yml restart"
echo "   Status:        docker ps"
echo ""

# Testar
echo "🔍 Testando..."
sleep 2
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ APLICAÇÃO RESPONDENDO NORMALMENTE!"
else
    echo "⚠️  Aguarde um pouco mais para inicialização..."
fi

echo ""
echo "✅ Tudo pronto! Sua aplicação está em produção."
echo ""
