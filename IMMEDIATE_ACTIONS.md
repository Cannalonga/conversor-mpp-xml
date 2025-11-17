# 🚀 INSTRUÇÕES DE AÇÃO IMEDIATA

## FAÇA AGORA (Próximos 10 minutos)

### 1️⃣ Rotacionar Credenciais Comprometidas

```powershell
# Windows - Abra PowerShell como Administrator

# Navegue até a pasta do projeto
cd "c:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"

# Execute o script de rotação
.\rotate_credentials.ps1

# O script vai:
# ✅ Gerar novos secrets aleatórios
# ✅ Fazer backup do .env anterior
# ✅ Criar novo .env seguro
# ✅ Atualizar .gitignore
```

**O que vai mudar:**
- ✅ JWT_SECRET_KEY: novo secret aleatório 64 caracteres
- ✅ JWT_REFRESH_SECRET: novo refresh token secret
- ✅ ADMIN_API_KEY: novo API key com prefixo 'sk_'
- ✅ Credenciais antigas: **INVALIDADAS** (não funcionam mais)

**Importante:**
- 🔓 A credencial antiga `"your-secret-key-change-in-production"` NÃO funciona mais
- 🔓 A credencial `"Alcap0ne"` NÃO funciona mais
- 🔓 Qualquer token criado com secret antigo = **INVÁLIDO**

---

### 2️⃣ Verificar Que Credenciais Foram Removidas

```powershell
# Abra o arquivo .env e confirme que ele:

# ✅ TEM valores como:
JWT_SECRET_KEY=a7f3b9e2c1d4g6h8i0j2k4l6m8n0o2p4q6r8s0t2u4v6w8x0y2z4a6b8c0d2e
ADMIN_PASSWORD_HASH=$2b$10$L9/hv5w8y2L8kZ8v1q8Jxe6F8M9X0K1L2M3N4O5P6Q7R8S9T0U1V2

# ❌ NÃO TEM valores como:
ADMIN_USERNAME=Alcap0ne
ADMIN_PASS=NovaSenh@2025#Sec$Conv789!
```

**Como verificar:**
```powershell
# Procurar por credenciais expostas
Get-Content .env | Select-String "Alcap0ne|NovaSenh@"

# Se NÃO retornar nada = ✅ SEGURO
```

---

### 3️⃣ Confirmar .env Está No .gitignore

```powershell
# Ver conteúdo de .gitignore
Get-Content .gitignore

# Deve conter (próximas primeiras linhas):
# .env
# .env.local
# *.backup*
```

**Se .env NÃO estiver em .gitignore:**
```powershell
# Adicionar manualmente
Add-Content .gitignore "`n.env"
Add-Content .gitignore "`n*.backup*"
```

---

### 4️⃣ Verificar Que .env NÃO Está No Git

```powershell
# Confirmar que git ignora .env
git check-ignore -v .env

# Se retornar ".gitignore:1:.env" = ✅ IGNORADO

# Remover se já foi commitado (IMPORTANTE!)
git rm --cached .env
git commit -m "chore: remove .env from git tracking"
git push
```

---

### 5️⃣ Fazer Backup Manual Das Informações Importantes

Se você tiver informações críticas no .env antigo, **SALVE AGORA**:

```powershell
# Criar pasta de backup segura (NÃO em git!)
mkdir C:\backup\cannaconverter

# Copiar arquivo de backup com timestamp
Copy-Item ".env.backup.*" "C:\backup\cannaconverter\"

# Anotar valores importantes (ex: números de contas, domínios)
# Nunca salve senhas/tokens - use password manager!
```

---

## PRÓXIMOS 30 MINUTOS (Parar Servidor Antigo)

### 6️⃣ Parar Todos os Servidores Node

```powershell
# Encontrar todos os processos Node rodando
Get-Process node

# Parar todos (força máxima)
Get-Process node | Stop-Process -Force

# Confirmar que parou
Get-Process node
# Deve retornar: Processo ou objeto não encontrado ✅
```

---

### 7️⃣ Iniciar Novo Servidor Enterprise

```powershell
# Navegue até a pasta
cd "c:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"

# Instale dependências (se não tiver)
npm install

# Inicie o novo servidor
npm start

# Deve exibir:
# 🚀 Server started on port 3000
# 📍 Endpoints available: http://localhost:3000/api/health
```

---

### 8️⃣ Verificar Que Servidor Está Rodando

Em outro terminal PowerShell:

```powershell
# Teste health check
curl http://localhost:3000/api/health

