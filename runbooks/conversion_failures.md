# 🚨 RUNBOOK: Conversion Failures (5xx Errors)

## 📋 Alert Information
- **Alert Name**: `ExcelConverterErrorBudgetBurnCritical` / `ExcelConverterAvailabilitySLO`  
- **Severity**: Critical
- **SLO Impact**: High - Direct impact on 99.5% success rate SLO
- **Business Impact**: Lost revenue, customer churn, reputation damage

## 🔍 Immediate Assessment (0-5 minutes)

### 1. Verify Alert Scope
```bash
# Check current error rate
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_success_rate_5m" | jq

# Check affected formats  
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_success_rate_by_format_5m" | jq
```

### 2. Quick Health Check
```bash
# API health endpoint
curl -f http://excel-converter-api:8000/health

# Worker health
docker ps | grep excel-worker
kubectl get pods -l app=excel-worker

# Check recent deployments
kubectl rollout history deployment/excel-converter
```

### 3. Error Pattern Analysis
- **Grafana Dashboard**: https://grafana.company.com/d/excel-overview
- **Sentry Errors**: https://sentry.io/organizations/company/projects/excel-converter/
- **Recent Error Spike**: Look for pattern in last 15 minutes

## 🔧 Investigation Steps (5-15 minutes)

### 1. Check Sentry for Error Context
```bash
# Get recent errors with context
# Look for:
# - Stack traces
# - User IDs affected  
# - File characteristics (size, format, sheets)
# - Error frequency by endpoint
```

**Common Error Patterns:**
- **Memory errors**: `OutOfMemoryError` → Worker memory pressure
- **Timeout errors**: `AsyncTimeoutError` → Worker overload or storage lag
- **Parsing errors**: `ExcelParseError` → Corrupted/unsupported files
- **Storage errors**: `S3/MinioError` → Storage backend issues

### 2. Worker Status Investigation  
```bash
# Check worker logs for specific job failures
docker logs excel-worker-1 | grep "ERROR\|EXCEPTION" | tail -20
kubectl logs -l app=excel-worker --since=15m | grep -E "(ERROR|job_id)"

# Check worker resource usage
docker stats excel-worker-1
kubectl top pods -l app=excel-worker

# Check worker queue depth
curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq
```

### 3. Infrastructure Health Check
```bash
# Database connectivity  
curl -f http://excel-converter-api:8000/health/database

# Storage connectivity
curl -f http://excel-converter-api:8000/health/storage  

# Redis connectivity (if using queue)
redis-cli ping

# Network connectivity between services
curl -f http://excel-worker-1:8080/health
```

## 🛠 Mitigation Actions

### Scenario A: Memory Pressure (Most Common)
**Symptoms**: OOM errors, worker restarts, slow processing

**Actions**:
```bash
# 1. Restart memory-heavy workers
kubectl delete pod -l app=excel-worker --field-selector=status.phase=Running | head -2

# 2. Temporarily increase memory limits
kubectl patch deployment excel-worker -p '{"spec":{"template":{"spec":{"containers":[{"name":"worker","resources":{"limits":{"memory":"4Gi"}}}]}}}}'

# 3. Scale up worker replicas
kubectl scale deployment excel-worker --replicas=6

# 4. Enable memory optimization mode
kubectl set env deployment/excel-worker MEMORY_OPTIMIZE_MODE=true
```

### Scenario B: Queue Backlog / Worker Overload  
**Symptoms**: Queue depth > 50, high latency, timeouts

**Actions**:
```bash
# 1. Scale workers immediately
kubectl scale deployment excel-worker --replicas=8

# 2. Check for stuck jobs
curl -X POST http://excel-converter-api:8000/admin/clear-stuck-jobs

# 3. Temporarily increase worker timeout
kubectl set env deployment/excel-worker JOB_TIMEOUT=600  # 10 minutes

# 4. Enable priority queuing for small files
kubectl set env deployment/excel-worker PRIORITY_QUEUE=true
```

### Scenario C: Storage Backend Issues
**Symptoms**: S3/Minio errors, file upload/download failures

**Actions**:
```bash
# 1. Check storage service health  
kubectl get pods -l app=minio
docker ps | grep minio

# 2. Test storage connectivity manually
aws s3 ls s3://excel-uploads/ --endpoint-url=http://minio:9000

# 3. Restart storage service if needed
kubectl rollout restart deployment/minio

# 4. Switch to backup storage (if configured)
kubectl set env deployment/excel-worker STORAGE_BACKEND=backup
```

