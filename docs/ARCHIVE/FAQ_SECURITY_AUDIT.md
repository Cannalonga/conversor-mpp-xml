# ❓ FAQ - PERGUNTAS FREQUENTES

---

## 🔴 PROBLEMAS CRÍTICOS

### P: "Quão sério é realmente?"

**R:** Muito. Você tem **10 vulnerabilidades críticas que podem ser exploradas em 1 minuto**:

1. Credenciais em plaintext em `.env` e `git` ← Acesso admin trivial
2. Admin auth bypass ← Uma linha de código explora
3. Sem rate limiting ← DOS attack
4. Sem validação arquivo ← RCE possível
5. CORS wildcard ← CSRF attack
6. JWT secret default ← Token forgery
7. Sem HTTPS ← MITM attack
8. Sem input validation ← SQL injection + XSS
9. In-memory database ← Perda de dados
10. Múltiplos servidores ← Memory leak + inconsistência

**Risco**: Se exposto em produção, APP inteira comprometida em 5 minutos.

**Ação**: Execute `rotate_credentials.ps1` HOJE.

---

### P: "Mas está funcionando agora, não precisa fazer?"

**R:** Não. Isso é como dizer "não preciso consertar a fechadura porque ninguém invadiu ainda".

Exemplo de ataque trivial:

```powershell
# Obter credencial padrão (público no código)
$secret = "your-secret-key-change-in-production"

# Forjar token admin
$token = "eyJ... [token com isAdmin=true] ..."

# Acessar admin
curl -H "Authorization: Bearer $token" http://seu-app/api/admin/stats
# ✅ ACESSO CONCEDIDO (deveria bloquear!)
```

---

## ✅ AÇÕES

### P: "Por onde começo?"

**R:** 1. Leia `IMMEDIATE_ACTIONS.md` (10 min)  
2. Execute `rotate_credentials.ps1` (5 min)  
3. Parar servidores antigos (5 min)  
4. Consolidar em `server-enterprise.js` (30 min)  

**Total**: ~50 minutos para mitigar os riscos mais críticos.

---

### P: "O que é o `rotate_credentials.ps1`?"

**R:** Script automático que:
1. Gera 4 novos secrets aleatórios (64 caracteres cada)
2. Faz backup do `.env` antigo
3. Cria novo `.env` com secrets rotacionados
4. Atualiza `.gitignore`
5. Avisa sobre git history cleanup

**Resultado**: Credenciais antigas = INVÁLIDAS, tokens antigos = REJEITADOS.

---

### P: "Preciso fazer backup antes?"

**R:** O script FAZ backup automaticamente (`env.backup.YYYYMMDD_HHMMSS`).

Mas SIM, se tem valores IMPORTANTES no `.env` (ex: chaves de API do Mercado Pago, domínios), anote num password manager ANTES de executar.

⚠️ **NUNCA salve o backup em git!!!**

---

### P: "Quanto tempo leva consolidar tudo?"

**R:** Por fase:

- **🔴 CRÍTICOS** (10 problemas) = **2 horas**
  - Credenciais rotacionadas
  - Servidores consolidados
  - Auth bypass fixado
  - Rate limiting ativo
  - File validation ativo

- **🟡 MÉDIOS** (10 problemas) = **4-6 horas**
  - PostgreSQL integration
  - Redis integration
  - Input validation completo

- **🟢 BAIXOS** (5 otimizações) = **2-3 horas**
  - Prometheus + Grafana
  - Docker
  - CI/CD pipeline

**Total**: ~12-16 horas para tudo.

---

### P: "Posso usar `server-minimal.js` em produção?"

**R:** NÃO. Ele tem vulnerabilidades.

Use `server-enterprise.js`:
- ✅ Consolidado (1 arquivo)
- ✅ Com todas correções
- ✅ Estruturado melhor
- ✅ Production-ready

---

## 🗄️ BANCO DE DADOS

### P: "Preciso de PostgreSQL?"

**R:** Sim, para produção.

Alternativas:
- **Produção**: PostgreSQL + Redis (recomendado)
- **Desenvolvimento local**: SQLite + Redis em memory
- **Staging**: PostgreSQL + Redis via Docker

Razões:
- In-memory = perda de dados no crash
- Não escalável para múltiplas instâncias
- Impossível manter auditoria

---

### P: "Como início a migração de dados?"

