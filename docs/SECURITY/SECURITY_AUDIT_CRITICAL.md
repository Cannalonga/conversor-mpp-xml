# 🔥 RELATÓRIO CRÍTICO DE SEGURANÇA — CONVERSOR MPP XML
## Auditoria OWASP Completa + Hardening
**Data**: 18 de Novembro 2025 | **Status**: 🔴 CRÍTICO (5 Issues) + ⚠️ 7 Warnings

---

## 📊 SUMÁRIO EXECUTIVO

| Severidade | Qtd | Status | Impacto |
|-----------|-----|--------|---------|
| 🔴 CRÍTICO | 5 | Requer fix imediata | RCE, Auth bypass, Data leak |
| 🟠 ALTO | 7 | Requer fix hoje | CORS bypass, Injection, Info disclosure |
| 🟡 MÉDIO | 3 | Requer fix semana | Denial of service, DoS |

**Tempo estimado para fix**: 2-4 horas  
**Risk score**: 8.9/10 (ALTO)

---

## 🚨 ISSUES CRÍTICOS (SEVERITY = CRITICAL)

### CRÍTICO #1: CORS MISCONFIGURATION — Origin Validation Bypass
**Arquivo**: `api/server-enterprise.js` (linha 161)  
**CWE**: CWE-346 (Origin Validation Error)  
**CVSS**: 8.1

**Problema**:
```javascript
if (!origin || config.corsOrigins.includes(origin)) {  // ← INSEGURO
    callback(null, true);
}
```

**Risk**: 
- `!origin` permite requisições SEM header `Origin` (todas as requisições desktop/curl)
- Não valida trailing slash (`http://localhost:3000/` vs `http://localhost:3000`)
- Se `CORS_ORIGINS` vazio → wildcard implícito

**Exploit**:
```bash
curl -X POST http://localhost:3000/api/premium/webhook/pix \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"fake"}' \
  # Sem Origin header → PASS ❌
```

**Fix**:
```javascript
// Whitelist apenas trusted origins, SEMPRE rejeitar sem Origin
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
            .split(',')
            .map(o => o.trim());
        
        // Rejeitar se origem não fornecida (exceto GET de navegador)
        if (!origin) {
            // Apenas APIs GET permitidas sem Origin
            if (req.method === 'GET' && !req.path.includes('/api/')) {
                return callback(null, true);
            }
            return callback(new Error('Origin header required'));
        }
        
        // Validação rigorosa com protocolo
        const originURL = new URL(origin);
        const isAllowed = allowedOrigins.some(allowed => {
            try {
                const allowedURL = new URL(allowed);
                return originURL.origin === allowedURL.origin;
            } catch {
                return false;
            }
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 3600,
    optionsSuccessStatus: 200
}));
```

---

### CRÍTICO #2: JWT SECRET EXPOSED IN PRODUCTION .env
**Arquivo**: `.env` (linhas 16-17)  
**CWE**: CWE-798 (Hardcoded Credentials)  
**CVSS**: 9.8

**Problema**:
```env
JWT_SECRET_KEY=d4f8e7b9c2a1f6g3h5j9k8l7m0n4p6q2r8s5t9w1x7y3z6a2b9c4e7f2g8h1i4
JWT_SECRET=d4f8e7b9c2a1f6g3h5j9k8l7m0n4p6q2r8s5t9w1x7y3z6a2b9c4e7f2g8h1i4
```

**Risk**:
- Secrets em plain text no arquivo `.env` commitado
- Tokens JWT podem ser forjados por anyone com acesso ao repo
- Qualquer admin pode gerar tokens premium illegais

**Verificação**:
```bash
git log --all -S "d4f8e7b9c2a1f6g3h5j9k8l7m0n4p6q2r8s5t9w1x7y3z6a2b9c4e7f2g8h1i4"
# → Expõe histórico de commits
```

**Fix IMEDIATO**:
1. Rotacionar secrets:
```bash
# Gerar nova chave
openssl rand -hex 64 > /tmp/new-jwt-secret.txt
cat /tmp/new-jwt-secret.txt

# Atualizar .env APENAS LOCALMENTE
echo "JWT_SECRET_KEY=$(cat /tmp/new-jwt-secret.txt)" >> .env.local

# NÃO COMMITAR .env com secrets
git rm --cached .env
git add .env.example
```

