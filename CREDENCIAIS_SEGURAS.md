# 🔐 Guia Rápido - Credenciais Seguras

## ✅ Status Atual

- ✅ `.env` está no `.gitignore` (protegido)
- ✅ `.env.example` criado com placeholders (seguro para git)
- ✅ Credenciais removidas do repositório
- ✅ Documentação de segurança criada

## 🚀 Próximos Passos

### 1. Obter Credenciais do Mercado Pago

**Você precisa acessar:**
https://www.mercadopago.com.br/settings/account/credentials

**Copiar:**
- `MP_ACCESS_TOKEN` (chave de acesso)
- `MP_PUBLIC_KEY` (chave pública)
- `MERCADO_PAGO_WEBHOOK_SECRET` (secret do webhook)

### 2. Configurar Localmente (Desenvolvimento)

```bash
# Copiar exemplo
cp .env.example .env

# Abrir e preencher com suas credenciais REAIS
nano .env
# ou
code .env
```

Preencher:
```
MP_ACCESS_TOKEN=APP_USR-sua_chave_real
MP_PUBLIC_KEY=APP_USR-sua_chave_publica_real
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret
```

### 3. Configurar no Servidor (Produção)

Não coloque credenciais no arquivo `.env` do servidor. Use:

**Opção A: Variáveis de Ambiente (Melhor)**
```bash
# SSH no servidor
ssh root@seu-servidor

# Adicionar ao shell profile
echo 'export MP_ACCESS_TOKEN="APP_USR-xxxxx"' >> ~/.bashrc
echo 'export MP_PUBLIC_KEY="APP_USR-xxxxx"' >> ~/.bashrc
source ~/.bashrc

# Verificar
echo $MP_ACCESS_TOKEN
```

**Opção B: PM2 (Se usar PM2)**
```bash
pm2 set MP_ACCESS_TOKEN "APP_USR-xxxxx"
pm2 set MP_PUBLIC_KEY "APP_USR-xxxxx"
pm2 restart cannaconvert.service
```

**Opção C: systemd (Se usar systemctl)**
```bash
# Editar serviço
sudo systemctl edit cannaconvert

# Adicionar:
[Service]
Environment="MP_ACCESS_TOKEN=APP_USR-xxxxx"
Environment="MP_PUBLIC_KEY=APP_USR-xxxxx"

# Reiniciar
sudo systemctl restart cannaconvert
```

### 4. Testar Configuração

```bash
# Verificar se variável está carregada
node -e "console.log(process.env.MP_ACCESS_TOKEN)"

# Deve exibir: APP_USR-xxxxx (não vazio)
```

## 📋 Checklist de Segurança

- [ ] Credenciais reais NÃO estão em arquivo `.env` do repositório
- [ ] `.env` está no `.gitignore`
- [ ] `.env.example` tem apenas placeholders
- [ ] Credenciais configuradas via variáveis de ambiente no servidor
- [ ] Webhook URL registrada no Mercado Pago
- [ ] Webhook Secret armazenado com segurança

## ⚠️ Nunca Fazer

❌ Commitar `.env` com credenciais reais  
❌ Compartilhar credenciais em chat/email  
❌ Colocar credenciais em comentários de código  
❌ Usar mesma credencial em dev e produção  

## ✅ Sempre Fazer

✅ Usar `.env.example` para documentar variáveis necessárias  
✅ Armazenar credenciais reais em variáveis de ambiente  
✅ Rodar em HTTPS em produção  
✅ Validar webhook com secret  
✅ Rotacionar credenciais a cada 3-6 meses  

---

**Quando você tiver as credenciais reais:**
1. Acesse o Mercado Pago
2. Copie as chaves de PRODUÇÃO
3. Configure no servidor via variáveis de ambiente
4. Teste com `npm start` localmente
5. Deploy para produção

Avise-me quando tiver as chaves reais e irei ajudar a configurar! 🚀
