# 🔒 SEGURANÇA AUDITORIA COMPLETA - CONVERSOR MPP XML
## Security Engineering Audit Report v1.0

**Data**: 28 de Dezembro de 2025  
**Auditor**: Security Engineering Team  
**Status**: Fase 1 - Mapeamento Completo  

---

## 📋 FASE 1: MAPEAMENTO DO SISTEMA

### 1.1 Stack de Tecnologias Detectado

#### Backend
- **Runtime**: Node.js (>=16.0.0)
- **Framework**: Express.js 4.18.2
- **ORM**: Prisma 6.19.0
- **Auth**: JWT (jsonwebtoken 9.0.2) + bcryptjs 3.0.3
- **File Upload**: Multer 1.4.5
- **Queue**: Bull/BullMQ (com fallback memory queue)
- **Cache/Session**: Redis 5.9.0 / IORedis 5.8.2
- **Database**: SQLite3 5.1.7 (+ Prisma)
- **Logging**: Winston 3.18.3 + Pino 9.14.0
- **Segurança**: Helmet 7.1.0
- **Rate Limiting**: express-rate-limit 8.2.1
- **Validação**: validator 13.15.23
- **File Sanitization**: sanitize-filename 1.6.3

#### Frontend
- **Framework**: Next.js 14.2.33
- **Runtime**: Node.js (via frontend/)
- **Autenticação**: NextAuth (via /api/auth/[...nextauth])

#### DevOps/Infraestrutura
- **Process Manager**: PM2 (ecosystem.config.js)
- **Container**: Docker (Dockerfile + docker-compose.yml)
- **CI/CD**: GitHub Actions (via .github/)
- **Monitoring**: Prometheus + Grafana
- **Alerts**: Alertmanager (alertmanager/)

---

### 1.2 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE BROWSER                        │
│              (localhost:3000 - Next.js Frontend)            │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP/HTTPS
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                        │
│  Port: 3000                                                 │
│  ├─ /public/index.html (Landing Page)                      │
│  ├─ /app/page.tsx (removed)                                │
│  ├─ /api/converters/info/all (Proxy Route)                │
│  └─ /api/auth/[...nextauth] (NextAuth)                    │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP/HTTPS
             ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Express.js)                       │