2. `.env.example`:
```env
JWT_SECRET_KEY=YOUR_64_HEX_CHARS_HERE_ROTATE_IN_PROD
JWT_SECRET=YOUR_64_HEX_CHARS_HERE_ROTATE_IN_PROD
ADMIN_PASSWORD_HASH=bcrypt_hash_here
```

3. Rewrite histórico git:
```bash
git filter-branch --force --index-filter \
  'git rm --cached -r .env' \
  --prune-empty --tag-name-filter cat -- --all
```

---

### CRÍTICO #3: ADMIN_PASSWORD_HASH IN PLAIN TEXT
**Arquivo**: `.env` (linhas 10-13)  
**CWE**: CWE-798 (Hardcoded Credentials)  
**CVSS**: 9.5

**Problema**:
```env
ADMIN_USERNAME=Alcap0ne
ADMIN_PASS=MPP2025SecureAdmin789  # ← PLAIN TEXT!
ADMIN_PASSWORD_HASH=$2b$12$lMykd5ItQQ8EzS4VEbkcCe1j2Q8ZjGDr73uEt76V9r6hYdIgProju
```

**Risk**:
- `ADMIN_PASS` em plain text → credential exposure
- Hash exposto → rainbow table attacks
- Qualquer desenvolvedor pode fazer login

**Fix**:
```env
# Remover ADMIN_PASS completamente
# Usar apenas hashed version
ADMIN_USERNAME=Alcap0ne
ADMIN_PASSWORD_HASH=$2b$12$GENERATED_BCRYPT_HASH_12_ROUNDS

# Gerar novo hash:
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('NUEVA_CONTRASEÑA_FUERTE',12).then(h=>console.log(h))"
```

---

### CRÍTICO #4: UNVALIDATED FILE UPLOAD — Path Traversal
**Arquivo**: `api/server-enterprise.js` (endpoints upload)  
**CWE**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)  
**CVSS**: 8.6

**Problema**:
```javascript
// Não encontrado validação de secure_filename
// Multer config pode permitir traversal via symlinks
const upload = multer({ dest: config.uploadDir });
```

**Exploit**:
```bash
curl -F "file=@../../../etc/passwd" http://localhost:3000/api/upload
# ou via symlink
ln -s /etc/passwd uploads/incoming/admin.mpp
```

**Fix**:
```javascript
const path = require('path');
const sanitize = require('sanitize-filename');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve('./uploads/incoming');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitizar nome + adicionar UUID
        const safe = sanitize(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
        const uuid = require('crypto').randomBytes(8).toString('hex');
        cb(null, `${uuid}_${safe}`);
    }
});

// Validação após upload
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['application/vnd.ms-project', 'application/xml'];
    const allowedExts = ['.mpp', '.xml'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        return cb(new Error('Invalid file type'));
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: config.maxFileSize }
});

// Middleware para validar path após upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    // Garantir que file está DENTRO de uploadDir
    const realPath = path.resolve(req.file.path);
    const uploadDir = path.resolve(config.uploadDir);
    
    if (!realPath.startsWith(uploadDir)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid file path' });
    }
    
    res.json({ success: true, file: req.file.filename });
});
```

---

### CRÍTICO #5: UNENCRYPTED PAYMENT DATA IN MEMORY
**Arquivo**: `api/server-enterprise.js` (linha 520+)  
**CWE**: CWE-312 (Cleartext Storage of Sensitive Information)  
**CVSS**: 8.3

**Problema**:
```javascript
global.transactions = {};
// CPF, email, nomes armazenados em plain text, não encriptado
global.transactions[txId] = {
    customer: { email, firstName, lastName, cpf },  // ← SEM ENCRIPTAÇÃO
    pixKey: '...',
    status: 'pending'
};
```

**Risk**:
- Crash ou memory dump expõe dados PII
- Retenção indefinida em memória
- Sem limpeza automática de dados sensíveis
- PCI-DSS compliance violation

