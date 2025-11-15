# 🚀 DEPLOYMENT & ROLLBACK RUNBOOK - ConversorMPP.com
## Enterprise-Grade CI/CD Operations & Blue-Green Deployment

---

## 📋 **DEPLOYMENT STRATEGY OVERVIEW**

### **Deployment Models**

| Strategy | Use Case | Risk Level | Rollback Time | Traffic Impact |
|----------|----------|------------|---------------|----------------|
| **Blue-Green** | Major releases | Low | < 2 minutes | Zero downtime |
| **Canary** | Feature releases | Medium | < 5 minutes | 5-20% users |
| **Rolling** | Patches/hotfixes | Medium | < 3 minutes | Brief interruption |
| **Emergency** | Critical fixes | High | Immediate | Minimal |

### **Environment Specifications**

```yaml
# Environment Configuration
environments:
  production:
    domain: "conversormpp.com"
    instances: 3
    database: "postgresql-prod"
    storage: "minio-prod"
    monitoring: "enabled"
    
  staging:
    domain: "staging.conversormpp.com"  
    instances: 1
    database: "postgresql-staging"
    storage: "minio-staging"
    monitoring: "enabled"
    
  development:
    domain: "localhost:3000"
    instances: 1
    database: "postgresql-dev"
    storage: "minio-dev"
    monitoring: "basic"
```

---

## 🔄 **BLUE-GREEN DEPLOYMENT PROCEDURES**

### **Pre-Deployment Checklist**
```powershell
# pre-deployment-check.ps1
function Test-PreDeployment {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Version,
        [Parameter(Mandatory=$true)]
        [string]$Environment = "staging"
    )
    
    Write-Host "🔍 Pre-deployment validation for $Version" -ForegroundColor Cyan
    
    $checks = @()
    
    # 1. Code quality gates
    Write-Host "1. Running code quality checks..." -ForegroundColor Yellow
    $testResults = npm test
    $checks += @{Name="Unit Tests"; Status=$LASTEXITCODE -eq 0}
    
    $lintResults = npm run lint
    $checks += @{Name="Code Linting"; Status=$LASTEXITCODE -eq 0}
    
    # 2. Security scan
    Write-Host "2. Security vulnerability scan..." -ForegroundColor Yellow
    npm audit --audit-level=high
    $checks += @{Name="Security Audit"; Status=$LASTEXITCODE -eq 0}
    
    # 3. Database migration check
    Write-Host "3. Database migration validation..." -ForegroundColor Yellow
    node scripts/validate-migrations.js
    $checks += @{Name="Database Migrations"; Status=$LASTEXITCODE -eq 0}
    
    # 4. Docker image build test
    Write-Host "4. Docker image build test..." -ForegroundColor Yellow
    docker build -t conversormpp:$Version-test .
    $checks += @{Name="Docker Build"; Status=$LASTEXITCODE -eq 0}
    
    # 5. Dependencies check
    Write-Host "5. Dependency vulnerability check..." -ForegroundColor Yellow
    docker run --rm -v "${PWD}:/app" -w /app node:18-alpine npm audit --audit-level=moderate
    $checks += @{Name="Dependencies"; Status=$LASTEXITCODE -eq 0}
    
    # Results summary
    Write-Host "`n📊 Pre-deployment Check Results:" -ForegroundColor Cyan
    $passed = 0
    foreach ($check in $checks) {
        $status = if ($check.Status) { "✅ PASS" } else { "❌ FAIL" }
        $color = if ($check.Status) { "Green" } else { "Red" }
        Write-Host "   $($check.Name): $status" -ForegroundColor $color
        if ($check.Status) { $passed++ }
    }
    
    $success = $passed -eq $checks.Count
    Write-Host "`nOverall: $passed/$($checks.Count) checks passed" -ForegroundColor $(if($success){"Green"}else{"Red"})
    
    if (!$success) {
        Write-Host "❌ Pre-deployment checks failed. Fix issues before proceeding." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ All pre-deployment checks passed. Ready for deployment." -ForegroundColor Green
    return $true
}
```

### **Blue-Green Deployment Script**
```powershell
# blue-green-deploy.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$Environment = "production",
    [switch]$SkipPreChecks,
    [switch]$AutoConfirm
)