# Deve retornar (exemplo):
#{
#  "status": "healthy",
#  "uptime": 5.123,
#  "memory": {...}
#}
```

---

## PRÓXIMAS 2 HORAS (Consolidação)

### 9️⃣ Revisar Consolidation Plan

Abra e leia: `SERVER_CONSOLIDATION_PLAN.md`

Este documento descreve como remover os servidores antigos:
- ✅ server.js (descontinuado)
- ✅ server-2fa.js (com vulnerabilidades)
- ✅ server-simple.js (teste apenas)

---

### 🔟 Implementar Consolidação

Quando estiver seguro:

```powershell
# 1. Confirmar que server-enterprise.js está funcionando
curl http://localhost:3000/premium-login.html

# 2. Remover servidores antigos
Remove-Item api\server.js
Remove-Item api\server-2fa.js
Remove-Item api\server-simple.js

# 3. Atualizar package.json para usar enterprise
# Abra package.json e altere:
# "start": "node api/server-minimal.js"
# Para:
# "start": "node api/server-enterprise.js"

# 4. Commit no git
git add -A
git commit -m "chore: consolidar servidores em server-enterprise.js"
git push
```

---

## DOCUMENTAÇÃO DE REFERÊNCIA

### Arquivos Criados Nesta Sessão

1. **`api/server-enterprise.js`** (800+ linhas)
   - Servidor consolidado com TODAS as correções
   - Use este para produção

2. **`CRITICAL_FIXES_ROADMAP.md`** (2000+ linhas)
   - Detalha 10 vulnerabilidades CRÍTICAS
   - Cada uma com: problema, exploração, solução, código
   - Plano 3-fases de implementação

3. **`SERVER_CONSOLIDATION_PLAN.md`**
   - Como remover servidores antigos
   - Step-by-step consolidação
   - Checklist de validação

4. **`SESSION_SUMMARY.md`**
   - Resumo completo desta sessão
   - Tudo que foi feito/documentado
   - Próximas ações

5. **`rotate_credentials.ps1`** e **`rotate_credentials.sh`**
   - Scripts automáticos de rotação
   - Gera novos secrets
   - Backup automático

6. **`.env.example`** (atualizado)
   - Arquivo de configuração completo
   - 200+ variáveis documentadas
   - Use como template para .env

---

## ⚠️ ALERTAS DE SEGURANÇA

### 🔴 NUNCA FAÇA ISTO

```
❌ Commitar .env em git
❌ Colocar credenciais em variáveis globais
❌ Usar "password123" em produção
❌ Deixar servidor rodando em HTTP em produção
❌ Permitir CORS: "*"
```

### ✅ SEMPRE FAÇA ISTO

```
✅ Usar .env para credenciais (gitignored)
✅ Rotacionar secrets periodicamente
✅ Usar bcrypt para hashing de passwords
✅ HTTPS apenas em produção
✅ CORS whitelist com domínios específicos
✅ Rate limiting em endpoints críticos
✅ Validar TODAS as entradas
```

---

## 🆘 SE DER ERRO

### Erro: "Address already in use :::3000"

```powershell
# Servidor anterior não parou
# Solução: parar força e reiniciar

Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Aguarde 5 segundos
Start-Sleep -Seconds 5

# Reinicie
npm start
```

### Erro: "Cannot find module 'helmet'"

```powershell
# Dependências não instaladas
npm install
npm start
```

### Erro: ".env file not found"

```powershell
# Você apagou .env
# Solução: copiar de um backup ou recriar

# Opção 1: Restore do backup
Copy-Item ".env.backup.20250115_153045" ".env"

# Opção 2: Recriar com script
.\rotate_credentials.ps1
```

---

## 📞 PRÓXIMAS ETAPAS (Tomorrow)

Quando terminar isso e servidor estiver rodando:

1. **PostgreSQL Setup**
   - Download PostgreSQL Community
   - Criar banco: `cannaconverter_dev`
   - User: `cannaconverter`

2. **Redis Setup**
   - Docker: `docker run -d -p 6379:6379 redis`
   - Ou download Redis para Windows

3. **Aplicar Validação de Entrada**
   - `npm install express-validator`
   - Adicionar validação em todos endpoints

4. **Implementar Autenticação com Hash**
   - `npm install bcrypt`
   - Gerar hash de passwords

---

## ✅ CHECKLIST FINAL

- [ ] Executou `rotate_credentials.ps1`
- [ ] Confirmou que .env não tem credenciais expostas
- [ ] Confirmou que .env está em .gitignore
- [ ] Parou todos os processos Node antigos
- [ ] Iniciou `npm start` com novo servidor
- [ ] Teste `/api/health` respondendo
- [ ] Removeu servidores antigos (server.js, server-2fa.js, etc)
- [ ] Atualizou package.json para usar server-enterprise.js
- [ ] Fez commit: `git commit -m "chore: consolidar servidor"`
- [ ] Fez push: `git push`

Quando tudo estiver feito, pode prosseguir para PostgreSQL + Redis setup.

---

**Criado em**: $(date -u)
**Para**: Você (Desenvolvedor)
**Urgência**: 🔴 CRÍTICO - Faça HOJE
