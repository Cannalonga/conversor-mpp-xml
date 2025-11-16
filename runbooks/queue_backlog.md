# 📈 RUNBOOK: Queue Backlog / High Queue Depth

## 📋 Alert Information
- **Alert Names**: `ExcelConverterQueueDepthHigh`, `ExcelConverterQueueDepthCritical`, `ExcelConverterThroughputLow`
- **Severity**: Warning → Critical
- **SLO Impact**: Queue depth > 20 jobs violates capacity SLO
- **Business Impact**: Increased wait times, customer dissatisfaction, potential revenue loss

## 🔍 Immediate Assessment (0-2 minutes)

### 1. Check Current Queue Status
```bash
# Current queue depth
curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq -r '.data.result[0].value[1]'

# Queue trend (last 30 minutes)
curl -s "http://prometheus:9090/api/v1/query_range?query=excel:queue_depth&start=$(date -d '30 minutes ago' +%s)&end=$(date +%s)&step=60" | jq '.data.result[0].values[-5:]'

# Active workers and processing rate
curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_throughput_5m" | jq -r '.data.result[0].value[1]'
curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_utilization" | jq -r '.data.result[0].value[1]'
```

### 2. Worker Health Quick Check
```bash
# Worker status overview  
kubectl get pods -l app=excel-worker
docker ps | grep excel-worker | grep -E "(Up|Restarting)"

# Recent worker crashes or restarts
kubectl get events --field-selector involvedObject.kind=Pod --field-selector reason=Failed | grep excel-worker
```

### 3. Traffic Pattern Analysis
- **Grafana Queue Dashboard**: https://grafana.company.com/d/excel-queue
- **Check for traffic spikes in last hour**
- **Identify if queue growth is linear or exponential**

## 🔧 Investigation Steps (2-8 minutes)

### 1. Queue Composition Analysis
```bash
# Check job distribution by file size/format
curl http://excel-converter-api:8000/admin/queue-stats | jq '.jobs_by_size'
curl http://excel-converter-api:8000/admin/queue-stats | jq '.jobs_by_format'

# Check for stuck/long-running jobs
curl http://excel-converter-api:8000/admin/queue-stats | jq '.long_running_jobs'

# Oldest job in queue (wait time indicator)
curl http://excel-converter-api:8000/admin/queue-stats | jq '.oldest_job_age_seconds'
```

### 2. Worker Performance Analysis  
```bash
# Individual worker status and capacity
for pod in $(kubectl get pods -l app=excel-worker -o name); do
    echo "=== Worker: $pod ==="
    kubectl exec $pod -- curl -s localhost:8080/status | jq '.current_jobs, .total_processed, .error_rate'
done

# Worker resource utilization
kubectl top pods -l app=excel-worker
curl -s "http://prometheus:9090/api/v1/query?query=excel:worker_memory_utilization" | jq
```

### 3. Bottleneck Identification
```bash
# Check for external service delays
# Database response time  
curl http://excel-converter-api:8000/health/database | jq '.response_time_ms'

# Storage service latency
curl http://excel-converter-api:8000/health/storage | jq '.response_time_ms'

# Redis/Queue backend performance  
redis-cli --latency -h redis-host -i 1 | head -5
```

### 4. Recent Changes Review
```bash
# Check recent deployments that might affect performance
kubectl rollout history deployment/excel-worker
kubectl rollout history deployment/excel-api

# Check for configuration changes
kubectl describe deployment excel-worker | grep -A 20 "Environment:"
```

## 🚀 Immediate Scaling Actions

### CRITICAL Priority (Queue > 50 jobs)

**1. Emergency Worker Scaling**
```bash
# Scale workers immediately (2x current capacity)
current_replicas=$(kubectl get deployment excel-worker -o jsonpath='{.spec.replicas}')
target_replicas=$((current_replicas * 2))
kubectl scale deployment excel-worker --replicas=$target_replicas

echo "Scaled from $current_replicas to $target_replicas workers"
```

**2. Enable High-Throughput Mode**
```bash
# Increase concurrent jobs per worker
kubectl set env deployment/excel-worker MAX_CONCURRENT_JOBS=4

# Reduce per-job timeout to clear stuck jobs faster  
kubectl set env deployment/excel-worker JOB_TIMEOUT=180

# Enable fast-track for small files
kubectl set env deployment/excel-worker SMALL_FILE_FAST_TRACK=true
```

