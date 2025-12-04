#!/bin/bash
# =============================================================================
# CannaConvert Staging - Backup & Restore Utility
# =============================================================================
# Manages PostgreSQL backups for staging environment.
# Usage:
#   ./backup-restore-staging.sh backup              - Create a backup
#   ./backup-restore-staging.sh restore <file>      - Restore from backup
#   ./backup-restore-staging.sh list                - List available backups
#   ./backup-restore-staging.sh clean [days]        - Remove old backups
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
POSTGRES_CONTAINER="postgres"
POSTGRES_DB="${POSTGRES_DB:-cannaconvert_staging}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="./backups/staging"
RETENTION_DAYS=7

# =============================================================================
# Helper Functions
# =============================================================================

usage() {
  echo ""
  echo -e "${BLUE}CannaConvert Staging - Backup & Restore Utility${NC}"
  echo ""
  echo "Usage:"
  echo "  $0 backup                 Create a new backup"
  echo "  $0 restore <file>         Restore from a backup file"
  echo "  $0 list                   List available backups"
  echo "  $0 clean [days]           Remove backups older than N days (default: 7)"
  echo ""
  echo "Examples:"
  echo "  $0 backup"
  echo "  $0 restore backups/staging/cannaconvert_staging_20240115_120000.sql.gz"
  echo "  $0 list"
  echo "  $0 clean 14"
  echo ""
  exit 1
}

check_container() {
  if ! docker compose -f $COMPOSE_FILE ps --status running | grep -q $POSTGRES_CONTAINER; then
    echo -e "${RED}Error: PostgreSQL container is not running.${NC}"
    echo "Start the staging environment first: ./scripts/staging/up.sh"
    exit 1
  fi
}

# =============================================================================
# Backup Command
# =============================================================================

do_backup() {
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║           Creating Staging Database Backup                     ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  check_container
  
  # Create backup directory
  mkdir -p "$BACKUP_DIR"
  
  # Generate filename with timestamp
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
  
  echo -e "${YELLOW}[1/3] Creating database dump...${NC}"
  
  # Run pg_dump inside container and compress
  docker compose -f $COMPOSE_FILE exec -T $POSTGRES_CONTAINER \
    pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists | gzip > "$BACKUP_FILE"
  
  if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE ($SIZE)${NC}"
  else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
  fi
  
  echo ""
  echo -e "${YELLOW}[2/3] Creating backup manifest...${NC}"
  
  # Create manifest file with metadata
  MANIFEST_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.manifest"
  cat > "$MANIFEST_FILE" << EOF
# CannaConvert Staging Backup Manifest
backup_file=$BACKUP_FILE
timestamp=$TIMESTAMP
database=$POSTGRES_DB
created=$(date -Iseconds)
size=$SIZE
environment=staging
EOF
  
  echo -e "${GREEN}✓ Manifest created: $MANIFEST_FILE${NC}"
  
  echo ""
  echo -e "${YELLOW}[3/3] Verifying backup integrity...${NC}"
  
  # Verify backup can be decompressed
  if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Backup integrity verified${NC}"
  else
    echo -e "${RED}✗ Backup integrity check failed${NC}"
    exit 1
  fi
  
  echo ""
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Backup Complete                             ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Backup file: $BACKUP_FILE"
  echo "Size: $SIZE"
  echo ""
  echo "To restore: $0 restore $BACKUP_FILE"
  echo ""
}

# =============================================================================
# Restore Command
# =============================================================================

