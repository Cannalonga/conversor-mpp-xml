#!/bin/bash
# 🔐 Script de Varredura e Limpeza de Segredos - Proteção Total
# Este script faz auditoria profunda e remove dados sensíveis expostos

set -e  # Sair em caso de erro

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Header
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔐 AUDITOR DE SEGURANÇA - VARREDURA DE CREDENCIAIS           ║"
echo "║     Detecta e remove dados sensíveis expostos                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar .gitignore
log_info "1️⃣  Verificando .gitignore..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    log_warning ".env não está em .gitignore!"
    echo ".env" >> .gitignore
    log_success "Adicionado .env ao .gitignore"
fi

if ! grep -q "^\.env\." .gitignore 2>/dev/null; then
    log_warning "Padrões .env.* não estão em .gitignore"
    cat >> .gitignore << EOF
.env.local
.env.*.local
.env.*.backup*
.env.backup*
EOF
    log_success "Adicionados padrões .env.* ao .gitignore"
fi

# 2. Verificar histórico Git
log_info "2️⃣  Verificando histórico Git para arquivos .env..."
SUSPICIOUS_COMMITS=$(git log --all --pretty=format:"%H %s" -- "*.env" 2>/dev/null || echo "")

if [ ! -z "$SUSPICIOUS_COMMITS" ]; then
    log_warning "Encontrados commits que modificam .env:"
    echo "$SUSPICIOUS_COMMITS" | head -5
    
    log_warning "Verifique se contêm dados sensíveis:"
    git show HEAD:".env" 2>/dev/null | head -10 || echo "  (arquivo pode não existir ou estar deletado)"
fi

# 3. Buscar strings sensíveis em arquivos versionados
log_info "3️⃣  Buscando por padrões de credenciais em versionamento..."

PATTERNS=(
    "password.*="
    "secret.*="
    "api_key.*="
    "token.*="
    "credentials.*="
    "sk_live_"
    "sk_test_"
    "pk_live_"
    "pk_test_"
    "APP_USR-"
    "admin@"
    "ADMIN_PASSWORD"
    "JWT_SECRET.*[a-zA-Z0-9]{20,}"
)

FOUND_ISSUES=0

for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(git grep -i "$pattern" -- "*.json" "*.js" "*.ts" "*.yml" "*.yaml" 2>/dev/null || echo "")
    
    if [ ! -z "$MATCHES" ]; then
        log_warning "Encontrado padrão '$pattern' em arquivos:"
        echo "$MATCHES" | head -3
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

if [ $FOUND_ISSUES -gt 0 ]; then
    log_error "Encontrados $FOUND_ISSUES tipos de padrões sensíveis!"
else
    log_success "Nenhum padrão óbvio de credencial encontrado"
fi

# 4. Verificar arquivos .env* existentes
log_info "4️⃣  Auditando arquivos .env* no disco..."

ENV_FILES=$(find . -name ".env*" -type f 2>/dev/null | grep -v node_modules | grep -v ".git" || echo "")

if [ ! -z "$ENV_FILES" ]; then
    log_warning "Arquivos .env encontrados:"
    echo "$ENV_FILES" | while read file; do
        if grep -E "(password|secret|key|token).*=" "$file" -i > /dev/null 2>&1; then
            # Contar linhas com possíveis credenciais
            COUNT=$(grep -E "(password|secret|key|token).*=" "$file" -ic)
            log_warning "  $file - $COUNT linhas com possíveis credenciais"
        else
            log_success "  $file - Apenas placeholders (seguro)"
        fi
    done
fi

# 5. Verificar credenciais na memória de ambiente
log_info "5️⃣  Verificando variáveis de ambiente ativas..."

ENV_VARS_TO_CHECK=(
    "JWT_SECRET"
    "API_KEY"
    "DATABASE_PASSWORD"
    "STRIPE_SECRET_KEY"
    "MERCADO_PAGO_ACCESS_TOKEN"
    "NEXTAUTH_SECRET"
)

for var in "${ENV_VARS_TO_CHECK[@]}"; do
    if [ ! -z "${!var}" ]; then
        VALUE_LENGTH=${#!var}
        log_warning "Variável $var está definida (${VALUE_LENGTH} chars)"
    fi
done

# 6. Verificar .git/config para URLs sensíveis
log_info "6️⃣  Verificando .git/config..."

if grep -E "username|password|token" .git/config 2>/dev/null; then
    log_error ".git/config contém credenciais!"
    log_warning "Use Git Credential Manager ou SSH keys"
else
    log_success ".git/config não contém credenciais óbvias"
fi

# 7. Varredura de backup files
log_info "7️⃣  Procurando arquivos de backup perigosos..."

BACKUP_FILES=$(find . \( -name ".env*.bak" -o -name ".env*.backup" -o -name ".env~" \) 2>/dev/null || echo "")

if [ ! -z "$BACKUP_FILES" ]; then
    log_warning "Encontrados arquivos de backup:"
    echo "$BACKUP_FILES"
    
    read -p "Deseja deletar estes arquivos? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "$BACKUP_FILES" | xargs rm -v
        log_success "Arquivos de backup removidos"
    fi
fi

# 8. Gerar relatório
log_info "8️⃣  Gerando relatório de segurança..."

REPORT_FILE=".security-audit-$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
╔════════════════════════════════════════════════════════════════╗
║  RELATÓRIO DE AUDITORIA DE SEGURANÇA
║  Data: $(date)
╚════════════════════════════════════════════════════════════════╝

1. ARQUIVOS .env DETECTADOS
   $(echo "$ENV_FILES" | wc -l) arquivo(s) encontrado(s)

2. HISTÓRICO GIT
   Commits que modificam .env: $(echo "$SUSPICIOUS_COMMITS" | wc -l)

3. PADRÕES ENCONTRADOS
   Tipos de padrões: $FOUND_ISSUES

4. STATUS GITIGNORE
   .env em .gitignore: $(grep -q "^\.env$" .gitignore && echo "SIM" || echo "NÃO")

5. RECOMENDAÇÕES
   - Use .env.example para versionamento (apenas placeholders)
   - Configure Secret Manager (AWS/Vault/Google/Azure)
   - Implemente rotação automática de secrets
   - Use pré-commit hooks para detecção
   - Faça auditoria regular (semanal)

6. PRÓXIMOS PASSOS
   1. Revisar arquivos .env locais
   2. Configurar Secret Manager em produção
   3. Rodar auditoria novamente: bash $0
   4. Implementar pipeline de CI/CD com detecção

EOF

log_success "Relatório gerado: $REPORT_FILE"
cat "$REPORT_FILE"

# 9. Sumário Final
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  RESUMO DA AUDITORIA                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ $FOUND_ISSUES -eq 0 ] && [ -z "$ENV_FILES" ]; then
    log_success "✨ SISTEMA SEGURO - Nenhuma exposição detectada"
else
    log_warning "⚠️  Atenção necessária - Verifique recomendações acima"
fi

echo ""
log_info "Auditoria concluída em $(date)"
echo ""
