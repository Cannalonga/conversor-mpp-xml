#!/bin/bash

# Script de Setup Completo do Conversor MPP para XML
# Versão: 2.0 - Arquitetura Enterprise

set -e  # Para em caso de erro

echo "🚀 Iniciando setup do Conversor MPP para XML..."
echo "========================================"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo "📥 Baixe e instale Node.js v18+ de: https://nodejs.org/"
    echo "   Versões recomendadas:"
    echo "   - Node.js 18.x LTS"
    echo "   - Node.js 20.x LTS"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node --version | cut -d'v' -f2)
echo "✅ Node.js encontrado: v$NODE_VERSION"

# Verificar se Redis está instalado (opcional mas recomendado)
if command -v redis-server &> /dev/null; then
    echo "✅ Redis encontrado para queue system"
else
    echo "⚠️  Redis não encontrado - instale para funcionalidade de queue"
    echo "   Ubuntu/Debian: sudo apt install redis-server"
    echo "   Windows: https://github.com/microsoftarchive/redis/releases"
    echo "   macOS: brew install redis"
fi

echo ""
echo "📦 Instalando dependências do projeto..."

# Instalar dependências principais
npm install

# Verificar se todas as dependências foram instaladas
echo ""
echo "🔍 Verificando dependências críticas..."

REQUIRED_DEPS=(
    "express"
    "multer" 
    "helmet"
    "express-rate-limit"
    "cors"
    "uuid"
    "validator"
    "jsonwebtoken"
    "bullmq"
    "ioredis"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if npm list "$dep" &> /dev/null; then
        echo "✅ $dep"
    else
        echo "❌ $dep - FALTANDO!"
        exit 1
    fi
done

echo ""
echo "📁 Criando estrutura de diretórios..."

# Criar diretórios necessários
mkdir -p uploads/{incoming,processing,converted,expired,quarantine}
mkdir -p logs
mkdir -p temp
mkdir -p backups

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "⚙️ Criando arquivo .env..."
    cat > .env << EOF
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações de Segurança
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_MAX_SIZE=10485760
MAX_FILES_PER_HOUR=10

# Configurações do Redis (Queue System)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Configurações de PIX
PIX_API_URL=https://api.pix.example.com
PIX_API_KEY=your-pix-api-key
PIX_WEBHOOK_SECRET=your-webhook-secret

# Configurações de Email (Notificações)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Configurações de Monitoramento
ENABLE_LOGGING=true
LOG_LEVEL=info
EOF
    echo "✅ Arquivo .env criado - CONFIGURE AS VARIÁVEIS!"
else
    echo "✅ Arquivo .env já existe"
fi

echo ""
echo "🧪 Executando testes de sintaxe..."
node scripts/syntax-check.js

echo ""
echo "🎉 Setup concluído com sucesso!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "===================="
echo "1. Configure o arquivo .env com suas credenciais"
echo "2. Instale e inicie o Redis (se ainda não fez):"
echo "   redis-server"
echo ""
echo "3. Inicie o servidor de desenvolvimento:"
echo "   npm run dev"
echo ""
echo "4. Inicie o worker de processamento (em outro terminal):"
echo "   npm run worker"
echo ""
echo "5. Acesse a aplicação:"
echo "   http://localhost:3000"
echo ""
echo "📚 COMANDOS ÚTEIS:"
echo "=================="
echo "npm run start        - Produção"
echo "npm run dev          - Desenvolvimento" 
echo "npm run worker       - Worker de processamento"
echo "npm run test         - Testes automatizados"
echo "npm run lint         - Análise de código"
echo "npm run syntax-check - Verificação de sintaxe"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo "==================="
echo "- Logs do servidor: logs/app.log"
echo "- Logs de erro: logs/error.log"
echo "- Arquivos temporários: uploads/"
echo "- Status do Redis: redis-cli ping"
echo ""