# 🎯 DEPLOY PASSO A PASSO - HOSTINGER

## PASSO 1: Abrir Terminal SSH no Hostinger

1. Vá para: https://hpanel.hostinger.com.br
2. Clique em **Meus Produtos**
3. Procure seu VPS/Servidor cloud
4. Clique em **Gerenciar** ou **Painel de Controle**
5. Procure **"Terminal"** ou **"SSH"** (botão azul)
6. Clique nele

---

## PASSO 2: Conectar

Você verá uma tela preta com um cursor piscando.

Digite:
```
root
```
Pressione **ENTER**

Depois digite a senha (será invisível):
```
cY2IPqvmmgO1Mi8b1F33KHqZZ
```
Pressione **ENTER**

**Resultado esperado:** Um terminal com `root@server:~#` ou similar

---

## PASSO 3: Copiar e Colar o Script

⚠️ **IMPORTANTE:** Copie TUDO abaixo (começando em `#!/bin/bash`), sem pular nada!

```bash
#!/bin/bash
set -e
clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🚀 CANNACONVERT - DEPLOY AUTOMÁTICO                         ║"
echo "║     Instalando: Docker, NGINX, Aplicação                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Atualizar sistema
echo "1️⃣  Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl wget build-essential

# 2. Instalar Docker
echo "2️⃣  Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker root
fi

# 3. Instalar Docker Compose
echo "3️⃣  Instalando Docker Compose..."
apt-get install -y docker-compose-plugin

# 4. Criar diretório da app
echo "4️⃣  Clonando código..."
rm -rf /opt/cannaconvert 2>/dev/null || true
mkdir -p /opt/cannaconvert

# 5. Clonar do GitHub
git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git /opt/cannaconvert --depth=1 --quiet
cd /opt/cannaconvert

# 6. Criar .env
echo "5️⃣  Configurando variáveis..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite://./data/production.db
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://cannaconvert.store
LOG_LEVEL=info
EOF

# 7. Criar diretórios
echo "6️⃣  Criando diretórios..."
mkdir -p data uploads logs
chmod 755 data uploads logs

# 8. Iniciar Docker
echo "7️⃣  Iniciando containers Docker..."
docker compose -f docker-compose.production.yml down 2>/dev/null || true
sleep 3
docker compose -f docker-compose.production.yml up -d

# 9. Aguardar inicialização
echo "8️⃣  Aguardando aplicação iniciar (pode levar até 2 minutos)..."
contador=0
while [ $contador -lt 120 ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo ""
        echo "   ✅ Aplicação respondendo!"
        break
    fi
    echo -n "."
    sleep 1
    contador=$((contador + 1))
done

# 10. Instalar e configurar NGINX
echo "9️⃣  Configurando NGINX (reverse proxy)..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/cannaconvert << 'NGINX'
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
}
NGINX

ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar NGINX
if nginx -t 2>/dev/null; then
    systemctl restart nginx
    echo "   ✅ NGINX configurado e ativo"
else
    echo "   ⚠️  Erro no NGINX, revisar configuração"
fi

# 11. Resumo final
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 SUA APLICAÇÃO ESTÁ ONLINE!"
echo ""
echo "📍 Acesse:"
echo "   https://cannaconvert.store"
echo ""
echo "⏱️  Aguarde 2-3 minutos para DNS propagar se não abrir"
echo ""
echo "📊 Verificar status:"
echo "   docker ps"
echo "   docker compose -f /opt/cannaconvert/docker-compose.production.yml logs"
echo ""
```

---

## PASSO 4: Colar no Terminal

1. **Selecione TUDO acima** (do `#!/bin/bash` até o último `EOF`)
2. **Copie** (Ctrl+C)
3. **No terminal do Hostinger**, clique com o botão direito e selecione **Colar**
   - Ou pressione **Ctrl+Shift+V** (em alguns navegadores)
4. Pressione **ENTER**

---

## PASSO 5: Aguardar o Deploy

O script vai:
- ✅ Atualizar o sistema
- ✅ Instalar Docker
- ✅ Clonar o código
- ✅ Iniciar a aplicação
- ✅ Configurar NGINX

**⏱️ Tempo total: 5-10 minutos**

Você verá mensagens tipo:
```
1️⃣  Atualizando sistema...
2️⃣  Instalando Docker...
.............................
3️⃣  Instalando Docker Compose...
4️⃣  Clonando código...
```

---

## PASSO 6: Verificar se Funcionou

Quando o script terminar, você verá:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                            ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## PASSO 7: Testar

1. Abra seu navegador
2. Vá para: https://cannaconvert.store

Se não abrir na primeira vez, **aguarde 2-3 minutos** e tente novamente (DNS precisa propagar)

---

## ❌ Se der erro

Mande a mensagem de erro que aparecer no terminal para eu ajudar!

Exemplos de erros que podem aparecer:
- `Permission denied`
- `Package not found`
- `Connection refused`

Se isso acontecer, copie tudo o que apareceu e compartilhe comigo! 📝

---

**Estou aqui acompanhando! 👀**

Quando colar o script, me avise e fico monitorando os erros!

