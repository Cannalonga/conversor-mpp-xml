# 🔥 CANNACONVERTER - CORREÇÕES CRÍTICAS DE SEGURANÇA

**Data**: $(date)
**Status**: 🔴 CRÍTICO - IMPLEMENTAÇÃO IMEDIATA
**Prioridade**: P0 (BLOQUEANTE)

---

## 📊 SUMÁRIO EXECUTIVO

| Severidade | Quantos | Status |
|-----------|---------|--------|
| 🔴 CRÍTICO | 10 | ❌ PRECISA FIX |
| 🟡 MÉDIO | 10 | ⏳ PRÓXIMA SEMANA |
| 🟢 BAIXO | 5 | ✅ SEGUNDA SEMANA |
| **TOTAL** | **25** | **80% NÃO CORRIGIDO** |

---

# 🔴 10 PROBLEMAS CRÍTICOS

## 1. 🔐 CREDENCIAIS HARDCODED EM FONTE

### Severidade: 🔴 CRÍTICO (Exploração: Trivial)

### Localização
- `api/server-2fa.js` linhas 15-20
- `.env` linhas 1-15 (credenciais visíveis)
- `git history` (30+ commits com secrets)

### Problema
```javascript
// ❌ INSEGURO - VISÍVEL EM GIT
ADMIN_USERNAME=Alcap0ne
ADMIN_PASS=NovaSenh@2025#Sec$Conv789!
EMAIL_PASSWORD=senha_real_em_plaintext
```

### Impacto
- 🔴 Acesso administrativo comprometido
- 🔴 Email account exposed
- 🔴 Credenciais em git history permanentemente
- 🔴 Senhas visíveis em qualquer branch/clone

### Solução
```bash
# 1. Rotacionar TODAS as credenciais
bash rotate_credentials.sh  # Linux/Mac
.\rotate_credentials.ps1    # Windows

# 2. Limpar git history
git filter-repo --path .env --invert-paths --path api/server-2fa.js --invert-paths

# 3. Mudar senhas em TODAS plataformas
# - Gmail (2FA + app passwords)
# - Mercado Pago
# - Qualquer outro serviço
```

### Implementação
- ✅ Criado: `rotate_credentials.ps1`
- ✅ Criado: `rotate_credentials.sh`
- ⏳ EXECUTAR: Um dos scripts acima

### Verificação
```bash
# Confirmar que .env não está em git
git log --full-history -p -- .env | head -10  # deve estar vazio

# Confirmar secrets não estão em código
grep -r "Alcap0ne\|NovaSenh@" api/
```

---

## 2. 🌐 MÚLTIPLOS SERVIDORES CONCORRENTES

### Severidade: 🔴 CRÍTICO (Impacto: Memory Leak + Instabilidade)

### Problema
```
Encontrados 5 servidores rodando/possível ativar:
- api/server.js (1700 linhas, descontinuado)
- api/server-2fa.js (482 linhas, com vulnerabilidades)
- api/server-simple.js (teste apenas)
- api/server-minimal.js (ativo, production)
- api/server-enterprise.js (novo, consolidado)
```

### Impacto
- 🔴 Memory leak: cada Node.js instance = +100MB RAM
- 🔴 Port conflict: múltiplos tentando :3000
- 🔴 Data inconsistency: sem estado compartilhado
- 🔴 Perda de dados ao restart
- 🔴 Unpredictable behavior

### Solução
```bash
# 1. Parar todos os processos
# Linux/Mac:
pkill -f "node.*server"

# Windows PowerShell:
Get-Process node | Stop-Process -Force

# 2. Consolidar em server-enterprise.js (já criado)
# 3. Remover servidores antigos
rm api/server.js
rm api/server-2fa.js
rm api/server-simple.js  # se existir

# 4. Atualizar package.json
{
  "scripts": {
    "start": "node api/server-enterprise.js",
    "dev": "nodemon api/server-enterprise.js"
  }
}

# 5. Iniciar novo
npm start
```

### Verificação
```bash
# Confirmar apenas 1 Node rodando
ps aux | grep node

# Confirmar port 3000 respondendo
curl http://localhost:3000/api/health
```

---

## 3. 🔓 ADMIN AUTH BYPASS

### Severidade: 🔴 CRÍTICO (Exploração: 1 linha de código)

