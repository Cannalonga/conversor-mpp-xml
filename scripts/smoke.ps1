# ======================================
# SMOKE TEST - CannaConverter
# ======================================
# Testa endpoints criticos e assets
# Exit 0 = OK, Exit 1 = FALHA
# ======================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [int]$MinConverters = 5
)

$ErrorActionPreference = "Stop"
$failures = @()
$passes = @()

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  SMOKE TEST - CannaConverter                                    " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "  Min Converters: $MinConverters" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Funcao helper para testar endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedContent = $null,
        [int]$ExpectedStatus = 200
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -ne $ExpectedStatus) {
            return @{ Pass = $false; Message = "Status $($response.StatusCode) != $ExpectedStatus" }
        }
        
        if ($ExpectedContent -and $response.Content -notmatch $ExpectedContent) {
            return @{ Pass = $false; Message = "Content not matching" }
        }
        
        return @{ Pass = $true; Message = "OK" }
    }
    catch {
        return @{ Pass = $false; Message = $_.Exception.Message }
    }
}

# ======================================
# TEST 1: Health Endpoint
# ======================================
Write-Host "[1/6] Testing /health endpoint..." -NoNewline
$result = Test-Endpoint -Name "Health" -Url "$BaseUrl/health" -ExpectedContent 'status'
if ($result.Pass) {
    Write-Host " [PASS]" -ForegroundColor Green
    $passes += "Health endpoint"
} else {
    Write-Host " [FAIL]: $($result.Message)" -ForegroundColor Red
    $failures += "Health endpoint: $($result.Message)"
}

# ======================================
# TEST 2: Main Page (index.html)
# ======================================
Write-Host "[2/6] Testing main page..." -NoNewline
$result = Test-Endpoint -Name "Main Page" -Url "$BaseUrl/" -ExpectedContent 'html'
if ($result.Pass) {
    Write-Host " [PASS]" -ForegroundColor Green
    $passes += "Main page"
} else {
    Write-Host " [FAIL]: $($result.Message)" -ForegroundColor Red
    $failures += "Main page: $($result.Message)"
}

# ======================================
# TEST 3: CSS Assets
# ======================================
Write-Host "[3/6] Testing CSS assets..." -NoNewline
$result = Test-Endpoint -Name "CSS" -Url "$BaseUrl/css/style.css" -ExpectedContent 'body'
if ($result.Pass) {
    Write-Host " [PASS]" -ForegroundColor Green
    $passes += "CSS assets"
} else {
    Write-Host " [FAIL]: $($result.Message)" -ForegroundColor Red
    $failures += "CSS assets: $($result.Message)"
}

# ======================================
# TEST 4: API V1 Converters List
# ======================================
Write-Host "[4/6] Testing /api/v1/converters..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/converters" -UseBasicParsing -TimeoutSec 10
    $json = $response.Content | ConvertFrom-Json
    
    if ($json.success -eq $true -and $json.count -ge $MinConverters) {
        Write-Host " [PASS] ($($json.count) converters found)" -ForegroundColor Green
        $passes += "API V1 Converters"
    } else {
        Write-Host " [FAIL]: Found $($json.count), need $MinConverters" -ForegroundColor Red
        $failures += "API V1 Converters: insufficient count"
    }
} catch {
    Write-Host " [FAIL]: $($_.Exception.Message)" -ForegroundColor Red
    $failures += "API V1 Converters: connection error"
}

# ======================================
# TEST 5: Converters Health
# ======================================
Write-Host "[5/6] Testing /api/converters/health..." -NoNewline
$result = Test-Endpoint -Name "Converters Health" -Url "$BaseUrl/api/converters/health" -ExpectedContent 'status'
if ($result.Pass) {
    Write-Host " [PASS]" -ForegroundColor Green
    $passes += "Converters health"
} else {
    Write-Host " [FAIL]: $($result.Message)" -ForegroundColor Red
    $failures += "Converters health: $($result.Message)"
}

# ======================================
# TEST 6: Static JS Files
# ======================================
Write-Host "[6/6] Testing JS assets..." -NoNewline
$result = Test-Endpoint -Name "JS" -Url "$BaseUrl/js/main.js" -ExpectedContent 'function'
if ($result.Pass) {
    Write-Host " [PASS]" -ForegroundColor Green
    $passes += "JS assets"
} else {
    Write-Host " [WARN]: $($result.Message)" -ForegroundColor Yellow
}

# ======================================
# RESULTADO FINAL
# ======================================
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST RESULTS" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $($passes.Count)" -ForegroundColor Green
foreach ($p in $passes) {
    Write-Host "   + $p" -ForegroundColor Green
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed: $($failures.Count)" -ForegroundColor Red
    foreach ($f in $failures) {
        Write-Host "   - $f" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host ">>> SMOKE TEST FAILED <<<" -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host ">>> SMOKE TEST PASSED <<<" -ForegroundColor Green
    exit 0
}
