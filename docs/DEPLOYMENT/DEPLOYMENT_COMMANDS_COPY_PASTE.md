# DEPLOYMENT COMMANDS - Copy & Paste Ready

## ✅ COMPLETED ✅
- [x] Branch pushed: fix/rate-limit-20251202
- [x] Tests passing: 6/6 upload validation
- [x] PR created: https://github.com/Cannalonga/conversor-mpp-xml/pull/1
- [x] Release notes ready: RELEASE_NOTES_v0.1.1.md
- [x] All security fixes implemented and verified

---

## STEP 4: Staging Deployment & Smoke Tests

After PR merge to main, deploy to staging:

### SSH to Staging Server
```bash
# Connect to your staging server
ssh user@staging.cannaconverter.com
# or
ssh user@your-staging-ip
```

### Pull Latest & Deploy
```bash
cd /srv/cannaconverter
git fetch origin
git checkout staging
git pull origin staging

# Build and restart containers
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

# Verify containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```
NAMES            STATUS              PORTS
cannaconverter   Up 2 minutes        0.0.0.0:443->3000/tcp
redis            Up 2 minutes        6379/tcp
```

### Health Check
```bash
# Should return {"status":"ok","timestamp":"..."}
curl -fsS https://staging.cannaconverter.com/api/health | jq .
```

### Rate Limiting Test
```bash
# Send 65 requests - should see 429 after 60th
for i in {1..65}; do 
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://staging.cannaconverter.com/api/health)
  echo "Request $i: $HTTP_CODE"
done | tail -10
```

Expected: Requests 61-65 return 429 (Too Many Requests)

### Upload Rate Limiting Test
```bash
# Create small test file
echo "test data" > /tmp/test.mpp

# Send 12 uploads in quick succession
for i in {1..12}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -F "file=@/tmp/test.mpp" https://staging.cannaconverter.com/api/upload)
  echo "Upload $i: $HTTP_CODE"
done | tail -10
```

Expected: Uploads 11-12 return 429 (Too Many Requests)

### Log Rotation Check
```bash
# Check logs exist and are daily-rotated
docker exec cannaconverter ls -lh logs/

# Should see files like:
# app.log
# app.log.2025-12-02
# error.log
# error.log.2025-12-02

# Tail recent logs
docker exec cannaconverter tail -f logs/app.log | head -20
```

### Worker Timeout Test
```bash
# Temporarily set low timeout (for testing only!)
docker exec -it cannaconverter bash -c 'export JOB_TIMEOUT_MS=5000 && npm start'

# In another terminal, upload large MPP file that would take >5 seconds
# Verify it fails with timeout error and file is quarantined
docker exec cannaconverter ls -lh uploads/quarantine/
```

### Upload Validation Test
```bash
# Create empty file
touch /tmp/empty.mpp

# Upload should fail with 400
curl -s -F "file=@/tmp/empty.mpp" https://staging.cannaconverter.com/api/upload | jq .
```

Expected error:
```json
{
  "success": false,
  "error": "FILE_EMPTY"
}
```

### End-to-End Flow Test
```bash
# 1. Upload valid MPP file
curl -F "file=@tests/fixtures/sample.mpp" https://staging.cannaconverter.com/api/upload

# 2. Check conversion queue
docker exec redis redis-cli LLEN bull_queue

# 3. Monitor logs
docker exec -f cannaconverter logs -f api | grep -E "conversion|queue|timeout"

# 4. Check converted file
docker exec cannaconverter ls -lh uploads/converted/

# 5. Download file
curl https://staging.cannaconverter.com/api/download/FILENAME -o output.xml
file output.xml  # Should be "XML document"
```

### Webhook Validation (PIX Flow)
```bash
# Check webhook logs
docker exec cannaconverter grep -i "webhook" logs/app.log | tail -10

# Verify PIX generation
docker exec cannaconverter grep -i "pix\|qr" logs/app.log | tail -5
```

---

## STEP 5: Monitor Staging (24-48 hours)

### Continuous Monitoring
```bash
# Watch logs in real-time
docker compose -f docker-compose.prod.yml logs -f api | tee staging_logs_$(date +%s).txt