function Start-BlueGreenDeployment {
    Write-Host "🚀 Starting Blue-Green deployment for $Version" -ForegroundColor Cyan
    
    # Pre-deployment validation
    if (!$SkipPreChecks) {
        Test-PreDeployment -Version $Version -Environment $Environment
    }
    
    # Step 1: Determine current active environment
    $currentActive = Get-ActiveEnvironment
    $newActive = if ($currentActive -eq "blue") { "green" } else { "blue" }
    
    Write-Host "Current active: $currentActive | Deploying to: $newActive" -ForegroundColor Yellow
    
    # Step 2: Deploy to inactive environment
    Write-Host "`n🔄 Step 1: Deploying to $newActive environment..." -ForegroundColor Cyan
    Deploy-ToEnvironment -Environment $newActive -Version $Version
    
    # Step 3: Database migrations (if needed)
    Write-Host "`n📊 Step 2: Running database migrations..." -ForegroundColor Cyan
    Run-DatabaseMigrations -Environment $newActive -Version $Version
    
    # Step 4: Health checks on new environment
    Write-Host "`n🏥 Step 3: Health validation on $newActive..." -ForegroundColor Cyan
    $healthPassed = Test-EnvironmentHealth -Environment $newActive -Timeout 300
    
    if (!$healthPassed) {
        Write-Host "❌ Health checks failed on $newActive environment" -ForegroundColor Red
        Write-Host "🔄 Initiating automatic rollback..." -ForegroundColor Yellow
        return Rollback-BlueGreenDeployment -From $newActive -To $currentActive
    }
    
    # Step 5: Smoke tests
    Write-Host "`n🔬 Step 4: Running smoke tests on $newActive..." -ForegroundColor Cyan
    $smokeTestsPassed = Run-SmokeTests -Environment $newActive
    
    if (!$smokeTestsPassed) {
        Write-Host "❌ Smoke tests failed on $newActive environment" -ForegroundColor Red
        if (!$AutoConfirm) {
            $proceed = Read-Host "Continue with deployment anyway? (y/N)"
            if ($proceed -ne "y") {
                return Rollback-BlueGreenDeployment -From $newActive -To $currentActive
            }
        } else {
            return Rollback-BlueGreenDeployment -From $newActive -To $currentActive
        }
    }
    
    # Step 6: Load balancer switchover
    Write-Host "`n⚡ Step 5: Switching traffic to $newActive..." -ForegroundColor Cyan
    if (!$AutoConfirm) {
        Write-Host "Ready to switch traffic from $currentActive to $newActive" -ForegroundColor Yellow
        $confirm = Read-Host "Proceed with traffic switch? (Y/n)"
        if ($confirm -eq "n") {
            Write-Host "❌ Deployment cancelled by user" -ForegroundColor Red
            return $false
        }
    }
    
    Switch-LoadBalancerTarget -From $currentActive -To $newActive
    
    # Step 7: Final validation
    Write-Host "`n✅ Step 6: Final validation..." -ForegroundColor Cyan
    Start-Sleep 30  # Allow traffic to stabilize
    
    $finalHealth = Test-ProductionHealth -Timeout 120
    if (!$finalHealth) {
        Write-Host "❌ Final health check failed - emergency rollback!" -ForegroundColor Red
        return Rollback-BlueGreenDeployment -From $newActive -To $currentActive -Emergency
    }
    
    # Step 8: Cleanup old environment
    Write-Host "`n🧹 Step 7: Cleaning up $currentActive environment..." -ForegroundColor Cyan
    Start-Sleep 60  # Wait for connections to drain
    Stop-Environment -Environment $currentActive
    
    Write-Host "🎉 Blue-Green deployment completed successfully!" -ForegroundColor Green
    Write-Host "   Version: $Version" -ForegroundColor Green
    Write-Host "   Active Environment: $newActive" -ForegroundColor Green
    Write-Host "   Deployment Time: $((Get-Date) - $deploymentStart)" -ForegroundColor Green
    
    # Log deployment success
    Log-DeploymentEvent -Type "Success" -Version $Version -Environment $newActive -Duration $((Get-Date) - $deploymentStart)
    
    return $true
}

function Get-ActiveEnvironment {
    # Check load balancer configuration to determine active environment
    $lbConfig = docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf | Select-String "upstream"
    
    if ($lbConfig -match "blue") {
        return "blue"
    } elseif ($lbConfig -match "green") {
        return "green"
    } else {
        throw "Unable to determine active environment"
    }
}

