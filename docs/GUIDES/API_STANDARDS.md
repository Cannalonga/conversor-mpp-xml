# 📚 REST API Standards - CannaConverter

> Padrões e especificações para todas as APIs do projeto

---

## 📐 Response Format Padrão

### Success Response (2xx)

```json
{
  "success": true,
  "data": { /* dados específicos */ },
  "meta": {
    "timestamp": "2025-11-17T20:30:45.123Z",
    "requestId": "123456-abc-789",
    "version": "1.0.0"
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "statusCode": 400,
    "details": {
      "field": "email",
      "expected": "valid email",
      "received": "invalid-email"
    }
  },
  "meta": {
    "timestamp": "2025-11-17T20:30:45.123Z",
    "requestId": "123456-abc-789"
  }
}
```

---

## 🔌 Endpoints Padrão

### Health Check
```
GET /api/health
GET /api/health/quick
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "checks": {
    "system": { "status": "ok", "uptime": 3600 },
    "memory": { "status": "ok", "heap": { "used": 45, "total": 256 } }
  }
}
```

---

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

---

### File Upload
```
POST /api/upload
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-123",
    "filename": "project.mpp",
    "size": 102400,
    "status": "received",
    "convertUrl": "/api/convert/file-123"
  }
}
```

---

### Conversion
```
POST /api/convert/{fileId}
GET  /api/convert/{fileId}/status
GET  /api/convert/{fileId}/download
```

**Convert Request:**
```json
{
  "format": "xml",
  "options": {
    "preserveFormatting": true,
    "includeMetadata": true
  }
}
```

**Status Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-123",
    "status": "converting",
    "progress": 45,
    "estimatedTime": 30,
    "resultUrl": "/api/convert/file-123/download"
  }
}
```

---

## 🔐 Authentication

### Bearer Token
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure (JWT)
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-123",
    "email": "user@example.com",
    "iat": 1234567890,
    "exp": 1234571490,
    "scopes": ["read", "write"]
  }
}
```

---

## 🚫 Error Codes

### Client Errors (4xx)

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Entrada inválida |
| `AUTH_ERROR` | 401 | Autenticação falhou |
| `AUTH_FORBIDDEN` | 403 | Acesso negado |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `CONFLICT` | 409 | Conflito (ex: usuário existente) |
| `RATE_LIMIT` | 429 | Muitos requisições |

### Server Errors (5xx)

| Code | Status | Meaning |
|------|--------|---------|
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |
| `SERVICE_UNAVAILABLE` | 503 | Serviço indisponível |

---

## 📦 Request/Response Examples

### Example: Upload e Convert

**1. Upload arquivo**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@project.mpp"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "file-123",
    "status": "received"
  }
}
```

**2. Iniciar conversão**
```bash
curl -X POST http://localhost:3000/api/convert/file-123 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"format": "xml"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "queued",
    "estimatedTime": 60
  }
}
```

**3. Verificar status**
```bash
curl http://localhost:3000/api/convert/file-123/status \
  -H "Authorization: Bearer {token}"
```

**4. Download resultado**
```bash
curl -O http://localhost:3000/api/convert/file-123/download \
  -H "Authorization: Bearer {token}"
```

---

## 🎯 API Versioning

### URL Format
```
/api/v1/endpoint
/api/v2/endpoint
```

### Header Support
```
Accept: application/vnd.cannaconverter.v1+json
```

---

## ⏱️ Rate Limiting

**Headers de resposta:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**Limite padrão:** 100 requisições por 15 minutos por IP

---

## 📊 Request ID Tracking

Cada requisição recebe um ID único para rastreamento:

```
X-Request-ID: 1234567890-abc123
```

Use este ID para debugging e logs.

---

## 🔄 Retry Policy

### Exponential Backoff
```
Retry-After: 60
```

Cliente deve aguardar antes de fazer nova tentativa.

---

## 💾 Pagination

### Query Parameters
```
GET /api/files?page=1&limit=20&sort=-createdAt
```

### Response
```json
{
  "success": true,
  "data": [
    { /* items */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🔍 Filtering & Searching

```
GET /api/conversions?status=completed&from=2025-01-01&to=2025-12-31
```

---

## 📝 Changelog

### v1.0.0 (Current)
- Initial API specification
- Authentication with JWT
- File upload and conversion
- Health check endpoints
- Rate limiting
- Error handling

---

**Standard API: Production Ready!** ✅
