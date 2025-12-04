# CannaConvert Frontend

Frontend Next.js 14+ para o sistema de conversão de arquivos.

## 🚀 Quick Start

### Pré-requisitos
- Node.js v18+
- npm ou yarn

### Instalação

```bash
# Navegar para o diretório frontend
cd frontend

# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Criar banco de dados SQLite e executar migrations
npx prisma migrate dev

# Iniciar em desenvolvimento
npm run dev
```

O frontend estará disponível em http://localhost:3000

### Build para produção

```bash
npm run build
npm start
```

## 📁 Estrutura

```
frontend/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   └── register/            # API de registro
│   ├── dashboard/               # Dashboard principal
│   ├── login/                   # Página de login
│   ├── register/                # Página de registro
│   ├── globals.css              # Estilos globais
│   ├── layout.tsx               # Layout raiz
│   └── page.tsx                 # Homepage
├── components/
│   ├── AuthProvider.tsx         # Session provider
│   ├── Button.tsx               # Botão reutilizável
│   ├── Card.tsx                 # Card component
│   ├── LogoutButton.tsx         # Botão de logout
│   └── UploadBox.tsx            # Upload drag & drop
├── lib/
│   ├── api.ts                   # Cliente API backend
│   ├── auth.ts                  # Configuração NextAuth
│   └── prisma.ts                # Prisma client
├── prisma/
│   └── schema.prisma            # Schema do banco
├── types/
│   └── next-auth.d.ts           # Types para sessão
└── middleware.ts                # Proteção de rotas
```

## 🔐 Autenticação

Sistema de autenticação com NextAuth v5:

- **Login**: Email + Senha
- **Registro**: Criação de conta com bcrypt
- **Sessão**: JWT persistente (30 dias)
- **Proteção**: Dashboard requer autenticação

### Rotas protegidas:
- `/dashboard/*` - Requer login

### Rotas públicas:
- `/` - Homepage
- `/login` - Página de login
- `/register` - Página de registro

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do frontend:

```env
# Database (SQLite)
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Backend API
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"

# Stripe Payment Integration (REQUIRED in production)
STRIPE_SECRET_KEY="sk_test_..."           # Stripe API secret key
STRIPE_WEBHOOK_SECRET="whsec_..."         # Webhook signing secret from Stripe CLI or Dashboard
STRIPE_PRICE_50="price_..."               # Price ID for 50 credits package
STRIPE_PRICE_200="price_..."              # Price ID for 200 credits package  
STRIPE_PRICE_500="price_..."              # Price ID for 500 credits package
```

### ⚠️ Production Environment Validation

In production (`NODE_ENV=production`), the app will **fail to start** if:
- `STRIPE_SECRET_KEY` is not set
- `STRIPE_WEBHOOK_SECRET` is not set

This ensures payment security in production environments.

## 💳 Stripe Webhook Integration

The webhook endpoint at `/api/credits/stripe-webhook` handles payment events from Stripe with:

### Security Features
- **Signature Verification**: All webhooks are verified using `STRIPE_WEBHOOK_SECRET`
- **Idempotency**: Duplicate events are detected and ignored (prevents double-crediting)
- **Atomic Transactions**: Credits are added in a single database transaction
- **Structured Logging**: All events are logged with correlation IDs

### Supported Events
- `checkout.session.completed` - Credits user after successful payment
- `payment_intent.payment_failed` - Logs failed payment attempts
- `charge.refunded` - Records refund events (future: auto-deduct credits)

### Testing with Stripe CLI

1. **Install Stripe CLI**:
   ```bash
   # Windows (via Scoop)
   scoop install stripe
   
   # Mac
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/credits/stripe-webhook
   ```
   
   Copy the webhook signing secret (`whsec_...`) and add to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

4. **Trigger test events**:
   ```bash
   # Basic checkout completed
   stripe trigger checkout.session.completed
   
   # With custom metadata (credits a specific user)
   stripe trigger checkout.session.completed \
     --override 'data.object.metadata[userId]=cmiqzo42u0000ey62xmk8td2u' \
     --override 'data.object.metadata[credits]=50' \
     --override 'data.object.metadata[packageId]=credits_50'
   
   # Payment failed
   stripe trigger payment_intent.payment_failed
   
   # Refund
   stripe trigger charge.refunded
   ```

5. **Verify in database**:
   ```bash
   # Check StripeEvent records
   npx prisma studio
   # Open http://localhost:5555 and check StripeEvent table
   ```

### Testing with Script

Run the included test script:
```bash
# Set required environment variables
export STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Run tests
npx ts-node scripts/test-stripe-webhook.ts

# Or with custom webhook URL
WEBHOOK_URL=http://localhost:3000/api/credits/stripe-webhook npx ts-node scripts/test-stripe-webhook.ts
```

### Webhook Metrics

GET `/api/credits/stripe-webhook` returns webhook processing metrics:
```json
{
  "service": "stripe-webhook",
  "metrics": {
    "webhookReceived": 10,
    "webhookVerified": 10,
    "webhookFailed": 0,
    "webhookDuplicate": 2,
    "creditsAdded": 8,
    "totalCreditsProcessed": 400
  },
  "timestamp": "2025-12-04T..."
}
```

## 🛠️ Scripts disponíveis

```bash
npm run dev           # Desenvolvimento (porta 3000)
npm run build         # Build de produção
npm start             # Iniciar produção
npm run lint          # Verificar código
npm run prisma:generate  # Gerar Prisma Client
npm run prisma:migrate   # Executar migrations
npm run prisma:studio    # Interface visual do banco
```

## 🎨 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **NextAuth v5** - Autenticação
- **Prisma** - ORM
- **SQLite** - Banco de dados
- **bcrypt** - Hash de senhas

## 📝 Próximas Etapas

- [ ] Etapa 3: Sistema de créditos (CannaCredits)
- [ ] Etapa 4: Histórico + Webhooks + Realtime
- [ ] Etapa 5: API pública + API Keys
- [ ] Etapa 6: Escalabilidade (Redis + Workers)
- [ ] Etapa 7: Presets Premium
