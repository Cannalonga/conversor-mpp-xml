#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ">> Build and push API image to GHCR"
docker build -t ghcr.io/cannalonga/conversor-mpp-xml:latest -f ../../Dockerfile .
docker push ghcr.io/cannalonga/conversor-mpp-xml:latest

if [ -d "./converter" ] || [ -f "../../converter/Dockerfile" ]; then
  echo ">> Build and push converter image (if present)"
  docker build -t ghcr.io/cannalonga/mpp-converter:latest -f ../../converter/Dockerfile ../../converter || true
  docker push ghcr.io/cannalonga/mpp-converter:latest || true
fi

# Copy .env.staging to remote via SCP if env vars present (used in GH Actions)
if [ -n "${STAGING_SSH_HOST:-}" ] && [ -n "${STAGING_SSH_USER:-}" ]; then
  echo ">> Copying .env.staging to remote host"
  scp -o StrictHostKeyChecking=no .env.staging ${STAGING_SSH_USER}@${STAGING_SSH_HOST}:~/deploy/staging/.env.staging || true
fi

echo ">> Remote docker-compose pull & up"
if [ -n "${STAGING_SSH_HOST:-}" ] && [ -n "${STAGING_SSH_USER:-}" ]; then
  ssh -o StrictHostKeyChecking=no ${STAGING_SSH_USER}@${STAGING_SSH_HOST} bash <<'SSH_END'
cd ~/deploy/staging || mkdir -p ~/deploy/staging && cd ~/deploy/staging
docker compose pull || true
docker compose up -d
docker compose ps
SSH_END
else
  echo "No STAGING_SSH_HOST/STAGING_SSH_USER set — running locally"
  docker compose -f docker-compose.staging.yml pull || true
  docker compose -f docker-compose.staging.yml up -d
fi

echo ">> Running smoke tests"
./scripts/smoke-test.sh
echo ">> Deploy finished"