function Deploy-ToEnvironment {
    param(
        [string]$Environment,
        [string]$Version
    )
    
    Write-Host "   📦 Building Docker images for $Version..." -ForegroundColor Yellow
    docker build -t conversormpp:$Version .
    docker tag conversormpp:$Version conversormpp:$Environment-$Version
    
    Write-Host "   🚀 Starting $Environment environment containers..." -ForegroundColor Yellow
    
    # Start new environment with version tag
    $env:DEPLOY_ENV = $Environment
    $env:DEPLOY_VERSION = $Version
    docker-compose -f docker-compose.$Environment.yml up -d
    
    Write-Host "   ⏳ Waiting for containers to start..." -ForegroundColor Yellow
    Start-Sleep 45
    
    # Verify containers are running
    $runningContainers = docker ps --filter "label=environment=$Environment" --format "{{.Names}}"
    Write-Host "   ✅ Started containers: $($runningContainers -join ', ')" -ForegroundColor Green
}

function Test-EnvironmentHealth {
    param(
        [string]$Environment,
        [int]$Timeout = 300
    )
    
    $port = if ($Environment -eq "blue") { "3001" } else { "3002" }
    $baseUrl = "http://localhost:$port"
    $startTime = Get-Date
    
    do {
        try {
            # Basic connectivity
            $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 10
            
            # Database connectivity
            $dbHealth = Invoke-RestMethod -Uri "$baseUrl/api/health/database" -TimeoutSec 10
            
            # Storage connectivity
            $storageHealth = Invoke-RestMethod -Uri "$baseUrl/api/health/storage" -TimeoutSec 10
            
            # Queue connectivity
            $queueHealth = Invoke-RestMethod -Uri "$baseUrl/api/health/queue" -TimeoutSec 10
            
            if ($health.status -eq "ok" -and $dbHealth.status -eq "ok" -and 
                $storageHealth.status -eq "ok" -and $queueHealth.status -eq "ok") {
                Write-Host "   ✅ All health checks passed for $Environment" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "   ⏳ Health check attempt failed, retrying..." -ForegroundColor Yellow
        }
        
        Start-Sleep 10
    } while (((Get-Date) - $startTime).TotalSeconds -lt $Timeout)
    
    Write-Host "   ❌ Health checks timed out for $Environment" -ForegroundColor Red
    return $false
}
```

---

## 🕯️ **CANARY DEPLOYMENT PROCEDURES**

### **Canary Deployment Script**
```powershell
# canary-deploy.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [int]$CanaryPercentage = 5,
    [int]$MonitoringDuration = 15,  # minutes
    [float]$ErrorRateThreshold = 2.0,  # percentage
    [int]$LatencyThresholdMs = 3000
)

function Start-CanaryDeployment {
    Write-Host "🕯️ Starting Canary deployment for $Version ($CanaryPercentage% traffic)" -ForegroundColor Cyan
    $deploymentStart = Get-Date
    
    # Step 1: Deploy canary version
    Write-Host "`n📦 Step 1: Deploying canary version..." -ForegroundColor Yellow
    Deploy-CanaryVersion -Version $Version
    
    # Step 2: Configure traffic splitting
    Write-Host "`n🔀 Step 2: Configuring traffic split ($CanaryPercentage% canary)..." -ForegroundColor Yellow
    Configure-TrafficSplit -CanaryPercentage $CanaryPercentage
    
    # Step 3: Monitor canary metrics
    Write-Host "`n📊 Step 3: Monitoring canary performance for $MonitoringDuration minutes..." -ForegroundColor Yellow
    $monitoringResult = Monitor-CanaryMetrics -Duration $MonitoringDuration -ErrorThreshold $ErrorRateThreshold -LatencyThreshold $LatencyThresholdMs
    
    if (!$monitoringResult.Success) {
        Write-Host "❌ Canary monitoring detected issues:" -ForegroundColor Red
        $monitoringResult.Issues | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
        
        Write-Host "🔄 Initiating automatic rollback..." -ForegroundColor Yellow
        Rollback-CanaryDeployment -Version $Version
        return $false
    }
    
    # Step 4: Gradual traffic increase
    Write-Host "`n📈 Step 4: Gradually increasing canary traffic..." -ForegroundColor Yellow
    $trafficStages = @(10, 25, 50, 75, 100)
    
    foreach ($percentage in $trafficStages) {
        Write-Host "   🔀 Increasing to $percentage% canary traffic..." -ForegroundColor Cyan
        Configure-TrafficSplit -CanaryPercentage $percentage
        
        # Monitor each stage
        Start-Sleep 120  # 2 minutes per stage
        $stageHealth = Test-QuickHealthMetrics -Duration 2
        
        if (!$stageHealth.Success) {
            Write-Host "   ❌ Stage $percentage% failed: $($stageHealth.Issue)" -ForegroundColor Red
            Rollback-CanaryDeployment -Version $Version
            return $false
        }
        
        Write-Host "   ✅ Stage $percentage% successful" -ForegroundColor Green
    }
    
    # Step 5: Finalize deployment
    Write-Host "`n🏁 Step 5: Finalizing canary deployment..." -ForegroundColor Yellow
    Finalize-CanaryDeployment -Version $Version
    
    $deploymentDuration = (Get-Date) - $deploymentStart
    Write-Host "🎉 Canary deployment completed successfully!" -ForegroundColor Green
    Write-Host "   Version: $Version" -ForegroundColor Green
    Write-Host "   Total Duration: $deploymentDuration" -ForegroundColor Green
    
    return $true
}

