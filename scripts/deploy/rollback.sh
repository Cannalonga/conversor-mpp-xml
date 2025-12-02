#!/bin/bash
# ============================================================================
# ROLLBACK SCRIPT - Emergency Procedure for v0.1.1-security
# Use only if critical issues found in production
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_ROOT="/srv/cannaconverter"
DOCKER_COMPOSE="docker-compose.prod.yml"
BACKUP_DIR="$REPO_ROOT/backups"
PREVIOUS_TAG="v0.1.0"  # Adjust to your previous stable version

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                      🚨 ROLLBACK PROCEDURE 🚨                  ║${NC}"
    echo -e "${RED}║                 v0.1.1-security → ${PREVIOUS_TAG}                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️ WARNING: This will revert to previous version${NC}"
    echo -e "${YELLOW}⚠️ You have 10 seconds to cancel (Ctrl+C)${NC}"
    echo ""
    sleep 10
}

confirm_rollback() {
    echo -e "${RED}Are you ABSOLUTELY sure you want to rollback?${NC}"
    echo -e "${RED}Type 'ROLLBACK' to confirm:${NC}"
    read -r CONFIRMATION
    
    if [ "$CONFIRMATION" != "ROLLBACK" ]; then
        echo -e "${YELLOW}Rollback cancelled${NC}"
        exit 0
    fi
}

step_1_backup() {
    echo -e "\n${BLUE}[STEP 1/5] Creating emergency backup...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Create timestamped backup
    BACKUP_TS=$(date +%s)
    BACKUP_DIR_EMERGENCY="$BACKUP_DIR/emergency-$BACKUP_TS"
    
    mkdir -p "$BACKUP_DIR_EMERGENCY"
    
    # Backup critical data
    echo -e "${YELLOW}  Backing up uploads/...${NC}"
    tar -czf "$BACKUP_DIR_EMERGENCY/uploads-backup-$BACKUP_TS.tar.gz" uploads/ 2>/dev/null || true
    
    echo -e "${YELLOW}  Backing up logs/...${NC}"
    tar -czf "$BACKUP_DIR_EMERGENCY/logs-backup-$BACKUP_TS.tar.gz" logs/ 2>/dev/null || true
    
    echo -e "${YELLOW}  Backing up current code...${NC}"
    git archive --format tar.gz -o "$BACKUP_DIR_EMERGENCY/code-backup-$BACKUP_TS.tar.gz" HEAD
    
    # Save current state
    echo "Rollback performed at: $(date)" > "$BACKUP_DIR_EMERGENCY/rollback-info.txt"
    echo "From: $(git rev-parse HEAD)" >> "$BACKUP_DIR_EMERGENCY/rollback-info.txt"
    echo "To: ${PREVIOUS_TAG}" >> "$BACKUP_DIR_EMERGENCY/rollback-info.txt"
    
    echo -e "${GREEN}✓ Backup complete: $BACKUP_DIR_EMERGENCY${NC}"
}

step_2_stop_services() {
    echo -e "\n${BLUE}[STEP 2/5] Stopping containers...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    echo -e "${YELLOW}  Stopping services...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" down
    
    echo -e "${YELLOW}  Waiting for cleanup...${NC}"
    sleep 5
    
    echo -e "${GREEN}✓ Services stopped${NC}"
}

step_3_revert_code() {
    echo -e "\n${BLUE}[STEP 3/5] Reverting code...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Option 1: Revert by tag
    if git rev-parse "$PREVIOUS_TAG" &> /dev/null; then
        echo -e "${YELLOW}  Checking out tag: ${PREVIOUS_TAG}${NC}"
        git checkout "$PREVIOUS_TAG"
    else
        # Option 2: Revert previous commit
        echo -e "${YELLOW}  Reverting to previous commit...${NC}"
        git reset --hard HEAD~1
    fi
    
    # Verify
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo -e "${GREEN}✓ Reverted to: $CURRENT_COMMIT${NC}"
}

step_4_restart_services() {
    echo -e "\n${BLUE}[STEP 4/5] Restarting containers...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    echo -e "${YELLOW}  Building images...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" build --no-cache
    
    echo -e "${YELLOW}  Starting services...${NC}"
    docker-compose -f "$DOCKER_COMPOSE" up -d
    
    echo -e "${YELLOW}  Waiting for services to be ready...${NC}"
    sleep 15
    
    echo -e "${GREEN}✓ Services started${NC}"
}

step_5_verify() {
    echo -e "\n${BLUE}[STEP 5/5] Verifying rollback...${NC}"
    
    cd "$REPO_ROOT" || exit 1
    
    # Check containers
    echo -e "${YELLOW}  Checking container status...${NC}"
    if docker-compose -f "$DOCKER_COMPOSE" ps | grep -q "Up"; then
        echo -e "${GREEN}✓ Containers running${NC}"
    else
        echo -e "${RED}✗ Containers failed to start${NC}"
        docker-compose -f "$DOCKER_COMPOSE" logs
        exit 1
    fi
    
    # Check health
    echo -e "${YELLOW}  Checking API health...${NC}"
    if curl -fs http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✓ API responding${NC}"
    else
        echo -e "${RED}✗ API not responding${NC}"
        exit 1
    fi
    
    # Check logs
    echo -e "${YELLOW}  Checking logs for errors...${NC}"
    ERROR_COUNT=$(docker-compose -f "$DOCKER_COMPOSE" logs api | grep -i "error" | wc -l)
    if [ "$ERROR_COUNT" -gt 10 ]; then
        echo -e "${YELLOW}⚠ Found $ERROR_COUNT errors in logs${NC}"
    else
        echo -e "${GREEN}✓ Logs look normal${NC}"
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    print_header
    confirm_rollback
    
    # Execute rollback steps
    step_1_backup
    step_2_stop_services
    step_3_revert_code
    step_4_restart_services
    step_5_verify
    
    # Final summary
    echo -e "\n${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                      🟢 ROLLBACK COMPLETE 🟢                   ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${GREEN}Summary:${NC}"
    echo -e "${GREEN}  ✓ Backup saved: $BACKUP_DIR_EMERGENCY${NC}"
    echo -e "${GREEN}  ✓ Services reverted to: ${PREVIOUS_TAG}${NC}"
    echo -e "${GREEN}  ✓ All systems operational${NC}"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Verify all functionality works${NC}"
    echo -e "${YELLOW}  2. Check logs: docker-compose logs -f${NC}"
    echo -e "${YELLOW}  3. Investigate what caused the issue${NC}"
    echo -e "${YELLOW}  4. Create hotfix or replan deployment${NC}"
    echo -e "${YELLOW}  5. Notify team of incident${NC}"
    
    # Send notification (optional)
    if command -v curl &> /dev/null; then
        echo -e "\n${YELLOW}Optional: Send alert to team${NC}"
        echo -e "${YELLOW}  Example: curl -X POST https://your-slack-webhook ...${NC}"
    fi
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

on_error() {
    echo -e "\n${RED}❌ ROLLBACK FAILED - Manual intervention required${NC}"
    echo -e "${RED}  Last backup: $BACKUP_DIR_EMERGENCY${NC}"
    echo -e "${RED}  Current state: Check 'docker-compose ps'${NC}"
    exit 1
}

trap on_error ERR

# ============================================================================
# RUN MAIN
# ============================================================================

main "$@"