│  Port: 3001                                                 │
│  ├─ GET /health (Health Check)                            │
│  ├─ POST /api/converters/* (File Upload/Conversion)       │
│  ├─ GET /api/convert/info/all (List Converters)           │
│  ├─ POST /upload-test (Upload Testing)                    │
│  └─ /metrics (Prometheus)                                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─────────────────────────────┬──────────────────┬──────────────┐
             ▼                             ▼                  ▼              ▼
        ┌─────────────┐          ┌──────────────┐    ┌───────────┐  ┌──────────┐
        │  SQLite DB  │          │  Redis Cache │    │ File System│  │ Queues  │
        │   (local)   │          │  (optional)  │    │(uploads/)  │  │(Bull/BQ)│
        └─────────────┘          └──────────────┘    └───────────┘  └──────────┘
```

---

### 1.3 Pontos de Entrada (Routes) Identificados

#### API Endpoints Críticos (Backend - Port 3001)
```javascript
// Authentication & User Management
POST   /auth/register           [public]  - Criar conta
POST   /auth/login              [public]  - Login
POST   /auth/refresh-token      [auth]    - Renovar JWT
POST   /auth/logout             [auth]    - Logout
GET    /auth/session            [auth]    - Obter sessão

// File Conversion (Core Business Logic)
POST   /api/converters/mpp-to-xml        [auth]  - Upload & Conversão
POST   /api/converters/excel-to-csv      [auth]  - Upload & Conversão
POST   /api/converters/json-to-csv       [auth]  - Upload & Conversão
POST   /api/converters/zip-to-xml        [auth]  - Upload & Conversão
POST   /api/converters/xml-to-mpp        [auth]  - Upload & Conversão
GET    /api/converters/info              [public]- Info do Conversor
GET    /api/convert/info/all             [public]- Lista todos

// Upload & File Management
POST   /upload-test             [public]  - Upload de teste
POST   /api/upload              [auth]    - Upload geral
GET    /download/:fileId        [auth]    - Download

// Admin & Monitoring
GET    /health                  [public]  - Health check
GET    /metrics                 [public]  - Prometheus metrics
GET    /admin/users             [admin]   - Listar usuários
GET    /admin/conversions       [admin]   - Histórico

// Premium/SaaS
POST   /api/premium/subscribe   [auth]    - Subscription
GET    /api/premium/invoice     [auth]    - Fatura
GET    /api/premium/usage       [auth]    - Uso de recursos
```

#### Frontend Routes (Port 3000)
```
GET  /                  - Landing page (public)
GET  /api/converters/info/all - Proxy para backend
GET  /api/auth/session - NextAuth session
```

---

### 1.4 Fluxo de Autenticação & Autorização

#### Autenticação (Auth Flow)
```
1. Client submete credenciais (email + password)
   └─> POST /auth/login

2. Backend:
   ├─ Valida email/password vs. DB (bcryptjs)
   ├─ Gera JWT token (jsonwebtoken)
   └─ Retorna { access_token, refresh_token }

3. Client armazena token (localStorage/cookie)

4. Requisições subsequentes:
   ├─ Headers: Authorization: Bearer <JWT>
   └─ Middleware valida token
```

#### Autorização (Access Control)
- **Public**: /health, /api/converters/info, upload-test
- **Authenticated**: /api/converters/*, /download/*, /api/premium/*
- **Admin**: /admin/*, /api/admin/*
- **Tenant-specific**: (presumível SaaS multi-tenant)

---

### 1.5 Tratamento de Upload/Download (CRÍTICO)

#### Upload Flow
```javascript
// Arquivo → Client → POST /api/converters/mpp-to-xml
// ↓
// Multer + upload-utils.js (validação)
// ├─ File type validation (mime-type)
// ├─ File size limits
// ├─ Filename sanitization (sanitize-filename)
// ├─ Salva em /uploads/incoming
// └─ Queue para processamento (Bull/BullMQ)
// ↓
// Conversion worker processa arquivo
// ├─ Extrai conteúdo
// ├─ Converte para formato alvo
// └─ Salva em /uploads/converted
// ↓
// Client faz download
// └─ GET /download/:fileId
```

#### Download Flow
```javascript
// GET /download/:fileId
// ├─ Valida autenticação (JWT)
// ├─ Valida ownership (user_id == file.owner_id)
// ├─ Stream arquivo
// └─ Log download
```

---

### 1.6 Dados Sensíveis Identificados

| Tipo | Localização | Criticidade |
|------|------------|-------------|
| JWT Tokens | Memory (client) / Headers | 🔴 CRÍTICA |
| Passwords | DB (hashed bcryptjs) | 🔴 CRÍTICA |
| API Keys | .env (env vars) | 🔴 CRÍTICA |
| User Data (PII) | SQLite DB | 🟠 ALTA |
| Upload Files | /uploads/ (filesystem) | 🟠 ALTA |
| Logs | /logs/ | 🟡 MÉDIA |
| PIX Keys (payment) | .env | 🔴 CRÍTICA |

---

### 1.7 Dependências Externas & Integrações

```
┌─────────────────────────────────────────────┐
│  Integrações Detectadas                     │
├─────────────────────────────────────────────┤
│ 1. Redis (cache/session) - opcional        │
│ 2. Prisma (Database ORM)                   │
│ 3. Nodemailer (email) - possível           │
│ 4. QRCode (PIX payment)                    │
│ 5. Sharp (image processing)                │
│ 6. XLSX (Excel parsing)                    │
│ 7. xml2js (XML parsing)                    │
│ 8. Archiver (ZIP processing)               │
│ 9. NextAuth (OAuth integration)            │
│ 10. Prometheus (monitoring)                │
└─────────────────────────────────────────────┘
```

---

### 1.8 Modelos de Dados (Prisma Schema)

Arquivos a revisar:
- `prisma/schema.prisma` - ORM model (usuários, conversões, pagamentos, etc)

---

### 1.9 Áreas de Risco Identificadas (Preliminary)

```
🔴 CRÍTICA
├─ File Upload Handler (RCE risk via malicious files)
├─ JWT Token Handling (expiração, refresh token security)
├─ Multi-tenant isolation (data leakage risk)
├─ SQL Injection (Prisma + user inputs)
└─ SSRF (URL parsing em webhooks)

🟠 ALTA
├─ CORS Configuration (excessivamente aberto)
├─ Rate Limiting (proteção insuficiente)
├─ Authentication Bypass (token validation)
├─ Privilege Escalation (admin vs user)
├─ Insecure Deserialization (XML/JSON parsing)
└─ Log Injection (PII em logs)

🟡 MÉDIA
├─ CSP Headers (muito relaxado)
├─ HTTPS Redirect (missing)
├─ Session Management (timeout)
├─ Error Messages (info disclosure)
└─ Dependencies (outdated versions)
```

---

## 📊 FASE 1 COMPLETA ✅

**Próximos passos:**
1. ✅ Mapeamento completado
2. 🔄 Fase 2: Scans automatizados
   - Dependency vulnerabilities (npm audit)
   - Secrets scanning (gitleaks)
   - SAST analysis (semgrep)
   - Container scanning (Dockerfile)
3. 🔄 Fase 3: Revisão manual dirigida
4. 🔄 Fase 4: Relatório final + remediation plan

---

**Arquivo**: SECURITY_AUDIT_FASE1_MAPEAMENTO.md  
**Status**: ✅ Completado - Pronto para Fase 2
