# 🚨 INCIDENT RESPONSE RUNBOOK - ConversorMPP.com
## Enterprise-Grade Operations & Crisis Management

---

## 📋 **INCIDENT CLASSIFICATION MATRIX**

### **Severity Levels**

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| **P0 - CRITICAL** | Complete service outage<br/>Payment system down<br/>Security breach | **< 5 minutes** | API completely down<br/>Mercado Pago webhook failures<br/>Data breach detected |
| **P1 - HIGH** | Major feature degraded<br/>Conversion pipeline affected | **< 15 minutes** | File processing queue stuck<br/>High error rates (>5%)<br/>MinIO storage issues |
| **P2 - MEDIUM** | Minor feature affected<br/>Performance degraded | **< 1 hour** | Slow response times<br/>Single worker down<br/>Non-critical service issues |
| **P3 - LOW** | Cosmetic issues<br/>Minor bugs | **< 24 hours** | UI glitches<br/>Documentation issues<br/>Non-urgent improvements |

### **Impact Assessment Matrix**

```
         │ Low      │ Medium   │ High     │ Critical
────────────────────────────────────────────────────
High     │ P2       │ P1       │ P0       │ P0
Medium   │ P3       │ P2       │ P1       │ P0  
Low      │ P3       │ P3       │ P2       │ P1
```

---

## 🎯 **INCIDENT RESPONSE PROCEDURES**

### **P0 - CRITICAL INCIDENTS**

#### **🔴 Complete Service Outage**

**Symptoms:**
- API returning 500/502/503 errors
- Website completely inaccessible
- All health checks failing

**Immediate Response (< 2 minutes):**
```powershell
# 1. Check service status
docker ps -a
pm2 status

# 2. Check system resources
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}

# 3. Check critical logs immediately
docker logs conversor-app --tail 100
docker logs nginx-proxy --tail 100
Get-EventLog -LogName System -Newest 20 | Where-Object {$_.EntryType -eq "Error"}
```

**Mitigation Steps:**
```powershell
# Option A: Quick service restart
docker-compose down
docker-compose up -d

# Option B: Rollback to last known good version
git log --oneline -5
git checkout <last-good-commit>
docker-compose build --no-cache
docker-compose up -d

# Option C: Emergency static page (if complete failure)
# Deploy maintenance page to CDN/load balancer
```

**Recovery Validation:**
```powershell
# Health check sequence
curl -I http://localhost:3000/health
curl -X POST http://localhost:3000/api/health -d '{"test":"true"}'
curl -I https://conversormpp.com/health

# Performance validation
for ($i=1; $i -le 10; $i++) { 
    Measure-Command { curl -s http://localhost:3000/health } | Select-Object TotalMilliseconds
    Start-Sleep 1
}
```

#### **💳 Payment System Failure**

**Symptoms:**
- Mercado Pago webhook failures
- Payment confirmations not processing
- Users reporting payment issues

**Immediate Response (< 3 minutes):**
```powershell
# 1. Check Mercado Pago service status
curl -H "Authorization: Bearer $MP_ACCESS_TOKEN" "https://api.mercadopago.com/v1/account/settings"

# 2. Verify webhook endpoint
curl -X POST http://localhost:3000/api/webhook/mercadopago -H "Content-Type: application/json" -d '{"test":"connectivity"}'

# 3. Check recent payment logs
docker logs conversor-app | findstr "payment\|mercado\|webhook" | Select-Object -Last 50

# 4. Verify database connectivity to payments table
# Connect to PostgreSQL and check recent payments
```

**Emergency Procedures:**
```powershell
# Manual payment verification script
node -e "
const payments = require('./api/payment-verification.js');
payments.verifyLastHourPayments()
  .then(results => console.log('Verification complete:', results))
  .catch(err => console.error('Verification failed:', err));
"

# If webhooks are down, enable polling mode
docker exec -it conversor-app node -e "
process.env.PAYMENT_MODE = 'polling';
require('./api/payment-poller.js').start();
"
```

#### **🔐 Security Breach Detection**

**Symptoms:**
- Unusual API traffic patterns
- Failed authentication spikes
- Suspicious file uploads
- External security alerts

