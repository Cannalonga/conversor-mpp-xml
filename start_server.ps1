# Script PowerShell para iniciar o Conversor MPP para XML
param(
    [switch]$NoBrowser,  # Não abrir navegador automaticamente
    [int]$Port = 8080    # Porta a usar (padrão 8080)
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 ============================================" -ForegroundColor Cyan
Write-Host "   CONVERSOR MPP PARA XML - INICIANDO" -ForegroundColor Cyan  
Write-Host "🚀 ============================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Parar servidores anteriores
    Write-Host "🛑 Parando servidores anteriores..." -ForegroundColor Yellow
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
    
    # Verificar se Python está disponível
    try {
        python --version | Out-Null
        Write-Host "✅ Python encontrado" -ForegroundColor Green
    } catch {
        throw "Python não encontrado. Instale Python em https://python.org"
    }
    
    # Verificar arquivo do servidor
    if (!(Test-Path "simple_working_server.py")) {
        throw "Arquivo simple_working_server.py não encontrado"
    }
    Write-Host "✅ Servidor encontrado" -ForegroundColor Green
    
    # Iniciar servidor
    Write-Host "🚀 Iniciando servidor na porta $Port..." -ForegroundColor Green
    
    # Iniciar em job para não bloquear
    $job = Start-Job -ScriptBlock { 
        param($Port)
        Set-Location $using:PWD
        python simple_working_server.py
    } -ArgumentList $Port
    
    # Aguardar servidor inicializar
    Write-Host "⏳ Aguardando servidor inicializar..." -ForegroundColor Yellow
    Start-Sleep 4
    
    # Testar conectividade
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -Method HEAD -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ Servidor respondendo na porta $Port" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Servidor pode estar iniciando..." -ForegroundColor Yellow
    }
    
    # Abrir navegador se solicitado
    if (-not $NoBrowser) {
        Write-Host "🌐 Abrindo navegador..." -ForegroundColor Cyan
        Start-Process "http://localhost:$Port"
    }
    
    Write-Host ""
    Write-Host "🎉 ============================================" -ForegroundColor Green
    Write-Host "   SERVIDOR ATIVO!" -ForegroundColor Green
    Write-Host "🎉 ============================================" -ForegroundColor Green
    Write-Host "   🌐 URL: http://localhost:$Port" -ForegroundColor White
    Write-Host "   📱 Teste em qualquer navegador" -ForegroundColor White
    Write-Host "   🛑 Pressione Ctrl+C para parar" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    
    # Aguardar interrupção do usuário
    Write-Host "Pressione Ctrl+C para parar o servidor..." -ForegroundColor Yellow
    try {
        Wait-Job $job | Out-Null
    } catch {
        # Usuário pressionou Ctrl+C
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Soluções:" -ForegroundColor Yellow
    Write-Host "   1. Instale Python: https://python.org" -ForegroundColor White
    Write-Host "   2. Verifique se está na pasta correta" -ForegroundColor White
    Write-Host "   3. Execute como administrador" -ForegroundColor White
} finally {
    # Limpar jobs e processos
    Write-Host ""
    Write-Host "🧹 Limpando processos..." -ForegroundColor Yellow
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Limpeza concluída" -ForegroundColor Green
}

Write-Host ""
Write-Host "👋 Até logo!" -ForegroundColor Cyan