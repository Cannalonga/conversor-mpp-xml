# 🔍 DIAGNÓSTICO - CANNACONVERT OFFLINE

## ❌ Erro Atual
```
ERR_CONNECTION_TIMED_OUT
cannaconvert.store demorou muito para responder
```

## 🔧 O que pode estar acontecendo:

### 1. **Servidor não está online**
   - [ ] Servidor parou de rodar
   - [ ] Serviço Node.js não está ativo
   - [ ] Docker container parou
   - [ ] PM2 processo morreu

### 2. **Rede/Firewall**
   - [ ] Porta 3000 não está aberta
   - [ ] Portas 80/443 bloqueadas
   - [ ] Firewall UFW bloqueando
   - [ ] Grupo de segurança AWS/DO bloqueando

### 3. **DNS/Domínio**
   - [ ] DNS não aponta para o IP correto
   - [ ] Propagação DNS incompleta
   - [ ] CNAME/A record incorreto

### 4. **NGINX**
   - [ ] NGINX não está rodando
   - [ ] Configuração incorreta
   - [ ] SSL certificado expirou

---

## ✅ CHECKLIST DE DIAGNÓSTICO

### Passo 1: Verificar Servidor Online
```bash
# SSH no servidor
ssh ubuntu@SEU_IP_AQUI

# Verificar se está online
ping SEU_DOMINIO.store

# Resolver DNS
nslookup cannaconvert.store
dig cannaconvert.store

# Ver IP apontado
host cannaconvert.store
```

### Passo 2: Verificar Serviços
```bash
# Ver containers Docker
docker ps -a

# Ver logs
docker compose -f docker-compose.production.yml logs --tail=50

# Ver portas abertas
netstat -tuln | grep 3000
ss -tuln | grep 3000

# Verificar se porta 3000 responde
curl http://localhost:3000/health
```

### Passo 3: Verificar NGINX
```bash
# Status NGINX
sudo systemctl status nginx

# Ver configuração
sudo cat /etc/nginx/sites-enabled/cannaconvert.conf

# Teste configuração
sudo nginx -t

# Logs de erro
sudo tail -f /var/log/nginx/error.log
```

### Passo 4: Verificar Firewall
```bash
# Status UFW
sudo ufw status

# Permitir portas (se necessário)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ver regras
sudo ufw status verbose
```

### Passo 5: Verificar SSL
```bash
# Ver certificados
sudo ls -la /etc/letsencrypt/live/cannaconvert.store/

# Verificar expiração
sudo certbot certificates

# Renovar se necessário
sudo certbot renew --dry-run
```

---

## 🚀 SOLUÇÃO RÁPIDA

Se o servidor está online mas a app não roda:

```bash
# 1. SSH no servidor
ssh ubuntu@SEU_IP

# 2. Ir para diretório da app
cd /opt/cannaconvert

# 3. Puxar código mais recente
git pull origin deploy/production

# 4. Criar .env (veja template abaixo)
cp deploy/production/.env.production.template .env

# 5. Iniciar com Docker
docker compose -f docker-compose.production.yml up -d

# 6. Verificar logs
docker compose -f docker-compose.production.yml logs -f

# 7. Testar
curl http://localhost:3000/health
```

---

## 📋 Informações Necessárias

Por favor, responda:

1. **IP do servidor ou hostname?**
   - Exemplo: `123.45.67.89`

2. **Qual provedor?**
   - [ ] DigitalOcean
   - [ ] AWS
   - [ ] Linode
   - [ ] Outro: ________

3. **Sistema operacional?**
   - [ ] Ubuntu 24.04
   - [ ] Ubuntu 22.04
   - [ ] Outro: ________

4. **Qual é o status?**
   - [ ] Servidor parou/é novo
   - [ ] Servidor roda mas sem app
   - [ ] App roda em localhost mas não externamente
   - [ ] SSL/HTTPS quebrado

5. **Tem acesso SSH?**
   - [ ] Sim
   - [ ] Não
   - [ ] Não tenho certeza

6. **Domínio está apontando para o servidor?**
   ```bash
   # Rode isto no seu PC
   nslookup cannaconvert.store
   # E compartilhe a resposta
   ```

---

## 📞 Próximos Passos

1. **Responda as questões acima**
2. **Execute os comandos de diagnóstico** e compartilhe os resultados
3. **Vou preparar o deploy automático** baseado na sua infraestrutura

Estou pronto para resolver! 🔧
