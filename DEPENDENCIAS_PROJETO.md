# 📦 DEPENDÊNCIAS DO PROJETO - ALTO NÍVEL

## Status: ✅ COMPLETO E DOCUMENTADO

---

## 🚀 **BACKEND - Node.js/Express** (package.json)

### Core Framework
- **express** ^4.18.2 - Framework web
- **compression** ^1.8.1 - Compressão de respostas
- **cors** ^2.8.5 - CORS handling
- **helmet** ^7.1.0 - Security headers
- **dotenv** ^17.2.3 - Variáveis de ambiente

### Database & ORM
- **prisma** ^6.19.0 - ORM (database agnostic)
- **@prisma/client** ^6.19.0 - Prisma client
- **sqlite3** ^5.1.7 - SQLite driver

### Cache & Queue
- **redis** ^5.9.0 - Redis client
- **ioredis** ^5.8.2 - Redis com pools
- **bull** ^4.16.5 - Job queue
- **bullmq** ^5.63.1 - Bull com RabbitMQ

### Autenticação & Segurança
- **jsonwebtoken** ^9.0.2 - JWT auth
- **bcryptjs** ^3.0.3 - Password hashing
- **speakeasy** ^2.0.0 - 2FA/TOTP
- **express-rate-limit** ^8.2.1 - Rate limiting
- **validator** ^13.15.23 - Input validation
- **joi** ^18.0.2 - Schema validation

### File Processing
- **multer** ^1.4.5-lts.1 - File upload
- **file-type** ^21.1.1 - File type detection
- **unzipper** ^0.12.3 - ZIP extraction
- **archiver** ^7.0.1 - ZIP creation
- **sanitize-filename** ^1.6.3 - Safe filenames

### Data Conversion
- **xml2js** ^0.6.2 - XML parsing
- **xlsx** ^0.18.5 - Excel/CSV
- **js-yaml** ^4.1.1 - YAML parsing

### Image & PDF Processing
- **pdfkit** ^0.17.2 - PDF generation
- **sharp** ^0.34.5 - Image resizing
- **qrcode** ^1.5.4 - QR code generation

### Logging & Monitoring
- **winston** ^3.18.3 - Logging
- **winston-daily-rotate-file** ^5.0.0 - Log rotation
- **pino** ^9.14.0 - Fast JSON logging
- **prom-client** ^15.1.3 - Prometheus metrics

### Email & Utilities
- **nodemailer** ^7.0.10 - Email sending
- **form-data** ^4.0.5 - Form data encoding
- **node-fetch** ^2.7.0 - HTTP requests
- **uuid** ^13.0.0 - UUID generation

### Dev Dependencies
- **nodemon** ^3.1.11 - Auto-reload
- **jest** ^30.2.0 - Testing
- **eslint** ^9.39.1 - Linting
- **adm-zip** ^0.5.16 - ZIP handling (tests)

### Node Requirements
```
Node.js: >=16.0.0
npm: >=8.0.0
```

---

## 🐍 **PYTHON** (requirements.txt)

### Web Framework
- **flask** >=2.3.0 - Flask web framework
- **werkzeug** >=2.3.0 - WSGI utilities

### Environment
- **python-dotenv** >=1.0.0 - Environment variables

---

## 🐳 **DOCKER** (docker-compose.production.yml)

### Services
- **Node.js** - Application container
- **Redis** - Cache & queue (official redis image)
- **NGINX** - Reverse proxy

### Volumes
- `/opt/cannaconvert/data` - Database (SQLite)
- `/opt/cannaconvert/uploads` - User uploads
- `/opt/cannaconvert/logs` - Application logs

---

## 📊 **STACK RESUMIDO**

| Componente | Tecnologia | Versão |
|-----------|-----------|--------|
| **Runtime** | Node.js | >=16.0.0 |
| **Framework** | Express.js | 4.18.2 |
| **Database** | SQLite/Prisma | 5.1.7/6.19.0 |
| **Cache** | Redis | 5.9.0 |
| **Queue** | Bull/BullMQ | 4.16.5/5.63.1 |
| **Auth** | JWT + 2FA | 9.0.2 + speakeasy |
| **Container** | Docker | Latest |
| **Proxy** | NGINX | Latest |
| **Monitoring** | Prometheus | 15.1.3 |

---

## ✅ **VERIFICAÇÃO DE DEPENDÊNCIAS**

### Instalar todas as dependências:
```bash
npm ci --only=production
```

### Verificar segurança:
```bash
npm audit
npm run security:check
```

### Verificar sintaxe:
```bash
npm run doctor
npm run lint
```

### Rodar testes:
```bash
npm test
npm run test:converters
```

---

## 📝 **NOTAS IMPORTANTES**

1. **Production Mode**: Sempre rodar com `NODE_ENV=production`
2. **Database**: SQLite embarcado, nenhuma instalação externa necessária
3. **Redis**: Obrigatório para cache e jobs (já no docker-compose)
4. **Segurança**: Helmet + JWT + Rate limiting ativado
5. **Logs**: Winston com rotação diária
6. **Metrics**: Prometheus em `/api/metrics`

---

**Última atualização:** 29 de Dezembro de 2025
**Status:** ✅ Pronto para Produção