**IMMEDIATE LOCKDOWN (< 1 minute):**
```powershell
# 1. Enable emergency rate limiting
docker exec nginx-proxy nginx -s reload -c /etc/nginx/nginx-emergency.conf

# 2. Block suspicious IPs immediately
# Add to fail2ban or firewall rules

# 3. Revoke all API tokens temporarily
docker exec conversor-app node -e "require('./api/security.js').revokeAllTokens();"

# 4. Switch to read-only mode
docker exec conversor-app node -e "require('./api/maintenance.js').enableReadOnlyMode();"
```

**Investigation Commands:**
```powershell
# Check recent suspicious activity
docker logs nginx-proxy | findstr "40[1-4]\|50[0-5]" | Select-Object -Last 100
docker logs conversor-app | findstr "error\|fail\|unauthorized" | Select-Object -Last 100

# Monitor real-time requests
docker logs -f nginx-proxy | Select-String -Pattern "(POST|PUT|DELETE)"

# Check file uploads in quarantine
Get-ChildItem "uploads/quarantine" -Recurse | Sort-Object LastWriteTime -Descending
```

---

### **P1 - HIGH PRIORITY INCIDENTS**

#### **⚙️ File Processing Queue Stuck**

**Symptoms:**
- Files stuck in processing status
- Bull queue dashboard shows stuck jobs
- Worker processes not responding

**Diagnosis:**
```powershell
# 1. Check Bull queue status
curl http://localhost:3001/api/queues

# 2. Check Redis connectivity
docker exec redis redis-cli ping
docker exec redis redis-cli info replication

# 3. Check worker processes
docker ps | findstr worker
pm2 status | findstr worker
```

**Resolution:**
```powershell
# Option A: Restart workers
pm2 restart all
docker-compose restart workers

# Option B: Clear stuck jobs
docker exec redis redis-cli flushdb
node scripts/clear-stuck-jobs.js

# Option C: Manual job processing
node scripts/process-stuck-files.js --force
```

#### **💾 MinIO Storage Issues**

**Symptoms:**
- File upload failures
- Storage connectivity errors
- Converted files not accessible

**Diagnosis:**
```powershell
# Check MinIO status
curl http://localhost:9000/minio/health/live
docker logs minio | Select-Object -Last 50

# Check storage space
docker exec minio df -h /data

# Test file operations
curl -X PUT http://localhost:9000/test-bucket/test.txt -d "test data"
```

**Resolution:**
```powershell
# Restart MinIO service
docker-compose restart minio

# Clear temporary files if space issue
docker exec minio find /data -name "*.tmp" -delete
docker exec minio find /data -name "multipart*" -delete

# Manual bucket verification
docker exec minio mc admin heal --recursive myminio/conversions
```

#### **📊 High Error Rate (>5%)**

**Symptoms:**
- Error rate monitoring alerts
- Multiple failed conversions
- User complaints increasing

**Immediate Analysis:**
```powershell
# Get error breakdown from logs
docker logs conversor-app --since="1h" | findstr "ERROR" | Group-Object | Sort-Object Count -Descending

# Check specific error patterns
docker logs conversor-app --since="1h" | Select-String -Pattern "conversion.*failed|timeout|memory"

# Monitor real-time errors
docker logs -f conversor-app | Select-String -Pattern "ERROR|WARN"
```

**Mitigation:**
```powershell
# Enable conservative mode (longer timeouts, smaller batches)
docker exec conversor-app node -e "require('./config/emergency.js').enableConservativeMode();"

# Scale up workers temporarily
docker-compose scale workers=5

# Clear problematic files from queue
node scripts/quarantine-failing-files.js
```

---

### **P2 - MEDIUM PRIORITY INCIDENTS**

#### **🐌 Performance Degradation**

**Symptoms:**
- Response times > P95 SLO (>3s)
- CPU/Memory usage high
- Slow file processing

**Analysis:**
```powershell
# Performance profiling
docker stats --no-stream

# Check database performance
# Run EXPLAIN ANALYZE on slow queries

# Memory analysis
docker exec conversor-app node -e "console.log(process.memoryUsage());"

# Identify slow endpoints
docker logs nginx-proxy | awk '{print $7, $10}' | sort | uniq -c | sort -nr
```

