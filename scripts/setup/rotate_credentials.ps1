# 🔐 CANNACONVERTER - ROTAÇÃO DE CREDENCIAIS (PowerShell)
# Uso: .\rotate_credentials.ps1

Write-Host "🔐 CANNACONVERTER - Rotação de Credenciais" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Gerar novos secrets
Write-Host "1️⃣  Gerando novos secrets aleatórios..." -ForegroundColor Yellow
$JWT_SECRET = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Random) + (Get-Date).Ticks)) -replace '[^a-zA-Z0-9]'
$JWT_REFRESH = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Random) + (Get-Date).Ticks)) -replace '[^a-zA-Z0-9]'
$ADMIN_API_KEY = "sk_$(New-Guid -AsBase64)"
$ENCRYPTION_KEY = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Random) + (Get-Date).Ticks)) -replace '[^a-zA-Z0-9]'

Write-Host "✅ Secrets gerados" -ForegroundColor Green

# 2. Backup
Write-Host "2️⃣  Fazendo backup de .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $BackupName = ".env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item ".env" $BackupName
    Write-Host "✅ Backup criado: $BackupName" -ForegroundColor Green
} else {
    Write-Host "⚠️  Arquivo .env não encontrado" -ForegroundColor Yellow
}

# 3. Criar novo .env
Write-Host "3️⃣  Criando novo .env com credenciais rotacionadas..." -ForegroundColor Yellow

$EnvContent = @"
# 🔐 CANNACONVERTER - CONFIGURAÇÃO LOCAL
# Gerado em: $(Get-Date)
# ⚠️ NUNCA commitar em git!

# ============================================================================
# 🗄️ BANCO DE DADOS
# ============================================================================
DATABASE_URL=postgresql://cannaconverter:senha123@localhost:5432/cannaconverter_dev
DATABASE_SSL=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================================================
# 💾 REDIS
# ============================================================================
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=
REDIS_TTL=3600

# ============================================================================
# 🔑 JWT & AUTENTICAÇÃO
# ============================================================================
JWT_SECRET_KEY=$($JWT_SECRET.Substring(0, [Math]::Min(64, $JWT_SECRET.Length)))
JWT_EXPIRY=7d
JWT_ALGORITHM=HS256

JWT_REFRESH_SECRET=$($JWT_REFRESH.Substring(0, [Math]::Min(64, $JWT_REFRESH.Length)))
JWT_REFRESH_EXPIRY=30d

# ============================================================================
# 👤 CREDENCIAIS ADMIN (DESENVOLVIMENTO APENAS!)
# ============================================================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=`$2b`$10`$L9/hv5w8y2L8kZ8v1q8Jxe6F8M9X0K1L2M3N4O5P6Q7R8S9T0U1V2
ADMIN_API_KEY=$ADMIN_API_KEY

# ============================================================================
# 📧 EMAIL & 2FA
# ============================================================================
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=noreply@cannaconverter.local
EMAIL_USERNAME=seu-email@gmail.com
EMAIL_PASSWORD=seu-app-password

EMAIL_SECURE=true
TWO_FA_ENABLED=true
TWO_FA_EXPIRY_SECONDS=300

# ============================================================================
# 💳 PAGAMENTO - MERCADO PAGO
# ============================================================================
MERCADO_PAGO_ACCESS_TOKEN=APP_USR_xxxxx_CHANGE_IN_PRODUCTION
MERCADO_PAGO_PUBLIC_KEY=APP_USR_xxxxx_CHANGE_IN_PRODUCTION
MERCADO_PAGO_WEBHOOK_SECRET=webhook_xxxxx_CHANGE_IN_PRODUCTION

# PIX
PIX_KEY_TYPE=email
PIX_KEY_VALUE=comercial@cannaconverter.com.br
CONVERSION_PRICE_BRL=10.00

# ============================================================================
# 🌐 SERVIDOR & DEPLOYMENT
# ============================================================================
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
APP_URL=http://localhost:3000

# ============================================================================
# 🔄 CORS & SEGURANÇA
# ============================================================================
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true

# ============================================================================
# 📁 UPLOAD DE ARQUIVOS
# ============================================================================
UPLOAD_TEMP_DIR=./uploads/incoming
UPLOAD_MAX_FILE_SIZE_MB=100
ALLOWED_MIME_TYPES=application/vnd.ms-project,application/xml
ALLOWED_EXTENSIONS=.mpp,.xml

# ============================================================================
# ⏱️ RATE LIMITING
# ============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_MAX=5

# ============================================================================
# 👷 WORKERS & PROCESSAMENTO
# ============================================================================
WORKER_TIMEOUT_SECONDS=300
WORKER_THREADS=4
PYTHON_WORKER_URL=http://localhost:8000
QUEUE_PROVIDER=redis

# ============================================================================
# 📊 LOGGING
# ============================================================================
LOG_LEVEL=debug
LOG_DIR=./logs
LOG_TRANSPORTS=console,file

# ============================================================================
# 🔍 OBSERVABILITY
# ============================================================================
OTEL_ENABLED=false
SENTRY_DSN=

# ============================================================================
# 🧪 TESTING & DEVELOPMENT
# ============================================================================
TEST_DATABASE_URL=sqlite://./data/test.db
MOCK_MODE=false
DEBUG=false
"@

Set-Content -Path ".env" -Value $EnvContent -Encoding UTF8
Write-Host "✅ Novo .env criado" -ForegroundColor Green

# 4. Adicionar .env ao .gitignore
Write-Host "4️⃣  Atualizando .gitignore..." -ForegroundColor Yellow
$gitignoreContent = ".env`n*.backup*`nnode_modules/`nlogs/`nuploads/`n"
if (Test-Path ".gitignore") {
    Add-Content ".gitignore" -Value $gitignoreContent
} else {
    Set-Content -Path ".gitignore" -Value $gitignoreContent
}
Write-Host "✅ .gitignore atualizado" -ForegroundColor Green

# 5. Resumo
Write-Host ""
Write-Host "✅ Rotação de credenciais completa!" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Novos secrets gerados:" -ForegroundColor Yellow
Write-Host "   JWT_SECRET_KEY: $($JWT_SECRET.Substring(0, 16))...$($JWT_SECRET.Substring($JWT_SECRET.Length - 4))" -ForegroundColor Gray
Write-Host "   JWT_REFRESH_SECRET: $($JWT_REFRESH.Substring(0, 16))...$($JWT_REFRESH.Substring($JWT_REFRESH.Length - 4))" -ForegroundColor Gray
Write-Host "   ADMIN_API_KEY: $($ADMIN_API_KEY.Substring(0, 16))...$(if ($ADMIN_API_KEY.Length -gt 4) { $ADMIN_API_KEY.Substring($ADMIN_API_KEY.Length - 4) })" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Copie os secrets gerados para seu password manager"
Write-Host "   2. Atualize DATABASE_URL, REDIS_URL com valores reais"
Write-Host "   3. Atualize EMAIL_* com credenciais de produção"
Write-Host "   4. Atualize MERCADO_PAGO_* com tokens de produção"
Write-Host "   5. Execute: npm install"
Write-Host "   6. Execute: npm start"
Write-Host ""
Write-Host "🚨 SEGURANÇA:" -ForegroundColor Red
Write-Host "   • NUNCA commite .env em git"
Write-Host "   • Use .env.example para versionamento"
Write-Host "   • Se credenciais foram expostas, rotacione em TODAS as plataformas"
Write-Host "   • Audite histórico de git para credenciais antigas"
Write-Host ""
