#!/bin/bash
# =============================================================================
# CannaConvert Staging - Stop Environment
# =============================================================================
# Stops staging environment and optionally cleans up volumes.
# Usage: ./scripts/staging/down.sh [--clean] [--keep-data]
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

# Parse arguments
CLEAN_VOLUMES=false
KEEP_DATA=false

for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN_VOLUMES=true
      shift
      ;;
    --keep-data)
      KEEP_DATA=true
      shift
      ;;
  esac
done

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         CannaConvert Staging - Stopping Environment           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Step 1: Stop containers
# =============================================================================
echo -e "${YELLOW}[1/3] Stopping containers...${NC}"

if [ "$CLEAN_VOLUMES" = true ]; then
  echo "  Removing containers and volumes..."
  docker compose -f $COMPOSE_FILE down --volumes --remove-orphans
else
  echo "  Removing containers (keeping volumes)..."
  docker compose -f $COMPOSE_FILE down --remove-orphans
fi

echo -e "${GREEN}✓ Containers stopped${NC}"

# =============================================================================
# Step 2: Clean up data directories (optional)
# =============================================================================
if [ "$CLEAN_VOLUMES" = true ] && [ "$KEEP_DATA" = false ]; then
  echo ""
  echo -e "${YELLOW}[2/3] Cleaning data directories...${NC}"
  
  read -p "  Are you sure you want to delete staging data? [y/N] " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf data/staging/postgres
    rm -rf data/staging/redis
    rm -rf data/staging/prometheus
    rm -rf data/staging/grafana
    rm -rf data/staging/alertmanager
    echo -e "${GREEN}✓ Data directories cleaned${NC}"
  else
    echo -e "${YELLOW}  Skipped data cleanup${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}[2/3] Keeping data directories${NC}"
fi

# =============================================================================
# Step 3: Clean up networks
# =============================================================================
echo ""
echo -e "${YELLOW}[3/3] Cleaning up networks...${NC}"

docker network prune -f 2>/dev/null || true

echo -e "${GREEN}✓ Networks cleaned${NC}"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Staging Environment Stopped                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$CLEAN_VOLUMES" = true ] && [ "$KEEP_DATA" = false ]; then
  echo "All staging data has been removed."
else
  echo "Data directories preserved in ./data/staging/"
  echo "To fully clean up, run: ./scripts/staging/down.sh --clean"
fi

echo ""
echo "To restart: ./scripts/staging/up.sh"
echo ""