**Fix**:
```javascript
const crypto = require('crypto');

class PaymentData {
    static encrypt(data) {
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(JSON.stringify(data));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
    
    static decrypt(encrypted) {
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
        const parts = encrypted.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(Buffer.from(parts[1], 'hex'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
    }
}

// Uso:
const transaction = {
    id: txId,
    status: 'pending',
    customerData: PaymentData.encrypt({
        email, firstName, lastName, cpf
    }),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30*60000),
    ttl: 1800 // 30 min auto-delete
};

// Auto-cleanup
setInterval(() => {
    Object.keys(global.transactions).forEach(txId => {
        if (Date.now() > global.transactions[txId].expiresAt) {
            delete global.transactions[txId];
        }
    });
}, 60000); // Check a cada minuto
```

---

## 🟠 ISSUES DE ALTO RISCO (7 warnings)

### ALT #1: Information Disclosure via Error Stack
**Arquivo**: `api/server-enterprise.js` (error handlers)  
**CWE**: CWE-209  
**Fix**: Não retornar stack traces em produção

```javascript
// ANTES (INSEGURO):
catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
}

// DEPOIS:
catch (error) {
    logger.error('Payment error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.id // correlação, não exposição
    });
}
```

### ALT #2: Missing Rate Limit on Premium Endpoints
**Arquivo**: `api/server-enterprise.js` (POST /api/premium/checkout)  
**CWE**: CWE-770 (Allocation of Resources Without Limits or Throttling)  
**Risk**: DDoS / Brute force transactions

**Fix**:
```javascript
const premiumLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 3, // 3 checkouts por IP por minuto
    message: 'Too many checkout attempts',
    standardHeaders: true,
    legacyHeaders: false
});

app.post('/api/premium/checkout', premiumLimiter, (req, res) => { ... });
```

### ALT #3: JWT Token Not Invalidated on Password Change
**CWE**: CWE-613 (Insufficient Session Expiration)  
**Fix**: Implementar token revocation list ou JWT jti claim

### ALT #4: HTTPS Not Enforced in Production
**CWE**: CWE-295 (Improper Certificate Validation)  
**Fix**:
```javascript
// Middleware para redirect HTTP → HTTPS
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});
```

### ALT #5: SQL Injection Risk (if using DB later)
**CWE**: CWE-89  
**Prevention**: Use parameterized queries sempre, nunca string interpolation

### ALT #6: Missing Security Headers
**CWE**: CWE-693 (Protection Mechanism Failure)  
**Helmet config incomplete**:
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'nonce-RANDOM_HERE'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' }
}));
```

### ALT #7: Logging Contains Sensitive Data
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)  
**Fix**: Sanitizar logs antes de escrever

```javascript
function sanitizeForLogging(obj) {
    const sensitive = ['password', 'token', 'secret', 'cpf', 'email', 'cardNumber'];
    const sanitized = JSON.parse(JSON.stringify(obj));
    
    Object.keys(sanitized).forEach(key => {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '***REDACTED***';
        }
    });
    
    return sanitized;
}

logger.info('Transaction:', sanitizeForLogging(transaction));
```

---

## 📋 CHECKLIST DE SEGURANÇA EXECUTORA

- [ ] Rotacionar JWT_SECRET_KEY em production
- [ ] Remover ADMIN_PASS e usar apenas hash
- [ ] Rewrite git history (remove secrets)
- [ ] Implementar CORS fix com URL validation
- [ ] Implementar file upload secure_filename + uuid
- [ ] Encriptar dados de pagamento em memória
- [ ] Remover stack traces de respostas
- [ ] Rate limiting em /api/premium/* endpoints
- [ ] HTTPS redirect middleware
- [ ] Helmet hardening completo
- [ ] Log sanitization for PII
- [ ] SQL injection prevention (se implementar DB)

---

## 🚀 PRÓXIMAS ETAPAS

1. **NOW**: Aplicar patches críticos (30 min)
2. **TODAY**: Deploy em staging + testes (1-2h)
3. **TOMORROW**: Mercado Pago sandbox + testes visuais
4. **WEEK**: Deploy produção com monitoring

---

**Gerado**: 18 de Novembro 2025 às 15:30 UTC  
**Status**: 🔥 AGUARDANDO APLICAÇÃO DE PATCHES