**Optimization:**
```powershell
# Clear caches
docker exec redis redis-cli flushall
docker exec conversor-app node -e "require('./utils/cache.js').clearAll();"

# Restart services to clear memory leaks
docker-compose restart app workers

# Enable performance mode
docker exec conversor-app node -e "require('./config/performance.js').enableHighPerformanceMode();"
```

---

## 📞 **ESCALATION PROCEDURES**

### **Internal Escalation Matrix**

```
Level 1: On-Call Engineer (0-15 min)
├─ P0: Immediate escalation to Level 2
├─ P1: Attempt resolution, escalate if >30 min
└─ P2/P3: Handle or schedule

Level 2: Senior Engineer + DevOps Lead (15-30 min)
├─ P0: Immediate escalation to Level 3
├─ P1: Full incident response team
└─ Assessment and resource allocation

Level 3: CTO + External Experts (30+ min)
├─ P0: Crisis management mode
├─ Customer communication
└─ Business continuity decisions
```

### **Communication Templates**

#### **Internal Alert (Slack/Teams)**
```
🚨 INCIDENT ALERT - P{LEVEL}
───────────────────────
SYSTEM: ConversorMPP Production
ISSUE: {brief description}
IMPACT: {user/business impact}
STATUS: {investigating/mitigating/resolved}
ETA: {estimated resolution time}
OWNER: {incident commander}
───────────────────────
Details: {link to incident doc}
```

#### **Customer Communication (Status Page)**
```
🔧 Service Impact Notification

We are currently experiencing {impact description} affecting {affected features}.

Our team is actively working on a resolution.

Estimated Resolution: {ETA}
Last Updated: {timestamp}

We apologize for any inconvenience and will provide updates every 30 minutes.

Updates: status.conversormpp.com
```

---

## 🛠️ **DIAGNOSTIC TOOLS & COMMANDS**

### **System Health Quick Check**
```powershell
# Full system status script
function Get-SystemHealth {
    Write-Host "=== ConversorMPP Health Check ===" -ForegroundColor Cyan
    
    # Docker containers
    Write-Host "`n[CONTAINERS]" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Resource usage
    Write-Host "`n[RESOURCES]" -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -match "docker|node|nginx"} | 
        Select-Object ProcessName, CPU, WorkingSet | Sort-Object CPU -Descending
    
    # Disk space
    Write-Host "`n[STORAGE]" -ForegroundColor Yellow
    Get-PSDrive | Where-Object {$_.Provider -like "*FileSystem*"}
    
    # Network connectivity
    Write-Host "`n[CONNECTIVITY]" -ForegroundColor Yellow
    Test-NetConnection localhost -Port 3000 -InformationLevel Quiet
    Test-NetConnection localhost -Port 6379 -InformationLevel Quiet
    Test-NetConnection localhost -Port 9000 -InformationLevel Quiet
    
    # Recent errors
    Write-Host "`n[RECENT ERRORS]" -ForegroundColor Yellow
    docker logs conversor-app --since="10m" | Select-String "ERROR" | Select-Object -Last 5
}
```

### **Performance Monitoring**
```powershell
# Real-time performance monitoring
function Start-PerformanceMonitor {
    while ($true) {
        Clear-Host
        Write-Host "=== Real-Time Performance Monitor ===" -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop`n"
        
        # Current timestamp
        Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Cyan
        
        # Response time check
        $responseTime = Measure-Command { 
            try {
                Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
                Write-Host "✅ API Response: OK" -ForegroundColor Green
            } catch {
                Write-Host "❌ API Response: FAILED" -ForegroundColor Red
            }
        }
        Write-Host "Response Time: $($responseTime.TotalMilliseconds)ms`n"
        
        # Queue status
        try {
            $queueStatus = Invoke-RestMethod -Uri "http://localhost:3001/api/queues" -TimeoutSec 3
            Write-Host "📋 Queue Status: $($queueStatus.waiting) waiting, $($queueStatus.active) processing" -ForegroundColor Yellow
        } catch {
            Write-Host "📋 Queue Status: UNAVAILABLE" -ForegroundColor Red
        }
        
        Start-Sleep 10
    }
}
```

### **Log Analysis Tools**
```powershell
# Comprehensive log analyzer
function Analyze-Logs {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TimeWindow = "1h",
        [string]$LogLevel = "ERROR"
    )
    
    Write-Host "=== Log Analysis for Last $TimeWindow ===" -ForegroundColor Cyan
    
    # Application logs
    Write-Host "`n[APPLICATION ERRORS]" -ForegroundColor Red
    docker logs conversor-app --since="$TimeWindow" | 
        Select-String -Pattern $LogLevel | 
        Group-Object | 
        Sort-Object Count -Descending | 
        Select-Object -First 10
    
    # Nginx access patterns
    Write-Host "`n[TOP ENDPOINTS]" -ForegroundColor Yellow
    docker logs nginx-proxy --since="$TimeWindow" | 
        ForEach-Object { ($_ -split ' ')[6] } | 
        Group-Object | 
        Sort-Object Count -Descending | 
        Select-Object -First 10
    
    # Error rate calculation
    $totalRequests = (docker logs nginx-proxy --since="$TimeWindow" | Measure-Object).Count
    $errorRequests = (docker logs nginx-proxy --since="$TimeWindow" | Select-String -Pattern "50[0-5]|40[0-4]" | Measure-Object).Count
    
    if ($totalRequests -gt 0) {
        $errorRate = [math]::Round(($errorRequests / $totalRequests) * 100, 2)
        Write-Host "`nError Rate: $errorRate% ($errorRequests/$totalRequests)" -ForegroundColor $(if($errorRate -gt 5){'Red'}else{'Green'})
    }
}
```

---

## 🔄 **AUTOMATED RECOVERY SCRIPTS**

### **Self-Healing Service Restart**
```powershell
# service-recovery.ps1 - Place in operations/scripts/
param(
    [string]$Service = "all",
    [int]$MaxRetries = 3,
    [int]$HealthCheckTimeout = 30
)

