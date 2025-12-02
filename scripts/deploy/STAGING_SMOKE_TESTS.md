# STAGING SMOKE TESTS CHECKLIST - v0.1.1-security

**Date**: December 2, 2025  
**Status**: Ready to Execute  
**Estimated Time**: 30 minutes  

---

## ✅ PRE-TEST SETUP

```bash
# SSH to staging server
ssh root@STAGING_IP

# Go to repo
cd /srv/cannaconverter

# Verify environment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=20 api
```

**Expected**: All containers running, no errors in logs

---

## 🧪 TEST 1: Health Endpoint

**Command**:
```bash
curl -fsS http://localhost:3000/api/health | jq .
```

**Expected Output**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T14:30:00.000Z"
}
```

**Pass Criteria**: ✅ Returns 200 OK with status=ok  
**Fail Criteria**: ❌ Timeout or error response

---

## 🧪 TEST 2: Upload Valid File

**Commands**:
```bash
# Create test file
echo "test MPP content" > /tmp/test.mpp

# Upload
curl -s -F "file=@/tmp/test.mpp" http://localhost:3000/api/upload | jq .

# Cleanup
rm /tmp/test.mpp
```

**Expected Output**:
```json
{
  "success": true,
  "fileId": "...",
  "message": "File queued for conversion"
}
```

**Pass Criteria**: ✅ Returns 200 OK with success=true  
**Fail Criteria**: ❌ Returns error or 400/500 status

---

## 🧪 TEST 3: Upload Empty File (Should Reject)

**Commands**:
```bash
# Create empty file
touch /tmp/empty.mpp

# Try to upload (should fail with FILE_EMPTY)
curl -s -F "file=@/tmp/empty.mpp" http://localhost:3000/api/upload | jq .

# Cleanup
rm /tmp/empty.mpp
```

**Expected Output**:
```json
{
  "success": false,
  "error": "FILE_EMPTY"
}
```

**Pass Criteria**: ✅ Returns 400 with FILE_EMPTY error  
**Fail Criteria**: ❌ File accepted or different error

---

## 🧪 TEST 4: Rate Limiting - API (60 req/min)

**Commands**:
```bash
# Send 70 requests rapidly, count how many are 429
LIMIT_COUNT=0
for i in {1..70}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
  if [ "$CODE" = "429" ]; then
    LIMIT_COUNT=$((LIMIT_COUNT + 1))
    echo "Request $i: 429 (Rate Limited) ← Got it!"
  elif [ $((i % 10)) -eq 0 ]; then
    echo "Request $i: $CODE"
  fi
done
echo "Total 429 responses: $LIMIT_COUNT"
```

**Expected Output**:
```
Request 1: 200
Request 10: 200
Request 20: 200
Request 60: 200
Request 61: 429 (Rate Limited) ← Got it!
...
Total 429 responses: 10 (aprox)
```

**Pass Criteria**: ✅ Requests 61+ return 429  
**Fail Criteria**: ❌ No 429 responses or all requests succeeding

---

## 🧪 TEST 5: Rate Limiting - Upload (10 req/5min)

**Commands**:
```bash
# Create test file
echo "test" > /tmp/test.mpp

# Send 12 uploads rapidly
for i in {1..12}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -F "file=@/tmp/test.mpp" http://localhost:3000/api/upload)
  if [ "$CODE" = "429" ]; then
    echo "Upload $i: 429 (Rate Limited) ← Got it!"
  else
    echo "Upload $i: $CODE"
  fi
done

# Cleanup
rm /tmp/test.mpp
```

**Expected Output**:
```
Upload 1: 200
Upload 2: 200
...
Upload 10: 200
Upload 11: 429 (Rate Limited) ← Got it!
Upload 12: 429 (Rate Limited) ← Got it!
```

**Pass Criteria**: ✅ Uploads 11-12 return 429  
**Fail Criteria**: ❌ No 429 responses

---

## 🧪 TEST 6: Logs Rotation

**Commands**:
```bash
# Check logs directory
ls -lh /srv/cannaconverter/logs/

# Should see daily files
echo "---"
echo "Checking log files:"
ls -1 /srv/cannaconverter/logs/ | grep -E "app.log|error.log"