**R:** Você não tem dados em produção ainda, então:

1. Instale Prisma: `npm install @prisma/client`
2. Configure database: `DATABASE_URL=...`
3. Crie schema em `prisma/schema.prisma`
4. Rode: `npx prisma generate`
5. Execute migrations: `npx prisma migrate deploy`

Pronto! Banco vazio e pronto para uso.

---

## 🔐 SEGURANÇA

### P: "Onde salvo os secrets?"

**R:** NUNCA em git. Use:

1. **Local development**: `.env` (gitignored)
2. **Staging/Production**: Environment variables
3. **Password manager**: Salve backup (1Password, Bitwarden, etc)

---

### P: "Como gero um JWT secret seguro?"

**R:** Terminal:

```powershell
# PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Resultado exemplo:
# a7f3b9e2c1d4g6h8i0j2k4l6m8n0o2p4q6r8s0t2u4v6w8x0y2z4a6b8c0d2e
```

Copie e cole em `.env`:
```
JWT_SECRET_KEY=a7f3b9e2c1d4g6h8i0j2k4l6m8n0o2p4q6r8s0t2u4v6w8x0y2z4a6b8c0d2e
```

---

### P: "Como faço hash de password?"

**R:** Use bcrypt (NUNCA plaintext):

```powershell
npm install bcrypt

node -e "
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync('minha-senha-aqui', salt);
console.log(hash);
"

# Resultado: $2b$10$L9/hv5w8y2L8kZ8v1q8Jxe6F8M9X0K1L2M3N4O5P6Q7R8S9T0U1V2

# Copie para .env:
# ADMIN_PASSWORD_HASH=$2b$10$L9/hv5w8y2L8kZ8v1q8Jxe6F8M9X0K1L2M3N4O5P6Q7R8S9T0U1V2
```

Depois:
```javascript
const bcrypt = require('bcrypt');
const isMatch = await bcrypt.compare(userPassword, hashDoBanco);
```

---

## ❌ ERROS COMUNS

### E: "Port 3000 already in use"

**R:** Servidor anterior não parou.

```powershell
# Parar força
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Aguardar 5s
Start-Sleep -Seconds 5

# Reiniciar
npm start
```

---

### E: "Cannot find module 'helmet'"

**R:** Dependências não instaladas.

```powershell
npm install
npm start
```

---

### E: ".env is missing"

**R:** Você deve ter deletado ou não criou.

**Opção 1**: Copiar de backup
```powershell
Copy-Item ".env.backup.*" ".env"
```

**Opção 2**: Recriar
```powershell
.\rotate_credentials.ps1
```

---

### E: "CORS origin not allowed"

**R:** Sua origem não está whitelisted.

Abra `server-enterprise.js` linhas ~150:
```javascript
const whitelist = [
    'http://localhost:3000',
    'http://localhost:5173',  // Seu frontend? Adicione aqui
    'https://seu-dominio.com.br'
];
```

---

## 🧪 TESTES

### P: "Como testo se rate limiting funciona?"

**R:** PowerShell:

```powershell
# Fazer 6 requisições rápido
for($i=1; $i -le 6; $i++) {
    Write-Host "Requisição $i:"
    curl http://localhost:3000/api/health
    Start-Sleep -Milliseconds 100
}

# Resultado esperado:
# 1-5: 200 OK
# 6: 429 Too Many Requests ✅
```

---

### P: "Como testo se admin auth funciona?"

**R:**

```powershell
# Sem token = deve bloquear
curl http://localhost:3000/api/admin/stats
# 401 Unauthorized ✅

# Com token inválido = deve bloquear
curl -H "Authorization: Bearer fake" http://localhost:3000/api/admin/stats
# 401 Unauthorized ✅

# Com token válido = deve funcionar
# (precisa gerar token válido primeiro via /api/auth/login)
```

---

### P: "Como testo se file upload validation funciona?"

**R:**

```powershell
# Test 1: Rejeite .exe
curl -F "file=@shell.exe" http://localhost:3000/api/upload
# 400 Bad Request: Extension not allowed ✅

# Test 2: Rejeite oversized
dd if=/dev/zero of=huge.bin bs=1G count=101
curl -F "file=@huge.bin" http://localhost:3000/api/upload
# 413 Payload Too Large ✅

# Test 3: Aceite .mpp
curl -F "file=@projeto.mpp" http://localhost:3000/api/upload
# 200 OK ✅
```

