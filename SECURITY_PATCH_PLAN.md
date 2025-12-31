# 🔧 SECURITY PATCH PLAN
## Ordem de Implementação & Testes

**Data**: 28 de Dezembro de 2025  
**Prioridade**: CRÍTICA - Não fazer deploy sem aplicar Fase 1  
**Tempo Estimado**: 8-12 horas  

---

## ⚡ QUICK START (30 minutos)

Se você tem pouco tempo, faça APENAS isto:

```bash
# 1. Gerar novo JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT_SECRET=$JWT_SECRET" > .env

# 2. Adicionar configurações críticas ao .env
echo "ALLOWED_ORIGINS=http://localhost:3000,https://seu-dominio.com.br" >> .env
echo "ENABLE_XXE_PROTECTION=true" >> .env
echo "ENABLE_FILE_SCANNING=true" >> .env

# 3. Fazer deploy COM variáveis de ambiente
NODE_ENV=production npm start

# 4. Invalidar tokens antigos (logout forçado de todos usuários)
npm run invalidate-sessions

# 5. Deploy do frontend com novo JWT
npm run build && npm run deploy
```

---

## 📅 PLANO DETALHADO

### FASE 1: CRÍTICAS (URGENTE - Hoje!)

#### Patch 1.1: Fix Hardcoded Secrets ⚠️ CRÍTICO
**Arquivo**: `api/config.js`  
**Tempo**: 30 minutos

```javascript
// ANTES (❌ VULNERABLE)
module.exports = {
    JWT_SECRET: validator.required('JWT_SECRET', 'dev-secret-key'),
    API_KEY: validator.required('API_KEY', 'dev-api-key'),
    SESSION_SECRET: validator.required('SESSION_SECRET', 'dev-session-secret'),
};

// DEPOIS (✅ SECURE)
module.exports = {
    JWT_SECRET: validator.required('JWT_SECRET'),  // SEM DEFAULT!
    API_KEY: validator.required('API_KEY'),
    SESSION_SECRET: validator.required('SESSION_SECRET'),
    
    // Validação em startup
    validate() {
        if (process.env.NODE_ENV === 'production') {
            if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
                throw new Error('❌ JWT_SECRET must be 32+ chars in production');
            }
            if (this.JWT_SECRET === 'dev-secret-key') {
                throw new Error('❌ You are using development secret in production!');
            }
        }
    }
};

// Em server.js startup:
config.validate();
```

**Teste**:
```bash
# Deve falhar sem .env
NODE_ENV=production node api/server.js
# Error: JWT_SECRET is required

# Deve falhar com default secret
JWT_SECRET=dev-secret-key NODE_ENV=production node api/server.js
# Error: You are using development secret in production!

# Deve funcionar com secret válido
JWT_SECRET=$(openssl rand -hex 32) node api/server.js
# ✅ Server started
```

**Checklist**:
- [ ] Código de validação adicionado
- [ ] .env.example NÃO contém secrets reais
- [ ] Documentação de setup atualizada
- [ ] Todos os tokens antigos invalidados

---

#### Patch 1.2: Fix File Upload Validation ⚠️ CRÍTICO
**Arquivo**: `api/upload-utils.js`  
**Dependências**: `npm install --save file-type magic-bytes`  
**Tempo**: 1 hora

```javascript
// NOVO: Validação segura
const fileType = require('file-type');

async function validateUploadSecure(file) {
    const errors = [];
    
    if (!file) return { valid: false, errors: ['No file provided'] };
    
    // 1. Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    const ALLOWED_EXTS = ['.mpp', '.xml'];
    if (!ALLOWED_EXTS.includes(ext)) {
        errors.push('File extension not allowed');
        return { valid: false, errors };
    }
    
    // 2. ✅ Check MIME type (magic bytes)
    const detected = await fileType.fromFile(file.path);
    
    const ALLOWED_MIMES = new Map([
        ['.mpp', ['application/vnd.ms-project', 'application/x-mpp']],
        ['.xml', ['application/xml', 'text/xml']]
    ]);
    
    const expectedMimes = ALLOWED_MIMES.get(ext) || [];
    if (!detected || !expectedMimes.includes(detected.mime)) {
        errors.push(`File type mismatch. Expected ${expectedMimes.join(' or ')}, got ${detected?.mime || 'unknown'}`);
        return { valid: false, errors };
    }
    
    // 3. ✅ Check file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        errors.push('File too large (max 50MB)');
        return { valid: false, errors };
    }
    
    // 4. ✅ Check for suspicious content
    const content = await fs.promises.readFile(file.path, 'utf-8');
    
    // Detectar XXE
    if (ext === '.xml') {
        if (content.includes('<!DOCTYPE') || content.includes('SYSTEM') || content.includes('PUBLIC')) {
            errors.push('File contains DOCTYPE or external entities (XXE risk)');
            return { valid: false, errors };
        }
    }
    
    // Detectar zip bomb
    if (ext === '.xml' && content.length > 10 * 1024 * 1024) {
        errors.push('XML file too large (possible zip bomb)');
        return { valid: false, errors };
    }
    
    return { valid: errors.length === 0, errors };
}

// Usar na rota de upload
app.post('/api/converters/:type/upload', 
    upload.single('file'),
    async (req, res) => {
        try {
            const validation = await validateUploadSecure(req.file);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Invalid file',
                    details: validation.errors
                });
            }
            
            // Processar arquivo seguro
            // ...
        } catch (error) {
            logger.error('UPLOAD_ERROR', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    }
);
```

