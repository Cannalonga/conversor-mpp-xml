# SaaS Core - Documentação de Integração

## 📋 Visão Geral

O **SaaS Core** implementa a arquitetura multi-tenant do projeto, permitindo:

- ✅ Gerenciamento de múltiplos usuários/clientes
- ✅ Planos/Subscriptions (Free, Pro, Enterprise)
- ✅ Rastreamento de uso (conversões por mês)
- ✅ Sistema de faturamento automático
- ✅ Isolamento de dados por usuário

## 🏗️ Arquitetura

### Modelos Prisma (Database)

1. **User** - Cliente/Usuário do platform
   - Campos: id, email, name, cpf, status, tier
   - Relações: subscriptions, usage, invoices
   
2. **Subscription** - Plano do usuário
   - Campos: planType, conversionsLimit, price, status
   - Planos: free (3 conv/mês), pro (100 conv/mês), enterprise (∞)
   
3. **Usage** - Rastreamento mensal
   - Campos: userId, month, conversionsCount, totalBytes
   - Período: YYYY-MM (agregado por mês)
   
4. **Invoice** - Faturamento
   - Campos: userId, amount, status, dueDate, paymentMethod
   - Statuses: pending, paid, failed, cancelled

### Repositórios (Data Access Layer)

```
api/saas/repositories.js
├── UserRepository (create, findById, findByEmail, update, list, countByTier)
├── SubscriptionRepository (create, getActive, upgrade, cancel, listActive, countByPlan)
├── UsageRepository (logConversion, getCurrentUsage, canConvert, getHistory, getDashboard)
└── BillingRepository (createInvoice, markAsPaid, getUserInvoices, getReport, getRevenue)
```

### Modelos/Controllers

```
api/saas/
├── models/
│   ├── user.model.js
│   ├── subscription.model.js
│   ├── usage.model.js
│   └── billing.model.js
├── controllers.js (UserController, SubscriptionController, UsageController, BillingController)
├── middleware.js (validateSaasToken, validateResourceAccess, validateConversionLimit, rateLimitByUser)
└── routes.js (POST, GET endpoints)
```

### Endpoints SaaS

#### Usuários
```
POST   /api/saas/users/register                 - Criar novo usuário (público)
GET    /api/saas/users/profile                  - Obter perfil do usuário (auth)
PUT    /api/saas/users/profile                  - Atualizar perfil (auth)
GET    /api/saas/users/list                     - Listar usuários (admin only)
```

#### Assinaturas
```
GET    /api/saas/subscriptions/active           - Obter plano ativo (auth)
POST   /api/saas/subscriptions/upgrade          - Fazer upgrade de plano (auth)
GET    /api/saas/subscriptions/list             - Listar assinaturas ativas (admin)
```

#### Uso
```
GET    /api/saas/usage/current                  - Uso do mês atual (auth)
GET    /api/saas/usage/history                  - Histórico de 12 meses (auth)
GET    /api/saas/usage/dashboard                - Dashboard de uso (admin)
```

#### Faturamento
```
GET    /api/saas/billing/invoices               - Minhas faturas (auth)
GET    /api/saas/billing/pending                - Faturas pendentes (admin)
GET    /api/saas/billing/revenue                - Receita mensal/anual (admin)
GET    /api/saas/billing/report                 - Relatório customizado (admin)
```

## 🔒 Isolamento de Dados (Multi-tenant)

### Middleware de Segurança

1. **validateSaasToken** - Verifica JWT e extrai userId
2. **validateResourceAccess** - Garante que usuário só acessa seus próprios dados
3. **validateConversionLimit** - Verifica limite de conversões antes de permitir
4. **rateLimitByUser** - Rate limiting por usuário (5 req/min)

### Exemplo de Fluxo

```javascript
// 1. Usuário faz login e recebe JWT com userId
POST /api/saas/users/register
Response: { user: { id: "cuid-123", email: "user@example.com" }, token: "eyJhbG..." }

// 2. Usuário envia token em cada requisição
GET /api/saas/usage/current
Headers: { Authorization: "Bearer eyJhbG..." }

// 3. Middleware valida token e extrai userId
// validateSaasToken: token válido? → sim
// validateResourceAccess: userId = cuid-123

// 4. Controller acessa dados do usuário 123 apenas
UsageRepository.getCurrentUsage("cuid-123")
→ Returns: { conversionsCount: 2, totalBytes: 5000000, canConvert: true, remaining: 1 }
```

## 💳 Fluxo de Pagamento SaaS

