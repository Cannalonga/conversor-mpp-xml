# CI/CD Pipeline Documentation

CannaConvert uses GitHub Actions for continuous integration and deployment. This document explains how to set up, configure, and run the CI pipeline.

## Overview

The CI pipeline consists of three main jobs:

```
┌─────────────────┐     ┌─────────────┐     ┌───────────────────┐
│  lint-and-test  │────▶│     e2e     │────▶│ docker-build-push │
│                 │     │             │     │   (main only)     │
└─────────────────┘     └─────────────┘     └───────────────────┘
```

1. **lint-and-test**: Runs linting, TypeScript checks, unit tests, and API tests
2. **e2e**: Runs end-to-end tests with Playwright against a full stack
3. **docker-build-push**: Builds Docker images and pushes to GitHub Container Registry (GHCR)

## Triggers

The pipeline runs on:
- **Push** to `main` branch
- **Pull requests** targeting `main` branch

## Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret | Required | Description |
|--------|----------|-------------|
| `GHCR_USERNAME` | Optional | GitHub username for GHCR login (defaults to `github.actor`) |
| `GHCR_TOKEN` | Optional | Personal Access Token with `write:packages` scope (defaults to `GITHUB_TOKEN`) |
| `POSTGRES_PASSWORD` | Optional | Password for PostgreSQL in E2E tests (defaults to `postgres`) |
| `ADMIN_PASSWORD_TEST` | Optional | Admin password for E2E tests (defaults to `admin123`) |
| `STRIPE_SECRET_KEY_TEST` | Optional | Stripe test API key (for payment tests) |
| `STRIPE_WEBHOOK_SECRET_TEST` | Optional | Stripe webhook secret (for webhook tests) |

### Setting Up GHCR Access

1. **Create a Personal Access Token (PAT)**:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Generate new token with scopes: `write:packages`, `read:packages`, `delete:packages`
   - Copy the token

2. **Add secrets to repository**:
   ```
   GHCR_USERNAME = your-github-username
   GHCR_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxx
   ```

3. **Alternative**: Use `GITHUB_TOKEN` (automatic)
   - The workflow uses `secrets.GITHUB_TOKEN` by default
   - Requires enabling "Read and write permissions" in repository settings:
     - Settings > Actions > General > Workflow permissions

## Job Details

### Job 1: lint-and-test

Runs in the `frontend/` directory:

```yaml
steps:
  - checkout
  - setup-node (v20, npm cache)
  - npm ci
  - npx prisma generate
  - npm run lint
  - npx tsc --noEmit
  - npm run test:unit
  - npm run test:api
```

**Environment Variables**:
- `NODE_ENV=test`
- `DATABASE_URL=file:./test.db`
- `NEXTAUTH_SECRET=test-secret-for-ci`

### Job 2: e2e

Runs end-to-end tests with services:

**Services**:
- PostgreSQL 15 (port 5432)
- Redis 7 (port 6379)

```yaml
steps:
  - checkout
  - setup-node
  - npm ci
  - npx prisma generate
  - npx prisma db push --force-reset
  - npx playwright install --with-deps chromium
  - npm run build
  - npm run start (background)
  - npm run test:e2e
```

**Artifacts**:
- `playwright-report/` - HTML test report
- `test-results/` - Screenshots and traces on failure

### Job 3: docker-build-push

Only runs on push to `main` (not on PRs).

**Images built**:
| Image | Context | Dockerfile |
|-------|---------|------------|
| `cannaconvert-frontend` | `./frontend` | `frontend/Dockerfile` |
| `cannaconvert-mpp` | `./microservices/mpp-converter` | `microservices/mpp-converter/Dockerfile` |
| `cannaconvert-api` | `.` | `docker/Dockerfile` |

**Tags**:
- `ghcr.io/<owner>/cannaconvert-<service>:<sha>`
- `ghcr.io/<owner>/cannaconvert-<service>:latest`

## Running CI Locally

### Prerequisites

- Node.js 20+
- Docker (optional, for image builds)
- PostgreSQL and Redis (for E2E tests, or use Docker)

### Using the Script (Linux/macOS)

```bash
# Run full CI pipeline
./scripts/ci/build-and-test.sh

# Skip E2E tests (faster)
./scripts/ci/build-and-test.sh --skip-e2e

# Skip Docker build
./scripts/ci/build-and-test.sh --skip-docker

# Skip both
./scripts/ci/build-and-test.sh --skip-e2e --skip-docker
```

### Using the Script (Windows PowerShell)

```powershell
# Run full CI pipeline
.\scripts\ci\build-and-test.ps1

# Skip E2E tests (faster)
.\scripts\ci\build-and-test.ps1 -SkipE2E

# Skip Docker build
.\scripts\ci\build-and-test.ps1 -SkipDocker

# Skip both
.\scripts\ci\build-and-test.ps1 -SkipE2E -SkipDocker
```

### Manual Steps

```bash
cd frontend

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run linter
npm run lint

# TypeScript check
npx tsc --noEmit

# Run unit tests
npm run test:unit

# Run API tests
npm run test:api

# Install Playwright browsers
npx playwright install --with-deps chromium

# Run E2E tests
npm run test:e2e
```

## Test Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run test` | Run all Vitest tests |
| `npm run test:unit` | Run unit tests only (`tests/unit/`) |
| `npm run test:unit:watch` | Run unit tests in watch mode |
| `npm run test:api` | Run API tests (`e2e/api-tests/`) |
| `npm run test:api:watch` | Run API tests in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:headed` | Run E2E tests with browser visible |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |

## Troubleshooting

### Common Issues

**1. Prisma generate fails**
```
Error: EPERM: operation not permitted
```
Solution: Close any running Next.js dev server or restart VS Code.

**2. E2E tests fail with connection refused**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
Solution: Ensure the app is running before tests start. Check the startup logs.

**3. Docker build fails with authentication error**
```
Error: denied: permission denied
```
Solution: Ensure `GHCR_TOKEN` has `write:packages` scope, or enable workflow permissions.

**4. Playwright browsers not found**
```
Error: Executable doesn't exist
```
Solution: Run `npx playwright install --with-deps chromium`

### Viewing CI Results

1. **GitHub Actions tab**: View workflow runs and logs
2. **Pull Request checks**: See status checks on PRs
3. **Artifacts**: Download test reports from completed runs

### Re-running Failed Jobs

1. Go to the failed workflow run
2. Click "Re-run failed jobs" or "Re-run all jobs"
3. For flaky tests, consider adding retries in Playwright config

## Docker Images

### Pulling Images

```bash
# Login to GHCR
echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USERNAME --password-stdin

# Pull images
docker pull ghcr.io/cannalonga/cannaconvert-frontend:latest
docker pull ghcr.io/cannalonga/cannaconvert-mpp:latest
docker pull ghcr.io/cannalonga/cannaconvert-api:latest
```

### Running Locally

```bash
# Using docker-compose
docker-compose up -d

# Or individual containers
docker run -d -p 3000:3000 ghcr.io/cannalonga/cannaconvert-frontend:latest
docker run -d -p 8080:8080 ghcr.io/cannalonga/cannaconvert-mpp:latest
```

## Future Improvements

- [ ] Add code coverage reporting (Codecov)
- [ ] Add performance benchmarks
- [ ] Add security scanning (Snyk, Trivy)
- [ ] Add deployment to staging/production
- [ ] Add Slack/Discord notifications
- [ ] Add branch protection rules
