# 🇧🇷 Integração Mercado Pago - Guia Completo

## 📋 Resumo

Sistema de pagamento completamente integrado com **Mercado Pago** para monetização da plataforma CannaConverter. Suporta múltiplas formas de pagamento (PIX, Cartão, etc) com webhook para confirmação automática.

## 🔧 Configuração

### 1. Obter Credenciais do Mercado Pago

1. Acesse [https://www.mercadopago.com.br/developers/dashboard](https://www.mercadopago.com.br/developers/dashboard)
2. Faça login ou crie uma conta
3. Vá para **Credenciais** → **Produção** ou **Teste**
4. Copie:
   - `Access Token` → Configure em `.env` como `MP_ACCESS_TOKEN`
   - `Public Key` → Configure em `.env` como `MP_PUBLIC_KEY`

### 2. Configurar Variáveis de Ambiente

```bash
# .env (local/desenvolvimento)
MP_ACCESS_TOKEN=TEST-5638414856465717-112709-4a3bdec3b31e62cbe16be5635d19a4ad-23974174
MP_PUBLIC_KEY=TEST-04bb6002-cc48-4e59-8fb8-21d72c204ea4
MERCADO_PAGO_ENVIRONMENT=test  # 'test' ou 'production'
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### 3. Instalar Dependências

```bash
npm install
# ou se apenas axios está faltando:
npm install axios
```

### 4. Configurar Webhook no Mercado Pago (Produção)

1. Dashboard → **Ferramentas** → **Webhooks**
2. URL do webhook: `https://seu-dominio.com/api/premium/webhook`
3. Selecione eventos:
   - `payment.created`
   - `payment.updated`
4. Salve e copie o `Webhook Secret` para `.env`

## 🚀 Fluxo de Pagamento

### Frontend (Cliente)

```
1. Usuário clica "💳 Comprar Créditos" ou "Comprar Agora"
   ↓
2. Modal abre com `openPaymentModal(amount, plan)`
   ↓
3. Click em "Pagar com Mercado Pago"
   ↓
4. `generatePixPayment()` chama POST `/api/premium/checkout`
   ↓
5. Redireciona para URL de checkout do Mercado Pago
   ↓
6. Usuário escolhe método (PIX/Cartão/etc) e paga
   ↓
7. Mercado Pago redireciona para `/pagamento/sucesso?preferenceId=...`
   ↓
8. Frontend detecta retorno e chama `checkMercadoPagoReturn()`
   ↓
9. Verifica status em POST `/api/payment/check-status`
   ↓
10. Créditos adicionados a `localStorage['userCredits']`
    ↓
11. Notificação de sucesso exibida
```

### Backend (Servidor)

```
Fluxo 1: Criação de Checkout
─────────────────────────────
POST /api/premium/checkout
├─ Recebe: { amount, plan, email, cpf }
├─ Cria preferência no Mercado Pago via mpService.createPaymentPreference()
├─ Retorna: { checkoutUrl, preferenceId, transactionId, ... }
└─ Frontend redireciona para checkoutUrl

Fluxo 2: Retorno do Pagamento
──────────────────────────────
GET /pagamento/sucesso?preferenceId=...&status=approved
├─ Redireciona para: /?payment=success&preferenceId=...
└─ Frontend detecta e verifica status

Fluxo 3: Verificação de Status
───────────────────────────────
POST /api/payment/check-status
├─ Recebe: { preferenceId }
├─ Consulta Mercado Pago: mpService.getPreferenceStatus()
├─ Se aprovado: retorna { success: true, credits: X }
└─ Frontend adiciona créditos ao localStorage

Fluxo 4: Webhook (Assíncrono)
────────────────────────────
POST /api/premium/webhook (do servidor Mercado Pago)
├─ Recebe: { type: 'payment', data: { id, status, ... } }
├─ Valida assinatura (opcional)
├─ Se status === 'approved': registra pagamento
└─ Retorna 200 OK (mesmo com erro)
```

## 📱 Estrutura de Arquivos

### Backend

```
api/
├─ server.js                      # Rotas principais
│  ├─ POST /api/premium/checkout        # Cria checkout
│  ├─ GET /pagamento/sucesso            # Retorno sucesso
│  ├─ GET /pagamento/erro               # Retorno erro
│  ├─ GET /pagamento/pendente           # Retorno pendente
│  ├─ POST /api/payment/check-status    # Verifica status
│  └─ POST /api/premium/webhook         # Webhook MP
│
└─ mercado-pago-service.js        # Classe integração MP
   ├─ createPaymentPreference()   # Cria checkout link
   ├─ createPixPayment()          # Gera PIX direto
   ├─ getPaymentStatus()          # Status de pagamento
   ├─ getPreferenceStatus()       # Status de preferência
   ├─ validateWebhook()           # Valida assinatura
   └─ processWebhook()            # Processa webhook
```

### Frontend

```
public/
└─ index.html
   └─ JavaScript Functions:
      ├─ openPaymentModal(amount, plan)      # Abre modal
      ├─ closePaymentModal()                 # Fecha modal
      ├─ generatePixPayment(amount, plan)    # Cria checkout
      ├─ checkPaymentStatus()                # Verifica status
      ├─ checkMercadoPagoReturn()            # Detecta retorno
      ├─ showSuccessNotification(msg)        # Notificação sucesso
      └─ showErrorNotification(msg)          # Notificação erro
```

## 💳 Preços e Créditos

```javascript
// Tabela de conversão
R$ 10,00 = 1 crédito
R$ 30,00 = 3 créditos
R$ 100,00 = 10 créditos

// Uso de créditos
1 conversão = 1 crédito

// Verificação de créditos
function hasEnoughCredits(requiredCredits = 1) {
    const credits = parseInt(localStorage.getItem('userCredits') || '0');
    return credits >= requiredCredits;
}

// Dedução após conversão
function deductCredits(amount = 1) {
    const credits = parseInt(localStorage.getItem('userCredits') || '0');
    const newCredits = Math.max(0, credits - amount);
    localStorage.setItem('userCredits', newCredits);
    return newCredits;
}
```

## 🧪 Testando em Desenvolvimento

### 1. Ambiente de Teste (Sandbox)

O projeto já usa credenciais de **teste** do Mercado Pago:

```bash
# .env
MERCADO_PAGO_ENVIRONMENT=test
MP_ACCESS_TOKEN=TEST-5638414856465717-...
MP_PUBLIC_KEY=TEST-04bb6002-cc48-4e59-8fb8-...
```

### 2. Cartões de Teste (PIX)

Para testar sem fazer pagamento real, use:

**PIX Dinâmico (QR Code):**
- Qualquer valor
- Escanear com Mercado Pago ou banco
- Usar dados de teste

**Cartão de Crédito:**
- Número: `4111 1111 1111 1111`
- Vencimento: `12/25`
- CVV: `123`
- Nome: Qualquer um

### 3. Simular Fluxo Completo

```bash
# Terminal 1: Iniciar servidor
npm start
# Servidor em http://localhost:3000

# Terminal 2: Clicar no navegador
# 1. Acesse http://localhost:3000
# 2. Clique em "💳 Comprar Créditos" ou "Comprar Agora"
# 3. Modal abre
# 4. Clique no botão de pagamento
# 5. Você será redirecionado para Mercado Pago (teste)
# 6. Use um dos cartões de teste acima
# 7. Complete o pagamento
# 8. Será redirecionado de volta para /pagamento/sucesso
# 9. Créditos aparecerão no localStorage
# 10. Notificação de sucesso
```

### 4. Verificar Logs

```bash
# Ver logs do servidor
pm2 logs cannaconvert.service

# Ou se rodando direto
npm start
# Procure por logs como:
# [CHECKOUT] Iniciando pagamento...
# [CHECKOUT] ✅ Preferência criada: 123456789
# [CHECK STATUS] Verificando preferência...
# [CHECK STATUS] ✅ Pagamento aprovado
```

## 🔒 Segurança

### 1. Validação de Webhook

Para ativar validação de assinatura (produção):

```javascript
// No arquivo server.js, descomente:
const isValid = mpService.validateWebhook(req.body, req.headers);
if (!isValid) {
    console.warn('[WEBHOOK MP] ⚠️ Assinatura inválida');
    return res.status(401).json({ success: false });
}
```

### 2. Boas Práticas

- ✅ Nunca expor `MP_ACCESS_TOKEN` no frontend
- ✅ Sempre validar requisições do webhook
- ✅ Armazenar créditos no backend (não localStorage)
- ✅ Usar HTTPS em produção
- ✅ Configurar CORS corretamente

## 📊 Monitoramento

### Verificar Pagamentos

```bash
# Mercado Pago Dashboard
https://www.mercadopago.com.br/admin/activity

# Ou via API (requer autenticação)
curl -X GET https://api.mercadopago.com/v1/payments/PAYMENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logs de Erros

```bash
# Procurar por
grep -i "erro\|error\|failed" logs/*.log

# Ou em tempo real
tail -f logs/application.log | grep -i "CHECKOUT\|WEBHOOK\|PAYMENT"
```

## ⚙️ Variáveis de Ambiente Completas

```bash
# Mercado Pago
MP_ACCESS_TOKEN=seu_token_aqui
MP_PUBLIC_KEY=sua_public_key_aqui
MERCADO_PAGO_ENVIRONMENT=test|production
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui

# URLs
APP_URL=https://seu-dominio.com
BACKEND_URL=https://seu-dominio.com/api

# Servidor
NODE_ENV=development|production
PORT=3000
```

## 🐛 Troubleshooting

### Erro: "Erro ao gerar código PIX"

```
❌ Causa: MP_ACCESS_TOKEN não configurado ou inválido
✅ Solução: 
   1. Verificar .env
   2. Confirmar token de teste/produção correto
   3. Reiniciar servidor: npm restart
```

### Erro: "Preferência não encontrada"

```
❌ Causa: preferenceId inválido ou expirado
✅ Solução:
   1. Verificar URL do webhook
   2. Testar novamente
   3. Verificar logs do Mercado Pago
```

### Pagamento não aparece em 5 minutos

```
❌ Causa: Webhook não foi recebido
✅ Solução:
   1. Verificar URL webhook no dashboard MP
   2. Verificar firewall/VPS
   3. Ver logs: POST /api/premium/webhook
   4. Registrar manualmente se necessário
```

### localStorage não persiste créditos

```
❌ Causa: Cookie/localStorage desabilitado ou modo incógnito
✅ Solução:
   1. Usar cookies ao invés de localStorage
   2. Backend guardar créditos em DB
   3. Sincronizar ao fazer login
```

## 📞 Suporte

- 📧 Mercado Pago: [https://support.mercadopago.com.br](https://support.mercadopago.com.br)
- 💬 Comunidade: [https://forum.mercadopago.com.br](https://forum.mercadopago.com.br)
- 🐛 Issues: Abrir issue no repositório do projeto

## 📚 Referências

- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers/pt/reference)
- [API de Pagamentos](https://www.mercadopago.com.br/developers/pt/reference/payments)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/guides/webhooks/set-up-webhook)
- [SDKs e Bibliotecas](https://www.mercadopago.com.br/developers/pt/sdks)

---

**Versão:** 1.0.0  
**Última atualização:** 2024  
**Ambiente:** Node.js + Express.js + Mercado Pago API
