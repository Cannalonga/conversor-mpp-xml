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

## 🚀 Quick Start

### 1. Inicialização Rápida
```bash
# Execute o script automático
restart-completo.bat
```

### 2. Inicialização Manual
```bash
# Navegar para o diretório
cd "C:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"

# Iniciar com PM2
pm2 start ecosystem.config.json --env production

# Verificar status
pm2 status
```

### 3. Acessar o Sistema
- **Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Health Check:** http://localhost:3000/api/health
- **SaaS API:** http://localhost:3000/api/saas/

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

### Acesso do Proprietário
Credenciais do administrador estão configuradas via **variáveis de ambiente**:

```bash
# .env (não commitar com valores reais!)
ADMIN_USER=seu_usuario_admin
ADMIN_PASS=sua_senha_super_segura
ADMIN_EMAIL_2FA=seu_email@example.com
```

### Recursos de Segurança
- **Autenticação via Variáveis de Ambiente** - Nunca hardcode credenciais
- **2FA via Email** - Notificações de login (configurável em .env)
- **Logs de acesso** - Monitoramento completo de tentativas de login
- **Sessão segura** - Token-based authentication com timeout

> ⚠️ **IMPORTANTE:** 
> - Credenciais nunca devem ser commitadas no repositório
> - Use `.env.example` como template e preencha `.env` localmente
> - Em produção, configure via variáveis de ambiente do servidor

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