**Teste**:
```bash
# 1. Upload de arquivo legítimo (deve aceitar)
curl -F "file=@valid.xml" http://localhost:3001/api/converters/xml-to-mpp
# ✅ 200 OK

# 2. Upload com extensão falsa (deve rejeitar)
echo "MZ" > fake.xml  # PE header mas com .xml
curl -F "file=@fake.xml" http://localhost:3001/api/converters/xml-to-mpp
# ✅ 400: File type mismatch

# 3. Upload com XXE (deve rejeitar)
echo '<?xml version="1.0"?><!DOCTYPE x SYSTEM "file:///etc/passwd"><x/>' > xxe.xml
curl -F "file=@xxe.xml" http://localhost:3001/api/converters/xml-to-mpp
# ✅ 400: File contains DOCTYPE or external entities
```

**Checklist**:
- [ ] file-type dependência instalada
- [ ] Validação MIME-type funcionando
- [ ] XXE detection ativo
- [ ] Tamanho de arquivo limitado
- [ ] Testes passando

---

#### Patch 1.3: Fix XXE Protection ⚠️ CRÍTICO
**Arquivo**: `converters/xmlToMpp.js` (e outros XML parsers)  
**Dependências**: `npm install --save libxmljs2`  
**Tempo**: 45 minutos

```javascript
// ANTES (❌ VULNERABLE)
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

// DEPOIS (✅ SECURE)
const libxmljs = require('libxmljs2');

function parseXMLSecurely(xmlContent) {
    try {
        // ✅ libxmljs2 é immune a XXE por padrão
        const doc = libxmljs.parseXml(xmlContent, {
            dtdload: false,          // Desabilitar DTD
            dtdvalid: false,
            nonet: true,            // Sem conexões de rede
            nocdata: false
        });
        
        return doc;
    } catch (error) {
        throw new Error(`XML parsing failed: ${error.message}`);
    }
}

// OU: xml2js com opções seguras
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
    strict: true,
    normalize: false,
    normalizeTags: false,
    // ✅ XXE protection
    resolveNamespace: true,
    explicitRoot: true,
    
    // Parser rules
    // (xml2js não suporta desabilitar completamente - considerar libxmljs2)
});
```

**Teste**:
```bash
# 1. Tentar XXE attack
cat > xxe-test.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<project>
    <name>&xxe;</name>
</project>
EOF

# 2. Parser deve rejeitar ou sanitizar
node -e "
const parser = require('./converters/xmlToMpp.js');
try {
    parser.parse(require('fs').readFileSync('xxe-test.xml', 'utf-8'));
    console.log('❌ XXE não foi bloqueado!');
} catch (e) {
    console.log('✅ XXE bloqueado:', e.message);
}
"
```

**Checklist**:
- [ ] libxmljs2 instalado (ou xml2js com config seguro)
- [ ] XXE tests passando
- [ ] DTD desabilitado
- [ ] External entities desabilitadas

---

### FASE 2: ALTAS (1-2 dias)

#### Patch 2.1: Fix CORS Configuration
**Arquivo**: `api/server.js`  
**Tempo**: 30 minutos

```javascript
// ANTES (❌ VULNERABLE)
app.use(cors());

// DEPOIS (✅ SECURE)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS origin not allowed: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 3600,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Logging CORS rejections
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        logger.warn('CORS_REJECTED', {
            origin: req.get('origin'),
            path: req.path,
            method: req.method
        });
        return res.status(403).json({ error: err.message });
    }
    next(err);
});
```

**.env.example**:
```env
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://seu-dominio.com.br
```