function Deploy-CanaryVersion {
    param([string]$Version)
    
    # Build canary image
    docker build -t conversormpp:$Version-canary .
    
    # Start canary containers (smaller scale)
    docker run -d --name conversormpp-canary-1 `
        --label "version=$Version" `
        --label "deployment=canary" `
        -p 3003:3000 `
        conversormpp:$Version-canary
        
    # Health check
    Start-Sleep 30
    $health = Test-NetConnection localhost -Port 3003 -InformationLevel Quiet
    if (!$health) {
        throw "Canary container failed to start"
    }
    
    Write-Host "   ✅ Canary version deployed successfully" -ForegroundColor Green
}

function Configure-TrafficSplit {
    param([int]$CanaryPercentage)
    
    # Update nginx configuration for traffic splitting
    $nginxConfig = @"
upstream backend {
    server localhost:3000 weight=$((100 - $CanaryPercentage));
    server localhost:3003 weight=$CanaryPercentage;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Canary-Version "$Version";
    }
}
"@
    
    $nginxConfig | Out-File "nginx/canary.conf" -Encoding UTF8
    docker exec nginx-proxy nginx -s reload
    
    Write-Host "   🔀 Traffic split configured: $((100 - $CanaryPercentage))% stable, $CanaryPercentage% canary" -ForegroundColor Cyan
}

function Monitor-CanaryMetrics {
    param(
        [int]$Duration,
        [float]$ErrorThreshold,
        [int]$LatencyThreshold
    )
    
    $startTime = Get-Date
    $endTime = $startTime.AddMinutes($Duration)
    $issues = @()
    
    Write-Host "   📊 Monitoring metrics until $(Get-Date $endTime -Format 'HH:mm:ss')..." -ForegroundColor Cyan
    
    while ((Get-Date) -lt $endTime) {
        # Check error rates
        $stableErrors = Get-ErrorRate -Version "stable" -Minutes 1
        $canaryErrors = Get-ErrorRate -Version "canary" -Minutes 1
        
        # Check latency
        $stableLatency = Get-AverageLatency -Version "stable" -Minutes 1
        $canaryLatency = Get-AverageLatency -Version "canary" -Minutes 1
        
        # Error rate comparison
        if ($canaryErrors -gt ($stableErrors + $ErrorThreshold)) {
            $issues += "Canary error rate ($canaryErrors%) significantly higher than stable ($stableErrors%)"
        }
        
        # Latency comparison
        if ($canaryLatency -gt ($stableLatency + $LatencyThreshold)) {
            $issues += "Canary latency ($canaryLatency ms) significantly higher than stable ($stableLatency ms)"
        }
        
        # Absolute thresholds
        if ($canaryErrors -gt 10) {
            $issues += "Canary error rate too high: $canaryErrors%"
        }
        
        if ($canaryLatency -gt 10000) {
            $issues += "Canary latency too high: $canaryLatency ms"
        }
        
        # Real-time metrics display
        $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
        Write-Host "   ⏱️  $elapsed/$Duration min | Stable: $stableErrors% err, $stableLatency ms | Canary: $canaryErrors% err, $canaryLatency ms" -ForegroundColor White
        
        if ($issues.Count -gt 0) {
            return @{ Success = $false; Issues = $issues }
        }
        
        Start-Sleep 30
    }
    
    Write-Host "   ✅ Canary monitoring completed successfully" -ForegroundColor Green
    return @{ Success = $true; Issues = @() }
}
```

---

## ⏪ **ROLLBACK PROCEDURES**

### **Emergency Rollback Script**
```powershell
# emergency-rollback.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Reason,
    [string]$ToVersion = "last-known-good",
    [switch]$Emergency,
    [switch]$Force
)