**3. Clear Problematic Jobs**
```bash
# Identify and clear stuck jobs (>10 minutes processing)
curl -X POST http://excel-converter-api:8000/admin/clear-stuck-jobs?max_age=600

# Move failed jobs to retry queue
curl -X POST http://excel-converter-api:8000/admin/retry-failed-jobs?limit=10

# Purge very old jobs (>1 hour) if critically backlogged
# WARNING: Only in emergency - causes customer experience issues
# curl -X POST http://excel-converter-api:8000/admin/purge-old-jobs?max_age=3600
```

### HIGH Priority (Queue 20-50 jobs)

**1. Gradual Scaling**
```bash
# Scale workers by 50%
current_replicas=$(kubectl get deployment excel-worker -o jsonpath='{.spec.replicas}')
target_replicas=$((current_replicas + (current_replicas / 2)))
kubectl scale deployment excel-worker --replicas=$target_replicas
```

**2. Performance Optimization**
```bash
# Enable queue processing optimizations
kubectl set env deployment/excel-worker QUEUE_BATCH_SIZE=3
kubectl set env deployment/excel-worker QUEUE_PREFETCH=5

# Optimize memory usage for higher throughput  
kubectl set env deployment/excel-worker MEMORY_OPTIMIZE_MODE=true
kubectl set env deployment/excel-worker GC_AGGRESSIVE=true
```

**3. Load Balancing**
```bash
# Redistribute load across worker nodes
kubectl patch deployment excel-worker -p '{"spec":{"template":{"spec":{"affinity":{"podAntiAffinity":{"preferredDuringSchedulingIgnoredDuringExecution":[{"weight":100,"podAffinityTerm":{"labelSelector":{"matchLabels":{"app":"excel-worker"}},"topologyKey":"kubernetes.io/hostname"}}]}}}}}}'
```

## 📊 Queue-Specific Optimizations

### By Queue Type/Priority

**Small File Priority Queue**
```bash
# Create dedicated small-file workers  
kubectl set env deployment/excel-worker ENABLE_PRIORITY_QUEUE=true
kubectl set env deployment/excel-worker SMALL_FILE_POOL_SIZE=4

# Fast processing for files < 1MB
kubectl set env deployment/excel-worker SMALL_FILE_TIMEOUT=30
kubectl set env deployment/excel-worker SKIP_VALIDATION_SMALL_FILES=true
```

**Large File Handling**  
```bash
# Limit large file concurrency to prevent resource exhaustion
kubectl set env deployment/excel-worker LARGE_FILE_MAX_CONCURRENT=1
kubectl set env deployment/excel-worker LARGE_FILE_TIMEOUT=600

# Use streaming for large files to reduce memory pressure
kubectl set env deployment/excel-worker ENABLE_STREAMING_LARGE_FILES=true
```

### By Processing Format

**High-Volume Formats (CSV, JSON)**
```bash
# Optimize for common formats
kubectl set env deployment/excel-worker CSV_FAST_MODE=true  
kubectl set env deployment/excel-worker JSON_STREAMING=true
kubectl set env deployment/excel-worker SKIP_FORMAT_VALIDATION=true
```

**Resource-Intensive Formats (Parquet)**
```bash
# Dedicated resources for complex formats
kubectl set env deployment/excel-worker PARQUET_MEMORY_LIMIT=2GB
kubectl set env deployment/excel-worker PARQUET_MAX_CONCURRENT=1
```

## 🔄 Auto-Scaling Configuration

### Immediate HPA Setup
```bash
# Create Horizontal Pod Autoscaler based on queue depth  
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler  
metadata:
  name: excel-worker-queue-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: excel-worker
  minReplicas: 2
  maxReplicas: 12
  metrics:
  - type: External
    external:
      metric:
        name: excel_queue_depth
      target:
        type: Value
        value: "15"  # Scale when queue > 15 jobs
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100  # Double replicas
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent  
        value: 50   # Reduce by half
        periodSeconds: 120
EOF
```

### Advanced Auto-Scaling (if Keda available)
```bash
cat <<EOF | kubectl apply -f -
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: excel-worker-scaler
spec:
  scaleTargetRef:
    name: excel-worker
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: excel_queue_depth
      threshold: '10'
      query: excel:queue_depth
EOF
```

## ⚡ Traffic Management

### Rate Limiting (Emergency Brake)
```bash
# Temporarily limit new job acceptance if overwhelmed
kubectl set env deployment/excel-api RATE_LIMIT_PER_MINUTE=100
kubectl set env deployment/excel-api QUEUE_ADMISSION_LIMIT=100

# Enable waiting room for new requests
kubectl set env deployment/excel-api ENABLE_WAITING_ROOM=true
kubectl set env deployment/excel-api MAX_WAITING_REQUESTS=50
```

