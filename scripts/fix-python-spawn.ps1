# Script para desabilitar extensões Python problemáticas no VS Code
# Causa: Disparos de 2.367+ processos Python ao abrir o workspace
# Solução: Desabilita todas as extensões Python que causam auto-indexing

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " CORRIGINDO DISPAROS DE PYTHON" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$extensionsDir = "$env:USERPROFILE\.vscode\extensions"

# Lista de extensões Python a desabilitar
$pythonExtensions = @(
  "ms-python.python*",
  "ms-python.vscode-pylance*",
  "ms-python.debugpy*",
  "ms-python.isort*",
  "ms-python.vscode-python-envs*",
  "ms-python.python-environment-manager*",
  "donjayamanne.python-extension-pack*",
  "donjayamanne.githistory*",
  "kevinrose.vsc-python-indent*"
)

if (-not (Test-Path $extensionsDir)) {
    Write-Host "[ERRO] Diretório de extensões não encontrado: $extensionsDir" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Procurando extensões Python problemáticas em:" -ForegroundColor Yellow
Write-Host "   $extensionsDir" -ForegroundColor Yellow
Write-Host ""

$disabledCount = 0
$alreadyDisabled = 0

foreach ($pattern in $pythonExtensions) {
    Get-ChildItem -Path $extensionsDir -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        $extName = $_.Name
        $extPath = $_.FullName
        $disabledPath = "$extPath.disabled"
        
        if (Test-Path $disabledPath) {
            Write-Host "   [SKIP] $extName (já estava desabilitada)" -ForegroundColor Gray
            $alreadyDisabled++
        } else {
            Write-Host "[DISABLE] Desabilitando: $extName" -ForegroundColor Yellow
            
            try {
                Rename-Item -Path $extPath -NewName "$extName.disabled" -ErrorAction Stop
                Write-Host "   [OK] Sucesso" -ForegroundColor Green
                $disabledCount++
            } catch {
                Write-Host "   [ERRO] $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " RESUMO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "[OK] Extensões desabilitadas: $disabledCount" -ForegroundColor Green
Write-Host "[SKIP] Já desabilitadas: $alreadyDisabled" -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "   1. Feche o VS Code COMPLETAMENTE (Ctrl+Q ou Alt+F4)" -ForegroundColor White
Write-Host "   2. Reabra o VS Code" -ForegroundColor White
Write-Host "   3. Verifique que não há mais disparos de Python" -ForegroundColor White
Write-Host ""
Write-Host "[VERIFICAR]" -ForegroundColor Yellow
Write-Host "   Abra PowerShell e execute:" -ForegroundColor White
Write-Host "   Get-Process python -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count" -ForegroundColor Cyan
Write-Host ""
Write-Host "[NOTA] Isso desabilita APENAS as extensões Python." -ForegroundColor Gray
Write-Host "   JavaScript/Node.js continuará funcionando normalmente." -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Deseja fechar o VS Code agora? (s/n)"
if ($response -eq "s" -or $response -eq "S") {
    Write-Host ""
    Write-Host "[CLOSING] Fechando VS Code..." -ForegroundColor Yellow
    Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "[OK] VS Code fechado. Reabra-o agora!" -ForegroundColor Green
}