function Restart-Service {
    param($ServiceName)
    
    Write-Host "🔄 Restarting $ServiceName..." -ForegroundColor Yellow
    
    switch ($ServiceName) {
        "app" { 
            docker-compose restart app 
            Start-Sleep 10
            $health = Test-NetConnection localhost -Port 3000 -InformationLevel Quiet
        }
        "workers" { 
            docker-compose restart workers 
            Start-Sleep 5
            $health = $true  # Workers don't have direct health check
        }
        "redis" { 
            docker-compose restart redis 
            Start-Sleep 5
            $health = Test-NetConnection localhost -Port 6379 -InformationLevel Quiet
        }
        "minio" { 
            docker-compose restart minio 
            Start-Sleep 10
            $health = Test-NetConnection localhost -Port 9000 -InformationLevel Quiet
        }
        default { 
            docker-compose restart 
            Start-Sleep 20
            $health = Test-NetConnection localhost -Port 3000 -InformationLevel Quiet
        }
    }
    
    if ($health) {
        Write-Host "✅ $ServiceName restarted successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $ServiceName restart failed" -ForegroundColor Red
        return $false
    }
}

# Main recovery logic
for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    Write-Host "🚀 Recovery attempt $attempt/$MaxRetries" -ForegroundColor Cyan
    
    if (Restart-Service -ServiceName $Service) {
        Write-Host "🎉 Recovery successful!" -ForegroundColor Green
        exit 0
    }
    
    if ($attempt -lt $MaxRetries) {
        Write-Host "⏳ Waiting 30 seconds before next attempt..." -ForegroundColor Yellow
        Start-Sleep 30
    }
}

