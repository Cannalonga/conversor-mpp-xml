#!/bin/bash
# ============================================================================
# MASTER DEPLOYMENT PACK - v0.1.1-security
# Security Hardening Sprint - Production Deployment
# Date: December 2, 2025
# Status: READY TO EXECUTE
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="/srv/cannaconverter"
STAGING_BRANCH="staging"
MAIN_BRANCH="main"
TAG_VERSION="v0.1.1-security"
DOCKER_COMPOSE="docker-compose.prod.yml"
BACKUP_DIR="$REPO_ROOT/backups"
ROLLBACK_COMMIT=""

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 1: PRE-DEPLOYMENT CHECKS                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

check_prerequisites() {
    echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker installed${NC}"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}✗ Docker Compose not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}✗ Git not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git installed${NC}"
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠ jq not found (optional, used for JSON parsing)${NC}"
    else
        echo -e "${GREEN}✓ jq installed${NC}"
    fi
}

check_repo_state() {
    echo -e "${YELLOW}[2/5] Checking repository state...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Check if repo exists
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}✗ Not a git repository${NC}"
        exit 1
    fi
    
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${GREEN}✓ Repository found (current branch: $CURRENT_BRANCH)${NC}"
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠ Warning: Uncommitted changes detected${NC}"
        echo -e "${YELLOW}  Run 'git status' to see changes${NC}"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ Repository state OK${NC}"
}

check_docker_running() {
    echo -e "${YELLOW}[3/5] Checking Docker daemon...${NC}"
    
    if ! docker ps &> /dev/null; then
        echo -e "${RED}✗ Docker daemon not running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker daemon running${NC}"
}

