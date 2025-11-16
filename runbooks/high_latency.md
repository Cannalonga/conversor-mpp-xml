# 🐌 RUNBOOK: High Latency / Performance Degradation

## 📋 Alert Information
- **Alert Names**: `ExcelConverterLatencySmallFilesSLO`, `ExcelConverterLatencyMediumFilesSLO`, `ExcelConverterAPILatencyHigh`
- **Severity**: Warning/Critical  
- **SLO Impact**: P95 latency thresholds exceeded
- **Business Impact**: Poor user experience, potential customer churn

## 🔍 Immediate Assessment (0-3 minutes)

### 1. Identify Latency Scope
```bash
# Check current P95 latency by file size
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_small_5m" | jq '.data.result[0].value[1]'
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_medium_5m" | jq '.data.result[0].value[1]'  
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_large_5m" | jq '.data.result[0].value[1]'

# Check API response time
curl -s "http://prometheus:9090/api/v1/query?query=excel:api_latency_p99_5m" | jq
```

### 2. Quick Resource Check
```bash
# Worker resource utilization
curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_utilization" | jq
curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_memory_utilization" | jq

# Queue depth  
curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq
```

### 3. System Load Overview
- **Grafana Dashboard**: https://grafana.company.com/d/excel-performance  
- **Current throughput vs. normal**
- **Any recent deployments or changes**

## 🔧 Investigation Steps (3-10 minutes)

### 1. Resource Bottleneck Analysis

**CPU Pressure Check:**
```bash
# Worker CPU utilization
kubectl top pods -l app=excel-worker
docker stats | grep excel-worker

# Host CPU usage  
curl -s "http://prometheus:9090/api/v1/query?query=rate(node_cpu_seconds_total{mode!='idle'}[5m])" | jq
```

**Memory Pressure Check:**
```bash
# Worker memory usage
kubectl top pods -l app=excel-worker
curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_memory_utilization" | jq

# Check for memory leaks (increasing trend)
curl -s "http://prometheus:9090/api/v1/query_range?query=excel_converter_memory_usage_bytes&start=$(date -d '1 hour ago' +%s)&end=$(date +%s)&step=60" | jq
```

**Storage I/O Check:**
```bash
# Check disk latency and usage
curl -s "http://prometheus:9090/api/v1/query?query=rate(node_disk_io_time_seconds_total[5m])" | jq

# Storage service health
curl -f http://minio:9000/health/live
aws s3api head-bucket --bucket excel-uploads --endpoint-url=http://minio:9000
```

### 2. Application-Level Performance

**Database Performance:**
```bash
# Check database connection pool
curl http://excel-converter-api:8000/health/database/pool

# Database query performance  
psql -h postgres-host -c "SELECT query, mean_time, calls FROM pg_stat_statements WHERE query LIKE '%excel%' ORDER BY mean_time DESC LIMIT 10;"

# Active connections
psql -h postgres-host -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**Queue Performance:**
```bash
# Redis performance (if using Redis queue)
redis-cli --latency-history -h redis-host

# Queue processing rate
curl -s "http://prometheus:9090/api/v1/query?query=rate(excel_converter_conversions_total{status='success'}[5m])" | jq
```

### 3. Worker Process Analysis
```bash
# Check worker logs for slow operations
kubectl logs -l app=excel-worker --since=15m | grep -E "(SLOW|took|duration)" | tail -20

# Check for stuck workers
curl http://excel-converter-api:8000/admin/worker-status

# Individual worker performance
for pod in $(kubectl get pods -l app=excel-worker -o name); do
    echo "=== $pod ==="
    kubectl exec $pod -- ps aux | head -5
    kubectl exec $pod -- free -h
done
```

## 🛠 Performance Optimization Actions

### Scenario A: High Resource Utilization (Most Common)

**CPU Bottleneck:**
```bash
# 1. Scale workers horizontally
kubectl scale deployment excel-worker --replicas=6

# 2. Reduce worker concurrency temporarily
kubectl set env deployment/excel-worker MAX_CONCURRENT_JOBS=2

# 3. Enable CPU optimization
kubectl set env deployment/excel-worker CPU_OPTIMIZE_MODE=true

# 4. Check for CPU-heavy processes
kubectl exec -it $(kubectl get pods -l app=excel-worker -o name | head -1) -- top
```

**Memory Bottleneck:**  
```bash
# 1. Restart high-memory workers
kubectl delete pod -l app=excel-worker --field-selector='status.phase=Running' | head -1

# 2. Enable memory optimization
kubectl set env deployment/excel-worker MEMORY_OPTIMIZE_MODE=true  

# 3. Reduce batch size for large files
kubectl set env deployment/excel-worker LARGE_FILE_BATCH_SIZE=1000

# 4. Enable streaming for large files
kubectl set env deployment/excel-worker ENABLE_STREAMING=true
```

### Scenario B: Storage I/O Latency

**Storage Optimization:**
```bash
# 1. Check storage service performance
kubectl get pods -l app=minio
curl -f http://minio:9000/health/ready

# 2. Enable local caching
kubectl set env deployment/excel-worker ENABLE_LOCAL_CACHE=true
kubectl set env deployment/excel-worker CACHE_SIZE=2GB

# 3. Use faster storage tier (if available)  
kubectl set env deployment/excel-worker STORAGE_TIER=fast

# 4. Restart storage service if needed
kubectl rollout restart deployment/minio
```

### Scenario C: Database Performance Issues

**Database Optimization:**
```bash
# 1. Check and optimize slow queries
psql -h postgres-host -c "SELECT query, mean_time FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC;"

# 2. Increase connection pool size temporarily
kubectl set env deployment/excel-api DB_POOL_SIZE=20