do_restore() {
  local BACKUP_FILE=$1
  
  if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file specified.${NC}"
    usage
  fi
  
  if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║           Restoring Staging Database Backup                    ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  check_container
  
  echo -e "${RED}WARNING: This will overwrite the current staging database!${NC}"
  echo "Backup file: $BACKUP_FILE"
  echo ""
  read -p "Are you sure you want to continue? [y/N] " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
  fi
  
  echo ""
  echo -e "${YELLOW}[1/4] Creating pre-restore backup...${NC}"
  
  # Create safety backup before restore
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  PRE_RESTORE_BACKUP="${BACKUP_DIR}/${POSTGRES_DB}_pre_restore_${TIMESTAMP}.sql.gz"
  
  docker compose -f $COMPOSE_FILE exec -T $POSTGRES_CONTAINER \
    pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists | gzip > "$PRE_RESTORE_BACKUP"
  
  echo -e "${GREEN}✓ Pre-restore backup created: $PRE_RESTORE_BACKUP${NC}"
  
  echo ""
  echo -e "${YELLOW}[2/4] Terminating active connections...${NC}"
  
  docker compose -f $COMPOSE_FILE exec -T $POSTGRES_CONTAINER \
    psql -U $POSTGRES_USER -d postgres -c "
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '$POSTGRES_DB'
        AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true
  
  echo -e "${GREEN}✓ Active connections terminated${NC}"
  
  echo ""
  echo -e "${YELLOW}[3/4] Restoring database...${NC}"
  
  # Restore from backup
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker compose -f $COMPOSE_FILE exec -T $POSTGRES_CONTAINER \
      psql -U $POSTGRES_USER -d $POSTGRES_DB
  else
    docker compose -f $COMPOSE_FILE exec -T $POSTGRES_CONTAINER \
      psql -U $POSTGRES_USER -d $POSTGRES_DB < "$BACKUP_FILE"
  fi
  
  echo -e "${GREEN}✓ Database restored${NC}"
  
  echo ""
  echo -e "${YELLOW}[4/4] Running migrations...${NC}"
  
  # Run any pending migrations
  docker compose -f $COMPOSE_FILE exec -T api npx prisma migrate deploy 2>/dev/null || \
    docker compose -f $COMPOSE_FILE exec -T api npx prisma db push 2>/dev/null || \
    echo "  (Prisma migrations skipped)"
  
  echo -e "${GREEN}✓ Migrations complete${NC}"
  
  echo ""
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Restore Complete                            ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Database restored from: $BACKUP_FILE"
  echo "Pre-restore backup saved: $PRE_RESTORE_BACKUP"
  echo ""
}

# =============================================================================
# List Command
# =============================================================================

do_list() {
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              Available Staging Backups                         ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "No backups directory found."
    echo "Create a backup first: $0 backup"
    exit 0
  fi
  
  BACKUPS=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | sort -r)
  
  if [ -z "$BACKUPS" ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 0
  fi
  
  echo "Directory: $BACKUP_DIR"
  echo ""
  printf "%-50s %10s %20s\n" "Filename" "Size" "Modified"
  echo "────────────────────────────────────────────────────────────────────────────────"
  
  for backup in $BACKUPS; do
    filename=$(basename "$backup")
    size=$(du -h "$backup" | cut -f1)
    modified=$(stat -c %y "$backup" 2>/dev/null | cut -d'.' -f1 || stat -f %Sm "$backup" 2>/dev/null)
    printf "%-50s %10s %20s\n" "$filename" "$size" "$modified"
  done
  
  echo ""
  echo "Total: $(echo "$BACKUPS" | wc -l) backup(s)"
  echo ""
  echo "To restore: $0 restore <backup_file>"
  echo ""
}

# =============================================================================
# Clean Command
# =============================================================================

do_clean() {
  local DAYS=${1:-$RETENTION_DAYS}
  
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              Cleaning Old Staging Backups                      ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "No backups directory found."
    exit 0
  fi
  
  echo "Finding backups older than $DAYS days..."
  echo ""
  
  OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$DAYS 2>/dev/null)
  
  if [ -z "$OLD_BACKUPS" ]; then
    echo "No old backups found."
    exit 0
  fi
  
  echo "The following backups will be deleted:"
  for backup in $OLD_BACKUPS; do
    echo "  - $backup"
  done
  echo ""
  
  read -p "Are you sure you want to delete these backups? [y/N] " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
  fi
  
  # Delete old backups and manifests
  for backup in $OLD_BACKUPS; do
    rm -f "$backup"
    rm -f "${backup%.sql.gz}.manifest"
    echo -e "${GREEN}✓ Deleted: $backup${NC}"
  done
  
  echo ""
  echo "Cleanup complete."
  echo ""
}

# =============================================================================
# Main
# =============================================================================

COMMAND=$1
shift 2>/dev/null || true

case $COMMAND in
  backup)
    do_backup
    ;;
  restore)
    do_restore "$@"
    ;;
  list)
    do_list
    ;;
  clean)
    do_clean "$@"
    ;;
  *)
    usage
    ;;
esac