**Teste**:
```bash
# 1. Request de origem permitida (deve funcionar)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3001/api/converters/info
# ✅ 200 OK com CORS headers

# 2. Request de origem não permitida (deve rejeitar)
curl -H "Origin: https://malicioso.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3001/api/converters/info
# ✅ Error: CORS origin not allowed
```

**Checklist**:
- [ ] ALLOWED_ORIGINS definido em .env
- [ ] CORS whitelist ativo
- [ ] Credentials: true se necessário
- [ ] Log de rejections implementado

---

#### Patch 2.2: Add Security Headers
**Arquivo**: `api/server.js`  
**Tempo**: 45 minutos

```javascript
// ✅ Configurar Helmet com rigor máximo
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", process.env.ALLOWED_ORIGINS],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            manifestSrc: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
        },
        reportUri: '/api/security/csp-report',
        reportOnly: false // true para teste, false em produção
    },
    
    hsts: {
        maxAge: 31536000,           // 1 ano
        includeSubDomains: true,
        preload: true
    },
    
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    permittedCrossDomainPolicies: false,
    
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' }
};

app.use(helmet(helmetConfig));

// ✅ CSP Report endpoint
app.post('/api/security/csp-report', express.json(), (req, res) => {
    const report = req.body['csp-report'];
    logger.warn('CSP_VIOLATION', {
        violated_directive: report['violated-directive'],
        blocked_uri: report['blocked-uri'],
        source_file: report['source-file'],
        line_number: report['line-number'],
        status_code: report['status-code'],
        ip: req.ip,
        user_agent: req.get('user-agent')
    });
    res.sendStatus(204);
});

// ✅ Custom security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
```

**Teste**:
```bash
# Verificar headers
curl -I http://localhost:3001
# ✅ Deve conter: Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Content-Security-Policy
```

**Checklist**:
- [ ] Helmet configurado com CSP
- [ ] HSTS ativo
- [ ] Security headers validados
- [ ] CSP report endpoint implementado
- [ ] Testes de compliance passando

---

### FASE 3: MÉDIAS (3-5 dias)

#### Patch 3.1: Hardened Rate Limiting
**Arquivo**: `api/middleware.js`  
**Dependências**: `npm install --save redis redis-rate-limiter`  
**Tempo**: 1.5 horas

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// ✅ Redis para distribuído rate limiting
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
});

// Limiters específicos
const limiters = {
    // Brute force protection
    login: rateLimit({
        store: new RedisStore({ client: redisClient, prefix: 'rl-login:' }),
        windowMs: 15 * 60 * 1000,
        max: 5,                  // 5 tentativas
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    }),
    
    // Upload limit
    upload: rateLimit({
        store: new RedisStore({ client: redisClient, prefix: 'rl-upload:' }),
        windowMs: 60 * 60 * 1000,
        max: 10,                 // 10 por hora
        message: 'Limite de upload atingido'
    }),
    
    // API global
    api: rateLimit({
        store: new RedisStore({ client: redisClient, prefix: 'rl-api:' }),
        windowMs: 15 * 60 * 1000,
        max: 100,
        skipSuccessfulRequests: false,
        keyGenerator: (req) => req.user?.id || req.ip
    }),
    
    // Admin endpoint
    admin: rateLimit({
        store: new RedisStore({ client: redisClient, prefix: 'rl-admin:' }),
        windowMs: 60 * 1000,
        max: 30
    })
};

// Aplicar
app.post('/auth/login', limiters.login, authController.login);
app.post('/api/converters/:type/upload', limiters.upload, uploadController.upload);
app.use('/admin', limiters.admin, adminRoutes);
app.use('/api', limiters.api);

module.exports = limiters;
```

**Teste**:
```bash
# 1. Exceder login attempts
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/login -d "email=test@test.com"
done
# ✅ 6ª requisição deve retornar 429 (Too Many Requests)

# 2. Verificar headers rate-limit
curl -I http://localhost:3001/api/converters/info
# ✅ Conter: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

---

#### Patch 3.2: Secure File Download (Path Traversal Fix)
**Arquivo**: `api/routes/download.js` (novo)  
**Tempo**: 1 hora

