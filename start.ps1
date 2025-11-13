# Conversor MPP para XML - Script de Inicialização
# Este script verifica dependências e inicia o servidor

$ErrorActionPreference = "Stop"

Write-Host "🚀 ====================================" -ForegroundColor Cyan
Write-Host "   CONVERSOR MPP PARA XML" -ForegroundColor Cyan
Write-Host "🚀 ====================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Verificar se Python está instalado
    Write-Host "🔍 Verificando Python..." -ForegroundColor Yellow
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python não está instalado ou não está no PATH"
    }
    Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
    
    # Verificar se o arquivo do servidor existe
    if (!(Test-Path "simple_server.py")) {
        throw "Arquivo simple_server.py não encontrado"
    }
    Write-Host "✅ Servidor encontrado" -ForegroundColor Green
    
    # Verificar pastas necessárias
    $folders = @("public", "uploads", "admin")
    foreach ($folder in $folders) {
        if (!(Test-Path $folder)) {
            Write-Host "⚠️  Criando pasta: $folder" -ForegroundColor Yellow
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
        }
    }
    Write-Host "✅ Estrutura de pastas verificada" -ForegroundColor Green
    
    # Parar processos Python anteriores
    Write-Host "🛑 Parando servidores anteriores..." -ForegroundColor Yellow
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Iniciar servidor
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
    Write-Host "📱 Para parar: pressione Ctrl+C" -ForegroundColor Cyan
    Write-Host ""
    
    python simple_server.py
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Soluções:" -ForegroundColor Yellow
    Write-Host "   1. Instale Python: https://python.org" -ForegroundColor White
    Write-Host "   2. Verifique se está na pasta correta" -ForegroundColor White
    Write-Host "   3. Execute como administrador" -ForegroundColor White
    Write-Host ""
    Read-Host "Pressione Enter para sair"
}