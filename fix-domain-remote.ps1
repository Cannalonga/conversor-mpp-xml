# Script de Diagnóstico e Correção Remota - CannaConvert
# Execute: ./fix-domain-remote.ps1

param(
    [string]$ServerIP = "213.199.35.118",
    [string]$SSHUser = "root",
    [string]$SSHKey = $null
)

Write-Host "🔧 DIAGNÓSTICO E CORREÇÃO REMOTA - CANNACONVERT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Função para executar SSH
function Invoke-SSH {
    param([string]$Command)
    
    if ($SSHKey) {
        & ssh -i $SSHKey "${SSHUser}@${ServerIP}" $Command
    } else {
        & ssh "${SSHUser}@${ServerIP}" $Command
    }
}

Write-Host "📝 Nota: Este script assumirá acesso SSH sem senha" -ForegroundColor Yellow
Write-Host "Se você tiver chave SSH, passe: -SSHKey 'C:\path\to\key'" -ForegroundColor Yellow
Write-Host ""

# 1. Status dos serviços
Write-Host "1️⃣ Verificando status dos serviços..." -ForegroundColor Green
Write-Host ""

Write-Host "  Node.js Service:" -NoNewline
try {
    $status = Invoke-SSH "systemctl is-active cannaconvert.service"
    if ($status -match "active") {
        Write-Host " ✅ ATIVO" -ForegroundColor Green
    } else {
        Write-Host " ❌ INATIVO" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO: $_" -ForegroundColor Yellow
}

Write-Host "  NGINX:" -NoNewline
try {
    $status = Invoke-SSH "systemctl is-active nginx"
    if ($status -match "active") {
        Write-Host " ✅ ATIVO" -ForegroundColor Green
    } else {
        Write-Host " ❌ INATIVO" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO: $_" -ForegroundColor Yellow
}

Write-Host ""

# 2. Portas
Write-Host "2️⃣ Verificando portas..." -ForegroundColor Green
Write-Host ""

Write-Host "  Porta 80 (NGINX):" -NoNewline
try {
    $ports = Invoke-SSH "ss -tlnp 2>/dev/null | grep ':80 '"
    if ($ports) {
        Write-Host " ✅ LISTENING" -ForegroundColor Green
    } else {
        Write-Host " ❌ NÃO ENCONTRADA" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO" -ForegroundColor Yellow
}

Write-Host "  Porta 3000 (Node.js):" -NoNewline
try {
    $ports = Invoke-SSH "ss -tlnp 2>/dev/null | grep ':3000 '"
    if ($ports) {
        Write-Host " ✅ LISTENING" -ForegroundColor Green
    } else {
        Write-Host " ❌ NÃO ENCONTRADA" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO" -ForegroundColor Yellow
}

Write-Host ""

# 3. Últimos logs
Write-Host "3️⃣ Últimos 5 logs do serviço:" -ForegroundColor Green
Write-Host ""
try {
    $logs = Invoke-SSH "journalctl -u cannaconvert.service -n 5 --no-pager"
    $logs | ForEach-Object { Write-Host "  $_" }
} catch {
    Write-Host "  ⚠️ Erro ao ler logs: $_" -ForegroundColor Yellow
}

Write-Host ""

# 4. Teste de conectividade local
Write-Host "4️⃣ Teste de conectividade local (no servidor):" -ForegroundColor Green
Write-Host ""
Write-Host "  HTTP localhost:80:" -NoNewline
try {
    $response = Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost"
    if ($response -eq "200") {
        Write-Host " ✅ HTTP 200" -ForegroundColor Green
    } else {
        Write-Host " ❌ HTTP $response" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO" -ForegroundColor Yellow
}

Write-Host "  HTTP localhost:3000:" -NoNewline
try {
    $response = Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
    if ($response -eq "200") {
        Write-Host " ✅ HTTP 200" -ForegroundColor Green
    } else {
        Write-Host " ❌ HTTP $response" -ForegroundColor Red
    }
} catch {
    Write-Host " ⚠️ ERRO" -ForegroundColor Yellow
}

Write-Host ""

# 5. Teste externo (do Windows local)
Write-Host "5️⃣ Testes de conectividade externa:" -ForegroundColor Green
Write-Host ""

Write-Host "  HTTP cannaconvert.store:" -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://cannaconvert.store" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅ HTTP 200" -ForegroundColor Green
    } else {
        Write-Host " ⚠️ HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ ERRO: $_" -ForegroundColor Red
}

Write-Host "  DNS cannaconvert.store:" -NoNewline
try {
    $dns = [System.Net.Dns]::GetHostAddresses("cannaconvert.store")
    if ($dns) {
        Write-Host " ✅ Resolvendo para $($dns[0])" -ForegroundColor Green
    } else {
        Write-Host " ❌ NÃO RESOLVENDO" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ ERRO: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 6. Sugestões de correção
Write-Host "🔧 Sugestões para correção:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se o serviço não está ativo:" -ForegroundColor Cyan
Write-Host "  ssh root@213.199.35.118 'systemctl restart cannaconvert.service'" -ForegroundColor White
Write-Host ""

Write-Host "Se o NGINX não está ativo:" -ForegroundColor Cyan
Write-Host "  ssh root@213.199.35.118 'systemctl restart nginx'" -ForegroundColor White
Write-Host ""

Write-Host "Para recarregar ambos:" -ForegroundColor Cyan
Write-Host "  ssh root@213.199.35.118 'systemctl restart cannaconvert.service && systemctl restart nginx && sleep 2'" -ForegroundColor White
Write-Host ""

Write-Host "Para limpar cache DNS local:" -ForegroundColor Cyan
Write-Host "  ipconfig /flushdns" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Teste no navegador:" -ForegroundColor Yellow
Write-Host "  1. Limpe cache: Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "  2. Tente modo incógnito: Ctrl+Shift+N" -ForegroundColor White
Write-Host "  3. Acesse: http://cannaconvert.store" -ForegroundColor White
Write-Host ""
