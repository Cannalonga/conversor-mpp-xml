# 🚀 GUIA RÁPIDO - DEPLOY NO HOSTINGER

## ⏱️ Tempo estimado: 10 minutos

---

## 📋 PASSO 1: Acessar Terminal SSH (Hostinger)

1. Vá para: https://hpanel.hostinger.com.br
2. Acesse **Meus Produtos** → **VPS/Cloud** → Seu servidor
3. Clique em **Terminal** ou **SSH Access**
4. Copie o comando que aparece (tipo: `ssh root@213.199.35.118`)

---

## 📋 PASSO 2: Conectar via SSH

### Opção A: Terminal Linux/Mac/WSL
```bash
ssh root@213.199.35.118
# Digite a senha quando pedir
```

### Opção B: Windows (Git Bash ou PuTTY)
- Use o Git Bash que vem com Git for Windows
- Ou use PuTTY (GUI)

---

## 📋 PASSO 3: Executar Script de Deploy

Quando estiver conectado SSH, copie e cole TUDO isto no terminal:

```bash
#!/bin/bash
set -e
echo "🚀 CANNACONVERT - DEPLOY AUTOMÁTICO"
echo "===================================="

apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq git curl wget > /dev/null 2>&1

if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    usermod -aG docker root
fi

apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1

rm -rf /opt/cannaconvert 2>/dev/null || true
mkdir -p /opt/cannaconvert
git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git /opt/cannaconvert --depth=1 --quiet
cd /opt/cannaconvert

cat > .env << 'ENVEOF'
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
ENVEOF

mkdir -p data uploads logs
chmod 755 data uploads logs

docker compose -f docker-compose.production.yml down 2>/dev/null || true
sleep 2
docker compose -f docker-compose.production.yml up -d

echo "Aguardando aplicação iniciar..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Aplicação online!"
        break
    fi
    echo -n "."
    sleep 1
done

apt-get install -y -qq nginx > /dev/null 2>&1

cat > /etc/nginx/sites-available/cannaconvert << 'NGINXEOF'
upstream backend { server 127.0.0.1:3000; }
server {
    listen 80;
    server_name cannaconvert.store www.cannaconvert.store;
    client_max_body_size 100M;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOY COMPLETO!                                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Acesse: https://cannaconvert.store"
echo ""
```

---

## ✅ VERIFICAR SE FUNCIONOU

Depois de executar, rode:

```bash
# Ver status dos containers
docker ps

# Ver logs
docker compose -f /opt/cannaconvert/docker-compose.production.yml logs -f

# Testar aplicação
curl http://localhost:3000/health
```

---

## 🌐 ACESSAR SITE

Depois de **2-3 minutos** para DNS propagar:

```
https://cannaconvert.store
```

---

## ❓ Se não funcionar

### 1. Verificar Docker
```bash
docker ps
docker logs <container-id>
```

### 2. Verificar NGINX
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### 3. Reiniciar tudo
```bash
cd /opt/cannaconvert
docker compose -f docker-compose.production.yml restart
sudo systemctl restart nginx
```

---

## 📱 Suporte

Se tiver problemas:
1. Verifique os logs: `docker compose logs`
2. Teste a porta: `curl http://localhost:3000`
3. Verifique DNS: `nslookup cannaconvert.store`

---

**✅ Pronto! Seu site estará online em poucos minutos!** 🚀