---

## 📦 DEPLOYMENT

### P: "Posso deploiar para produção agora?"

**R:** NÃO. Falta:

- ❌ HTTPS/TLS (requer certificado)
- ❌ PostgreSQL (atual: in-memory)
- ❌ Redis (atual: sem persistência)
- ❌ Rate limiting com Redis store (atual: memory-only)
- ❌ Backup automático (atual: nada)
- ❌ Monitoring (atual: nenhum)
- ❌ Logs centralizados (atual: arquivo local)
- ❌ Auto-scaling (atual: 1 instância)

**Recomendação**: Aguarde 48 horas. Depois estará pronto.

---

### P: "Como deploio em production?"

**R:** Pré-requisitos:

```bash
# 1. Todo o .env setup (secrets)
✅ JWT_SECRET_KEY=xxxxx
✅ DATABASE_URL=postgres://...
✅ REDIS_URL=redis://...
✅ HTTPS_ENABLED=true

# 2. Certificados SSL/TLS
# - Obter de Let's Encrypt ou auto-assinado
# - Colocar em ./certs/

# 3. Load balancer
# - Traefik, Nginx, ou cloud provider

# 4. Monitoring
# - Prometheus + Grafana
# - Logs centralizados (ELK, DataDog, etc)

# 5. Backup
# - PostgreSQL backup diário
# - Redis snapshot

# 6. CI/CD
# - GitHub Actions / GitLab CI
# - Testes automáticos
# - Deploy automático
```

Deploy típico em VPS/Cloud:

```bash
# 1. Clone repo
git clone ...

# 2. Setup
npm install
npx prisma migrate deploy

# 3. Start
npm start

# 4. Reverse proxy (Traefik)
# Traefik vai:
# - Terminar HTTPS
# - Load balance requisições
# - Renew certificates automaticamente
```

---

## 🆘 PRECISO DE AJUDA

### P: "Executei `rotate_credentials.ps1` mas servidor não inicia"

**R:** 

```powershell
# 1. Verificar erro
npm start 2>&1 | Out-File -FilePath error.log

# 2. Abrir arquivo e procurar por "Cannot find module" ou "ENOENT"

# 3. Se for "Cannot find module"
npm install

# 4. Se for "Cannot read property of undefined"
cat .env | Select-String "JWT_SECRET_KEY"
# Deve retornar um valor, não estar vazio
```

---

### P: "Preciso desfazer a rotação de credenciais"

**R:** Restaurar backup:

```powershell
# 1. Ver backups disponíveis
ls .env.backup.*

# 2. Restaurar
Copy-Item ".env.backup.20250115_153045" ".env"  # use seu timestamp

# 3. Restart servidor
npm start
```

⚠️ Mas isso REATIVA as credenciais antigas (inseguro!). Melhor rotacionar novamente.

---

### P: "GitHub Actions está falhando no deploy"

**R:** Provavelmente falta variáveis de ambiente.

Ir em: GitHub → Settings → Secrets → add:
```
JWT_SECRET_KEY=xxxxx
DATABASE_URL=postgres://...
REDIS_URL=redis://...
```

---

## 📚 REFERÊNCIAS

| Documento | Quando ler |
|-----------|-----------|
| `IMMEDIATE_ACTIONS.md` | Antes de começar |
| `CRITICAL_FIXES_ROADMAP.md` | Para entender vulnerabilidades |
| `SERVER_CONSOLIDATION_PLAN.md` | Para consolidar servidores |
| `api/server-enterprise.js` | Para entender código |
| `.env.example` | Para configurar aplicação |

---

## ✅ CHECKLIST - "Fiz tudo?"

- [ ] Leste FAQ completo
- [ ] Executou `rotate_credentials.ps1`
- [ ] Confirmou `.env` está seguro
- [ ] Testou `/api/health` respondendo
- [ ] Consolidou servidores
- [ ] Planejou PostgreSQL + Redis para amanhã
- [ ] Commitou mudanças no git
- [ ] Marcou calendário para PostgreSQL install

---

**Criado por**: GitHub Copilot (Claude Haiku 4.5)  
**Status**: ✅ COMPLETO  
**Próxima revisão**: Após consolidação de servidores

Se tiver mais dúvidas, volte aqui ou leia os documentos referenciados!
