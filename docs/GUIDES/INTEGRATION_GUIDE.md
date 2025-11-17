# 🚀 Integração de Enterprise Standards no Servidor

> Guia para integrar todos os componentes profissionais no `api/server-minimal.js`

---

## 1️⃣ Imports Necessários

```javascript
// Logger
const Logger = require('./logger');
const logger = new Logger('Server');

// Config
const { loadConfig } = require('./config');
const config = loadConfig();

// Error Handling
const {
    globalErrorHandler,
    notFoundHandler,
    asyncHandler
} = require('./error-handler');

// Middleware
const {
    requestIdMiddleware,
    requestLoggingMiddleware,
    securityHeadersMiddleware,
    corsMiddleware,
    RateLimiter
} = require('./middleware');

// Health Check
const HealthCheckService = require('./health-check');
```

---

## 2️⃣ Middlewares de Segurança

```javascript
const app = express();

// ✅ Request ID (para tracing)
app.use(requestIdMiddleware);

// ✅ Security Headers
app.use(securityHeadersMiddleware);

// ✅ CORS
app.use(corsMiddleware);

// ✅ Request Logging
app.use(requestLoggingMiddleware);

// ✅ Rate Limiting
const limiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100
});
app.use('/api', limiter.middleware());

// ✅ Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
```

---

## 3️⃣ Health Check Endpoint

```javascript
const healthCheck = new HealthCheckService();

app.get('/api/health', asyncHandler(async (req, res) => {
    const health = await healthCheck.runAll();
    
    const statusCode = health.status === 'ok' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    logger.info('Health check', { status: health.status });
    res.status(statusCode).json(health);
}));

app.get('/api/health/quick', asyncHandler(async (req, res) => {
    const isHealthy = await healthCheck.getQuickStatus();
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString()
    });
}));
```

---

## 4️⃣ Rotas da Aplicação

```javascript
// ✅ Com asyncHandler para capturar erros
app.post('/api/upload', asyncHandler(async (req, res) => {
    // Sua lógica aqui
    logger.info('File uploaded', { filename: req.file?.filename });
    res.json({ success: true });
}));

app.get('/api/admin/dashboard', asyncHandler(async (req, res) => {
    // Dashboard logic
    logger.api('/api/admin/dashboard', 'GET', 200);
    res.json({ /* dados */ });
}));
```

---

## 5️⃣ Tratamento de Erros (Final)

```javascript
// ✅ 404 Handler (deve estar no final)
app.use(notFoundHandler);

// ✅ Global Error Handler (deve estar no final)
app.use(globalErrorHandler);
```

---

## 6️⃣ Startup e Logging

```javascript
const PORT = config.PORT || 3000;
const HOST = config.HOST || 'localhost';

app.listen(PORT, HOST, () => {
    logger.info(`Server started`, {
        host: HOST,
        port: PORT,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString()
    });
    
    console.log('🚀 SERVIDOR RODANDO');
    console.log(`   Host: ${HOST}`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Env: ${config.NODE_ENV}`);
    console.log(`   Health: http://${HOST}:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Server shutting down gracefully');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Server terminated');
    process.exit(1);
});
```

---

## 7️⃣ Environment Variables Requeridas

```bash
# .env
NODE_ENV=development
HOST=localhost
PORT=3000
LOG_LEVEL=info
ENABLE_RATE_LIMITING=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Security
JWT_SECRET=seu-secret-jwt
API_KEY=sua-api-key
SESSION_SECRET=seu-session-secret
```

---

## 8️⃣ Exemplo Completo Minimalista

```javascript
const express = require('express');
const Logger = require('./api/logger');
const { loadConfig } = require('./api/config');
const { globalErrorHandler, notFoundHandler, asyncHandler } = require('./api/error-handler');
const { requestIdMiddleware, securityHeadersMiddleware } = require('./api/middleware');
const HealthCheckService = require('./api/health-check');

const logger = new Logger('App');
const config = loadConfig();
const app = express();
const healthCheck = new HealthCheckService();

// Middlewares
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(express.json());
app.use(express.static('public'));

// Health
app.get('/api/health', asyncHandler(async (req, res) => {
    const health = await healthCheck.runAll();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
}));

// 404
app.use(notFoundHandler);

// Error Handler
app.use(globalErrorHandler);

// Start
app.listen(config.PORT, () => {
    logger.info('Server running', { port: config.PORT });
});
```

---

## 9️⃣ Checklist de Integração

- [ ] Copiar `api/logger.js`
- [ ] Copiar `api/config.js`
- [ ] Copiar `api/error-handler.js`
- [ ] Copiar `api/middleware.js`
- [ ] Copiar `api/health-check.js`
- [ ] Atualizar `api/server-minimal.js` com imports
- [ ] Adicionar middlewares ao app
- [ ] Adicionar endpoints (health, etc)
- [ ] Adicionar error handlers (404, global)
- [ ] Atualizar `.env` com variáveis necessárias
- [ ] Testar endpoints com curl/Postman
- [ ] Verificar logs em `logs/app.log`

---

## 🔟 Testing

```bash
# Testar health check
curl http://localhost:3000/api/health

# Testar logs
cat logs/app.log

# Testar rate limiting (100 requests em 15 min)
for i in {1..101}; do curl http://localhost:3000/api/health; done

# Testar 404
curl http://localhost:3000/nao-existe
```

---

## 📊 Exemplo de Resposta

```json
{
  "status": "ok",
  "timestamp": "2025-11-17T20:30:45.123Z",
  "checks": {
    "system": {
      "status": "ok",
      "uptime": 3600,
      "systemUptime": 86400
    },
    "memory": {
      "status": "ok",
      "heap": {
        "used": 45,
        "total": 256,
        "percent": "17.58"
      }
    }
  },
  "uptime": 3600
}
```

---

**Integração Completa = Servidor Enterprise Ready!** 🏆