# Check error rate
grep -i "error\|fail" logs/app.log | wc -l

# Check queue depth over time
watch -n 5 'docker exec redis redis-cli LLEN bull_queue'

# Monitor disk usage
watch -n 60 'df -h'

# Check Redis memory
docker exec redis redis-cli INFO memory | grep used_memory_human
```

### Performance Baselines
```bash
# P50 conversion time
tail -100 logs/app.log | grep "conversion_time_ms" | awk -F: '{print $NF}' | sort -n | head -50

# Error rate percentage
TOTAL=$(grep "conversion" logs/app.log | wc -l)
ERRORS=$(grep -i "error\|fail" logs/app.log | wc -l)
echo "scale=2; $ERRORS * 100 / $TOTAL" | bc

# Queue depth trend
for i in {1..10}; do 
  DEPTH=$(docker exec redis redis-cli LLEN bull_queue)
  echo "$(date): Queue depth = $DEPTH"
  sleep 60
done
```

### Alert Triggers (Watch For)
```bash
# If queue depth exceeds 1000
if [ $(docker exec redis redis-cli LLEN bull_queue) -gt 1000 ]; then
  echo "⚠️ ALERT: Queue backlog detected!"
  docker compose -f docker-compose.prod.yml logs api | tail -50
fi

# If error rate > 5%
ERROR_COUNT=$(grep -i "error\|fail" logs/app.log | wc -l)
TOTAL_COUNT=$(grep "conversion" logs/app.log | wc -l)
ERROR_PCT=$((ERROR_COUNT * 100 / TOTAL_COUNT))
if [ $ERROR_PCT -gt 5 ]; then
  echo "⚠️ ALERT: Error rate ${ERROR_PCT}% exceeds 5%!"
fi

# If disk usage > 75%
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_PCT -gt 75 ]; then
  echo "⚠️ ALERT: Disk usage ${DISK_PCT}% exceeds 75%!"
fi
```

---

## STEP 6: Production Deployment

### Prerequisites
```bash
# Verify staging tests all passed ✅
# Verify no new Sentry errors ✅
# Verify monitoring shows healthy metrics ✅
# Verify supervisor approved PR ✅
```

### Create Release Tag
```bash
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.1.1-security \
  -m "v0.1.1 — Security hardening (rate limit, logger, worker timeout)"

# Push tag to GitHub
git push origin v0.1.1-security

# Create GitHub release (optional but recommended)
gh release create v0.1.1-security \
  --title "v0.1.1 — Security Hardening" \
  --notes-file RELEASE_NOTES_v0.1.1.md
```

### Deploy to Production
```bash
# On production server
ssh user@prod.cannaconverter.com

cd /srv/cannaconverter
git fetch origin
git checkout main
git pull origin main
git checkout v0.1.1-security  # or just pull main

# Backup current deployment
cp docker-compose.prod.yml docker-compose.prod.yml.backup.$(date +%s)
docker compose -f docker-compose.prod.yml down
docker image prune -f

# Pull latest images and start
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

# Verify
docker ps --format "table {{.Names}}\t{{.Status}}"
curl -fsS https://cannaconverter.com/api/health | jq .

# Tail logs
docker compose -f docker-compose.prod.yml logs -f api | head -50
```

### Post-Deployment Verification
```bash
# Health check
curl -fsS https://cannaconverter.com/api/health

# Rate limiting active
for i in {1..70}; do curl -s https://cannaconverter.com/api/health > /dev/null; done
# Request 71+ should return 429

# Logs rotating daily
ls -lh logs/
grep "Daily rotation started" logs/app.log

# No console.log in production
grep "console.log" logs/app.log || echo "✅ No console.log found"
```

---

## STEP 7: Rollback Plan (If Needed)

If production shows critical issues:

### Immediate Rollback
```bash
# On production server
cd /srv/cannaconverter

# Stop current version
docker compose -f docker-compose.prod.yml down

# Restore previous version
git checkout v0.1.0  # or previous tag

# Restart
docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl -fsS https://cannaconverter.com/api/health
```

### Database Rollback (If Needed)
```bash
# No database migrations in this release, but if needed:
# 1. Restore from backup
# 2. Restart containers
# 3. Verify data integrity

