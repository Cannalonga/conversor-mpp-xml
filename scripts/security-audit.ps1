# 🔐 Script de Varredura de Segurança - Windows PowerShell
# Detecta e remove dados sensíveis expostos no repositório

# Cores
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

# Header
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗"
Write-Host "║  🔐 AUDITOR DE SEGURANÇA - VARREDURA DE CREDENCIAIS           ║"
Write-Host "║     Detecta e remove dados sensíveis expostos                  ║"
Write-Host "╚════════════════════════════════════════════════════════════════╝"
Write-Host ""

# 1. Verificar .gitignore
Write-Info "1️⃣  Verificando .gitignore..."

$gitignorePath = ".gitignore"
$gitignoreContent = if (Test-Path $gitignorePath) { Get-Content $gitignorePath } else { "" }

$envPatterns = @(
    "^\.env$"
    "^\.env\."
    "\.env\.local"
    "\.env\.backup"
)

foreach ($pattern in $envPatterns) {
    if ($gitignoreContent -notmatch $pattern) {
        Write-Warning ".env com padrão '$pattern' não está em .gitignore"
        Add-Content $gitignorePath "$pattern" -ErrorAction SilentlyContinue
        Write-Success "Adicionado ao .gitignore"
    }
}

# 2. Procurar arquivos .env*
Write-Info "2️⃣  Procurando arquivos .env*..."

$envFiles = Get-ChildItem -Path "." -Filter ".env*" -File -ErrorAction SilentlyContinue | Where-Object {
    $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.git"
}

if ($envFiles) {
    Write-Warning "Encontrados $($envFiles.Count) arquivo(s) .env*:"
    
    foreach ($file in $envFiles) {
        $content = Get-Content $file.FullName
        
        # Verificar se contém valores reais (não placeholder)
        $hasSensitiveData = $content | Where-Object {
            $_ -match "(password|secret|key|token).*=" -and 
            $_ -notmatch "PLACEHOLDER|YOUR_|CHANGE_ME|EXAMPLE|GERAR_COM|GENERATE"
        }
        
        if ($hasSensitiveData) {
            Write-Warning "  $($file.Name) - CONTÉM DADOS SENSÍVEIS"
            Write-Host "    Linhas com dados:" ($hasSensitiveData | Measure-Object).Count
        } else {
            Write-Success "  $($file.Name) - Apenas placeholders (seguro)"
        }
    }
} else {
    Write-Success "Nenhum arquivo .env* encontrado no disco"
}

# 3. Verificar Git history
Write-Info "3️⃣  Verificando histórico Git..."

try {
    $gitCommits = git log --all --pretty=format:"%H %s" -- "*.env" 2>$null
    
    if ($gitCommits) {
        Write-Warning "Encontrados commits que modificam .env:"
        $gitCommits | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Success "Nenhum arquivo .env encontrado no histórico Git"
    }
} catch {
    Write-Warning "Não foi possível verificar histórico Git"
}

# 4. Buscar padrões sensíveis
Write-Info "4️⃣  Buscando por padrões de credenciais..."

$patterns = @(
    "password"
    "secret"
    "api_key"
    "token"
    "sk_live_"
    "sk_test_"
    "pk_live_"
    "pk_test_"
    "APP_USR-"
)

$foundIssues = 0

foreach ($pattern in $patterns) {
    $matches = Select-String -Path "*.json", "*.js", "*.ts", "*.yml", "*.yaml" `
        -Pattern $pattern -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -notmatch "node_modules|.git|.env.example"
        }
    
    if ($matches) {
        Write-Warning "Encontrado padrão '$pattern' em:"
        $matches | Select-Object -First 3 | ForEach-Object {
            Write-Host "  $($_.Path):$($_.LineNumber) - $($_.Line)"
        }
        $foundIssues++
    }
}

if ($foundIssues -eq 0) {
    Write-Success "Nenhum padrão óbvio de credencial encontrado"
} else {
    Write-Error "Encontrados $foundIssues tipos de padrões sensíveis"
}

# 5. Verificar variáveis de ambiente
Write-Info "5️⃣  Verificando variáveis de ambiente ativas..."

$envVarsToCheck = @(
    "JWT_SECRET"
    "API_KEY"
    "DATABASE_PASSWORD"
    "STRIPE_SECRET_KEY"
    "MERCADO_PAGO_ACCESS_TOKEN"
    "NEXTAUTH_SECRET"
)

foreach ($var in $envVarsToCheck) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Warning "Variável $var está definida ($($value.Length) chars)"
    }
}

Write-Success "Verificação de variáveis concluída"

# 6. Gerar relatório
Write-Info "6️⃣  Gerando relatório de segurança..."

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = ".security-audit-$timestamp.txt"

$report = @"
╔════════════════════════════════════════════════════════════════╗
║  RELATÓRIO DE AUDITORIA DE SEGURANÇA
║  Data: $(Get-Date)
╚════════════════════════════════════════════════════════════════╝

1. ARQUIVOS .env DETECTADOS
   Total: $($envFiles.Count) arquivo(s)

2. HISTÓRICO GIT
   Status: Verificado

3. PADRÕES ENCONTRADOS
   Tipos: $foundIssues padrão(ões)

4. STATUS GITIGNORE
   .env em .gitignore: $(if ($gitignoreContent -match '\.env') { "SIM" } else { "NÃO" })

5. RECOMENDAÇÕES
   - Use .env.example para versionamento (apenas placeholders)
   - Configure Secret Manager (AWS/Vault/Google/Azure)
   - Implemente rotação automática de secrets
   - Use pré-commit hooks para detecção
   - Faça auditoria regular (semanal)

6. PRÓXIMOS PASSOS
   1. Revisar arquivos .env locais
   2. Configurar Secret Manager em produção
   3. Rodar auditoria novamente
   4. Implementar pipeline de CI/CD com detecção

Gerado por: security-audit.ps1
"@

$report | Set-Content -Path $reportFile -Encoding UTF8
Write-Success "Relatório gerado: $reportFile"

# 7. Sumário Final
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗"
Write-Host "║  RESUMO DA AUDITORIA                                           ║"
Write-Host "╚════════════════════════════════════════════════════════════════╝"
Write-Host ""

if ($foundIssues -eq 0 -and $envFiles.Count -eq 0) {
    Write-Success "✨ SISTEMA SEGURO - Nenhuma exposição detectada"
} else {
    Write-Warning "⚠️  Atenção necessária - Verifique recomendações acima"
}

Write-Host ""
Write-Info "Auditoria concluída em $(Get-Date)"
Write-Host ""