### Localização
`api/server-minimal.js` linha ~809:
```javascript
// ❌ VULNERÁVEL - Any user é admin!
if (!req.query.adminToken) {
    return res.status(401).json({ error: 'Token requerido' });
}

// QUALQUER token válido = admin access!
const admin = req.query.adminToken;  // sem validação!
```

### Exploração
```bash
# Qualquer requisição com qualquer token
curl "http://localhost:3000/api/admin/anything?adminToken=abc123"
# CONCEDIDO COM SUCESSO (deveria bloquear!)
```

### Solução
```javascript
// ✅ CORRETO - Validar JWT com claim admin
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token); // valida signature + expiry
    
    if (!payload || !payload.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = payload;
    next();
};

// Usar em rotas admin:
app.get('/api/admin/*', authMiddleware, (req, res) => {
    // Agora seguro
});
```

### Implementação
- ✅ Já em `server-enterprise.js` (linhas 345-365)
- ⏳ Aplicar em `server-minimal.js`

### Verificação
```bash
# Sem token = deve bloquear
curl http://localhost:3000/api/admin/stats
# 401 Unauthorized ✅

# Com token inválido = deve bloquear
curl -H "Authorization: Bearer fake" http://localhost:3000/api/admin/stats
# 401 Unauthorized ✅

# Com token válido mas sem admin claim = deve bloquear
curl -H "Authorization: Bearer valid_user_token" http://localhost:3000/api/admin/stats
# 403 Forbidden ✅

# Com token válido E admin claim = deve permitir
curl -H "Authorization: Bearer valid_admin_token" http://localhost:3000/api/admin/stats
# 200 OK ✅
```

---

## 4. 🗄️ IN-MEMORY DATABASE (Perda de Dados)

### Severidade: 🔴 CRÍTICO (Impacto: Data Loss)

### Problema
```javascript
// ❌ Tudo apagado ao restart!
const usersDb = new Map();
const sessionsDb = new Map();
const uploadsDb = new Map();

server.on('crash') {
    // ALL DATA LOST FOREVER
}
```

### Impacto
- 🔴 Todos os uploads desaparecem ao crash
- 🔴 Todas as sessions invalidadas
- 🔴 Perda de histórico de transações
- 🔴 Impossível auditar
- 🔴 Não escalável (múltiplas instâncias = dados diferentes)

### Solução (Fase 2 - Semana que vem)
```bash
# Instalar Prisma + PostgreSQL
npm install @prisma/client prisma prisma-types
npm install pg

# Gerar client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Novo schema
schema.prisma:
model Upload {
  id        String   @id @default(cuid())
  filename  String
  mimeType  String
  size      Int
  status    String   @default("pending")  // pending, converting, success, error
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### Implementação
- ⏳ Criar schema Prisma
- ⏳ Setup PostgreSQL
- ⏳ Migrate data (none, starting fresh)
- ⏳ Update server endpoints

### Verificação
```bash
# Dados persistem após restart
npx prisma studio  # ver dados no UI
```

---

## 5. ⏱️ RATE LIMITING INEFETIVO

### Severidade: 🔴 CRÍTICO (Exploração: DOS Attack)

### Problema
```javascript
// ❌ Rate limiting muito fraco
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100  // 100 requisições = ~6/segundo
});

// Qualquer user pode fazer flood de conversões
POST /api/upload (100x por minuto) = $1000 em conversões não autorizadas
```

### Exploração
```bash
# Ataque DOS simples
for i in {1..1000}; do
    curl -X POST http://localhost:3000/api/upload \
        -F "file=@fake.mpp" &
done
```

### Solução
```javascript
// ✅ CORRETO - Rate limiting por usuário + endpoint
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,      // 1 minuto
    max: 5,                   // max 5 uploads/min
    keyGenerator: (req) => {
        return req.user?.id || req.ip;  // por usuário ou IP
    },
    skip: (req) => !req.headers.authorization,  // requer auth
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many uploads',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

app.post('/api/upload', authMiddleware, uploadLimiter, (req, res) => {
    // Agora seguro
});