```javascript
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateJWT } = require('../middleware');

// ✅ Download seguro
router.get('/:fileId', authenticateJWT, async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.id;
        
        // 1. Validar UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(fileId)) {
            logger.warn('INVALID_FILE_ID_FORMAT', { fileId, userId });
            return res.status(400).json({ error: 'Invalid file ID format' });
        }
        
        // 2. Verificar ownership no banco
        const conversion = await db.conversions.findUnique({
            where: { id: fileId }
        });
        
        if (!conversion || conversion.userId !== userId) {
            logger.warn('UNAUTHORIZED_FILE_ACCESS', { fileId, userId });
            return res.status(404).json({ error: 'File not found' });
        }
        
        // 3. Validar que arquivo existe e está no diretório seguro
        const baseDir = path.resolve('./uploads/converted');
        const filePath = path.resolve(baseDir, conversion.filename);
        
        // ✅ Path traversal protection
        if (!filePath.startsWith(baseDir)) {
            logger.error('PATH_TRAVERSAL_ATTEMPT', { filePath, baseDir, userId });
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // 4. Verificar se arquivo existe
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // 5. Validar tipo de arquivo permitido
        const allowedExtensions = ['.xml', '.mpp', '.csv', '.pdf'];
        const ext = path.extname(filePath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            logger.warn('FORBIDDEN_FILE_TYPE', { ext, fileId, userId });
            return res.status(403).json({ error: 'File type not allowed' });
        }
        
        // 6. Download seguro
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 
            `attachment; filename="${conversion.originalFilename}"`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        const stream = fs.createReadStream(filePath);
        stream.on('error', (err) => {
            logger.error('STREAM_ERROR', { fileId, error: err.message });
            res.status(500).json({ error: 'Download failed' });
        });
        
        stream.pipe(res);
        
        // 7. Log download
        await db.downloads.create({
            conversionId: fileId,
            userId: userId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            downloadedAt: new Date()
        });
        
        logger.info('FILE_DOWNLOADED', {
            fileId,
            userId,
            filename: conversion.originalFilename,
            size: stats.size
        });
        
    } catch (error) {
        logger.error('DOWNLOAD_ERROR', { error: error.message });
        res.status(500).json({ error: 'Download failed' });
    }
});

module.exports = router;
```

---

## 🧪 PLANO DE TESTES

### Teste Após Cada Patch

```bash
# Teste 1.1 (Hardcoded Secrets)
npm test -- tests/security/secrets.test.js

# Teste 1.2 (File Upload)
npm test -- tests/security/upload.test.js

# Teste 1.3 (XXE)
npm test -- tests/security/xxe.test.js

# Teste 2.1 (CORS)
npm test -- tests/security/cors.test.js

# Teste 2.2 (Headers)
npm test -- tests/security/headers.test.js

# Teste 3.1 (Rate Limit)
npm test -- tests/security/rate-limit.test.js

# Teste 3.2 (Path Traversal)
npm test -- tests/security/path-traversal.test.js

# Todos os testes
npm test -- tests/security/
```

---

## 📋 DEPLOY CHECKLIST

### Antes de Deploy em Produção

```bash
# 1. Gerar novo JWT_SECRET
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT_SECRET gerado: $JWT_SECRET"

# 2. Validar .env
test -f .env && echo "✅ .env existe" || echo "❌ Criar .env"
grep "JWT_SECRET" .env || echo "❌ Adicionar JWT_SECRET ao .env"

# 3. Executar testes
npm test

# 4. Build frontend
npm run build

# 5. npm audit
npm audit

# 6. Validar health check
NODE_ENV=production node api/server.js &
sleep 2
curl http://localhost:3001/health
pkill -f "node api/server.js"

# 7. Deploy
git commit -m "🔒 Security patches: Fix hardcoded secrets, CORS, XXE, rate limiting"
git push origin main
# ... Deploy pipeline
```

---

## 🚨 EMERGENCY PROCEDURES

**Se descobrir exploração em produção**:

```bash
# 1. Rotacionar secrets imediatamente
NEW_JWT_SECRET=$(openssl rand -hex 32)
# Atualizar em environment

# 2. Invalidar todas as sessões/tokens
npm run invalidate-all-tokens
# Força login de todos os usuários

# 3. Auditar logs
grep -i "authorization\|jwt\|token" logs/*.log | tail -1000

# 4. Revisar uploads recentes
ls -lt uploads/incoming | head -20
# Verificar se há arquivos suspeitos

# 5. Fazer deploy de patches
npm run deploy:emergency

# 6. Notificar usuários
npm run send-notification "System security update. Please login again."
```

---

## ✅ CONCLUSÃO

**Próximas Ações**:
1. ✅ Implementar Fase 1 (hoje)
2. ✅ Executar testes completos
3. ✅ Deploy em staging
4. ✅ Fazer deploy em produção
5. ✅ Monitorar por 48 horas
6. ✅ Implementar Fase 2 (próximas 48h)
7. ✅ Melhorias contínuas (Fase 3)

**Status**: 🔄 Ready for Implementation

---

**Documento**: SECURITY_PATCH_PLAN.md  
**Versão**: 1.0  
**Última Atualização**: 28/12/2025
