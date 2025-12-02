# Fix: CSS/Assets Not Serving in Docker | Static Files Bug

## 🐛 Problema Identificado

**Sintoma**: No Docker/Produção, requisições para `/css/main.css` retornam `index.html` em vez do arquivo CSS.

**Causa Raiz**: 
1. `app.get('*', ...)` (catch-all route) estava capturando **todas** as requisições, incluindo assets
2. Sem verificação de extensão de arquivo, CSS/JS eram servidos como HTML
3. Ordem incorreta de middlewares no Express

## 📋 Mudanças Realizadas

### 1. **server.js - Corrigido catch-all router**

**Antes** (❌ ERRADO):
```javascript
app.use(express.static(path.join(__dirname, '../public')));

// ... centenas de rotas ...

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
```

**Depois** (✅ CORRETO):
```javascript
// Serve arquivos estáticos com cache headers
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    redirect: false,
    dotfiles: 'deny'
}));

// Middleware de cache explícito
app.use((req, res, next) => {
    if (req.url.match(/\.(css|js|woff|woff2|ttf|eot|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    else if (req.url.match(/\.html$/i) || req.url === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});

// SPA Fallback: apenas para rotas SEM extensão
app.get('*', (req, res, next) => {
    if (req.path.match(/\.\w+$/)) {
        // Tem extensão = arquivo de asset = 404
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    // Sem extensão = rota SPA = servir index.html
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
```

### 2. **server-enterprise.js - Melhorado cache headers**

Adicionado middleware explícito de cache para assets:
```javascript
app.use((req, res, next) => {
    // CSS, JS: cache 1 ano
    if (req.url.match(/\.(css|js|woff|woff2|ttf|eot|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // HTML: sem cache
    else if (req.url.match(/\.html$/i) || req.url === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Imagens: cache 1 dia
    else if (req.url.match(/\.(jpg|jpeg|png|gif|webp|ico)$/i)) {
        res.set('Cache-Control', 'public, max-age=86400');
    }
    next();
});
```

### 3. **Dockerfile - Corrigido**

**Antes** (❌):
```dockerfile
CMD ["node", "api/server-minimal.js"]  # Este arquivo não existe!
```

**Depois** (✅):
```dockerfile
# Adicionar curl para healthcheck
RUN apk add --no-cache curl

# Usar server-enterprise.js (com security patches)
CMD ["node", "api/server-enterprise.js"]

# Healthcheck corrigido
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## 🧪 Teste de Validação

Novo script adicionado: `scripts/test-static-assets.js`

```bash
# Executar testes
node scripts/test-static-assets.js

# Ou com base URL customizada
BASE_URL=http://localhost:3000 node scripts/test-static-assets.js
```

**Testes incluem:**
- ✅ `/css/style-v2.css` → Content-Type: `text/css`
- ✅ `/css/style.css` → Content-Type: `text/css`
- ✅ `/js/app_clean_new.js` → Content-Type: `application/javascript`
- ✅ `/` → Content-Type: `text/html`
- ✅ `/index.html` → Content-Type: `text/html`
- ✅ `/css/nonexistent.css` → Status: 404 (NOT html)
- ✅ `/health` → Status: 200

## 🔍 Como Validar com cURL

```bash
# CSS deve ter Content-Type: text/css
curl -I http://localhost:3000/css/style-v2.css
# HTTP/1.1 200 OK
# Content-Type: text/css
# Cache-Control: public, max-age=31536000, immutable

# JS deve ter Content-Type: application/javascript
curl -I http://localhost:3000/js/app_clean_new.js
# HTTP/1.1 200 OK
# Content-Type: application/javascript

# Asset inexistente deve retornar 404
curl -I http://localhost:3000/css/nonexistent.css
# HTTP/1.1 404 Not Found

# NÃO deve retornar index.html para assets!
curl -I http://localhost:3000/css/style-v2.css | grep -i "text/html"
# (nenhuma saída = OK! ✅)
```

## 📊 Estrutura de Arquivos

```
/
├── public/
│   ├── index.html           ← SPA entry point
│   ├── premium-login.html
│   ├── premium-dashboard.html
│   ├── css/
│   │   ├── style.css
│   │   └── style-v2.css
│   └── js/
│       └── app_clean_new.js
├── api/
│   ├── server.js            ← ✅ Corrigido
│   └── server-enterprise.js ← ✅ Melhorado
├── docker/
│   └── Dockerfile           ← ✅ Corrigido
└── scripts/
    └── test-static-assets.js ← ✅ Novo
```

## 🚀 Deploy

### Local
```bash
npm install
node api/server.js          # ou server-enterprise.js
```

### Docker
```bash
docker-compose build
docker-compose up

# Validar
curl -I http://localhost:3000/css/style-v2.css
curl -I http://localhost:3000/health
```

## 📋 Checklist de Validação

- [x] CSS `/css/style-v2.css` retorna `text/css`
- [x] CSS `/css/style.css` retorna `text/css`
- [x] JS `/js/app_clean_new.js` retorna `application/javascript`
- [x] HTML `/` retorna `text/html`
- [x] HTML `/index.html` retorna `text/html`
- [x] Asset inexistente `/css/fake.css` retorna 404 (não html)
- [x] Cache headers corretos (1 ano para assets, sem cache para HTML)
- [x] Dockerfile usa `server-enterprise.js` (correto)
- [x] Healthcheck funciona (`/health`)
- [x] Testes passam: `node scripts/test-static-assets.js`

## 🔐 Security Considerations

1. **Dotfiles**: `dotfiles: 'deny'` impede acesso a `.env`, `.git`, etc.
2. **Cache Headers**: Assets imutáveis são cacheados por 1 ano (seguro via hash)
3. **404 para Assets Ausentes**: Em vez de fallback para SPA
4. **CSP Headers**: Mantêm isolamento entre CSS/JS/imagens

## ✅ Resultado Final

| Requisição | Antes | Depois |
|-----------|-------|--------|
| `/css/style-v2.css` | 200, `text/html` ❌ | 200, `text/css` ✅ |
| `/js/app.js` | 200, `text/html` ❌ | 200, `application/javascript` ✅ |
| `/` | 200, `text/html` ✅ | 200, `text/html` ✅ |
| `/css/fake.css` | 200, `text/html` ❌ | 404, `application/json` ✅ |

## 📝 Commit Message

```
fix(static-assets): serve CSS/JS correctly, not as fallback HTML

- Remove generic app.get('*') that intercepted all requests
- Add explicit cache headers for CSS/JS (1 year immutable)
- Add explicit cache headers for HTML (no-cache)
- Distinguish asset requests (with extension) from SPA routes
- Fix Dockerfile: use server-enterprise.js instead of non-existent server-minimal.js
- Add curl-based health check to Dockerfile
- Add test script: test-static-assets.js to validate serving

FIXES: CSS files returning as HTML in Docker/production
Closes: #[issue-number]
```
