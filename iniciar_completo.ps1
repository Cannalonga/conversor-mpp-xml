# Script PowerShell para iniciar o servidor
Write-Host "🚀 CONVERSOR MPP PARA XML - INICIANDO..." -ForegroundColor Cyan

# Matar processos existentes na porta 8080
$processes = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "🔄 Limpando porta 8080..." -ForegroundColor Yellow
    $processes | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# Definir diretório atual
Set-Location $PSScriptRoot

# Iniciar servidor
Write-Host "🌐 Iniciando servidor Python..." -ForegroundColor Green
Start-Process python -ArgumentList "simple_working_server.py" -WindowStyle Normal

# Aguardar servidor iniciar
Start-Sleep -Seconds 3

# Abrir navegador
Write-Host "🌍 Abrindo navegador..." -ForegroundColor Green
Start-Process "http://localhost:8080"

Write-Host "✅ Servidor iniciado! Acesse: http://localhost:8080" -ForegroundColor Green
Write-Host "💡 Para parar o servidor, feche a janela do Python" -ForegroundColor Yellow