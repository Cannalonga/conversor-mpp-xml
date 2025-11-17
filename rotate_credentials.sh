#!/bin/bash
# 🔐 CANNACONVERTER - SCRIPT DE ROTAÇÃO DE CREDENCIAIS
# Uso: bash rotate_credentials.sh

set -e

echo "🔐 CANNACONVERTER - Rotação de Credenciais"
echo "==========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Gerar novos secrets
echo -e "${YELLOW}1️⃣  Gerando novos secrets aleatórios...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_API_KEY=$(node -e "console.log('sk_' + require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo -e "${GREEN}✅ Secrets gerados${NC}"

# 2. Backup de .env atual
echo -e "${YELLOW}2️⃣  Fazendo backup de .env...${NC}"
if [ -f ".env" ]; then
    cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backup criado${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
fi

# 3. Criar novo .env seguro
echo -e "${YELLOW}3️⃣  Criando novo .env com credenciais rotacionadas...${NC}"

cat > .env << EOF
# 🔐 CANNACONVERTER - CONFIGURAÇÃO LOCAL
# Gerado em: $(date)
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
JWT_SECRET_KEY=$JWT_SECRET
JWT_EXPIRY=7d
JWT_ALGORITHM=HS256

JWT_REFRESH_SECRET=$JWT_REFRESH
JWT_REFRESH_EXPIRY=30d

# ============================================================================
# 👤 CREDENCIAIS ADMIN (DESENVOLVIMENTO APENAS!)
# ============================================================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=\$2b\$10\$L9/hv5w8y2L8kZ8v1q8Jxe6F8M9X0K1L2M3N4O5P6Q7R8S9T0U1V2
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
EOF

echo -e "${GREEN}✅ Novo .env criado${NC}"

# 4. Adicionar .env ao gitignore
echo -e "${YELLOW}4️⃣  Atualizando .gitignore...${NC}"
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "*.backup*" >> .gitignore
fi
echo -e "${GREEN}✅ .gitignore atualizado${NC}"

# 5. Remover credenciais da história de git
echo -e "${YELLOW}5️⃣  Verificando histórico do git...${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    COMMITS_WITH_CREDS=$(git log --all --oneline --grep="Alcap0ne\|NovaSenh@\|ADMIN_PASSWORD" | wc -l)
    if [ $COMMITS_WITH_CREDS -gt 0 ]; then
        echo -e "${RED}⚠️  AVISO: Encontrados $COMMITS_WITH_CREDS commits com credenciais!${NC}"
        echo -e "${RED}    Você deve executar: git-filter-repo --path .env --invert-paths${NC}"
    fi
fi

# 6. Summary
echo ""
echo -e "${GREEN}✅ Rotação de credenciais completa!${NC}"
echo ""
echo -e "${YELLOW}🔐 Novos secrets:${NC}"
echo "   JWT_SECRET_KEY: ${JWT_SECRET:0:16}...${JWT_SECRET: -4}"
echo "   JWT_REFRESH_SECRET: ${JWT_REFRESH:0:16}...${JWT_REFRESH: -4}"
echo "   ADMIN_API_KEY: ${ADMIN_API_KEY:0:16}...${ADMIN_API_KEY: -4}"
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASSOS:${NC}"
echo "   1. Copie os valores acima para seu password manager"
echo "   2. Atualize DATABASE_URL, REDIS_URL com valores reais"
echo "   3. Atualize EMAIL_* com credenciais de produção"
echo "   4. Atualize MERCADO_PAGO_* com tokens de produção"
echo "   5. Execute: npm install"
echo "   6. Execute: npm start"
echo ""
echo -e "${YELLOW}🚨 SEGURANÇA:${NC}"
echo "   • NUNCA commite .env em git"
echo "   • Use .env.example para versionamento"
echo "   • Rode git filter-repo para limpar histórico se necessário"
echo "   • Rotacione credenciais periodicamente em produção"
echo ""