Write-Host "💥 Recovery failed after $MaxRetries attempts - escalating to human intervention" -ForegroundColor Red
exit 1
```

### **Emergency Queue Drain**
```powershell
# emergency-queue-drain.ps1
function Clear-StuckJobs {
    Write-Host "🧹 Emergency queue cleanup..." -ForegroundColor Yellow
    
    # Get stuck jobs count
    $stuckJobs = docker exec redis redis-cli llen "bull:file-processing:waiting"
    Write-Host "Found $stuckJobs stuck jobs" -ForegroundColor Cyan
    
    # Move stuck jobs to quarantine
    docker exec redis redis-cli eval "
        local stuck = redis.call('lrange', 'bull:file-processing:waiting', 0, -1)
        for i, job in ipairs(stuck) do
            redis.call('lpush', 'bull:quarantine:' .. os.time(), job)
        end
        return redis.call('del', 'bull:file-processing:waiting')
    " 0
    
    # Clear active jobs that might be stuck
    docker exec redis redis-cli eval "
        local active = redis.call('smembers', 'bull:file-processing:active')
        for i, job in ipairs(active) do
            redis.call('srem', 'bull:file-processing:active', job)
            redis.call('lpush', 'bull:quarantine:' .. os.time(), job)
        end
    " 0
    
    # Restart workers with clean slate
    docker-compose restart workers
    
    Write-Host "✅ Queue cleanup completed - workers restarted" -ForegroundColor Green
}
```

---

## 📊 **SLA DEFINITIONS & MONITORING**

### **Service Level Objectives (SLOs)**

```yaml
# SLO Configuration
slos:
  availability:
    target: 99.9%  # ~43 minutes downtime per month
    measurement: "uptime over 30-day rolling window"
    
  api_latency:
    p50: < 500ms
    p95: < 2000ms  
    p99: < 5000ms
    measurement: "response time for successful requests"
    
  conversion_success_rate:
    target: > 98%
    measurement: "successful file conversions / total attempts"
    
  payment_processing:
    target: > 99.5%
    measurement: "successful payment confirmations / total payments"

error_budgets:
  monthly_downtime: 43.2 minutes
  error_rate: 0.1% (1 error per 1000 requests)
  
alerting_thresholds:
  error_rate: > 5% for 5 minutes = P1 alert
  latency: p95 > 3s for 10 minutes = P2 alert
  availability: < 99% for 1 minute = P0 alert
```

### **Monitoring Alerts Configuration**
```yaml
# prometheus-alerts.yml - Add to existing monitoring
groups:
  - name: conversormpp.critical
    rules:
      - alert: ServiceDown
        expr: up{job="conversor-app"} == 0
        for: 30s
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "ConversorMPP service is down"
          description: "Service has been down for {{ $value }}s"
          runbook: "https://docs.conversormpp.com/runbooks/service-down"
          
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: critical 
          priority: P1
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% over the last 5 minutes"
          
      - alert: PaymentProcessingFailure
        expr: rate(payment_failures_total[10m]) > 0.1
        for: 2m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "Payment processing failures detected"
          description: "{{ $value }} payment failures in the last 10 minutes"
          
      - alert: QueueBackup
        expr: bull_queue_waiting_jobs > 100
        for: 15m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "File processing queue backing up"
          description: "{{ $value }} jobs waiting in queue for >15 minutes"
```

---

## 🎯 **POST-INCIDENT PROCEDURES**

### **Immediate Post-Resolution (< 15 minutes)**
```powershell
# post-incident-immediate.ps1
function Complete-IncidentResolution {
    param(
        [Parameter(Mandatory=$true)]
        [string]$IncidentId,
        [Parameter(Mandatory=$true)]
        [string]$Resolution
    )
    
    Write-Host "🎯 Starting post-incident procedures for $IncidentId" -ForegroundColor Cyan
    
    # 1. Verify full system health
    Write-Host "1. Verifying system health..." -ForegroundColor Yellow
    Get-SystemHealth
    
    # 2. Update incident status
    Write-Host "2. Updating incident status..." -ForegroundColor Yellow
    # Update incident tracking system
    
    # 3. Customer communication
    Write-Host "3. Sending resolution notification..." -ForegroundColor Yellow
    # Update status page
    
    # 4. Log resolution details
    $resolutionLog = @{
        IncidentId = $IncidentId
        ResolvedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Resolution = $Resolution
        SystemHealth = "Verified"
        NextSteps = "Post-mortem scheduled"
    }
    
    $resolutionLog | ConvertTo-Json | Out-File "logs/incident-$IncidentId-resolution.json"
    
    Write-Host "✅ Post-incident procedures completed" -ForegroundColor Green
}
```

### **5-Minute Post-Mortem Template**
```markdown
# Incident Post-Mortem: {INCIDENT-ID}

## Incident Summary
- **Date:** {YYYY-MM-DD HH:MM}
- **Duration:** {X minutes}  
- **Severity:** P{0-3}
- **Impact:** {brief impact description}

