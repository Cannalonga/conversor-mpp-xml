#!/bin/bash
# =============================================================================
# CannaConvert Staging - Start Environment
# =============================================================================
# Starts staging environment, waits for services, runs migrations.
# Usage: ./scripts/staging/up.sh [--no-build] [--skip-migrate]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
COMPOSE_FILE="docker-compose.staging.yml"
TIMEOUT=180
INTERVAL=5

# Parse arguments
NO_BUILD=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --no-build)
      NO_BUILD=true
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=true
      shift
      ;;
  esac
done

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         CannaConvert Staging - Starting Environment           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Step 1: Create data directories
# =============================================================================
echo -e "${YELLOW}[1/5] Creating data directories...${NC}"
mkdir -p data/staging/{postgres,redis,prometheus,grafana,alertmanager}
mkdir -p uploads logs backups
echo -e "${GREEN}✓ Directories created${NC}"

# =============================================================================
# Step 2: Start Docker Compose
# =============================================================================
echo ""
echo -e "${YELLOW}[2/5] Starting Docker Compose...${NC}"

if [ "$NO_BUILD" = true ]; then
  docker compose -f $COMPOSE_FILE up -d
else
  docker compose -f $COMPOSE_FILE up --build -d
fi

echo -e "${GREEN}✓ Docker Compose started${NC}"

# =============================================================================
# Step 3: Wait for services to be healthy
# =============================================================================
echo ""
echo -e "${YELLOW}[3/5] Waiting for services to be healthy...${NC}"

wait_for_health() {
  local url=$1
  local name=$2
  local elapsed=0
  
  echo -n "  Waiting for $name..."
  
  while [ $elapsed -lt $TIMEOUT ]; do
    if curl -s -f "$url" > /dev/null 2>&1; then
      echo -e " ${GREEN}✓${NC}"
      return 0
    fi
    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
    echo -n "."
  done
  
  echo -e " ${RED}✗ TIMEOUT${NC}"
  return 1
}

# Wait for each service
wait_for_health "http://localhost:5433" "PostgreSQL" || {
  echo "Checking PostgreSQL via docker..."
  docker exec cannaconvert-postgres-staging pg_isready -U postgres || exit 1
}

wait_for_health "http://localhost:6380" "Redis" || {
  echo "Checking Redis via docker..."
  docker exec cannaconvert-redis-staging redis-cli ping || exit 1
}

wait_for_health "http://localhost:8081/actuator/health" "MPP Converter" || exit 1
wait_for_health "http://localhost:3001/health" "API" || exit 1
wait_for_health "http://localhost:3000" "Frontend" || exit 1

echo -e "${GREEN}✓ All services healthy${NC}"

# =============================================================================
# Step 4: Run database migrations
# =============================================================================
if [ "$SKIP_MIGRATE" = false ]; then
  echo ""
  echo -e "${YELLOW}[4/5] Running database migrations...${NC}"
  
  # Export DATABASE_URL for prisma
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cannaconvert_staging"
  
  cd frontend
  
  # Try migrate deploy first, fall back to db push if no migrations
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "  Running prisma migrate deploy..."
    npx prisma migrate deploy || {
      echo -e "${YELLOW}  Migration failed, trying db push...${NC}"
      npx prisma db push --accept-data-loss
    }
  else
    echo "  No migrations found, using db push..."
    npx prisma db push
  fi
  
  cd ..
  
  echo -e "${GREEN}✓ Database migrations complete${NC}"
else
  echo ""
  echo -e "${YELLOW}[4/5] Skipping migrations (--skip-migrate)${NC}"
fi

# =============================================================================
# Step 5: Print access URLs
# =============================================================================
echo ""
echo -e "${YELLOW}[5/5] Staging environment ready!${NC}"
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Access URLs                               ║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Frontend:      ${GREEN}http://localhost:3000${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  API:           ${GREEN}http://localhost:3001${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  MPP Converter: ${GREEN}http://localhost:8081${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Grafana:       ${GREEN}http://localhost:3002${NC}  (admin/admin)         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Prometheus:    ${GREEN}http://localhost:9090${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Alertmanager:  ${GREEN}http://localhost:9093${NC}                        ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  PostgreSQL:    ${GREEN}localhost:5433${NC}                               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Redis:         ${GREEN}localhost:6380${NC}                               ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Run smoke tests: ./scripts/staging/smoke-test.sh"
echo "Stop staging:    ./scripts/staging/down.sh"
echo ""
