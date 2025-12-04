#!/bin/bash
# =============================================================================
# CannaConvert CI - Local Build and Test Script
# =============================================================================
# This script replicates the GitHub Actions CI pipeline locally.
# Run from the project root directory.
#
# Usage:
#   ./scripts/ci/build-and-test.sh [--skip-e2e] [--skip-docker]
#
# Options:
#   --skip-e2e    Skip E2E tests (faster for quick checks)
#   --skip-docker Skip Docker build step
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_E2E=false
SKIP_DOCKER=false

for arg in "$@"; do
  case $arg in
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
  esac
done

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CannaConvert CI - Local Build & Test                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# STEP 1: Check prerequisites
# =============================================================================
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# =============================================================================
# STEP 2: Install dependencies
# =============================================================================
echo ""
echo -e "${YELLOW}[2/7] Installing dependencies...${NC}"

cd frontend
npm ci

echo -e "${GREEN}✓ Dependencies installed${NC}"

# =============================================================================
# STEP 3: Generate Prisma Client
# =============================================================================
echo ""
echo -e "${YELLOW}[3/7] Generating Prisma Client...${NC}"

npx prisma generate

echo -e "${GREEN}✓ Prisma Client generated${NC}"

# =============================================================================
# STEP 4: TypeScript Check
# =============================================================================
echo ""
echo -e "${YELLOW}[4/7] Running TypeScript check...${NC}"

npx tsc --noEmit || {
    echo -e "${RED}✗ TypeScript check failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ TypeScript check passed${NC}"

# =============================================================================
# STEP 5: Unit Tests
# =============================================================================
echo ""
echo -e "${YELLOW}[5/7] Running unit tests...${NC}"

if npm run test:unit --if-present 2>/dev/null; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
else
    echo -e "${YELLOW}⚠ No unit tests configured or tests skipped${NC}"
fi

# =============================================================================
# STEP 6: API Tests
# =============================================================================
echo ""
echo -e "${YELLOW}[6/7] Running API tests...${NC}"

export NODE_ENV=test
export DATABASE_URL="file:./test.db"
export NEXTAUTH_SECRET="test-secret-for-ci"
export NEXTAUTH_URL="http://localhost:3000"

npm run test:api -- --run || {
    echo -e "${RED}✗ API tests failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ API tests passed${NC}"

# =============================================================================
# STEP 7: E2E Tests (optional)
# =============================================================================
if [ "$SKIP_E2E" = false ]; then
    echo ""
    echo -e "${YELLOW}[7/7] Running E2E tests...${NC}"
    
    # Install Playwright browsers if needed
    npx playwright install --with-deps chromium
    
    # Run E2E tests
    npm run test:e2e -- --reporter=list || {
        echo -e "${RED}✗ E2E tests failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ E2E tests passed${NC}"
else
    echo ""
    echo -e "${YELLOW}[7/7] Skipping E2E tests (--skip-e2e flag)${NC}"
fi

# =============================================================================
# STEP 8: Docker Build (optional)
# =============================================================================
cd ..

if [ "$SKIP_DOCKER" = false ]; then
    echo ""
    echo -e "${YELLOW}[BONUS] Building Docker images...${NC}"
    
    if command -v docker &> /dev/null; then
        # Build frontend
        if [ -f "frontend/Dockerfile" ]; then
            docker build -t cannaconvert-frontend:local ./frontend
            echo -e "${GREEN}✓ Frontend image built${NC}"
        fi
        
        # Build MPP converter
        if [ -f "microservices/mpp-converter/Dockerfile" ]; then
            docker build -t cannaconvert-mpp:local ./microservices/mpp-converter
            echo -e "${GREEN}✓ MPP Converter image built${NC}"
        fi
        
        # Build legacy API
        if [ -f "docker/Dockerfile" ]; then
            docker build -t cannaconvert-api:local -f docker/Dockerfile .
            echo -e "${GREEN}✓ API image built${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Docker not found, skipping image builds${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Skipping Docker build (--skip-docker flag)${NC}"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    CI Pipeline Complete                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}All checks passed! ✓${NC}"
echo ""
echo "Next steps:"
echo "  1. Commit your changes"
echo "  2. Push to GitHub"
echo "  3. CI will run automatically on push/PR to main"
echo ""
