# v0.1.1 — Security Hardening & Stability

## 🔒 Security Improvements

### Rate Limiting (MÉDIO #1)
- **express-rate-limit** middleware for API and upload endpoints
- API limit: 60 requests/minute per IP (configurable)
- Upload limit: 10 requests/5 minutes per IP (stricter)
- Prevents DoS attacks and abuse
- Configurable via environment variables

### Enhanced Error Handling (MÉDIO #2)
- Maps file system errors to proper HTTP status codes
  - `ENOENT` → 404 (File not found)
  - `EACCES` → 403 (Permission denied)
  - `ValidationError` → 400 (Bad request)
- Request ID tracking for debugging
- Stack traces only in development mode
- Production-safe error responses

### Logger with Daily Rotation (MÉDIO #3)
- **Winston** + **DailyRotateFile** replaces console.log
- Structured JSON logging for parsing
- Separate log files for app and errors
- Log retention: 14 days for app, 30 days for errors
- Auto-compression of archived logs
- Handles uncaught exceptions and rejections

### Worker Timeout Protection (MÉDIO #4)
- Job timeout: 5 minutes default (configurable)
- Uses Promise.race pattern for graceful failure
- Failed jobs automatically quarantined
- Prevents queue from stalling due to long-running jobs
- Timeout logged with job ID for monitoring

### Upload Validation (BAJO #2 & #3)
- Magic bytes detection using **file-type** library
- Empty file rejection with FILE_EMPTY error code
- File size validation (50MB default, configurable)
- MIME type whitelist support
- Not based on extension (secure against spoofing)

## 📊 Test Coverage

- **6 upload validation tests** - 100% passing
- **5 security component tests** - 100% passing
- All test fixtures included
- Custom test runner (no external dependencies)

## 📦 Dependencies Added

```json
{
  "express-rate-limit": "^6.11.0",
  "winston": "^3.11.0",
  "winston-daily-rotate-file": "^4.7.1",
  "file-type": "^18.5.0"
}
```

## 🔧 Configuration

Add to `.env`:

```env
# Rate Limiting
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MS=300000

# Worker Timeout
JOB_TIMEOUT_MS=300000
JOB_LOCK_DURATION_MS=30000
JOB_LOCK_RENEW_MS=15000

# Logging
LOG_LEVEL=info
```

## ✅ What's Fixed

| Issue | Type | Status |
|-------|------|--------|
| DoS via upload spam | MÉDIO | ✅ Fixed |
| Generic error responses | MÉDIO | ✅ Fixed |
| Disk full from logs | MÉDIO | ✅ Fixed |
| Stuck worker jobs | MÉDIO | ✅ Fixed |
| console.log in production | BAJO | ✅ Fixed |
| Unvalidated MPP files | BAJO | ✅ Fixed |
| Empty file acceptance | BAJO | ✅ Fixed |

## 🚀 Deployment

### Prerequisites
```bash
npm ci
npm test  # All tests must pass
npm audit # Verify no new vulnerabilities
```

### Staging
```bash
git checkout staging
git pull origin staging
git merge --no-ff fix/rate-limit-20251202
docker compose -f docker-compose.prod.yml up -d --build
curl -fsS https://staging.cannaconverter.com/api/health | jq .
```

### Production (after staging validation)
```bash
git checkout main
git pull origin main
git tag -a v0.1.1-security -m "v0.1.1 — Security hardening"
git push origin v0.1.1-security
# Deploy via CD pipeline
```

## 🧪 Smoke Tests (Staging)

1. **Health check**: `curl https://staging.cannaconverter.com/api/health`
2. **Rate limiting**: Send >60 requests, expect 429 on request 61+
3. **Log rotation**: Check `logs/` folder for daily .log files
4. **Worker timeout**: Simulate long job, verify quarantine
5. **Upload validation**: Upload empty file, expect 400 error
6. **E2E flow**: Upload → Queue → Conversion → Download

## 📈 Monitoring

### Grafana Dashboards
- `queue_depth` - Should decrease over time
- `conversion_duration_seconds` - P95 < 30s
- `conversion_failures_total` - No increase

### Alerts
- `queue_depth > 1000` - Warning
- `error_rate > 5%` - Critical
- `disk_usage > 75%` - Warning

### Logs
```bash
# Check application logs
docker compose -f docker-compose.prod.yml logs -f api

# Check rotation
ls -lh logs/
```

## 🔄 Rollback Plan

If critical issues occur:

```bash
# On server
docker compose -f docker-compose.prod.yml down
git checkout v0.1.0  # Previous version
docker compose -f docker-compose.prod.yml up -d --build
```

## 📝 Breaking Changes

**None.** This release is fully backward compatible.

## 🙏 Contributors

Security audit and implementation: GitHub Copilot Enterprise Audit System

## 📄 License

See LICENSE file

---

**Release Date**: December 2, 2025  
**Status**: ✅ Production Ready  
**Breaking Changes**: None  
**Test Coverage**: 11/11 passing (100%)
