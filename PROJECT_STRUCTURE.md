# 📁 Estrutura de Projeto - CannaConverter

> Projeto profissional e organizado! ✨

## 🚀 Início Rápido

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm run start:simple

# Ou via PM2
pm2 start ecosystem.config.json
```

---

## 📂 Estrutura do Projeto

```
conversor-mpp-xml/
├── 📄 README.md                 ← COMEÇAR AQUI!
├── 📄 package.json              (dependências)
├── 📄 .env                      (configuração local)
├── 📄 docker-compose.yml        (docker compose)
├── 📄 ecosystem.config.json     (PM2 config)
│
├── 📁 api/                      Backend Node.js
│   ├── server-minimal.js        (servidor principal)
│   ├── secure-auth.js           (autenticação)
│   ├── security.js              (proteções)
│   └── upload-utils.js          (upload de arquivos)
│
├── 📁 public/                   Frontend
│   ├── index.html               (página principal)
│   ├── 📁 css/
│   │   └── style-v2.css         (design system)
│   └── 📁 js/
│       └── app_clean_new.js     (javascript)
│
├── 📁 admin/                    Painel administrativo
│   ├── login.html
│   ├── login-simple.html
│   ├── login-2fa.html
│   └── dashboard.html
│
├── 📁 config/                   ✨ Configurações
│   ├── .env.example             (exemplo de .env)
│   ├── .env.production          (produção)
│   ├── .env.secure              (credenciais)
│   ├── .env.template            (template)
│   └── server_config.json       (config do server)
│
├── 📁 docker/                   ✨ Docker
│   ├── Dockerfile               (docker main)
│   ├── Dockerfile.office        (office tools)
│   └── Dockerfile.scalable      (escalável)
│
├── 📁 scripts/                  ✨ Scripts úteis
│   ├── 📁 deploy/               (deployment)
│   │   ├── quick-deploy.sh
│   │   ├── deploy.sh
│   │   ├── start-production.bat
│   │   ├── start-production.sh
│   │   └── restart-completo.bat
│   │
│   ├── 📁 setup/                (setup inicial)
│   │   ├── setup.sh
│   │   ├── check-system.ps1
│   │   ├── rotate_credentials.ps1
│   │   └── rotate_credentials.sh
│   │
│   └── 📁 health/               (health checks)
│       └── healthcheck.js
│
├── 📁 docs/                     ✨ Documentação
│   ├── 📁 GUIDES/               (guias práticos)
│   │   ├── README_PRODUCTION.md
│   │   ├── INSTALL_NODEJS.md
│   │   ├── ENTERPRISE_README.md
│   │   └── OFFICE_CONVERTER_README.md
│   │
│   ├── 📁 SECURITY/             (segurança)
│   │   ├── SEGURANCA_IMPLEMENTADA.md
│   │   ├── SECURITY_REMEDIATION_REPORT_17-18NOV.md
│   │   ├── GIT_HOOKS_SECURITY_GUIDE.md
│   │   ├── SECURITY_CONFIG.md
│   │   └── README_SECURITY_AUDIT.md
│   │
│   ├── 📁 DEPLOYMENT/           (deployment)
│   │   ├── DEPLOYMENT_PLAN_NEXT_PHASE.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── HETZNER_DEPLOY_GUIA_COMPLETO.md
│   │   └── HETZNER_DEPLOY_PERSONALIZADO.md
│   │
│   └── 📁 ARCHIVE/              (documentação antiga)
│       └── (arquivos históricos)
│
├── 📁 tests/                    ✨ Testes
│   └── test-login-flow.html     (testes de login)
│
├── 📁 utils/                    ✨ Utilitários
│   ├── upload_utils.py
│   └── simple_server_secure.py
│
├── 📁 logs/                     ✨ Logs
│   └── (arquivos de log)
│
├── 📁 uploads/                  (pasta de uploads)
│   ├── incoming/
│   ├── converted/
│   ├── processing/
│   └── quarantine/
│
├── 📁 queue/                    (fila de processamento)
├── 📁 converters/               (conversores)
└── 📁 node_modules/             (dependências npm)
```

---

## 🎯 Guia de Uso Rápido

### 1️⃣ **Primeira Vez?**
- Leia: `README.md`
- Setup: `docs/GUIDES/INSTALL_NODEJS.md`

### 2️⃣ **Quer Entender Segurança?**
- `docs/SECURITY/SEGURANCA_IMPLEMENTADA.md`
- `docs/SECURITY/GIT_HOOKS_SECURITY_GUIDE.md`

### 3️⃣ **Quer Fazer Deploy?**
- `docs/DEPLOYMENT/DEPLOYMENT_PLAN_NEXT_PHASE.md`
- `scripts/deploy/` (scripts prontos)

### 4️⃣ **Rodar Local**
```bash
# Desenvolvimento
npm run start:simple

# Produção (via PM2)
pm2 start ecosystem.config.json --env production

# Parar servidor
pm2 stop mpp-converter
```

### 5️⃣ **Testes**
```bash
# Abrir teste de login
start tests/test-login-flow.html
```

---

## 🔑 Credenciais de Admin (Teste)

```
Usuário: Alcap0ne
Senha: C@rolin@36932025
Email: rafaelcannalonga2@hotmail.com
```

---

## 💰 Configuração Monetária

- **Preço**: R$ 10,00 por conversão
- **Sistema**: PIX automático
- **Verificação**: Pagamento em tempo real

---

## 🛡️ Segurança

✅ Git hooks ativo (15+ padrões maliciosos bloqueados)
✅ Autenticação PBKDF2 (100k iterations)
✅ CORS configurado
✅ Validação de uploads
✅ Rate limiting pronto

---

## 📊 Status Atual

| Item | Status |
|------|--------|
| Servidor | ✅ Rodando |
| Autenticação | ✅ Funcionando |
| Segurança | ✅ Protegida |
| Design | ✅ Design System |
| Testes | ✅ Todos passando |
| Documentação | ✅ Completa |

---

## 🚀 Próximos Passos

- [ ] Logo final (GPT)
- [ ] Testes mobile
- [ ] Staging deployment
- [ ] Production release

---

## 📞 Suporte

- Email: canna.vendasonline@gmail.com
- Health Check: http://localhost:3000/api/health
- Admin Panel: http://localhost:3000/admin

---

**Última atualização**: November 17, 2025
**Estrutura organizada e pronta para produção!** 🎉