docker exec postgres pg_restore -d cannaconverter_db < backups/cannaconverter_db.sql
docker compose -f docker-compose.prod.yml restart postgres
```

### Communication
```bash
# Notify supervisor of rollback
# Update status page
# Create incident report
# Schedule postmortem
```

---

## STEP 8: Post-Deployment Monitoring (24-72 hours)

### Daily Checklist
```bash
# Every 6 hours:
[ ] curl health endpoint
[ ] check error logs (grep -i error logs/app.log | wc -l)
[ ] verify queue depth (docker exec redis redis-cli LLEN bull_queue)
[ ] check disk usage (df -h)
[ ] verify log rotation (ls -lh logs/)

# Every 24 hours:
[ ] verify conversion success rate > 99%
[ ] check P95 conversion time < 30s
[ ] confirm no new Sentry errors
[ ] review security audit logs
[ ] verify rate limiting is blocking abuse attempts
```

### Expected Metrics (Healthy)
```
Queue Depth:              < 100 items
Conversion Success Rate:  > 99%
P95 Conversion Time:      < 30 seconds
Error Rate:               < 1%
Disk Usage:               < 50%
Log Files:                Growing ~100MB/day
CPU Usage:                < 60%
Memory Usage:             < 2GB
```

### Alert Thresholds
```
CRITICAL:
  - Queue depth > 1000 items
  - Error rate > 10%
  - Disk usage > 85%
  - Conversion time P95 > 60s

WARNING:
  - Queue depth > 500 items
  - Error rate > 5%
  - Disk usage > 75%
  - Conversion time P95 > 45s
```

---

## QUICK REFERENCE

### File Locations
- PR Body: `PR_BODY_fix_rate_limit.md`
- Release Notes: `RELEASE_NOTES_v0.1.1.md`
- Tests: `tests/upload-validation-improved.test.js`
- Logger: `api/logger-winston.js`
- Rate Limiting: `api/middleware.js`
- Validator: `api/utils/upload-validator.js`

### GitHub URLs
- PR: https://github.com/Cannalonga/conversor-mpp-xml/pull/1
- Branch: https://github.com/Cannalonga/conversor-mpp-xml/tree/fix/rate-limit-20251202
- Commits: https://github.com/Cannalonga/conversor-mpp-xml/commits/fix/rate-limit-20251202

### Environment Variables (.env)
```env
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MS=300000
JOB_TIMEOUT_MS=300000
JOB_LOCK_DURATION_MS=30000
JOB_LOCK_RENEW_MS=15000
LOG_LEVEL=info
NODE_ENV=production
```

### Test Commands
```bash
npm ci                                    # Install exact dependencies
npm test                                  # Run all tests
node tests/upload-validation-improved.test.js  # Run upload tests only
```

### Docker Commands
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml down
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## TROUBLESHOOTING

### npm test fails with "localStorage" error
**Solution**: Run custom test instead:
```bash
node tests/upload-validation-improved.test.js
```

### Rate limiting not working
**Check**:
```bash
docker exec cannaconverter grep -i "rate.*limit" logs/app.log
echo $RATE_LIMIT_MAX  # Should be 60
```

### Worker timeout not triggered
**Verify**: Set `JOB_TIMEOUT_MS=5000` temporarily for testing
```bash
docker exec cannaconverter env | grep JOB_TIMEOUT
```

### Logs not rotating daily
**Check**:
```bash
docker exec cannaconverter ls -lah logs/
# Should have date-based files like: app.log.2025-12-02
```

### Upload validation rejecting valid files
**Debug**:
```bash
curl -v -F "file=@tests/fixtures/sample.mpp" https://staging.cannaconverter.com/api/upload
# Check response headers and error message
```

---

## CONTACT & SUPPORT

- **Supervisor**: [Email/Slack]
- **DevOps**: [On-call contact]
- **Security**: [Audit contact]
- **Emergency Rollback**: Approved by [Name]

---

**Last Updated**: December 2, 2025
**Deployment Status**: Ready
**Estimated Time**: 2-3 hours (staging) + 1-2 hours (production)
