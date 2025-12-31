# 🔐 Configuração Segura de Credenciais Mercado Pago

## ⚠️ IMPORTANTE: Segurança

**NUNCA** committe credenciais reais no repositório!

- ❌ Não adicione chaves reais ao `.env`
- ❌ Não faça commit de `.env` com credenciais
- ❌ Não compartilhe chaves em mensagens/chat
- ✅ Use variáveis de ambiente no servidor
- ✅ Armazene credenciais em gestor seguro
- ✅ Rotacione chaves regularmente

---

## 📋 Obter Credenciais do Mercado Pago

### 1. Acessar Dashboard
1. Vá para: https://www.mercadopago.com.br/developers/dashboard
2. Faça login com sua conta Mercado Pago
3. Selecione **Credenciais**

### 2. Copiar Access Token e Public Key

**Para Desenvolvimento (Sandbox):**
- Type: `Teste`
- Access Token (começa com `TEST-`)
- Public Key (começa com `TEST-`)

**Para Produção (Real):**
- Type: `Produção`
- Access Token (sem prefixo `TEST-`)
- Public Key (sem prefixo `TEST-`)

---

## 🖥️ Configurar no Servidor (Linux)

### Opção 1: Variáveis de Ambiente (Recomendado)

```bash
# 1. Criar arquivo seguro de credenciais (não versionado)
sudo nano /opt/cannaconvert/.env.production

# 2. Adicionar:
MP_ACCESS_TOKEN=APP_USR-1234567890123456-abcdefgh
MP_PUBLIC_KEY=APP_USR-1234567890123456-abcdefgh
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
MERCADO_PAGO_ENVIRONMENT=production

# 3. Salvar permissões
sudo chmod 600 /opt/cannaconvert/.env.production

# 4. No PM2/systemctl, carregar o arquivo:
# pm2 start ecosystem.config.js --env production
```

### Opção 2: Secrets do PM2

```bash
# 1. Configurar via PM2
pm2 set MP_ACCESS_TOKEN "APP_USR-xxxxx"
pm2 set MP_PUBLIC_KEY "APP_USR-xxxxx"
pm2 set MERCADO_PAGO_WEBHOOK_SECRET "seu_secret"

# 2. Verificar
pm2 conf

# 3. Reiniciar
pm2 restart cannaconvert.service
```

### Opção 3: Docker Secrets (Mais Seguro)

```bash
# 1. Se usar Docker, criar secret:
echo "APP_USR-xxxxx" | docker secret create mp_access_token -

# 2. No docker-compose.yml:
services:
  api:
    secrets:
      - mp_access_token
    environment:
      MP_ACCESS_TOKEN_FILE: /run/secrets/mp_access_token
```

---

## 🔧 Verificar Configuração

```bash
# SSH no servidor
ssh root@seu-servidor

# Testar se variáveis estão carregadas
echo $MP_ACCESS_TOKEN

# Se vazio, adicionar ao perfil de shell
echo 'export MP_ACCESS_TOKEN="APP_USR-xxxxx"' >> ~/.bashrc
source ~/.bashrc

# Testar token com curl
curl -X GET https://api.mercadopago.com/v1/payments \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  | head -n 20
```

---

## 🛡️ Melhores Práticas

### 1. Arquivo `.env` Local
```bash
# Para desenvolvimento local APENAS
# NUNCA commitar no Git
MP_ACCESS_TOKEN=TEST-xxxxx  # Credencial de TESTE
MP_PUBLIC_KEY=TEST-xxxxx
```

### 2. Arquivo `.gitignore`
```
# Garantir que .env nunca é versionado
.env
.env.*.local
.env.production
.env.production.local
```

### 3. Rotação de Credenciais
```bash
# A cada 3-6 meses, gerar novas chaves:
1. Dashboard Mercado Pago → Credenciais
2. Clique em "Regenerar"
3. Copie a nova chave
4. Atualize no servidor
5. Teste antes de usar em produção
```

### 4. Monitoramento
```bash
# Verificar uso de credenciais nos logs
grep "MP_ACCESS_TOKEN\|Authorization" logs/*.log

# Alertar se credencial aparecer em erro
grep -i "error\|failed" logs/*.log | grep -v "User\|Auth"
```

---

## 📦 Configurar via Arquivo .env.example

Para documentar QUAIS variáveis são necessárias sem expor os valores:

```bash
# .env.example (COMMIT ISTO)
# Copie este arquivo para .env e preencha com valores reais

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxx-xxxxxxxx
MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxx-xxxxxxxx
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
MERCADO_PAGO_ENVIRONMENT=production

# URLs
APP_URL=https://seu-dominio.com
BACKEND_URL=https://seu-dominio.com
```

---

## 🚨 Em Caso de Exposição de Credencial

Se uma chave foi acidentalmente commitada:

```bash
# 1. IMEDIATAMENTE invalidar no Mercado Pago
#    Dashboard → Credenciais → Regenerar

# 2. Remover do Git History
git filter-branch --tree-filter 'rm -f .env' HEAD
# OU
git-filter-repo --invert-paths --path .env

# 3. Force push (cuidado!)
git push origin --force-with-lease

# 4. Notificar equipe
# Avisar que credenciais foram trocadas
```

---

## 📝 Checklist de Segurança

- [ ] `.env` está no `.gitignore`
- [ ] Credenciais reais NÃO estão no repositório
- [ ] Arquivo `.env.example` criado com placeholders
- [ ] Credenciais configuradas no servidor via variáveis
- [ ] Permissões de arquivo: `chmod 600 .env` (servidor)
- [ ] Logs não expõem credenciais
- [ ] HTTPS ativado (não HTTP)
- [ ] Webhook secret configurado
- [ ] Webhook URL registrada no Mercado Pago
- [ ] Acesso ao Mercado Pago é 2FA protegido

---

## 🔗 Links Úteis

- [Painel Mercado Pago](https://www.mercadopago.com.br/developers/dashboard)
- [Gerenciar Credenciais](https://www.mercadopago.com.br/settings/account/credentials)
- [Webhooks - Configurar](https://www.mercadopago.com.br/developers/panel)
- [Documentação API](https://www.mercadopago.com.br/developers/pt/reference)

---

**Status:** ✅ Seguro  
**Última atualização:** 2024  
**Responsável:** Seu Time