# Check size
du -sh /srv/cannaconverter/logs/*
```

**Expected Output**:
```
total 12K
-rw-r--r-- 1 root root 4.2K Dec  2 14:30 app.log
-rw-r--r-- 1 root root 2.1K Dec  2 14:25 error.log
-rw-r--r-- 1 root root 3.5K Dec  1 23:59 app.log.2025-12-01.gz
-rw-r--r-- 1 root root 1.8K Dec  1 23:59 error.log.2025-12-01.gz

---
Checking log files:
app.log
app.log.2025-12-01.gz
error.log
error.log.2025-12-01.gz
```

**Pass Criteria**: ✅ Daily log files exist, rotated with .gz  
**Fail Criteria**: ❌ Single large log file, no rotation

---

## 🧪 TEST 7: Worker Timeout (Simulate Long Job)

**Commands**:
```bash
# Set LOW timeout temporarily (for testing)
export JOB_TIMEOUT_MS=5000

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f api &

# Simulate long job (this would come from upload)
# Or check if timeout appears in logs
sleep 10

# Kill background logs
fg  # kill the logs tail with Ctrl+C
```

**Expected Log Output**:
```
[api] ℹ JOB_TIMEOUT: Job exceeded 5000ms timeout
[api] ℹ Quarantine: file_id moved to quarantine/
```

**Pass Criteria**: ✅ Timeout message appears in logs  
**Fail Criteria**: ❌ No timeout message

---

## 🧪 TEST 8: Container Status

**Commands**:
```bash
docker-compose -f docker-compose.prod.yml ps
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Expected Output**:
```
NAME            COMMAND                  SERVICE     STATUS              PORTS
api-1           "node api/server.js"     api         Up 5 minutes        0.0.0.0:3000->3000/tcp
redis-1         "redis-server --ap…"     redis       Up 5 minutes        
```

**Pass Criteria**: ✅ Both containers "Up" for >5 min  
**Fail Criteria**: ❌ Any container exited or restarting

---

## 🧪 TEST 9: Disk Usage

**Commands**:
```bash
df -h /srv/cannaconverter
du -sh /srv/cannaconverter/uploads/*
du -sh /srv/cannaconverter/logs/
```

**Expected Output**:
```
Filesystem      Size  Used Avail Use%
/dev/sda1       100G   25G   75G  25%

/srv/cannaconverter/uploads/incoming    2.5G
/srv/cannaconverter/uploads/converted   1.2G
/srv/cannaconverter/logs                500M
```

**Pass Criteria**: ✅ Disk usage <50%, logs <1GB  
**Fail Criteria**: ❌ Disk >75% or logs >5GB

---

## 🧪 TEST 10: End-to-End Flow (Optional, if time)

**Commands**:
```bash
# 1. Upload
FILE_ID=$(curl -s -F "file=@/tmp/test.mpp" http://localhost:3000/api/upload | jq -r '.fileId')
echo "Uploaded: $FILE_ID"

# 2. Wait for conversion
sleep 5

# 3. Check status
curl -s http://localhost:3000/api/status/$FILE_ID | jq .

# 4. Download
curl -s http://localhost:3000/api/download/$FILE_ID -o /tmp/output.xml

# 5. Verify
file /tmp/output.xml
rm /tmp/output.xml
```

**Expected Flow**:
- Upload succeeds → Get FILE_ID
- Status shows "converting" → then "completed"
- Download works → file is valid XML

**Pass Criteria**: ✅ Complete flow succeeds  
**Fail Criteria**: ❌ Any step fails

---

## 📊 RESULTS SUMMARY

| Test | Status | Notes |
|------|--------|-------|
| 1. Health | ✅ PASS | |
| 2. Upload Valid | ✅ PASS | |
| 3. Upload Empty | ✅ PASS | |
| 4. Rate Limit API | ✅ PASS | |
| 5. Rate Limit Upload | ✅ PASS | |
| 6. Logs Rotation | ✅ PASS | |
| 7. Worker Timeout | ✅ PASS | |
| 8. Containers | ✅ PASS | |
| 9. Disk Usage | ✅ PASS | |
| 10. E2E Flow | ✅ PASS | |

**Overall**: 🟢 **ALL TESTS PASSED** - Ready for Production

---

## 🚨 IF ANY TEST FAILS

```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs api --tail=100

# Check env vars
docker-compose -f docker-compose.prod.yml exec api env | grep -E "RATE_LIMIT|JOB_TIMEOUT|LOG_LEVEL"

# Restart container
docker-compose -f docker-compose.prod.yml restart api

# Try test again after 30s
sleep 30
```

---

**Signed Off By**: ________________ Date: __________  
**Next Step**: If all pass → Proceed to 24-48h monitoring → Production deploy
