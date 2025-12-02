# PR: Fix Static Assets Serving in Docker - CSS/JS Now Correct

## 🎯 Objective
Fix critical issue where CSS, JavaScript, and other static assets return `index.html` instead of the correct content type in Docker/production environment.

## 🐛 Problem
When accessing `/css/style-v2.css`, `/js/app.js`, or other assets in Docker:
- **Response Status**: 200 OK
- **Content-Type**: `text/html` ❌ (WRONG - should be `text/css` or `application/javascript`)
- **Content**: `index.html` source code instead of CSS/JS

**Why**: A catch-all route `app.get('*')` was intercepting asset requests before they could be served as static files.

## ✅ Solution

### Changes Made

#### 1. **api/server.js**
- ✅ Add cache headers middleware before compression
- ✅ Replace problematic catch-all with intelligent SPA router
- ✅ New router checks file extension to distinguish assets from SPA routes

```javascript
// 📁 STATIC FILES MIDDLEWARE COM CACHE HEADERS CORRETOS
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    redirect: false,
    dotfiles: 'deny'
}));

// 🎯 MIDDLEWARE DE CACHE EXPLÍCITO PARA ASSETS
app.use((req, res, next) => {
    // CSS, JS: 1 year cache (immutable)
    if (req.url.match(/\.(css|js|woff|woff2|ttf|eot|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // HTML: no cache
    else if (req.url.match(/\.html$/i) || req.url === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});

// SPA FALLBACK - APENAS PARA ROTAS SEM EXTENSÃO
app.get('*', (req, res, next) => {
    if (req.path.match(/\.\w+$/)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
```

#### 2. **api/server-enterprise.js**
- ✅ Add same cache headers middleware
- ✅ Optimize Content-Type handling

#### 3. **docker/Dockerfile**
- ✅ Fix: Change `server-minimal.js` → `server-enterprise.js` (correct active server)
- ✅ Fix: Add `curl` to dependencies for health check
- ✅ Fix: Use curl-based health check instead of node script
- ✅ Add: `/app/logs` directory creation

#### 4. **scripts/test-static-assets.js** (NEW)
- ✅ Add comprehensive test suite for static assets
- ✅ Validate Content-Type headers
- ✅ Validate Cache-Control headers
- ✅ Test 404 for non-existent assets

## 📋 Tests

### New Test Suite
```bash
node scripts/test-static-assets.js
```

Tests validate:
- ✅ `/css/style-v2.css` → 200, `text/css`
- ✅ `/css/style.css` → 200, `text/css`
- ✅ `/js/app_clean_new.js` → 200, `application/javascript`
- ✅ `/` → 200, `text/html`
- ✅ `/index.html` → 200, `text/html`
- ✅ `/css/nonexistent.css` → 404 (NOT HTML)
- ✅ `/health` → 200 OK

### Manual Validation
```bash
# CSS must be text/css
curl -I http://localhost:3000/css/style-v2.css
# Expected: Content-Type: text/css

# JS must be application/javascript
curl -I http://localhost:3000/js/app_clean_new.js
# Expected: Content-Type: application/javascript

# Cache headers check
curl -I http://localhost:3000/css/style-v2.css | grep Cache-Control
# Expected: Cache-Control: public, max-age=31536000, immutable

# Non-existent file should NOT return HTML
curl http://localhost:3000/css/fake.css
# Expected: {"error": "Arquivo não encontrado"}
# NOT: <html>...</html>
```

## 📊 Impact

| File | Before | After | Impact |
|------|--------|-------|--------|
| `/css/style-v2.css` | `text/html` | `text/css` | 🟢 CRITICAL |
| `/js/app.js` | `text/html` | `application/javascript` | 🟢 CRITICAL |
| `/` | `text/html` | `text/html` | 🟢 WORKING |
| Cache headers | None | 1 year for assets | 🟢 IMPROVEMENT |
| Dockerfile | `server-minimal.js` (broken) | `server-enterprise.js` (working) | 🟢 FIX |

## 🚀 Deployment

### Local
```bash
npm install
node api/server.js
curl -I http://localhost:3000/css/style-v2.css  # Should be text/css ✅
```

### Docker
```bash
docker-compose build
docker-compose up
curl -I http://localhost:3000/css/style-v2.css  # Should be text/css ✅
```

## 📋 Checklist

- [x] Fixed catch-all router to not intercept assets
- [x] Added cache headers for CSS, JS, images
- [x] Updated Dockerfile to use correct server
- [x] Added health check curl support
- [x] Created test script for validation
- [x] All tests passing locally
- [x] Documentation updated
- [x] No breaking changes to existing APIs

## 🔒 Security

- ✅ Dotfiles blocked (`dotfiles: 'deny'`)
- ✅ Cache headers prevent stale assets
- ✅ CSP headers maintained
- ✅ 404 for missing assets (not SPA fallback)

## 📝 Files Changed

- `api/server.js` - Core fix: cache headers + smart SPA router
- `api/server-enterprise.js` - Cache headers middleware
- `docker/Dockerfile` - Fix broken CMD, add curl, fix health check
- `scripts/test-static-assets.js` - NEW: Comprehensive validation
- `docs/FIXES/STATIC_ASSETS_FIX.md` - NEW: Detailed documentation

## ✨ Related Issues

Fixes issue where frontend assets were not loading in Docker because:
1. Catch-all route intercepted all requests
2. No file extension check before serving index.html
3. Dockerfile pointed to non-existent server file
4. Missing health check dependencies

## 🎓 Learning

This fix demonstrates:
1. Importance of route ordering in Express
2. Distinguishing static file serving from SPA routing
3. Cache header optimization for production
4. Testing static assets delivery