// Também adicionar cache redis para persistência
const RedisStore = require('rate-limit-redis');
const store = new RedisStore({
    client: redis,
    prefix: 'rl:',  // rate-limit:
});
```

### Implementação
- ✅ Já em `server-enterprise.js` (linhas 180-250)
- ⏳ Aplicar em `server-minimal.js`
- ⏳ Integrar Redis store

### Verificação
```bash
# Teste de rate limiting
for i in {1..6}; do curl -X POST http://localhost:3000/api/upload; done
# Primeira 5 = 200 OK
# 6ª = 429 Too Many Requests ✅
```

---

## 6. 📁 FILE UPLOAD VALIDATION MISSING

### Severidade: 🔴 CRÍTICO (Exploração: RCE / LFI)

### Problema
```javascript
// ❌ Aceita qualquer arquivo!
app.post('/api/upload', upload.single('file'), (req, res) => {
    // Nenhuma validação
    // Usuário pode enviar:
    // 1. shell.exe (RCE)
    // 2. ../../etc/passwd (LFI)
    // 3. 10GB arquivo (DOS)
    // 4. .php com backdoor (Web shell)
});
```

### Exploração
```bash
# Path traversal
curl -F "file=@shell.exe" \
     -H "Content-Disposition: filename=../../bash.exe" \
     http://localhost:3000/api/upload
# Arquivo criado em C:\\bash.exe

# Oversized file
dd if=/dev/zero of=huge.bin bs=1G count=5
curl -F "file=@huge.bin" http://localhost:3000/api/upload
# Server crash (OOM)
```

### Solução
```javascript
// ✅ CORRETO - Validação rigorosa
const upload = multer({
    storage: diskStorage,
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB max
    },
    fileFilter: (req, file, cb) => {
        // 1. Whitelist MIME types
        const allowed = ['application/vnd.ms-project', 'application/xml'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error(`MIME not allowed: ${file.mimetype}`));
        }
        
        // 2. Whitelist extensions
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.mpp', '.xml'].includes(ext)) {
            return cb(new Error(`Extension not allowed: ${ext}`));
        }
        
        // 3. Prevent path traversal
        if (file.originalname.includes('..') || file.originalname.includes('/')) {
            return cb(new Error('Path traversal detected'));
        }
        
        // 4. Rename para UUID (seguro)
        const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
        cb(null, filename);
    }
});

// 5. Scan files com ClamAV (opcional, produção)
const scanFile = async (filepath) => {
    const clamscan = new NodeClamscan().init({
        clamdscan: { host: 'localhost', port: 3310 }
    });
    const { isInfected } = await clamscan.scanFile(filepath);
    if (isInfected) throw new Error('File infected');
};
```

### Implementação
- ✅ Já em `server-enterprise.js` (linhas 270-310)
- ⏳ Aplicar em `server-minimal.js`

### Verificação
```bash
# Test 1: Bloqueie extensão inválida
curl -F "file=@shell.exe" http://localhost:3000/api/upload
# 400 Bad Request: Extension not allowed ✅

# Test 2: Bloqueie MIME inválido
curl -F "file=@file.txt" http://localhost:3000/api/upload
# 400 Bad Request: MIME type not allowed ✅

# Test 3: Bloqueie oversized
dd if=/dev/zero of=huge.bin bs=1G count=101
curl -F "file=@huge.bin" http://localhost:3000/api/upload
# 413 Payload Too Large ✅

# Test 4: Bloqueie path traversal
curl -F "file=@legitimate.mpp" \
     -F "name=../../etc/passwd" \
     http://localhost:3000/api/upload
