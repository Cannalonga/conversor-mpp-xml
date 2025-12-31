#!/bin/bash
set -e

echo "================================================"
echo "CANNACONVERT - DEPLOY PRODUCTION"
echo "================================================"
echo ""

# 1. Limpar se existir
echo "[1/9] Preparando ambiente..."
rm -rf /opt/cannaconvert 2>/dev/null || true
mkdir -p /opt/cannaconvert
cd /opt/cannaconvert

# 2. Clonar código
echo "[2/9] Clonando código do repositório..."
git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git . --depth=1 --quiet

# 3. Instalar Node.js (se não tiver)
echo "[3/9] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "     Instalando Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    echo "     Node.js instalado com sucesso"
else
    echo "     Node.js já instalado: $(node --version)"
fi

# 4. Instalar dependências npm
echo "[4/9] Instalando dependências Node.js..."
npm ci --only=production > /dev/null 2>&1

# 5. Criar arquivo .env
echo "[5/9] Configurando arquivo .env..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store
JWT_SECRET_KEY=prod_secret_$(date +%s)
ENCRYPTION_KEY=prod_encryption_$(date +%s)
ADMIN_API_KEY=prod_admin_$(date +%s)
DATABASE_URL=sqlite://./data/production.db
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
ENVEOF

# 6. Criar estrutura de diretórios
echo "[6/9] Criando diretórios de dados..."
mkdir -p data uploads logs
chmod 755 data uploads logs

# 7. Instalar PM2 para gerenciar processo
echo "[7/9] Instalando PM2 para controle de processo..."
npm install -g pm2 > /dev/null 2>&1
pm2 delete cannaconvert 2>/dev/null || true

# 8. Iniciar aplicação com PM2
echo "[8/9] Iniciando aplicação..."
pm2 start api/server.js --name cannaconvert --max-memory-restart 500M
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1

sleep 5

# 9. Configurar NGINX
echo "[9/9] Configurando NGINX como reverse proxy..."
apt-get install -y nginx > /dev/null 2>&1

cat > /etc/nginx/sites-available/cannaconvert << 'NGINXEOF'
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
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
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/cannaconvert
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx

echo ""
echo "================================================"
echo "DEPLOY CONCLUIDO COM SUCESSO"
echo "================================================"
echo ""
echo "Informacoes da aplicacao:"
echo "  URL: http://cannaconvert.store"
echo "  IP Servidor: 213.199.35.118"
echo "  Porta: 3000"
echo "  Banco de dados: SQLite"
echo ""
echo "Comandos uteis:"
echo "  Ver status: pm2 status"
echo "  Ver logs: pm2 logs cannaconvert"
echo "  Reiniciar: pm2 restart cannaconvert"
echo "  Parar: pm2 stop cannaconvert"
echo "  Ver processos: ps aux | grep node"
echo ""
echo "Verificar saude da aplicacao:"
echo "  curl http://localhost:3000/health"
echo ""
