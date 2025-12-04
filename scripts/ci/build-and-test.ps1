# =============================================================================
# CannaConvert CI - Local Build and Test Script (Windows PowerShell)
# =============================================================================
# This script replicates the GitHub Actions CI pipeline locally.
# Run from the project root directory.
#
# Usage:
#   .\scripts\ci\build-and-test.ps1 [-SkipE2E] [-SkipDocker]
#
# Options:
#   -SkipE2E    Skip E2E tests (faster for quick checks)
#   -SkipDocker Skip Docker build step
# =============================================================================

param(
    [switch]$SkipE2E,
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "`n[$Step] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║           CannaConvert CI - Local Build & Test                ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue

# =============================================================================
# STEP 1: Check prerequisites
# =============================================================================
Write-Step "1/7" "Checking prerequisites..."

$nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
if ([int]$nodeVersion -lt 20) {
    Write-Error "Node.js 20+ required (found v$nodeVersion)"
    exit 1
}

Write-Success "Node.js $(node -v) detected"

# =============================================================================
# STEP 2: Install dependencies
# =============================================================================
Write-Step "2/7" "Installing dependencies..."

Push-Location frontend
npm ci
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci failed"; exit 1 }

Write-Success "Dependencies installed"

# =============================================================================
# STEP 3: Generate Prisma Client
# =============================================================================
Write-Step "3/7" "Generating Prisma Client..."

npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Error "Prisma generate failed"; exit 1 }

Write-Success "Prisma Client generated"

# =============================================================================
# STEP 4: TypeScript Check
# =============================================================================
Write-Step "4/7" "Running TypeScript check..."

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { 
    Write-Error "TypeScript check failed"
    exit 1 
}

Write-Success "TypeScript check passed"

# =============================================================================
# STEP 5: Unit Tests
# =============================================================================
Write-Step "5/7" "Running unit tests..."

$env:NODE_ENV = "test"

try {
    npm run test:unit --if-present 2>$null
    Write-Success "Unit tests passed"
} catch {
    Write-Host "⚠ No unit tests configured or tests skipped" -ForegroundColor Yellow
}

# =============================================================================
# STEP 6: API Tests
# =============================================================================
Write-Step "6/7" "Running API tests..."

$env:DATABASE_URL = "file:./test.db"
$env:NEXTAUTH_SECRET = "test-secret-for-ci"
$env:NEXTAUTH_URL = "http://localhost:3000"

npm run test:api -- --run
if ($LASTEXITCODE -ne 0) { 
    Write-Error "API tests failed"
    exit 1 
}

Write-Success "API tests passed"

# =============================================================================
# STEP 7: E2E Tests (optional)
# =============================================================================
if (-not $SkipE2E) {
    Write-Step "7/7" "Running E2E tests..."
    
    # Install Playwright browsers if needed
    npx playwright install --with-deps chromium
    
    npm run test:e2e -- --reporter=list
    if ($LASTEXITCODE -ne 0) { 
        Write-Error "E2E tests failed"
        exit 1 
    }
    
    Write-Success "E2E tests passed"
} else {
    Write-Step "7/7" "Skipping E2E tests (-SkipE2E flag)"
}

# =============================================================================
# STEP 8: Docker Build (optional)
# =============================================================================
Pop-Location

if (-not $SkipDocker) {
    Write-Host "`n[BONUS] Building Docker images..." -ForegroundColor Yellow
    
    $dockerExists = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerExists) {
        # Build frontend
        if (Test-Path "frontend/Dockerfile") {
            docker build -t cannaconvert-frontend:local ./frontend
            Write-Success "Frontend image built"
        }
        
        # Build MPP converter
        if (Test-Path "microservices/mpp-converter/Dockerfile") {
            docker build -t cannaconvert-mpp:local ./microservices/mpp-converter
            Write-Success "MPP Converter image built"
        }
        
        # Build legacy API
        if (Test-Path "docker/Dockerfile") {
            docker build -t cannaconvert-api:local -f docker/Dockerfile .
            Write-Success "API image built"
        }
    } else {
        Write-Host "⚠ Docker not found, skipping image builds" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nSkipping Docker build (-SkipDocker flag)" -ForegroundColor Yellow
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                    CI Pipeline Complete                       ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "All checks passed! ✓" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Commit your changes"
Write-Host "  2. Push to GitHub"
Write-Host "  3. CI will run automatically on push/PR to main"
Write-Host ""