### Scenario D: Database Issues
**Symptoms**: Database connection errors, job metadata failures

**Actions**:
```bash
# 1. Check database connectivity
pg_isready -h postgres-host -p 5432

# 2. Check connection pool status
curl http://excel-converter-api:8000/health/database/pool

# 3. Restart API service to reset connections
kubectl rollout restart deployment/excel-api

# 4. Check database resource usage  
kubectl top pods -l app=postgres
```

## 📞 Escalation Path

### Immediate Escalation (< 5 minutes)
- **If**: Error rate > 50% OR complete service down
- **Who**: On-call SRE + Engineering Lead  
- **How**: PagerDuty + Slack #excel-alerts

### Standard Escalation (5-15 minutes)
- **If**: Cannot identify root cause OR mitigation not working
- **Who**: Backend Team Lead + Product Manager
- **How**: Slack #excel-incidents + Email to stakeholders

### Executive Escalation (15+ minutes)  
- **If**: Revenue impact > $10k OR customer escalations
- **Who**: Engineering Director + Customer Success
- **How**: Incident call + Customer communication

## 📝 Communication Templates

### Internal Slack Update
```
🚨 Excel Converter Incident - HIGH ERROR RATE
Status: INVESTIGATING 
Impact: ~X% of conversions failing since [time]
Actions: Scaling workers, investigating Sentry errors
ETA: Resolution expected in 15-30 minutes
Next update: 10 minutes
```

### Customer Status Page
```
⚠️ Excel Converter - Degraded Performance
We're experiencing elevated error rates with Excel conversions. 
Our team is actively working on a fix.
Estimated resolution: 30 minutes
Updates: https://status.company.com
```

## ✅ Resolution Verification

### 1. Metrics Return to Normal
```bash
# Verify error rate < 1%
curl -s "http://prometheus:9090/api/v1/query?query=excel:error_rate_5m" | jq '.data.result[0].value[1]'

# Verify queue depth < 20
curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq '.data.result[0].value[1]'

# Verify latency within SLO  
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_small_5m" | jq
```

### 2. End-to-End Test
```bash
# Test conversion with known good file
curl -X POST "http://excel-converter-api:8000/api/excel/convert/json" \
     -F "file=@test-small.xlsx" \
     -H "Authorization: Bearer test-token"

# Verify response time < 3 seconds
# Verify successful conversion  
# Verify output data integrity
```

### 3. Monitor for 15 Minutes
- Watch Grafana dashboard for continued stability
- Monitor Sentry for new error patterns
- Verify no new alerts triggered

## 📊 Post-Incident Actions

### Immediate (< 1 hour)
- [ ] Update incident status to RESOLVED
- [ ] Notify stakeholders of resolution
- [ ] Scale workers back to normal if temporarily increased
- [ ] Document root cause and fix in incident tracker

### Short-term (< 24 hours)  
- [ ] Complete post-mortem analysis
- [ ] Update monitoring thresholds if needed
- [ ] Review and improve this runbook based on incident
- [ ] Identify preventive measures

### Long-term (< 1 week)
- [ ] Implement preventive monitoring improvements  
- [ ] Code changes to prevent recurrence
- [ ] Update alerting rules if false positive/negative
- [ ] Team retrospective and process improvements

## 📚 Reference Links

- **Grafana Dashboard**: https://grafana.company.com/d/excel-overview
- **Sentry Project**: https://sentry.io/organizations/company/projects/excel-converter/  
- **Runbook Repository**: https://wiki.company.com/excel-converter/runbooks/
- **Escalation Policy**: https://company.pagerduty.com/escalation_policies/excel
- **Architecture Docs**: https://wiki.company.com/excel-converter/architecture/

## 🔍 Troubleshooting Commands Reference

```bash
# Quick health check
curl -f http://excel-converter-api:8000/health

# Check worker status
kubectl get pods -l app=excel-worker
docker ps | grep excel

# Scale workers
kubectl scale deployment excel-worker --replicas=N  

# Check logs  
kubectl logs -l app=excel-worker --since=10m
docker logs excel-worker-1 | tail -50

# Check metrics
curl -s "http://prometheus:9090/api/v1/query?query=excel:error_rate_5m"

# Clear stuck jobs
curl -X POST http://excel-converter-api:8000/admin/clear-stuck-jobs

# Force worker restart
kubectl rollout restart deployment/excel-worker
```

---

**Last Updated**: November 15, 2025  
**Owner**: SRE Team  
**Version**: 1.0