```mermaid
1. Usuário se registra
   POST /api/saas/users/register
   → Cria User com tier: "free"
   → Cria Subscription planType: "free"

2. Usuário faz conversão
   POST /api/convert
   → validateConversionLimit: canConvert(userId)?
   → Sim: inicia conversão
   → UsageRepository.logConversion() incrementa counter

3. Usuário atinge limite (3 conversões no free)
   POST /api/convert
   → validateConversionLimit: can Convert(userId)?
   → Não: "Conversion limit exceeded"
   → Sugerir upgrade para PRO

4. Usuário faz upgrade
   POST /api/saas/subscriptions/upgrade { planType: "pro" }
   → SubscriptionRepository.upgrade()
   → Cancela assinatura anterior
   → Cria nova assinatura PRO (100 conversões)
   → BillingRepository.createInvoice() cria fatura de R$ 99,90

5. Sistema monitora pagamento
   GET /api/saas/billing/pending (admin)
   → Retorna invoices não pagas

6. Webhook de pagamento confirmado
   POST /webhook/payment
   → BillingRepository.markAsPaid(invoiceId)
   → Subscription agora com 100 conversões disponíveis
```

## 📊 Dashboards Admin

### Revenue Dashboard
```
GET /api/saas/billing/revenue
Response: {
  month: "2024-11",
  monthlyRevenue: 4999.50,
  yearlyRevenue: 24998.75,
  pendingCount: 5,
  pendingAmount: 499.50
}
```

### Usage Dashboard
```
GET /api/saas/usage/dashboard
Response: {
  month: "2024-11",
  totalConversions: 1250,
  totalBytes: 5368709120,
  topUsers: [
    { user: {...}, conversionsCount: 45 },
    { user: {...}, conversionsCount: 38 },
    ...
  ]
}
```

### Relatório Customizado
```
GET /api/saas/billing/report?startDate=2024-01-01&endDate=2024-11-30
Response: {
  invoices: [...],
  summary: {
    total: 523,
    paid: 490,
    pending: 20,
    failed: 13,
    totalAmount: 15234.50,
    paidAmount: 14235.00
  }
}
```

## 🔄 Integração com Conversor MPP

### Na criação do Conversion

```javascript
// api/conversion-service.js - startConversion()

// 1. Validar limite
const canConvert = await UsageRepository.canConvert(fileId);
if (!canConvert.allowed) {
  throw new Error(canConvert.reason);
}

// 2. Iniciar conversão
const conversion = await FileRepository.createConversion(transactionId, {
  filename, size, hash
});

// 3. Processar arquivo
// ... (conversão real do MPP para XML)

// 4. Registrar uso
await UsageRepository.logConversion(userId, {
  filename,
  size,
  hash,
  status: 'completed'
});

// 5. Retornar resultado
return { success: true, downloadUrl: `/api/download/${hash}` };
```

## 🚀 Próximas Fases

### Fase 2: Webhook Integration (Mercado Pago)
- [ ] Integrar webhook de pagamento do Mercado Pago
- [ ] Auto-upgrade de subscription ao receber confirmação
- [ ] Email de confirmação de pagamento

### Fase 3: Frontend SaaS
- [ ] Dashboard do usuário (visualizar uso, plano, invoices)
- [ ] Página de upgrade de plano
- [ ] Histórico de conversões
- [ ] Gerenciador de conta

### Fase 4: Analytics & Reports
- [ ] Gráficos de uso ao longo do tempo
- [ ] Relatórios de ROI para admin
- [ ] Exportação de dados (CSV/PDF)

## 📝 Variáveis de Ambiente

```env
# Database
DATABASE_URL=file:./prisma/dev.db

# JWT
JWT_SECRET=sua-chave-super-secreta

# Admin
ADMIN_USER=admin
ADMIN_PASS=senha-admin
ADMIN_EMAIL_2FA=admin@example.com

# SaaS
SAAS_ENABLED=true
```

## 🧪 Teste de Integração

```bash
# 1. Registrar novo usuário
curl -X POST http://localhost:3000/api/saas/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com", "name":"Test User"}'

# 2. Obter token (do registro acima)

# 3. Verificar uso
curl -X GET http://localhost:3000/api/saas/usage/current \
  -H "Authorization: Bearer eyJhbG..."

# 4. Fazer upgrade
curl -X POST http://localhost:3000/api/saas/subscriptions/upgrade \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"planType":"pro"}'

# 5. Verificar invoice criada
curl -X GET http://localhost:3000/api/saas/billing/invoices \
  -H "Authorization: Bearer eyJhbG..."
```

---

**Status**: ✅ Implementação Completa - SaaS Core v1.0
**Última atualização**: 2024-11-20
**Próximo passo**: Integrar com server-new.js e testar fluxo completo
