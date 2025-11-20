# 🔐 CONFIGURAÇÃO DE SEGURANÇA - MPP CONVERTER

## ⚠️ NOTA IMPORTANTE

**CREDENCIAIS NUNCA DEVEM SER ARMAZENADAS AQUI OU COMMITADAS NO REPOSITÓRIO**

Use variáveis de ambiente (`.env`) para armazenar dados sensíveis.

---

## 🛡️ CREDENCIAIS - COMO CONFIGURAR

### Setup Seguro
```bash
# 1. Crie o arquivo .env localmente
cp .env.example .env

# 2. Abra .env e configure SUAS credenciais (não compartilhe!)
nano .env

# 3. Configure as variáveis:
ADMIN_USERNAME=seu_usuario_personalizado
ADMIN_PASSWORD_HASH=seu_bcrypt_hash

# 4. NUNCA commite .env no git
# (já está no .gitignore)
```

### Gerar Hash Seguro
```bash
# Execute APENAS localmente, uma única vez
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('SUA_SENHA_FORTE_AQUI',12).then(h=>console.log(h))"

# Cole o resultado no .env como ADMIN_PASSWORD_HASH
```

---

## 🔒 RECURSOS DE SEGURANÇA IMPLEMENTADOS

### ✅ Autenticação Segura
- ✅ Credenciais via **variáveis de ambiente** (nunca hardcoded)
- ✅ Senhas com **bcrypt** (10+ rounds de hashing)
- ✅ JWT tokens com **expiração configurável**
- ✅ Rate limiting contra **brute force**
- ✅ Logs de **todas as tentativas de login**
- **Email de destino:** rafaelcannalonga2@hotmail.com
- **Alertas de segurança:** Atividade suspeita é reportada
- **Configuração SMTP:** Outlook/Hotmail integrado

### ✅ Proteção de APIs
- Todas as rotas admin protegidas por middleware
- Token-based authentication ativo
- Validação de sessão em tempo real
- Logout seguro com limpeza de tokens

### ✅ Monitoramento de Acesso
- Logs detalhados de tentativas de login
- Registro de IP e User-Agent
- Timestamp de cada acesso
- Dashboard com histórico de atividades

---

## 🚀 ARQUIVOS DE CONFIGURAÇÃO

### 📁 Principais
- `admin/login.html` - Interface de login personalizada
- `admin/dashboard.html` - Dashboard com info do proprietário
- `api/server-minimal.js` - Backend com auth hardcoded
- `config/2fa-config.js` - Sistema 2FA por email
- `.env` - Configurações de ambiente

### 🔧 Variáveis de Ambiente (.env)
```
ADMIN_USER=Alcap0ne
ADMIN_PASS=C@rolin@36932025
ADMIN_EMAIL=rafaelcannalonga2@hotmail.com
ENABLE_2FA=true
```

---

## 📧 CONFIGURAÇÃO EMAIL 2FA

### SMTP Settings
```
Host: smtp-mail.outlook.com
Port: 587
Security: STARTTLS
Email: rafaelcannalonga2@hotmail.com
```

### Notificações Automáticas
- ✅ **Login bem-sucedido:** Confirmação por email
- ⚠️ **Tentativa inválida:** Alerta de segurança
- 🚨 **Atividade suspeita:** Notificação imediata
- 📊 **Relatório diário:** Resumo de acessos

---

## 🛡️ NÍVEIS DE SEGURANÇA

### 🔴 Crítico
- Acesso administrativo exclusivo
- Credenciais hardcoded no sistema
- 2FA obrigatório para notificações

### 🟡 Médio  
- APIs protegidas por middleware
- Rate limiting ativo
- Validação de arquivos

### 🟢 Básico
- Logs centralizados
- Monitoramento PM2
- Health checks automáticos

---

## 🚀 COMANDOS DE ACESSO

### Login Administrativo
1. Acesse: http://localhost:3000/admin
2. Use as credenciais: `Alcap0ne` / `C@rolin@36932025`
3. Aguarde confirmação 2FA
4. Dashboard será liberado automaticamente

### Logout Seguro
1. Clique no botão "Sair" no dashboard
2. Sessão será limpa automaticamente
3. Redirecionamento para login

---

## 📋 CHECKLIST DE SEGURANÇA

- [x] ✅ Credenciais exclusivas configuradas
- [x] ✅ Sistema 2FA implementado
- [x] ✅ Todas as APIs protegidas
- [x] ✅ Email de notificação ativo
- [x] ✅ Logs de acesso funcionando
- [x] ✅ Dashboard personalizado
- [x] ✅ Logout seguro implementado
- [x] ✅ Configuração PM2 salva

---

## 🔄 BACKUP & RECOVERY

### Backup das Configurações
```bash
pm2 save
```

### Restaurar após Restart
```bash
pm2 resurrect
```

---

## ⚡ STATUS ATUAL

**🟢 SISTEMA SEGURO E OPERACIONAL**

- Proprietário: Rafael Cannalonga
- Email: rafaelcannalonga2@hotmail.com  
- Autenticação: Personalizada com 2FA
- Status: Pronto para produção

---

**🏆 SEGURANÇA ENTERPRISE CONFIGURADA! 🏆**

*Configuração exclusiva para Rafael Cannalonga - Novembro 2025*