function Start-EmergencyRollback {
    Write-Host "🚨 EMERGENCY ROLLBACK INITIATED" -ForegroundColor Red
    Write-Host "Reason: $Reason" -ForegroundColor Red
    $rollbackStart = Get-Date
    
    # Step 1: Immediate traffic diversion (if emergency)
    if ($Emergency) {
        Write-Host "`n⚡ STEP 1: Immediate traffic diversion..." -ForegroundColor Red
        Enable-MaintenancePage
        Start-Sleep 5
    }
    
    # Step 2: Determine rollback target
    Write-Host "`n📍 STEP 2: Determining rollback target..." -ForegroundColor Yellow
    $targetVersion = if ($ToVersion -eq "last-known-good") {
        Get-LastKnownGoodVersion
    } else {
        $ToVersion
    }
    
    Write-Host "Rolling back to version: $targetVersion" -ForegroundColor Cyan
    
    # Step 3: Database rollback (if needed)
    Write-Host "`n📊 STEP 3: Database rollback check..." -ForegroundColor Yellow
    $dbRollbackNeeded = Test-DatabaseRollbackRequired -ToVersion $targetVersion
    
    if ($dbRollbackNeeded) {
        if (!$Force) {
            $confirm = Read-Host "Database rollback required. This may cause data loss. Continue? (yes/NO)"
            if ($confirm -ne "yes") {
                Write-Host "❌ Rollback cancelled due to database concerns" -ForegroundColor Red
                return $false
            }
        }
        
        Write-Host "   🔄 Executing database rollback..." -ForegroundColor Red
        Rollback-Database -ToVersion $targetVersion
    }
    
    # Step 4: Application rollback
    Write-Host "`n🔄 STEP 4: Application rollback..." -ForegroundColor Yellow
    
    # Quick method: Switch to previous environment
    $currentActive = Get-ActiveEnvironment
    $rollbackTarget = if ($currentActive -eq "blue") { "green" } else { "blue" }
    
    # Verify rollback target has correct version
    $rollbackVersion = Get-EnvironmentVersion -Environment $rollbackTarget
    
    if ($rollbackVersion -eq $targetVersion) {
        Write-Host "   ✅ Using existing $rollbackTarget environment with version $rollbackVersion" -ForegroundColor Green
        Switch-LoadBalancerTarget -From $currentActive -To $rollbackTarget
    } else {
        Write-Host "   🔧 Deploying version $targetVersion to $rollbackTarget environment..." -ForegroundColor Yellow
        Deploy-ToEnvironment -Environment $rollbackTarget -Version $targetVersion
        Start-Sleep 30
        Switch-LoadBalancerTarget -From $currentActive -To $rollbackTarget
    }
    
    # Step 5: Health validation
    Write-Host "`n🏥 STEP 5: Post-rollback health check..." -ForegroundColor Yellow
    $healthCheck = Test-ProductionHealth -Timeout 120
    
    if (!$healthCheck) {
        Write-Host "❌ CRITICAL: Post-rollback health check failed!" -ForegroundColor Red
        Write-Host "🆘 Manual intervention required immediately" -ForegroundColor Red
        return $false
    }
    
    # Step 6: Disable maintenance page
    if ($Emergency) {
        Write-Host "`n✅ STEP 6: Restoring normal traffic..." -ForegroundColor Green
        Disable-MaintenancePage
    }
    
    $rollbackDuration = (Get-Date) - $rollbackStart
    Write-Host "`n🎯 ROLLBACK COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "   Target Version: $targetVersion" -ForegroundColor Green
    Write-Host "   Rollback Duration: $rollbackDuration" -ForegroundColor Green
    Write-Host "   Active Environment: $rollbackTarget" -ForegroundColor Green
    
    # Log rollback event
    Log-RollbackEvent -Reason $Reason -ToVersion $targetVersion -Duration $rollbackDuration -Success $true
    
    # Send alerts
    Send-RollbackAlert -Reason $Reason -ToVersion $targetVersion -Success $true
    
    return $true
}

function Get-LastKnownGoodVersion {
    # Query deployment history to find last successful deployment
    $deploymentLog = Get-Content "logs/deployments.json" | ConvertFrom-Json | Sort-Object timestamp -Descending
    
    foreach ($deployment in $deploymentLog) {
        if ($deployment.status -eq "success" -and $deployment.environment -eq "production") {
            return $deployment.version
        }
    }
    
    throw "No last known good version found in deployment history"
}

function Test-DatabaseRollbackRequired {
    param([string]$ToVersion)
    
    # Check if target version requires database schema changes
    $currentDbVersion = Get-DatabaseSchemaVersion
    $targetDbVersion = Get-VersionDatabaseSchema -Version $ToVersion
    
    return $targetDbVersion -lt $currentDbVersion
}