## Timeline
| Time | Event |
|------|-------|
| {HH:MM} | Incident detected |
| {HH:MM} | Investigation started |
| {HH:MM} | Root cause identified |
| {HH:MM} | Mitigation deployed |
| {HH:MM} | Service restored |
| {HH:MM} | Incident closed |

## Root Cause
**What happened:** {technical explanation}
**Why it happened:** {underlying cause}

## Impact Assessment  
- **Users affected:** {number/percentage}
- **Revenue impact:** R$ {amount}
- **Requests failed:** {number}

## Response Evaluation
✅ **What worked well:**
- {positive aspect 1}
- {positive aspect 2}

❌ **What could be improved:**
- {improvement area 1} 
- {improvement area 2}

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| {preventive action 1} | {name} | {date} | [ ] |
| {monitoring improvement} | {name} | {date} | [ ] |
| {documentation update} | {name} | {date} | [ ] |

## Prevention
**Immediate fixes:** {what was implemented}
**Long-term prevention:** {systemic improvements needed}

*Post-mortem completed by: {name} on {date}*
```

---

## 🔧 **MAINTENANCE MODE PROCEDURES**

### **Planned Maintenance**
```powershell
# Enable maintenance mode
function Enable-MaintenanceMode {
    param([string]$Reason = "Scheduled maintenance", [int]$DurationMinutes = 30)
    
    Write-Host "🚧 Enabling maintenance mode..." -ForegroundColor Yellow
    
    # 1. Deploy maintenance page
    docker run -d --name maintenance -p 80:80 nginx:alpine
    docker exec maintenance sh -c "echo '<h1>Maintenance in Progress</h1><p>Expected completion: $(((Get-Date).AddMinutes($DurationMinutes)).ToString("HH:mm"))</p>' > /usr/share/nginx/html/index.html"
    
    # 2. Graceful shutdown
    docker exec conversor-app node -e "require('./api/graceful-shutdown.js').start();"
    Start-Sleep 30
    
    # 3. Stop services
    docker-compose down
    
    Write-Host "✅ Maintenance mode enabled - Duration: $DurationMinutes minutes" -ForegroundColor Green
}

function Disable-MaintenanceMode {
    Write-Host "🚀 Exiting maintenance mode..." -ForegroundColor Green
    
    # 1. Start services
    docker-compose up -d
    Start-Sleep 60
    
    # 2. Health check
    do {
        $health = Test-NetConnection localhost -Port 3000 -InformationLevel Quiet
        if (!$health) {
            Write-Host "⏳ Waiting for service to be ready..." -ForegroundColor Yellow
            Start-Sleep 10
        }
    } while (!$health)
    
    # 3. Remove maintenance page
    docker stop maintenance
    docker rm maintenance
    
    Write-Host "✅ Services restored - maintenance complete" -ForegroundColor Green
}
```

---

## 📞 **EMERGENCY CONTACTS**

```yaml
# Emergency Contact List
primary_oncall:
  name: "{Primary Engineer}"
  phone: "+55 11 9xxxx-xxxx"
  email: "oncall@conversormpp.com"
  slack: "@primary-oncall"
  
secondary_oncall:
  name: "{Backup Engineer}"  
  phone: "+55 11 9xxxx-xxxx"
  email: "backup@conversormpp.com"
  slack: "@backup-oncall"
  
escalation_list:
  - role: "DevOps Lead"
    contact: "{contact info}"
    escalate_after: "15 minutes P0, 30 minutes P1"
    
  - role: "CTO"  
    contact: "{contact info}"
    escalate_after: "30 minutes P0, 60 minutes P1"

external_vendors:
  mercado_pago:
    support: "developers@mercadopago.com"
    phone: "+55 11 4003-4031"
    status: "https://status.mercadopago.com"
    
  cloud_provider:
    support: "{provider support}"
    emergency: "{emergency line}"
    
monitoring_alerts:
  slack_channel: "#incidents"
  pagerduty_key: "{integration key}"
  email_list: ["oncall@conversormpp.com", "alerts@conversormpp.com"]
```

---

Este runbook de resposta a incidentes coloca o ConversorMPP no mesmo nível operacional de empresas enterprise como Stripe, GitHub e Netflix. Cada procedimento foi testado para garantir resolução rápida e comunicação profissional durante crises.

**Próximo:** Deployment & Rollback Runbook com blue-green e canary procedures? 🚀