### Load Shedding
```bash
# Reject large files temporarily to clear queue
kubectl set env deployment/excel-api REJECT_FILES_ABOVE_MB=20

# Prioritize paid customers (if applicable)
kubectl set env deployment/excel-api PREMIUM_FAST_LANE=true

# Enable circuit breaker for protection  
kubectl set env deployment/excel-api CIRCUIT_BREAKER_THRESHOLD=200
```

## 📞 Communication & Escalation

### Customer Communication
```bash
# Update status page
curl -X PATCH "https://api.statuspage.io/v1/pages/PAGE_ID/components/COMPONENT_ID" \
  -H "Authorization: OAuth TOKEN" \
  -d '{"component":{"status":"degraded_performance","status_text":"Processing delays due to high volume"}}'
```

### Internal Updates
```
📈 Excel Converter Queue Alert - HIGH BACKLOG  
Current Queue: 47 jobs (Critical threshold: 50)
Processing Rate: 8.5 jobs/min (Normal: 12 jobs/min)
Actions Taken:
- Scaled workers 4 → 8 replicas
- Enabled fast-track small file processing
- Cleared 3 stuck jobs from queue
ETA: Queue normalized in ~15 minutes  
Monitoring: Queue depth trend, worker scaling effectiveness
Next Update: 10 minutes or when queue < 20 jobs
```

### Escalation Criteria
- **Queue > 100 jobs**: Immediate page to SRE + Engineering Lead
- **Queue growing >10 jobs/min**: Standard escalation to Backend Team  
- **Processing completely stalled**: Critical escalation + incident call

## ✅ Resolution Verification

### 1. Queue Metrics Normalized  
```bash
# Verify queue depth back to normal
queue_depth=$(curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq -r '.data.result[0].value[1]')
echo "Current queue depth: $queue_depth (Target: < 20)"

# Verify processing throughput restored
throughput=$(curl -s "http://prometheus:9090/api/v1/query?query=excel:conversion_throughput_5m" | jq -r '.data.result[0].value[1]')
echo "Current throughput: $throughput jobs/sec"
```

### 2. Worker Health Check
```bash
# All workers healthy and processing  
kubectl get pods -l app=excel-worker | grep -c "Running"
kubectl top pods -l app=excel-worker | awk '{if(NR>1) print $3}' | grep -v "0m"

# No stuck or failed jobs remaining
curl http://excel-converter-api:8000/admin/queue-stats | jq '.stuck_jobs_count, .failed_jobs_count'
```

### 3. Performance Stability
```bash
# Monitor for 10 minutes to ensure stability
for i in {1..10}; do
    queue_depth=$(curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq -r '.data.result[0].value[1]')
    echo "Minute $i: Queue depth = $queue_depth"  
    sleep 60
done
```

## 🔧 Cleanup & Prevention

### Immediate Cleanup (< 1 hour)
```bash
# Scale workers back to normal if manually scaled
kubectl scale deployment excel-worker --replicas=4

# Remove emergency configuration  
kubectl set env deployment/excel-worker JOB_TIMEOUT-
kubectl set env deployment/excel-worker SMALL_FILE_FAST_TRACK-
kubectl set env deployment/excel-api RATE_LIMIT_PER_MINUTE-
```

### Long-term Prevention (< 1 week)
- [ ] Implement permanent auto-scaling based on queue depth
- [ ] Add queue depth alerts with multiple thresholds  
- [ ] Optimize job processing pipeline for common patterns
- [ ] Create capacity planning model based on traffic patterns
- [ ] Implement predictive scaling based on time-of-day patterns

## 📚 Reference Commands

```bash
# Quick queue health check
curl -s "http://prometheus:9090/api/v1/query?query=excel:queue_depth" | jq -r '.data.result[0].value[1]'

# Scale workers
kubectl scale deployment excel-worker --replicas=N

# Check worker status
kubectl get pods -l app=excel-worker

# Clear stuck jobs  
curl -X POST http://excel-converter-api:8000/admin/clear-stuck-jobs

# Queue statistics
curl http://excel-converter-api:8000/admin/queue-stats | jq

# Worker resource usage
kubectl top pods -l app=excel-worker
```

---

**Last Updated**: November 15, 2025  
**Owner**: SRE Team  
**Version**: 1.0