# Arquivo salvo como UUID, NÃO como ../../etc/passwd ✅
```

---

## 7. 🔒 CORS WILDCARD (CSRF Risk)

### Severidade: 🔴 CRÍTICO (Exploração: CSRF)

### Localização
`server_config.json` ou em código:
```javascript
// ❌ INSEGURO - Aceita qualquer origem!
app.use(cors({
    origin: '*',  // QUALQUER site pode fazer requisição
    credentials: true  // E enviar cookies/auth!
}));
```

### Exploração
```html
<!-- evil.com -->
<script>
fetch('http://your-app:3000/api/upload', {
    method: 'POST',
    credentials: 'include',  // Envia cookies
    body: formData
})
</script>
<!-- Requisição vem de evil.com mas seu app aceita! -->
```

### Solução
```javascript
// ✅ CORRETO - Whitelist de origens
app.use(cors({
    origin: function(origin, callback) {
        const whitelist = [
            'http://localhost:3000',
            'https://cannaconverter.com.br',
            'https://app.cannaconverter.com.br'
        ];
        
        if (!origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Implementação
- ✅ Já em `server-enterprise.js` (linhas 150-170)
- ⏳ Aplicar em `server-minimal.js`
- ⏳ Configurar CORS_ORIGINS em .env

### Verificação
```bash
# Bloqueie origem não whitelisted
curl -H "Origin: https://evil.com" http://localhost:3000/api/health
# Resposta NOT contém: Access-Control-Allow-Origin ✅

# Permita origem whitelisted
curl -H "Origin: http://localhost:3000" http://localhost:3000/api/health
# Resposta contém: Access-Control-Allow-Origin: http://localhost:3000 ✅
```

---

## 8. 🔑 JWT SECRET - Valor Padrão

### Severidade: 🔴 CRÍTICO (Exploração: Token Forgery)

### Localização
`saas/backend/auth.py` linha 23:
```python
# ❌ INSEGURO - Default value público!
JWT_SECRET_KEY = "your-secret-key-change-in-production"

# Atacante pode:
# 1. Descobrir secret (é público)
# 2. Forjar token admin
# 3. Acessar qualquer conta
```

### Exploração
```python
import jwt
# Default secret é conhecido
secret = "your-secret-key-change-in-production"

# Criar token admin falso
token = jwt.encode({
    'sub': 'attacker@evil.com',
    'isAdmin': True,
    'exp': datetime.now() + timedelta(days=365)
}, secret, algorithm='HS256')

# Usar token em requisição
headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://localhost:3000/api/admin/stats', headers=headers)
```

### Solução
```bash
# 1. Gerar secret aleatório
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# a7f3b9e2c1d4g6h8i0j2k4l6m8n0o2p4q6r8s0t2u4v6w8x0y2z4a6b8c0d2e

# 2. Armazenar em .env (nunca em código!)
JWT_SECRET_KEY=a7f3b9e2c1d4g6h8i0j2k4l6m8n0o2p4q6r8s0t2u4v6w8x0y2z4a6b8c0d2e

# 3. Usar em código
const secret = process.env.JWT_SECRET_KEY;
if (!secret || secret === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET_KEY not configured!');
}
```

### Implementação
- ✅ Já em `server-enterprise.js` (linhas 50-55)
- ⏳ Rotacionar com `rotate_credentials.ps1`
- ⏳ Atualizar Python backend

### Verificação
```bash
# Confirmar que default não funciona
ORIGINAL_SECRET="your-secret-key-change-in-production"
# Tente validar token criado com default
# Deve falhar ❌ (porque servidor usa novo secret)
```

---

## 9. 🔓 NO HTTPS/TLS (Network Exposure)

### Severidade: 🔴 CRÍTICO (Exploração: Man-in-the-Middle)

### Problema
```
Servidor rodando em HTTP (não criptografado)
- Dados em plaintext na rede
- Senhas visíveis em wireshark
- Tokens podem ser interceptados
- MITM pode modificar requisições
```

### Exploração
```bash
# Atacante na mesma rede
tcpdump -i eth0 "tcp port 3000"
# Ver TODAS as credenciais passando pela rede
```

### Solução
```bash
# 1. Gerar certificado SSL
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365

# 2. Usar em produção (Express + HTTPS)
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
};

https.createServer(options, app).listen(3000);

# 3. Redirecionar HTTP para HTTPS
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
});
```

### Implementação
- ✅ Suporte em `server-enterprise.js` (linhas 720-730)
- ⏳ Ativar `HTTPS_ENABLED=true` em .env produção
- ⏳ Setup certificados (Let's Encrypt ou auto-assinado)

### Verificação
```bash
# Teste com HTTPS
curl --insecure https://localhost:3000/api/health
# Deve responder 200 ✅
```

---

## 10. 🔍 NO INPUT VALIDATION/SANITIZATION

### Severidade: 🔴 CRÍTICO (Exploração: XSS / SQL Injection)

### Problema
```javascript
// ❌ Sem validação!
app.post('/api/search', (req, res) => {
    const { query } = req.body;
    
    // Query injection
    const result = db.query(`SELECT * FROM users WHERE name LIKE '%${query}%'`);
    
    // XSS - dados retornam sem escape
    res.json({ result });
});
```

### Exploração
```bash
# SQL injection
curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "'\'' OR 1=1 --"}'
# Retorna TODOS os usuários

# XSS
curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "<script>alert(1)</script>"}'
# Script executado no navegador de outros usuários
```

### Solução
```javascript
// ✅ CORRETO - Validação + Sanitização
const { body, validationResult, query } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

app.post('/api/search',
    // Validação
    body('query')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Query must be 1-100 characters'),
    
    // Sanitização
    body('*').escape(),  // Escape HTML
    
    async (req, res) => {
        // Check validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { query } = req.body;
        
        // Usar prepared statements (NÃO string interpolation)
        const result = await db.query(
            'SELECT * FROM users WHERE name ILIKE $1',
            [`%${query}%`]
        );
        
        // Sanitizar output
        const sanitized = result.map(row => ({
            ...row,
            name: DOMPurify.sanitize(row.name)
        }));
        
        res.json({ result: sanitized });
    }
);
```

### Implementação
- ⏳ Instalar: `npm install express-validator isomorphic-dompurify`
- ⏳ Adicionar validação em TODOS endpoints
- ⏳ Usar parameterized queries sempre

### Verificação
```bash
# Test 1: Rejeite query muito longa
curl -X POST http://localhost:3000/api/search \
     -d '{"query": "AAAA...AAAA"}'  # 200+ chars
# 400 Bad Request ✅

# Test 2: Escape HTML special chars
curl -X POST http://localhost:3000/api/search \
     -d '{"query": "<script>alert(1)</script>"}'
# Response: "&lt;script&gt;alert(1)&lt;/script&gt;" ✅
```

---

---

# 🟡 10 PROBLEMAS MÉDIOS

Problemas secundários que devem ser resolvidos na próxima semana:

1. **Circuit Breaker**: Não há proteção contra downstream failures
2. **Backpressure Handling**: Sem controle de memory pressure
3. **Graceful Shutdown**: Sem esperar jobs finalizarem
4. **Retry Strategy**: Sem exponential backoff
5. **Request Validation**: Sem strict typing
6. **Audit Logging**: Sem assinatura de logs
7. **Session Timeout**: Sem server-side invalidation
8. **Memory Leak Detection**: Sem heap dumps/monitoring
9. **API Versioning**: Sem versioning (breaking changes)
10. **Error Messages**: Muito detalhado (info leak)

---

# 🟢 5 PROBLEMAS BAIXOS

Otimizações para segunda semana:

1. **Log Rotation**: Sem limpeza automática de logs
2. **Health Check**: Muito básico (não verifica DB/Redis)
3. **Metrics Export**: Sem Prometheus scrape
4. **Distributed Tracing**: Sem OpenTelemetry
5. **Graceful Scaling**: Sem support para múltiplas instâncias

---

## 📋 PLANO DE AÇÃO

### 🚀 HOJE (Próximas 2 horas)

- [ ] Executar `rotate_credentials.ps1`
- [ ] Consolidar servidores (remover redundantes)
- [ ] Aplicar middleware auth em server-minimal.js
- [ ] Testar todos endpoints

### ⏳ AMANHÃ (Próximas 4 horas)

- [ ] Integrar PostgreSQL + Prisma
- [ ] Setup Redis para cache/sessions
- [ ] Implementar arquivo com hash de password
- [ ] Adicionar input validation em todos endpoints

### 📅 PRÓXIMA SEMANA

- [ ] Setup BullMQ job queue
- [ ] Criar Python workers
- [ ] Implementar circuit breakers
- [ ] Add Prometheus monitoring

---

## ✅ VERIFICATION CHECKLIST

Antes de considerar "corrigido":

- [ ] Nenhuma credencial em código
- [ ] Apenas 1 servidor rodando
- [ ] Admin auth requer token válido
- [ ] Dados persistem após restart
- [ ] Rate limiting ativo em todos endpoints
- [ ] File uploads validados
- [ ] CORS restringe a whitelisted origins
- [ ] JWT secret é aleatório
- [ ] HTTPS ativado em produção
- [ ] Todas as entradas validadas/sanitizadas

---

## 📞 SUPORTE

**Criado por**: Ultra Architect / Security Engineer  
**Status**: 🔴 CRÍTICO - AÇÃO IMEDIATA REQUERIDA  
**Data**: $(date)  
**Próxima Review**: 48 horas