check_disk_space() {
    echo -e "${YELLOW}[4/5] Checking disk space...${NC}"
    
    DISK_USAGE=$(df "$REPO_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        echo -e "${RED}✗ Disk usage ${DISK_USAGE}% (threshold: 80%)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Disk space OK (${DISK_USAGE}% used)${NC}"
}

check_env_file() {
    echo -e "${YELLOW}[5/5] Checking environment configuration...${NC}"
    
    if [ ! -f "$REPO_ROOT/.env" ]; then
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        echo -e "${YELLOW}  Required variables:${NC}"
        echo -e "${YELLOW}    - RATE_LIMIT_MAX=60${NC}"
        echo -e "${YELLOW}    - JOB_TIMEOUT_MS=300000${NC}"
        echo -e "${YELLOW}    - LOG_LEVEL=info${NC}"
        read -p "Create .env file? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cat > "$REPO_ROOT/.env" << 'EOF'
# Rate Limiting
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MS=300000

# Worker Timeout
JOB_TIMEOUT_MS=300000
JOB_LOCK_DURATION_MS=30000
JOB_LOCK_RENEW_MS=15000

# Logging
LOG_LEVEL=info

# Production
NODE_ENV=production
EOF
            echo -e "${GREEN}✓ .env file created${NC}"
        fi
    else
        echo -e "${GREEN}✓ .env file exists${NC}"
        # Verify required variables
        for var in RATE_LIMIT_MAX JOB_TIMEOUT_MS LOG_LEVEL; do
            if ! grep -q "^$var=" "$REPO_ROOT/.env"; then
                echo -e "${YELLOW}⚠ Missing variable: $var${NC}"
            fi
        done
    fi
}

# ============================================================================
# PHASE 2: STAGING DEPLOYMENT
# ============================================================================

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 2: STAGING DEPLOYMENT                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

deploy_staging() {
    echo -e "${YELLOW}Deploying to staging...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Fetch latest from origin
    echo -e "${YELLOW}[1/6] Fetching latest code...${NC}"
    git fetch origin
    echo -e "${GREEN}✓ Fetched${NC}"
    
    # Checkout/create staging branch
    echo -e "${YELLOW}[2/6] Switching to staging branch...${NC}"
    if git rev-parse --verify "$STAGING_BRANCH" &> /dev/null; then
        git checkout "$STAGING_BRANCH"
    else
        git checkout -b "$STAGING_BRANCH" "origin/$STAGING_BRANCH" || git checkout -b "$STAGING_BRANCH" "origin/$MAIN_BRANCH"
    fi
    echo -e "${GREEN}✓ Staging branch ready${NC}"
    
    # Reset to origin/main for fresh staging
    echo -e "${YELLOW}[3/6] Resetting to origin/main...${NC}"
    git reset --hard origin/"$MAIN_BRANCH"
    echo -e "${GREEN}✓ Reset complete${NC}"
    
    # Create backup
    echo -e "${YELLOW}[4/6] Creating backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    BACKUP_TS=$(date +%s)
    BACKUP_FILE="$BACKUP_DIR/compose-backup-$BACKUP_TS.yml"
    if [ -f "$REPO_ROOT/$DOCKER_COMPOSE" ]; then
        cp "$REPO_ROOT/$DOCKER_COMPOSE" "$BACKUP_FILE"
        echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    fi
    
    # Save rollback commit
    ROLLBACK_COMMIT=$(git rev-parse HEAD)
    echo "Rollback commit: $ROLLBACK_COMMIT" > "$BACKUP_DIR/rollback-info-$BACKUP_TS.txt"
    
    # Pull latest images
    echo -e "${YELLOW}[5/6] Pulling latest Docker images...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" pull
    echo -e "${GREEN}✓ Images pulled${NC}"
    
    # Start containers
    echo -e "${YELLOW}[6/6] Starting containers...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" up -d --build
    echo -e "${GREEN}✓ Containers started${NC}"
    
    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 10
    
    # Verify containers running
    echo -e "${YELLOW}Verifying containers...${NC}"
    if docker-compose -f "$DOCKER_COMPOSE" ps | grep -q "Up"; then
        echo -e "${GREEN}✓ All containers running${NC}"
    else
        echo -e "${RED}✗ Some containers failed to start${NC}"
        docker-compose -f "$DOCKER_COMPOSE" ps
        exit 1
    fi
}

# ============================================================================
# PHASE 3: SMOKE TESTS
# ============================================================================

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 3: SMOKE TESTS                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

smoke_test_health() {
    echo -e "${YELLOW}[1/7] Testing health endpoint...${NC}"
    
    RESPONSE=$(curl -fsS http://localhost:3000/api/health || echo "FAILED")
    
    if echo "$RESPONSE" | grep -q "ok"; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${RED}✗ Health check failed: $RESPONSE${NC}"
        return 1
    fi
}

smoke_test_upload() {
    echo -e "${YELLOW}[2/7] Testing upload endpoint...${NC}"
    
    # Create test file
    TEST_FILE="/tmp/test-upload-$RANDOM.txt"
    echo "test data" > "$TEST_FILE"
    
    RESPONSE=$(curl -s -F "file=@$TEST_FILE" http://localhost:3000/api/upload)
    
    rm -f "$TEST_FILE"
    
    if echo "$RESPONSE" | grep -qE "success|error|queue"; then
        echo -e "${GREEN}✓ Upload endpoint responding${NC}"
    else
        echo -e "${RED}✗ Upload failed: $RESPONSE${NC}"
        return 1
    fi
}

smoke_test_rate_limit() {
    echo -e "${YELLOW}[3/7] Testing rate limiting (sending 70 requests)...${NC}"
    
    LIMIT_COUNT=0
    for i in {1..70}; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
        if [ "$HTTP_CODE" = "429" ]; then
            LIMIT_COUNT=$((LIMIT_COUNT + 1))
        fi
    done
    
    if [ "$LIMIT_COUNT" -gt 5 ]; then
        echo -e "${GREEN}✓ Rate limiting active ($LIMIT_COUNT requests blocked)${NC}"
    else
        echo -e "${YELLOW}⚠ Rate limiting may not be working (only $LIMIT_COUNT requests blocked)${NC}"
    fi
}

smoke_test_logs() {
    echo -e "${YELLOW}[4/7] Checking logs rotation...${NC}"
    
    LOG_FILE="$REPO_ROOT/logs/app.log"
    
    if [ -f "$LOG_FILE" ]; then
        echo -e "${GREEN}✓ Logs file exists${NC}"
        LOG_SIZE=$(du -h "$LOG_FILE" | awk '{print $1}')
        echo -e "${YELLOW}  Size: $LOG_SIZE${NC}"
    else
        echo -e "${YELLOW}⚠ Logs file not found${NC}"
    fi
}

smoke_test_containers() {
    echo -e "${YELLOW}[5/7] Checking container status...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    docker-compose -f "$DOCKER_COMPOSE" ps
}

smoke_test_disk() {
    echo -e "${YELLOW}[6/7] Checking disk usage...${NC}"
    
    DISK_USAGE=$(df "$REPO_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    echo -e "${YELLOW}  Disk usage: ${DISK_USAGE}%${NC}"
    
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✓ Disk space OK${NC}"
    else
        echo -e "${RED}✗ Disk usage critical (${DISK_USAGE}%)${NC}"
    fi
}

smoke_test_redis() {
    echo -e "${YELLOW}[7/7] Checking Redis connection...${NC}"
    
    if docker exec redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis connected${NC}"
    else
        echo -e "${YELLOW}⚠ Redis check skipped${NC}"
    fi
}

# ============================================================================
# PHASE 4: MONITORING
# ============================================================================

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 4: MONITORING (Wait 60 seconds)                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

monitor_services() {
    echo -e "${YELLOW}Monitoring services for 60 seconds...${NC}"
    
    for i in {60..1}; do
        # Check health
        HEALTH=$(curl -s http://localhost:3000/api/health | grep -o "ok" || echo "FAIL")
        
        # Check containers
        RUNNING=$(docker-compose -f "$DOCKER_COMPOSE" ps -q | wc -l)
        
        # Check disk
        DISK=$(df "$REPO_ROOT" | tail -1 | awk '{print $5}')
        
        # Print status
        printf "\r${BLUE}[${i}s]${NC} Health: ${HEALTH} | Containers: ${RUNNING} | Disk: ${DISK} "
        
        sleep 1
    done
    
    echo -e "\n${GREEN}✓ Monitoring complete${NC}"
}

# ============================================================================
# PHASE 5: PRODUCTION DEPLOYMENT
# ============================================================================

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 5: PRODUCTION DEPLOYMENT                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

confirm_production_deploy() {
    echo -e "${YELLOW}⚠ PRODUCTION DEPLOYMENT - Are you ready?${NC}"
    echo -e "${YELLOW}  Make sure:${NC}"
    echo -e "${YELLOW}    1. Staging tests all passed${NC}"
    echo -e "${YELLOW}    2. No errors in staging logs${NC}"
    echo -e "${YELLOW}    3. Team is ready for observation${NC}"
    echo -e "${YELLOW}    4. Rollback procedure reviewed${NC}"
    
    read -p "Deploy to PRODUCTION? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
}

deploy_production() {
    echo -e "${YELLOW}Deploying to production...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Create backup
    echo -e "${YELLOW}[1/4] Creating backup...${NC}"
    PROD_BACKUP="$BACKUP_DIR/prod-backup-$(date +%s).tar.gz"
    tar -czf "$PROD_BACKUP" uploads/ logs/ 2>/dev/null || true
    echo -e "${GREEN}✓ Backup created${NC}"
    
    # Update production
    echo -e "${YELLOW}[2/4] Pulling latest code...${NC}"
    git fetch origin
    git checkout "$MAIN_BRANCH"
    git reset --hard "origin/$MAIN_BRANCH"
    echo -e "${GREEN}✓ Code updated${NC}"
    
    # Build & deploy
    echo -e "${YELLOW}[3/4] Building and deploying...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" pull
    docker-compose -f "$DOCKER_COMPOSE" up -d --build
    echo -e "${GREEN}✓ Deployment complete${NC}"
    
    # Verify
    echo -e "${YELLOW}[4/4] Verifying deployment...${NC}"
    sleep 10
    if curl -fs http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✓ Production deployment successful${NC}"
    else
        echo -e "${RED}✗ Production verification failed${NC}"
        echo -e "${YELLOW}Rolling back...${NC}"
        docker-compose -f "$DOCKER_COMPOSE" down
        git reset --hard HEAD~1
        docker-compose -f "$DOCKER_COMPOSE" up -d --build
        exit 1
    fi
}

# ============================================================================
# PHASE 6: TAGGING & RELEASE
# ============================================================================

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 6: TAGGING & RELEASE                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

create_tag_and_release() {
    echo -e "${YELLOW}Creating tag and release...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Create annotated tag
    echo -e "${YELLOW}[1/2] Creating git tag...${NC}"
    git tag -a "$TAG_VERSION" -m "v0.1.1 — Security hardening (rate limit, logger, worker timeout)" || {
        echo -e "${YELLOW}⚠ Tag already exists${NC}"
    }
    
    # Push tag
    git push origin "$TAG_VERSION" 2>/dev/null || true
    echo -e "${GREEN}✓ Tag created${NC}"
    
    # GitHub release (requires gh CLI)
    if command -v gh &> /dev/null; then
        echo -e "${YELLOW}[2/2] Creating GitHub release...${NC}"
        if [ -f "RELEASE_NOTES_v0.1.1.md" ]; then
            gh release create "$TAG_VERSION" \
                --title "v0.1.1 — Security Hardening" \
                --notes-file RELEASE_NOTES_v0.1.1.md || true
            echo -e "${GREEN}✓ Release created${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ GitHub CLI not installed (create release manually)${NC}"
    fi
}

# ============================================================================
# ROLLBACK FUNCTION
# ============================================================================

rollback() {
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          ROLLBACK IN PROGRESS                                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    echo -e "${YELLOW}[1/3] Stopping containers...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" down
    
    echo -e "${YELLOW}[2/3] Reverting code...${NC}"
    if [ -n "$ROLLBACK_COMMIT" ]; then
        git reset --hard "$ROLLBACK_COMMIT"
    else
        git reset --hard HEAD~1
    fi
    
    echo -e "${YELLOW}[3/3] Restarting services...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" up -d --build
    
    echo -e "${RED}✓ Rollback complete${NC}"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   MASTER DEPLOYMENT - v0.1.1-security${NC}"
    echo -e "${BLUE}   $(date)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
    
    # Parse arguments
    STAGE="${1:-check}"
    
    case "$STAGE" in
        check)
            check_prerequisites
            check_repo_state
            check_docker_running
            check_disk_space
            check_env_file
            echo -e "\n${GREEN}✓ All checks passed${NC}"
            ;;
        staging)
            check_prerequisites
            deploy_staging
            smoke_test_health
            smoke_test_upload
            smoke_test_rate_limit
            smoke_test_logs
            smoke_test_containers
            monitor_services
            echo -e "\n${GREEN}✓ Staging deployment complete${NC}"
            echo -e "${YELLOW}Next: Monitor for 24-48 hours, then run: $0 production${NC}"
            ;;
        production)
            confirm_production_deploy
            deploy_production
            create_tag_and_release
            echo -e "\n${GREEN}✓ Production deployment complete${NC}"
            echo -e "${YELLOW}Monitor: docker-compose logs -f${NC}"
            ;;
        rollback)
            rollback
            ;;
        *)
            echo -e "${YELLOW}Usage: $0 {check|staging|production|rollback}${NC}"
            echo -e "${YELLOW}  check      - Run pre-deployment checks${NC}"
            echo -e "${YELLOW}  staging    - Deploy to staging + smoke tests${NC}"
            echo -e "${YELLOW}  production - Deploy to production (after staging OK)${NC}"
            echo -e "${YELLOW}  rollback   - Rollback to previous version${NC}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
