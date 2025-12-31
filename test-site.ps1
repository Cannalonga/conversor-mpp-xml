# Teste de acesso ao site
Write-Host "Testando cannaconvert.store..." -ForegroundColor Cyan
Write-Host ""

# Teste 1: DNS
Write-Host "1. Resolvendo DNS:" -NoNewline
try {
    $ip = [System.Net.Dns]::GetHostAddresses("cannaconvert.store")
    if ($ip) {
        Write-Host " OK ($($ip[0]))" -ForegroundColor Green
    } else {
        Write-Host " NAO RESOLVEU" -ForegroundColor Red
    }
} catch {
    Write-Host " ERRO" -ForegroundColor Red
}

# Teste 2: Conexão TCP
Write-Host "2. Conectando na porta 80:" -NoNewline
try {
    $conn = Test-NetConnection -ComputerName "cannaconvert.store" -Port 80 -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FALHOU" -ForegroundColor Red
    }
} catch {
    Write-Host " ERRO" -ForegroundColor Red
}

# Teste 3: HTTP GET
Write-Host "3. HTTP GET http://cannaconvert.store:" -NoNewline
try {
    $resp = Invoke-WebRequest -Uri "http://cannaconvert.store" -UseBasicParsing -TimeoutSec 10
    Write-Host " HTTP $($resp.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host " ERRO: $($_.Exception.Message.Substring(0, 50))" -ForegroundColor Red
}

# Teste 4: IP direto
Write-Host "4. HTTP GET http://213.199.35.118:" -NoNewline
try {
    $resp = Invoke-WebRequest -Uri "http://213.199.35.118" -UseBasicParsing -TimeoutSec 10
    Write-Host " HTTP $($resp.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host " ERRO" -ForegroundColor Red
}

Write-Host ""
Write-Host "Resumo: Se 1-3 falharem, eh um problema LOCAL (DNS/Firewall/ISP)" -ForegroundColor Yellow
Write-Host "Se 4 OK mas 3 falha: problema de DNS no seu ISP" -ForegroundColor Yellow