function Rollback-Database {
    param([string]$ToVersion)
    
    Write-Host "   ⚠️  Executing database rollback - this may take several minutes..." -ForegroundColor Red
    
    # Create emergency backup before rollback
    $backupName = "emergency-rollback-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Create-DatabaseBackup -Name $backupName
    
    # Execute rollback migrations
    node scripts/database-rollback.js --to-version=$ToVersion --confirm
    
    if ($LASTEXITCODE -ne 0) {
        throw "Database rollback failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "   ✅ Database rollback completed successfully" -ForegroundColor Green
}
```

### **Automated Rollback Triggers**
```powershell
# rollback-monitors.ps1 - Runs as background service
function Start-RollbackMonitoring {
    Write-Host "🔍 Starting automated rollback monitoring..." -ForegroundColor Cyan
    
    while ($true) {
        try {
            # Check critical metrics
            $errorRate = Get-CurrentErrorRate
            $responseTime = Get-CurrentResponseTime
            $availability = Get-CurrentAvailability
            
            # Error rate threshold
            if ($errorRate -gt 15) {  # 15% error rate
                Write-Host "🚨 CRITICAL: Error rate $errorRate% detected" -ForegroundColor Red
                Trigger-AutomaticRollback -Reason "High error rate: $errorRate%" -Emergency
            }
            
            # Response time threshold
            if ($responseTime -gt 10000) {  # 10 seconds
                Write-Host "🚨 CRITICAL: Response time $responseTime ms detected" -ForegroundColor Red
                Trigger-AutomaticRollback -Reason "High response time: $responseTime ms" -Emergency
            }
            
            # Availability threshold
            if ($availability -lt 0.95) {  # 95% availability
                Write-Host "🚨 CRITICAL: Availability $($availability*100)% detected" -ForegroundColor Red
                Trigger-AutomaticRollback -Reason "Low availability: $($availability*100)%" -Emergency
            }
            
            Start-Sleep 30  # Check every 30 seconds
            
        } catch {
            Write-Host "❌ Monitoring error: $_" -ForegroundColor Red
            Start-Sleep 60  # Wait longer on error
        }
    }
}

function Trigger-AutomaticRollback {
    param(
        [string]$Reason,
        [switch]$Emergency
    )
    
    Write-Host "🤖 AUTOMATIC ROLLBACK TRIGGERED" -ForegroundColor Red
    Write-Host "Reason: $Reason" -ForegroundColor Red
    
    # Prevent multiple simultaneous rollbacks
    $lockFile = "operations/rollback.lock"
    if (Test-Path $lockFile) {
        Write-Host "🔒 Rollback already in progress, skipping..." -ForegroundColor Yellow
        return
    }
    
    try {
        # Create lock file
        "ROLLBACK_IN_PROGRESS" | Out-File $lockFile
        
        # Execute rollback
        $success = Start-EmergencyRollback -Reason "AUTO: $Reason" -Emergency:$Emergency -Force
        
        if ($success) {
            Write-Host "✅ Automatic rollback completed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Automatic rollback failed - escalating to human intervention" -ForegroundColor Red
            Send-EscalationAlert -Reason "Automatic rollback failed: $Reason"
        }
        
    } finally {
        # Always remove lock file
        if (Test-Path $lockFile) {
            Remove-Item $lockFile
        }
    }
}
```

---

## 🔧 **DEPLOYMENT UTILITIES**

### **Version Management**
```powershell
# version-manager.ps1
function New-DeploymentVersion {
    param(
        [string]$Type = "patch",  # major, minor, patch
        [string]$Branch = "main"
    )
    
    # Get current version from package.json
    $package = Get-Content "package.json" | ConvertFrom-Json
    $currentVersion = $package.version
    
    # Calculate new version
    $versionParts = $currentVersion.Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    
    switch ($Type) {
        "major" { $major++; $minor = 0; $patch = 0 }
        "minor" { $minor++; $patch = 0 }
        "patch" { $patch++ }
    }
    
    $newVersion = "$major.$minor.$patch"
    
    # Add build metadata
    $buildNumber = $env:BUILD_NUMBER ?? (Get-Date -Format "yyyyMMddHHmm")
    $gitHash = git rev-parse --short HEAD
    $fullVersion = "$newVersion-build.$buildNumber+$gitHash"
    
    Write-Host "🏷️  Version increment: $currentVersion → $newVersion" -ForegroundColor Cyan
    Write-Host "🔨 Full version: $fullVersion" -ForegroundColor Yellow
    
    return @{
        Version = $newVersion
        FullVersion = $fullVersion
        BuildNumber = $buildNumber
        GitHash = $gitHash
    }
}

function Tag-ReleaseVersion {
    param(
        [string]$Version,
        [string]$ReleaseNotes
    )
    
    # Update package.json
    $package = Get-Content "package.json" | ConvertFrom-Json
    $package.version = $Version
    $package | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    
    # Commit version change
    git add package.json
    git commit -m "chore: bump version to $Version"
    
    # Create and push tag
    git tag -a "v$Version" -m "Release $Version`n`n$ReleaseNotes"
    git push origin "v$Version"
    git push origin main
    
    Write-Host "✅ Version $Version tagged and pushed" -ForegroundColor Green
}
```

### **Environment Health Checks**
```powershell
# health-checker.ps1
function Test-ProductionHealth {
    param([int]$Timeout = 60)
    
    Write-Host "🏥 Running comprehensive production health check..." -ForegroundColor Cyan
    $startTime = Get-Date
    $healthResults = @{}
    
    # API Health
    try {
        $apiResponse = Invoke-RestMethod -Uri "https://conversormpp.com/health" -TimeoutSec 10
        $healthResults["api"] = $apiResponse.status -eq "ok"
    } catch {
        $healthResults["api"] = $false
    }
    
    # Database Health
    try {
        $dbResponse = Invoke-RestMethod -Uri "https://conversormpp.com/api/health/database" -TimeoutSec 10
        $healthResults["database"] = $dbResponse.status -eq "ok"
    } catch {
        $healthResults["database"] = $false
    }
    
    # Storage Health
    try {
        $storageResponse = Invoke-RestMethod -Uri "https://conversormpp.com/api/health/storage" -TimeoutSec 10
        $healthResults["storage"] = $storageResponse.status -eq "ok"
    } catch {
        $healthResults["storage"] = $false
    }
    
    # Queue Health
    try {
        $queueResponse = Invoke-RestMethod -Uri "https://conversormpp.com/api/health/queue" -TimeoutSec 10
        $healthResults["queue"] = $queueResponse.status -eq "ok"
    } catch {
        $healthResults["queue"] = $false
    }
    
    # Performance Test
    try {
        $perfStart = Get-Date
        $perfResponse = Invoke-RestMethod -Uri "https://conversormpp.com/api/health/performance" -TimeoutSec 15
        $perfTime = ((Get-Date) - $perfStart).TotalMilliseconds
        $healthResults["performance"] = $perfTime -lt 3000  # Under 3 seconds
    } catch {
        $healthResults["performance"] = $false
    }
    
    # Results Summary
    Write-Host "`n📊 Health Check Results:" -ForegroundColor Cyan
    $passed = 0
    foreach ($check in $healthResults.GetEnumerator()) {
        $status = if ($check.Value) { "✅ HEALTHY" } else { "❌ UNHEALTHY" }
        $color = if ($check.Value) { "Green" } else { "Red" }
        Write-Host "   $($check.Key.PadRight(12)): $status" -ForegroundColor $color
        if ($check.Value) { $passed++ }
    }
    
    $overallHealth = $passed -eq $healthResults.Count
    $checkDuration = (Get-Date) - $startTime
    
    Write-Host "`nOverall Health: $passed/$($healthResults.Count) checks passed" -ForegroundColor $(if($overallHealth){"Green"}else{"Red"})
    Write-Host "Check Duration: $($checkDuration.TotalSeconds) seconds" -ForegroundColor White
    
    return $overallHealth
}

function Test-QuickHealthMetrics {
    param([int]$Duration = 2)  # minutes
    
    $startTime = Get-Date
    $endTime = $startTime.AddMinutes($Duration)
    $errorCount = 0
    $requestCount = 0
    $totalLatency = 0
    
    while ((Get-Date) -lt $endTime) {
        try {
            $requestStart = Get-Date
            $response = Invoke-RestMethod -Uri "https://conversormpp.com/health" -TimeoutSec 5
            $latency = ((Get-Date) - $requestStart).TotalMilliseconds
            
            $requestCount++
            $totalLatency += $latency
            
            if ($response.status -ne "ok") {
                $errorCount++
            }
            
        } catch {
            $errorCount++
            $requestCount++
        }
        
        Start-Sleep 5
    }
    
    $errorRate = if ($requestCount -gt 0) { ($errorCount / $requestCount) * 100 } else { 100 }
    $avgLatency = if ($requestCount -gt 0) { $totalLatency / $requestCount } else { 0 }
    
    $success = $errorRate -lt 10 -and $avgLatency -lt 5000
    
    return @{
        Success = $success
        ErrorRate = $errorRate
        AverageLatency = $avgLatency
        RequestCount = $requestCount
        Issue = if (!$success) { "Error rate: $errorRate%, Latency: $avgLatency ms" } else { $null }
    }
}
```

---

## 📊 **DEPLOYMENT MONITORING & ALERTS**

### **Deployment Success Metrics**
```yaml
# deployment-metrics.yml
deployment_slos:
  deployment_success_rate: > 95%
  deployment_duration: < 15 minutes
  rollback_duration: < 5 minutes
  zero_downtime_requirement: true
  
monitoring_windows:
  immediate: 5 minutes    # Critical issues
  short_term: 30 minutes  # Performance degradation  
  long_term: 24 hours     # Business metrics
  
alert_thresholds:
  error_rate_spike: > 5% increase
  latency_degradation: > 50% increase
  availability_drop: < 99.5%
  
automated_actions:
  error_rate_15percent_5min: automatic_rollback
  latency_10s_2min: automatic_rollback
  availability_95percent_1min: automatic_rollback
```

### **Post-Deployment Validation**
```powershell
# post-deployment-validation.ps1
function Start-PostDeploymentValidation {
    param(
        [string]$Version,
        [string]$Environment = "production"
    )
    
    Write-Host "✅ Starting post-deployment validation for $Version" -ForegroundColor Cyan
    $validationStart = Get-Date
    
    # Validation phases
    $phases = @(
        @{ Name="Immediate Health"; Duration=2; Function="Test-ImmediateHealth" },
        @{ Name="Performance Baseline"; Duration=5; Function="Test-PerformanceBaseline" },
        @{ Name="Feature Validation"; Duration=10; Function="Test-FeatureValidation" },
        @{ Name="Load Testing"; Duration=15; Function="Test-LoadCapacity" }
    )
    
    foreach ($phase in $phases) {
        Write-Host "`n🔬 Phase: $($phase.Name) (Duration: $($phase.Duration) minutes)" -ForegroundColor Yellow
        
        $phaseResult = & $phase.Function -Duration $phase.Duration
        
        if (!$phaseResult.Success) {
            Write-Host "❌ Validation failed in phase: $($phase.Name)" -ForegroundColor Red
            Write-Host "   Issue: $($phaseResult.Issue)" -ForegroundColor Red
            
            # Automatic rollback on validation failure
            Write-Host "🔄 Initiating automatic rollback due to validation failure..." -ForegroundColor Yellow
            Start-EmergencyRollback -Reason "Post-deployment validation failed: $($phaseResult.Issue)" -Force
            return $false
        }
        
        Write-Host "✅ Phase completed successfully: $($phase.Name)" -ForegroundColor Green
    }
    
    $validationDuration = (Get-Date) - $validationStart
    Write-Host "`n🎉 Post-deployment validation completed successfully!" -ForegroundColor Green
    Write-Host "   Total Validation Time: $validationDuration" -ForegroundColor Green
    
    # Log successful validation
    Log-DeploymentValidation -Version $Version -Environment $Environment -Duration $validationDuration -Success $true
    
    return $true
}

function Test-ImmediateHealth {
    param([int]$Duration)
    
    $endTime = (Get-Date).AddMinutes($Duration)
    
    while ((Get-Date) -lt $endTime) {
        $health = Test-ProductionHealth -Timeout 30
        
        if (!$health) {
            return @{ Success = $false; Issue = "Health check failed" }
        }
        
        Start-Sleep 30
    }
    
    return @{ Success = $true }
}

function Test-PerformanceBaseline {
    param([int]$Duration)
    
    # Run performance tests and compare with baseline
    $metrics = Measure-PerformanceMetrics -Duration $Duration
    $baseline = Get-PerformanceBaseline
    
    # Check for significant performance regression
    if ($metrics.AverageLatency -gt ($baseline.AverageLatency * 1.5)) {
        return @{ Success = $false; Issue = "Latency regression: $($metrics.AverageLatency)ms vs baseline $($baseline.AverageLatency)ms" }
    }
    
    if ($metrics.ThroughputRPS -lt ($baseline.ThroughputRPS * 0.8)) {
        return @{ Success = $false; Issue = "Throughput regression: $($metrics.ThroughputRPS) RPS vs baseline $($baseline.ThroughputRPS) RPS" }
    }
    
    return @{ Success = $true }
}
```

Este runbook de deployment e rollback estabelece procedimentos enterprise-grade que garantem deployments seguros, monitoramento contínuo e recuperação rápida em caso de problemas. 

**Próximo:** Backup & Recovery Runbook com estratégias completas de proteção de dados? 💾