# 🚀 Conversor MPP para XML - Sistema Enterprise

[![Status](https://img.shields.io/badge/Status-Produção-green.svg)](http://localhost:3000)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-blue.svg)](https://nodejs.org/)
[![PM2](https://img.shields.io/badge/PM2-Enabled-brightgreen.svg)](https://pm2.keymetrics.io/)

> Sistema profissional para conversão de arquivos Microsoft Project (.mpp) para XML com interface web moderna, controle financeiro e painel administrativo completo.

## 📋 Características Principais

### ✨ Funcionalidades Core
- **Conversão MPP → XML** - Interface web intuitiva
- **Upload Seguro** - Validação de arquivos e rate limiting  
- **Download Automático** - Arquivos XML gerados instantaneamente
- **Sistema de Cobrança** - R$ 10,00 por conversão
- **Disclaimer Transparente** - Informações sobre limitações técnicas

### 🛡️ Segurança Enterprise
- **Autenticação Admin** - Login protegido com credenciais
- **Rate Limiting** - Proteção contra abuso de API
- **Validação de Arquivos** - Verificação de tipos e tamanhos
- **Logs Centralizados** - Monitoramento completo de atividades

### 💰 Sistema Financeiro
- **Controle de Receitas** - Rastreamento automático de transações
- **Calculadora IR 2025** - Tabelas atualizadas do Imposto de Renda
- **Relatórios Detalhados** - Estatísticas diárias, mensais e anuais
- **Dashboard Administrativo** - Interface completa de gestão

### 🏢 SaaS Multi-Tenant (Novo!)
- **Autenticação por Cliente** - Cada usuário tem sua conta
- **Planos Flexíveis** - Free / Pro / Enterprise
- **Limite de Conversões** - Configurável por plano
- **Isolamento de Dados** - Cada tenant vê apenas seus dados
- **Faturamento Automático** - Integrado com PIX
- **Dashboard do Cliente** - Uso e histórico de conversões

### 🔧 Infraestrutura de Produção
- **PM2 Process Manager** - Estabilidade e auto-restart
- **Zero Downtime** - Sistema robusto para produção
- **Logs Persistentes** - Monitoramento e debugging
- **Scripts de Deploy** - Inicialização automática

## 🚀 Setup Enxuto (Desenvolvimento & Produção)

### Pré-Requisitos
- Node.js v20+
- Docker (para Redis)
- Git

### 1️⃣ Clonar e Configurar
```bash
# Clonar repositório
git clone https://github.com/Cannalonga/conversor-mpp-xml.git
cd conversor-mpp-xml

# Criar .env a partir do exemplo
cp .env.example .env

# Editar .env com suas configurações
# - ALLOWED_ORIGINS (ex: http://localhost:3000,https://seu-dominio.com)
# - ADMIN_USERNAME e ADMIN_PASSWORD_HASH (bcrypt)
# - PIX_KEY (se usar PIX)
# - REDIS_URL (ex: redis://localhost:6379)
# - PORT (padrão 3000)
nano .env  # ou use seu editor favorito
```

### 2️⃣ Instalar Dependências
```bash
npm install
```

### 3️⃣ Subir Redis (Local com Docker)
```bash
# Iniciar container Redis
docker run -d -p 6379:6379 --name conv-redis redis:6

# Verificar se está rodando
docker ps | grep conv-redis
```

### 4️⃣ Modo Desenvolvimento (Com Logs Ao Vivo)
```bash
# Terminal 1: API + Frontend
npm run dev

# Terminal 2: Worker (em outro terminal)
npm run worker

# Acessar
# - Frontend: http://localhost:3000
# - Admin: http://localhost:3000/admin
# - Health: http://localhost:3000/api/health
```

### 5️⃣ Modo Produção (Com PM2)
```bash
# Iniciar todos os processos
pm2 start ecosystem.config.json --env production

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs mpp-converter-prod

# Parar serviço
pm2 stop mpp-converter-prod

# Reiniciar
pm2 restart mpp-converter-prod

# Salvar configuração de inicialização automática
pm2 save
```

---

## ✅ Checklist de Validação

Antes de colocar em produção, valide cada ponto:

### 1. CORS
```bash
# ✓ Requisição do domínio autorizado funciona
curl -H "Origin: http://seu-dominio.com" http://localhost:3000/api/health

# ✓ Requisição de outro domínio é bloqueada
curl -H "Origin: http://outro-dominio.com" http://localhost:3000/api/health
# → Deve retornar erro CORS
```

### 2. Rate Limiting
```bash
# ✓ Fazer 5 uploads rápidos do mesmo IP
for i in {1..5}; do curl -X POST -F "file=@arquivo.mpp" http://localhost:3000/api/upload; done

# ✓ 6ª requisição deve retornar 429 (Too Many Requests)
curl -X POST -F "file=@arquivo.mpp" http://localhost:3000/api/upload
# → Status: 429, Retry-After: 60
```

### 3. PIX / Pagamento
```bash
# ✓ Gerar QR Code PIX
curl -X POST http://localhost:3000/api/payment/pix \
  -H "Content-Type: application/json" \
  -d '{"fileName": "projeto.mpp", "amount": 10.00}'

# ✓ Response contém qrCode e pixKey AUSENTE (por segurança)
# ✓ Ler QR com app de banco
```

### 4. Worker / Timeout
```bash
# ✓ Upload arquivo válido
# → Job deve aparecer na fila (Redis)
# → Worker processa em < 5 minutos
# → Arquivo aparece em uploads/converted/

# ✓ Se worker travar, timeout em 5 min mata o job
# → Log indica: "Job timeout after 300000ms"
# → Fila continua processando novos jobs
```

### 5. Download Token Expirado
```bash
# ✓ Fazer conversão (gera link com token)
# ✓ Copiar URL de download
# ✓ Esperar DOWNLOAD_TOKEN_EXPIRY (ex: 15 min)
# ✓ Tentar usar o link de novo
# → Deve retornar 401: "Token expirado"
```

### 6. Logs e Rotação
```bash
# ✓ Verificar pasta logs/
ls -la logs/

# ✓ Deve ter arquivos tipo: app-2025-11-20.log (por data)
# ✓ Arquivos de 14 dias atrás foram deletados
# ✓ Nenhum arquivo com > 10MB (max size)

# ✓ Ver logs em tempo real
tail -f logs/app-*.log
```

---

## 🛡️ Segurança - Checklist Pré-Deploy

- [ ] Credenciais ADMIN_USER/ADMIN_PASSWORD_HASH alteradas no .env
- [ ] ALLOWED_ORIGINS configurado (não usar * em produção)
- [ ] JWT_SECRET_KEY gerada com 64 caracteres aleatórios
- [ ] ENCRYPTION_KEY configurada (32 bytes)
- [ ] PIX_KEY removida do código (apenas em .env)
- [ ] SSL/HTTPS ativado (nginx reverse proxy)
- [ ] Rate limiting testado
- [ ] Logs sendo rotacionados corretamente
- [ ] Backup de uploads/ configurado
- [ ] .env adicionado ao .gitignore (verificar)

---

## 🚀 Variáveis de Ambiente Obrigatórias

```bash
# === SERVIDOR ===
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# === BANCO DE DADOS ===
DATABASE_URL=file:./prisma/dev.db  # SQLite dev, PostgreSQL prod

# === SEGURANÇA ===
JWT_SECRET_KEY=<64_hex_chars_aleatorios>
JWT_EXPIRATION_HOURS=24
SESSION_SECRET=<32_hex_chars_aleatorios>
ENCRYPTION_KEY=<32_hex_chars_aleatorios>

# === ADMIN ===
ADMIN_USERNAME=seu_usuario_admin
ADMIN_PASSWORD_HASH=<bcrypt_hash_sua_senha>

# === CORS ===
ALLOWED_ORIGINS=http://localhost:3000,https://seu-dominio.com

# === REDIS ===
REDIS_URL=redis://localhost:6379

# === TAXA/COBRANÇA ===
PAYMENT_AMOUNT=10.00

# === LOGGING ===
LOG_LEVEL=info
LOG_MAX_FILES=14d

# === RATE LIMITING ===
RATE_LIMIT_GLOBAL=100
RATE_LIMIT_UPLOAD=5

# === FILA ===
JOB_TIMEOUT_MS=300000
```

---

## 🏢 SaaS API (Multi-Tenant)

### Endpoints de Autenticação
```bash
# Registrar novo cliente
POST /api/saas/users/register
Content-Type: application/json

{
  "email": "cliente@example.com",
  "name": "João Silva",
  "cpf": "12345678901"
}

Response: 201 Created
{
  "success": true,
  "user": {
    "id": "xxx",
    "email": "cliente@example.com",
    "tier": "free",
    "status": "active"
  }
}
```

### Endpoints de Perfil (Autenticado)
```bash
# Obter perfil do cliente
GET /api/saas/users/profile
Authorization: Bearer {JWT_TOKEN}

# Atualizar perfil
PUT /api/saas/users/profile
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
{
  "name": "João Silva Updated",
  "phone": "11999999999"
}
```

### Endpoints de Assinatura
```bash
# Obter assinatura ativa
GET /api/saas/subscriptions/active
Authorization: Bearer {JWT_TOKEN}

# Fazer upgrade de plano
POST /api/saas/subscriptions/upgrade
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
{
  "planType": "pro"  # free | pro | enterprise
}

Response: 200 OK
{
  "success": true,
  "subscription": {
    "planType": "pro",
    "conversionsLimit": 100,
    "billingCycle": "monthly",
    "price": 29.90
  }
}
```

### Endpoints de Uso
```bash
# Obter uso do mês atual
GET /api/saas/usage/current
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{
  "success": true,
  "usage": {
    "month": "2025-11",
    "conversionsCount": 45,
    "conversionsLimit": 100,
    "percentageUsed": 45,
    "totalBytes": 1024000
  }
}
```

### Endpoints de Faturamento
```bash
# Listar faturas
GET /api/saas/billing/invoices
Authorization: Bearer {JWT_TOKEN}

# Obter faturas em aberto
GET /api/saas/billing/pending
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{
  "success": true,
  "invoices": [
    {
      "id": "inv_xxx",
      "amount": 29.90,
      "status": "pending",
      "dueDate": "2025-12-20",
      "pixQrCode": "base64...",
      "pixCopyPaste": "00020126..."
    }
  ]
}
```

### Planos Disponíveis

| Plano | Preço | Conversões/mês | Suporte |
|-------|-------|-----------------|---------|
| **Free** | R$ 0,00 | 0 (Demo) | Comunitário |
| **Pro** | R$ 29,90 | 100 | Email |
| **Enterprise** | Customizado | Ilimitado | Dedicado |


## 🔐 Credenciais de Admin

### ⚠️ Segurança Crítica

**NUNCA** commite credenciais reais no repositório. Use **apenas** variáveis de ambiente:

```bash
# .env (arquivo local, adicionar ao .gitignore)
ADMIN_USERNAME=seu_usuario_admin
ADMIN_PASSWORD_HASH=<bcrypt_hash_gerado_localmente>
```

### Como Gerar Hash Seguro
```bash
# Execute localmente APENAS (não no repositório)
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('SUA_SENHA_SUPER_FORTE_AQUI',12).then(h=>console.log('Hash:',h))"
```

### Recursos de Segurança
- ✅ **Env Variables Only** - Credenciais nunca hardcoded
- ✅ **2FA via Email** - Autenticação de dois fatores
- ✅ **Logs de Acesso** - Monitoramento de tentativas
- ✅ **Token-Based Auth** - JWT com timeout configurável
- ✅ **Rate Limiting** - Proteção contra brute force

---

## 🏗️ Estrutura do Projeto

```
📦 conversor-mpp-xml/
├── 📁 api/                    # Backend Node.js
│   ├── server-minimal.js      # Servidor principal
│   └── ...
├── 📁 public/                 # Frontend
│   ├── index.html            # Interface principal
│   ├── 📁 css/
│   │   └── style.css         # Estilos responsivos
│   └── 📁 js/
│       └── app_clean_new.js   # JavaScript principal
├── 📁 admin/                  # Painel Administrativo
│   ├── login.html            # Página de login
│   └── dashboard.html        # Dashboard completo
├── 📁 uploads/                # Diretório de arquivos
│   ├── 📁 incoming/          # Arquivos recebidos
│   ├── 📁 converted/         # XMLs gerados
│   ├── 📁 processing/        # Em processamento
│   └── 📁 expired/           # Arquivos expirados
├── 📁 logs/                   # Logs do sistema
├── ecosystem.config.json     # Configuração PM2
├── package.json              # Dependências Node.js
├── restart-completo.bat      # Script de inicialização
└── README.md                 # Esta documentação
```

## ⚙️ Configuração de Produção

### Variáveis de Ambiente
```bash
# Opcional: Credenciais admin customizadas
ADMIN_USER=seu_usuario
ADMIN_PASS=sua_senha_super_segura

# Opcional: Configurações do servidor
PORT=3000
NODE_ENV=production
```

### Comandos PM2
```bash
# Status do sistema
pm2 status

# Logs em tempo real
pm2 logs mpp-converter-prod

# Reiniciar serviço
pm2 restart mpp-converter-prod

# Parar serviço
pm2 stop mpp-converter-prod

# Salvar configuração
pm2 save
```

## 📊 Painel Administrativo

### Funcionalidades do Dashboard
1. **Estatísticas em Tempo Real**
   - Conversões do dia
   - Total de arquivos processados
   - Status do servidor
   - Uso de disco

2. **Gestão Financeira**
   - Receita total e diária
   - Calculadora de IR 2025
   - Histórico de transações
   - Relatórios exportáveis

3. **Monitoramento**
   - Logs do sistema em tempo real
   - Atividade recente
   - Gestão de arquivos
   - Configurações do servidor

## 🚀 Deploy em Produção

### Checklist de Produção
- [ ] Credenciais admin alteradas
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] DNS apontando corretamente

### Problemas Comuns
1. **Porta em uso:** Altere a porta no `ecosystem.config.json`
2. **Falha no PM2:** Reinstale com `npm install -g pm2`
3. **Erro 500:** Verifique logs com `pm2 logs`
4. **Admin não carrega:** Limpe localStorage do navegador

## 📝 Changelog

### v2.0 - SaaS Core (20/11/2025)
- ✅ Arquitetura multi-tenant completa
- ✅ Autenticação por cliente (User Model)
- ✅ Planos flexíveis (Free/Pro/Enterprise)
- ✅ Limite de conversões por plano
- ✅ Isolamento de dados por tenant
- ✅ API SaaS com 15+ endpoints
- ✅ Middleware de segurança multi-tenant
- ✅ Faturamento automático integrado
- ✅ Dashboard de uso para clientes
- ✅ Prisma ORM com migrations
- ✅ Tests automatizados para SaaS

### v1.0 (13/11/2025)
- ✅ Sistema completo de conversão MPP → XML
- ✅ Interface web moderna e responsiva  
- ✅ Painel administrativo com autenticação
- ✅ Sistema financeiro com calculadora IR 2025
- ✅ Infraestrutura PM2 para produção
- ✅ Segurança com rate limiting
- ✅ Disclaimer transparente sobre limitações

---

**🏆 Sistema Enterprise Completo - Pronto para Produção! 🏆**

*Desenvolvido em Novembro 2025*