# 3. Enable read replicas for queries (if available)
kubectl set env deployment/excel-api USE_READ_REPLICA=true

# 4. Restart API to reset connection pool
kubectl rollout restart deployment/excel-api
```

### Scenario D: Queue/Processing Pipeline Issues

**Queue Optimization:**
```bash
# 1. Check queue health
redis-cli info replication
redis-cli ping

# 2. Optimize queue processing  
kubectl set env deployment/excel-worker QUEUE_BATCH_SIZE=5
kubectl set env deployment/excel-worker QUEUE_PREFETCH=10

# 3. Enable priority processing
kubectl set env deployment/excel-worker ENABLE_PRIORITY_QUEUE=true

# 4. Clear any stuck jobs
curl -X POST http://excel-converter-api:8000/admin/clear-stuck-jobs
```

## 🎯 Performance Tuning by File Size

### Small Files (< 1MB) - Target: P95 < 3s
```bash
# Optimize for fast processing
kubectl set env deployment/excel-worker SMALL_FILE_FAST_TRACK=true
kubectl set env deployment/excel-worker SMALL_FILE_POOL_SIZE=8

# Reduce overhead
kubectl set env deployment/excel-worker SKIP_VALIDATION_SMALL_FILES=true
```

### Medium Files (1-5MB) - Target: P95 < 8s  
```bash
# Balanced processing
kubectl set env deployment/excel-worker MEDIUM_FILE_CHUNK_SIZE=50000  
kubectl set env deployment/excel-worker ENABLE_PARALLEL_SHEETS=true

# Memory optimization
kubectl set env deployment/excel-worker MEDIUM_FILE_MEMORY_LIMIT=1GB
```

### Large Files (5-20MB) - Target: P95 < 20s
```bash
# Streaming and chunking
kubectl set env deployment/excel-worker ENABLE_STREAMING=true
kubectl set env deployment/excel-worker LARGE_FILE_CHUNK_SIZE=10000
kubectl set env deployment/excel-worker STREAM_BUFFER_SIZE=64MB

# Dedicated worker pool  
kubectl label nodes node-1 workload=large-files
kubectl patch deployment excel-worker-large -p '{"spec":{"template":{"spec":{"nodeSelector":{"workload":"large-files"}}}}}'
```

## 📊 Performance Monitoring

### Real-time Metrics to Watch
```bash
# Latency trend (should decrease after optimization)
watch -n 30 'curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_small_5m" | jq -r ".data.result[0].value[1]"'

# Throughput (should maintain or improve)
watch -n 30 'curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_throughput_5m" | jq -r ".data.result[0].value[1]"'

# Resource utilization (should normalize)  
watch -n 30 'curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_utilization" | jq -r ".data.result[0].value[1]"'
```

### Performance Baseline Verification
- **Small files**: P95 < 3 seconds ✅
- **Medium files**: P95 < 8 seconds ✅  
- **Large files**: P95 < 20 seconds ✅
- **API endpoints**: P99 < 2 seconds ✅
- **Queue depth**: < 20 jobs ✅

## 📞 Escalation Criteria

### Immediate Escalation
- **If**: P95 latency > 2x SLO target for 10+ minutes
- **Or**: Complete processing stopped (0 throughput)
- **Or**: Critical customer escalation received

### Standard Escalation  
- **If**: Optimization attempts don't improve latency within 15 minutes
- **Or**: Resource utilization > 90% despite scaling

### Communication
```bash
# Internal update template
🐌 Excel Converter Performance Issue
Current: Small file P95 = 5.2s (Target: 3s)
Actions: Scaled workers 4→6, enabled optimization mode  
ETA: Improvement expected in 10 minutes
Monitoring: P95 trend, resource utilization
```

## ✅ Resolution Verification

### 1. Latency SLO Compliance
```bash
# Verify all file sizes meet SLO
for size in small medium large; do
    latency=$(curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_${size}_5m" | jq -r '.data.result[0].value[1]')
    echo "File size $size: P95 = ${latency}s"
done
```

### 2. Performance Stability Test
```bash
# Run load test to verify stability
kubectl create job perf-test --image=loadtest:latest -- \
    --target http://excel-converter-api:8000/api/excel/convert/json \
    --rate 10 --duration 5m --file small-test.xlsx

# Monitor during test
watch -n 30 'curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_latency_p95_small_5m"'
```

### 3. Resource Utilization Check
- CPU utilization < 80% ✅
- Memory utilization < 85% ✅  
- Storage I/O latency < 100ms ✅
- Queue depth < 10 jobs ✅

## 🔄 Prevention & Long-term Optimization

### Immediate Actions
- [ ] Revert temporary environment changes after verification
- [ ] Document root cause in incident tracker  
- [ ] Update performance baselines if needed

### Short-term Improvements (< 1 week)
- [ ] Implement permanent performance optimizations discovered
- [ ] Add more granular performance monitoring  
- [ ] Update autoscaling rules based on learnings
- [ ] Create performance regression tests

### Long-term Optimization (< 1 month)
- [ ] Code profiling and optimization sprint
- [ ] Infrastructure capacity planning review
- [ ] Consider performance-focused architecture changes
- [ ] Implement predictive performance monitoring

## 📚 Reference Links

- **Performance Dashboard**: https://grafana.company.com/d/excel-performance
- **Resource Dashboard**: https://grafana.company.com/d/excel-resources  
- **Architecture Docs**: https://wiki.company.com/excel-converter/performance/
- **Optimization Guide**: https://wiki.company.com/excel-converter/tuning/

---

**Last Updated**: November 15, 2025  
**Owner**: Performance Team  
**Version**: 1.0