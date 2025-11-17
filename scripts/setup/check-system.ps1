# Verificacao do Sistema Conversor MPP para XML
# Pode ser executado mesmo sem Node.js instalado

Write-Host "CONVERSOR MPP XML - VERIFICACAO DO SISTEMA" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

# Verificar Node.js
Write-Host "`nVERIFICANDO NODE.JS:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    if ($nodeVersion -and $npmVersion) {
        Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "OK npm: $npmVersion" -ForegroundColor Green
        $nodeInstalled = $true
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "ERRO: Node.js NAO INSTALADO!" -ForegroundColor Red
    Write-Host "   Baixe de: https://nodejs.org/" -ForegroundColor Yellow
    $nodeInstalled = $false
}

# Verificar arquivos principais
Write-Host "`nVERIFICANDO ARQUIVOS PRINCIPAIS:" -ForegroundColor Yellow

$criticalFiles = @(
    "api\server.js",
    "api\security.js", 
    "api\upload-utils.js",
    "queue\queue.js",
    "queue\worker.js",
    "utils\downloadToken.js",
    "converters\mppToXml.js",
    "public\index.html",
    "public\js\app_clean_new.js",
    "ecosystem.config.js",
    "package.json"
)

$missingFiles = 0
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "OK $file" -ForegroundColor Green
    } else {
        Write-Host "ERRO $file - FALTANDO!" -ForegroundColor Red
        $missingFiles++
    }
}

# Verificar package.json
Write-Host "`nVERIFICANDO CONFIGURACAO:" -ForegroundColor Yellow

if (Test-Path "package.json") {
    Write-Host "OK package.json existe" -ForegroundColor Green
    
    try {
        $packageContent = Get-Content "package.json" -Raw | ConvertFrom-Json
        
        if ($packageContent.dependencies) {
            $depCount = ($packageContent.dependencies | Get-Member -MemberType NoteProperty).Count
            Write-Host "OK $depCount dependencias configuradas" -ForegroundColor Green
        }
        
        if ($packageContent.scripts) {
            $scriptCount = ($packageContent.scripts | Get-Member -MemberType NoteProperty).Count
            Write-Host "OK $scriptCount scripts disponiveis" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "AVISO: Erro ao ler package.json" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "ERRO: package.json nao encontrado!" -ForegroundColor Red
    $missingFiles++
}

# Resultado final
Write-Host "`n" + ("=" * 50) -ForegroundColor Gray

if ($missingFiles -eq 0 -and $nodeInstalled) {
    Write-Host "SUCESSO: SISTEMA COMPLETAMENTE PRONTO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "INICIAR DESENVOLVIMENTO:" -ForegroundColor Cyan
    Write-Host "   1. npm install"
    Write-Host "   2. npm run dev"
    Write-Host "   3. npm run worker (em outro terminal)" 
    Write-Host "   4. Acesse: http://localhost:3000"
    
} elseif ($missingFiles -eq 0 -and -not $nodeInstalled) {
    Write-Host "AVISO: SISTEMA PRONTO - FALTA APENAS NODE.JS!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "INSTALAR NODE.JS:" -ForegroundColor Cyan
    Write-Host "   1. Acesse: https://nodejs.org/"
    Write-Host "   2. Baixe versao LTS"
    Write-Host "   3. Execute como Administrador"
    Write-Host "   4. Reinicie este terminal"
    
} else {
    Write-Host "ERRO: SISTEMA INCOMPLETO!" -ForegroundColor Red
    Write-Host "Arquivos faltando: $missingFiles" -ForegroundColor Red
}

Write-Host "`nDOCUMENTACAO:" -ForegroundColor Cyan
Write-Host "   - ENTERPRISE_README.md"
Write-Host "   - INSTALL_NODEJS.md"
Write-Host "   - .env.example"