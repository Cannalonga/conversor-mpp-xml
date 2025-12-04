# Staging Environment

This document describes the staging environment for CannaConvert, including setup, configuration, and operational procedures.

## Overview

The staging environment is a complete replica of the production environment, designed for integration testing and pre-deployment validation.

### Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5433 | Database (Postgres 15) |
| Redis | 6380 | Cache & queue backend |
| MPP Converter | 8081 | Java Spring Boot converter |
| API | 3001 | Node.js Express backend |
| Frontend | 3000 | Next.js web application |
| Worker | - | Background job processor |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3002 | Monitoring dashboards |
| Alertmanager | 9093 | Alert routing |

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2+
- Node.js 20+ (for Prisma migrations)
- 4GB+ available RAM
- 10GB+ disk space

### Start Environment

```bash
# Start with rebuild
./scripts/staging/up.sh --build

# Start without rebuild (faster)
./scripts/staging/up.sh
```

### Stop Environment

```bash
# Stop containers (preserve data)
./scripts/staging/down.sh

# Stop and remove volumes
./scripts/staging/down.sh --clean

# Stop and clean, but keep data directories
./scripts/staging/down.sh --clean --keep-data
```

### Run Smoke Tests

```bash
./scripts/staging/smoke-test.sh
```

## Configuration

### Environment Variables

The staging environment uses these default values:

```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_staging
POSTGRES_DB=cannaconvert_staging
DATABASE_URL=postgresql://postgres:postgres_staging@postgres:5432/cannaconvert_staging

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# Application
NODE_ENV=staging
LOG_LEVEL=debug
```

### Overriding Configuration

Create a `.env.staging` file in the project root:

```bash
# .env.staging
POSTGRES_PASSWORD=your_custom_password
JWT_SECRET=your_custom_jwt_secret
API_KEY=your_custom_api_key
```

Then reference it in `docker-compose.staging.yml`:

```yaml
services:
  api:
    env_file:
      - .env.staging
```

## Data Management

### Database Backups

```bash
# Create backup
./scripts/staging/backup-restore-staging.sh backup

# List backups
./scripts/staging/backup-restore-staging.sh list

# Restore backup
./scripts/staging/backup-restore-staging.sh restore backups/staging/<filename>.sql.gz

# Clean old backups (default: 7 days)
./scripts/staging/backup-restore-staging.sh clean

# Clean backups older than 14 days
./scripts/staging/backup-restore-staging.sh clean 14
```

### Data Directories

Staging data is persisted in:

```
./data/staging/
├── postgres/          # PostgreSQL data
├── redis/             # Redis snapshots
├── prometheus/        # Prometheus TSDB
├── grafana/           # Grafana dashboards/config
└── alertmanager/      # Alertmanager data
```

### Reset Database

```bash
# Stop environment
./scripts/staging/down.sh

# Remove database volume
rm -rf ./data/staging/postgres

# Restart (will recreate database)
./scripts/staging/up.sh --build
```

## Monitoring

### Prometheus

- URL: http://localhost:9090
- Targets: http://localhost:9090/targets
- Query Interface: http://localhost:9090/graph

Key metrics:
- `http_request_duration_seconds` - API latency
- `http_requests_total` - Request count by status
- `process_cpu_seconds_total` - CPU usage
- `nodejs_heap_size_used_bytes` - Memory usage

### Grafana

- URL: http://localhost:3002
- Default credentials: admin / admin

Pre-configured dashboards:
- **API Overview** - Request rate, latency, errors
- **Database** - Query performance, connections
- **System** - CPU, memory, disk usage

### Alertmanager

- URL: http://localhost:9093
- Configuration: `monitoring/alertmanager/alertmanager.yml`

## Smoke Tests

The smoke test script validates:

1. **Health Checks** - All services responding
2. **API Endpoints** - Core API functionality
3. **Database Connectivity** - PostgreSQL connection
4. **Prometheus Targets** - Metrics collection
5. **Conversion Flow** - End-to-end file conversion
6. **Security Headers** - CORS, CSP, HSTS

### Running Tests

```bash
# Run all smoke tests
./scripts/staging/smoke-test.sh

# Custom endpoints (for remote staging)
API_URL=http://staging.example.com:3001 \
FRONTEND_URL=http://staging.example.com:3000 \
./scripts/staging/smoke-test.sh
```

### Test Output

```
╔═══════════════════════════════════════════════════════════════╗
║                    Test Results Summary                        ║
╚═══════════════════════════════════════════════════════════════╝

  Passed:  12
  Failed:  0
  Skipped: 3
  Total:   15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL SMOKE TESTS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.staging.yml logs <service>

# Check resource usage
docker stats

# Rebuild from scratch
./scripts/staging/down.sh --clean
./scripts/staging/up.sh --build
```

### Database Connection Issues

```bash
# Test database connectivity
docker compose -f docker-compose.staging.yml exec postgres \
  psql -U postgres -d cannaconvert_staging -c "SELECT 1"

# Check database logs
docker compose -f docker-compose.staging.yml logs postgres
```

### Port Conflicts

If ports are already in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.staging.yml`:

```yaml
services:
  api:
    ports:
      - "4001:3001"  # Use 4001 instead of 3001
```

### Memory Issues

```bash
# Check container memory
docker stats --no-stream

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > 6GB+
```

### Slow Startup

```bash
# Skip rebuild if images exist
./scripts/staging/up.sh

# Pre-pull images
docker compose -f docker-compose.staging.yml pull
```

## CI/CD Integration

### GitHub Actions

The staging environment can be used in CI:

```yaml
- name: Start Staging
  run: |
    chmod +x scripts/staging/up.sh
    ./scripts/staging/up.sh
    
- name: Run Smoke Tests
  run: |
    chmod +x scripts/staging/smoke-test.sh
    ./scripts/staging/smoke-test.sh
    
- name: Stop Staging
  if: always()
  run: ./scripts/staging/down.sh --clean
```

### Local Testing Before PR

```bash
# Start staging
./scripts/staging/up.sh --build

# Run smoke tests
./scripts/staging/smoke-test.sh

# Check results, fix issues

# Stop when done
./scripts/staging/down.sh
```

## Security Notes

- **Staging credentials are not secure** - Do not use in production
- Data directories should be gitignored
- Staging should not be exposed to public internet
- Use separate secrets for production

## Related Documentation

- [CI Pipeline](./CI.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API.md)
