# Diagnostico remoto simples
$ServerIP = "213.199.35.118"

Write-Host "Testando acesso ao dominio..." -ForegroundColor Cyan

# Teste 1: HTTP
Write-Host "`n1. HTTP cannaconvert.store:" -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://cannaconvert.store" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host " OK (Status $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " ERRO: $_" -ForegroundColor Red
}

# Teste 2: IP direto
Write-Host "2. HTTP via IP direto (213.199.35.118):" -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://213.199.35.118" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host " OK (Status $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " ERRO: $_" -ForegroundColor Red
}

# Teste 3: DNS
Write-Host "3. Resolucao DNS:" -NoNewline
try {
    $dns = [System.Net.Dns]::GetHostAddresses("cannaconvert.store")
    Write-Host " $($dns[0])" -ForegroundColor Green
} catch {
    Write-Host " ERRO: $_" -ForegroundColor Red
}

# Teste 4: Port 80
Write-Host "4. Conectividade Porta 80:" -NoNewline
try {
    $connection = Test-NetConnection -ComputerName $ServerIP -Port 80 -InformationLevel Quiet
    if ($connection) {
        Write-Host " OK" -ForegroundColor Green
    }
} catch {
    Write-Host " ERRO: $_" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor Cyan
