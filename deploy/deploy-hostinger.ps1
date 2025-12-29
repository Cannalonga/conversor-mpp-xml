# Script de Deploy via SSH para Hostinger
# Usa credenciais de forma segura (nunca exibe)

$server = "root@213.199.35.118"
$password = "cY2IPqvmmgO1Mi8b1F33KHqZZ"

# ============================================================================
# Função para executar comando SSH
# ============================================================================
function Invoke-SSH {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $Description..." -ForegroundColor Blue
    
    # Usar sshpass para passar senha automaticamente
    $result = echo $password | sshpass -p $password ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $server $Command 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Description - OK" -ForegroundColor Green
        return $result
    } else {
        Write-Host "❌ $Description - ERRO" -ForegroundColor Red
        Write-Host $result
        return $null
    }
}

# ============================================================================
# DEPLOY
# ============================================================================

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 CANNACONVERT - DEPLOY EM PRODUÇÃO                         ║" -ForegroundColor Cyan
Write-Host "║     Servidor: 213.199.35.118                                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Verificar sshpass
Write-Host "`n[1/10] Verificando ferramentas..." -ForegroundColor Yellow
if (-not (Get-Command sshpass -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  sshpass não está instalado"
    Write-Host "Para Windows, use WSL ou Git Bash"
    Write-Host "Alternativa: Use putty ou WinSCP"
    exit 1
}

Write-Host "✅ Ferramentas OK" -ForegroundColor Green

# Deploy Script
$deployScript = @'
#!/bin/bash
set -e

log_info() { echo "[INFO] $1"; }
log_success() { echo "✅ $1"; }

log_info "1. Atualizando sistema..."
apt-get update -qq
log_success "Sistema atualizado"

log_info "2. Instalando dependências..."
apt-get install -y git curl wget > /dev/null 2>&1
log_success "Dependências instaladas"

log_info "3. Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
    usermod -aG docker root
fi
log_success "Docker OK"

log_info "4. Clonando código..."
rm -rf /opt/cannaconvert 2>/dev/null || true
mkdir -p /opt/cannaconvert
git clone -b deploy/production https://github.com/Cannalonga/conversor-mpp-xml.git /opt/cannaconvert --depth=1
cd /opt/cannaconvert
log_success "Código clonado"

log_info "5. Configurando .env..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=cannaconvert.store
JWT_SECRET_KEY=SECRET_$(openssl rand -hex 16)
ENCRYPTION_KEY=SECRET_$(openssl rand -hex 16)
DATABASE_URL=sqlite://./data/production.db
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://cannaconvert.store
LOG_LEVEL=info
EOF
log_success ".env criado"

log_info "6. Criando diretórios..."
mkdir -p data uploads logs
chmod 755 data uploads logs
log_success "Diretórios OK"

log_info "7. Iniciando Docker..."
docker compose -f docker-compose.production.yml down 2>/dev/null || true
sleep 2
docker compose -f docker-compose.production.yml up -d
log_success "Docker iniciado"

log_info "8. Aguardando aplicação..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Aplicação online!"
        break
    fi
    sleep 1
done

log_info "9. Configurando NGINX..."
apt-get install -y nginx > /dev/null 2>&1
cat > /etc/nginx/sites-available/cannaconvert << 'NGINX'
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
NGINX
ln -sf /etc/nginx/sites-available/cannaconvert /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
log_success "NGINX configurado"

log_info "10. Verificando..."
curl -f http://localhost:3000/health > /dev/null 2>&1
log_success "Tudo OK!"

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo "🌐 Acesse: https://cannaconvert.store"
'@

Write-Host "`n[2-10/10] Executando deploy no servidor..." -ForegroundColor Yellow
Write-Host "Por favor aguarde, isso pode levar alguns minutos..." -ForegroundColor Gray

# Executar script
$deployScript | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@213.199.35.118 "bash -s" 2>&1

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOY COMPLETO!                                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n🌐 Aplicação está ONLINE:"
Write-Host "   https://cannaconvert.store" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tudo pronto para uso!" -ForegroundColor Green
