# 🚀 Checklist de Deploy - Mercado Pago

## Antes de Fazer Deploy

- [ ] Testar localmente com `npm start`
- [ ] Executar teste de integração: `node test-mercado-pago.js`
- [ ] Verificar se axios está instalado: `npm list axios`
- [ ] Verificar credenciais em `.env`:
  - [ ] `MP_ACCESS_TOKEN` preenchido
  - [ ] `MP_PUBLIC_KEY` preenchido
  - [ ] `APP_URL` configurado

## Deploy no Servidor (Linux)

```bash
# 1. SSH no servidor
ssh root@213.199.35.118

# 2. Navegar para o projeto
cd /opt/cannaconvert

# 3. Atualizar código
git pull origin main  # ou seu branch

# 4. Instalar dependências (se houver novo axios)
npm install

# 5. Verificar se arquivo existe
ls -la api/mercado-pago-service.js

# 6. Restart do PM2
pm2 restart cannaconvert.service
# OU se usando systemctl
systemctl restart cannaconvert

# 7. Verificar logs
pm2 logs cannaconvert.service
# OU
journalctl -u cannaconvert -f

# 8. Testar endpoint
curl -X POST http://localhost:3000/api/premium/checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 30, "plan": "test"}'
```

## Deploy via Docker (se usar)

```bash
# Reconstruir imagem
docker-compose build

# Restart container
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## Configurar Webhook no Mercado Pago (Produção)

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Dashboard → **Ferramentas** → **Webhooks**
3. **Adicionar webhook**
4. URL: `https://seu-dominio.com/api/premium/webhook`
5. Selecione eventos:
   - [ ] `payment.created`
   - [ ] `payment.updated`
6. Teste webhook
7. Copie o **Webhook Secret** e configure em `.env`:
   ```
   MERCADO_PAGO_WEBHOOK_SECRET=seu_secret_aqui
   ```

## Validar Após Deploy

```bash
# Teste local
curl http://localhost:3000/health

# Teste checkout
curl -X POST http://localhost:3000/api/premium/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 30,
    "plan": "complete",
    "email": "teste@example.com",
    "cpf": "12345678900"
  }'

# Resposta esperada
# {
#   "success": true,
#   "transactionId": "123456789",
#   "checkoutUrl": "https://mercadopago.com.br/...",
#   ...
# }
```

## Checklist Pós-Deploy

- [ ] Site acessível via domínio (cannaconvert.store)
- [ ] Botão "💳 Comprar Créditos" clicável
- [ ] Redirecionamento para Mercado Pago funciona
- [ ] Pagamento de teste é aceito
- [ ] Retorno de `/pagamento/sucesso` funciona
- [ ] Créditos aparecem em `localStorage['userCredits']`
- [ ] Notificação de sucesso aparece
- [ ] Logs mostram `[CHECKOUT]` e `[CHECK STATUS]`

## Monitorar

```bash
# Procurar por erros
grep -i "erro\|error\|failed" /var/log/cannaconvert/*.log

# Ver pagamentos em tempo real
pm2 logs | grep CHECKOUT

# Verificar se webhook está sendo recebido
pm2 logs | grep WEBHOOK
```

## Rollback (se necessário)

```bash
# Voltar commit anterior
git revert HEAD

# Reinstalar dependências
npm install

# Restart
pm2 restart cannaconvert.service
```

## Problemas Comuns

### Erro: "axios not found"
```bash
npm install axios
npm start
```

### Erro: "MP_ACCESS_TOKEN not configured"
```bash
# Verificar .env
cat .env | grep MP_

# Se vazio, configurar:
echo "MP_ACCESS_TOKEN=TEST-xxxxx" >> .env
```

### Pagamento não redireciona
```bash
# Verificar CORS
curl -X OPTIONS http://localhost:3000 -v

# Verificar se PORT está correto
echo $PORT  # deve ser 3000
```

### Webhook não recebe notificações
```bash
# Verificar URL
curl -X POST https://seu-dominio.com/api/premium/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment"}'

# Deve retornar 200 OK
```

## Support

- 📧 Mercado Pago: support@mercadopago.com.br
- 🐛 Logs: `/var/log/cannaconvert/`
- 📊 Dashboard: https://www.mercadopago.com.br/admin

---

**Status:** ✅ Pronto para Deploy  
**Versão:** 1.0  
**Última atualização:** 2024
