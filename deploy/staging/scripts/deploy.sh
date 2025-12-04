#!/usr/bin/env bash
set -euo pipefail

# Resolve script root (deploy/staging)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}" || exit 1

echo ">> ROOT_DIR=${ROOT_DIR}"

echo ">> Build and push API image to GHCR"
# Build from repository root (expect Dockerfile at repo root)
docker build -t ghcr.io/cannalonga/conversor-mpp-xml:latest -f "${ROOT_DIR}/../../Dockerfile" "${ROOT_DIR}/../.." || \
  docker build -t ghcr.io/cannalonga/conversor-mpp-xml:latest -f "${ROOT_DIR}/Dockerfile" "${ROOT_DIR}" || true
docker push ghcr.io/cannalonga/conversor-mpp-xml:latest || true

# Build converter image if exists
if [ -d "${ROOT_DIR}/../../converter" ] || [ -f "${ROOT_DIR}/../../converter/Dockerfile" ] || [ -d "${ROOT_DIR}/converter" ]; then
  echo ">> Build and push converter image (if present)"
  if [ -f "${ROOT_DIR}/../../converter/Dockerfile" ]; then
    docker build -t ghcr.io/cannalonga/mpp-converter:latest -f "${ROOT_DIR}/../../converter/Dockerfile" "${ROOT_DIR}/../../converter" || true
  else
    docker build -t ghcr.io/cannalonga/mpp-converter:latest -f "${ROOT_DIR}/converter/Dockerfile" "${ROOT_DIR}/converter" || true
  fi
  docker push ghcr.io/cannalonga/mpp-converter:latest || true
fi

# If STAGING_SSH_* is provided, copy files to remote
if [ -n "${STAGING_SSH_HOST:-}" ] && [ -n "${STAGING_SSH_USER:-}" ]; then
  echo ">> Copying files to remote host ${STAGING_SSH_USER}@${STAGING_SSH_HOST}"
  scp -o StrictHostKeyChecking=no "${ROOT_DIR}/docker-compose.staging.yml" "${STAGING_SSH_USER}@${STAGING_SSH_HOST}:~/deploy/staging/docker-compose.staging.yml" || true
  scp -o StrictHostKeyChecking=no "${ROOT_DIR}/.env.staging" "${STAGING_SSH_USER}@${STAGING_SSH_HOST}:~/deploy/staging/.env.staging" || true
  scp -o StrictHostKeyChecking=no -r "${ROOT_DIR}/scripts" "${STAGING_SSH_USER}@${STAGING_SSH_HOST}:~/deploy/staging/scripts" || true
fi

# If SSH configured, run remote compose; otherwise run local compose
if [ -n "${STAGING_SSH_HOST:-}" ] && [ -n "${STAGING_SSH_USER:-}" ]; then
  ssh -o StrictHostKeyChecking=no "${STAGING_SSH_USER}@${STAGING_SSH_HOST}" bash <<'SSH_END'
set -eux
cd ~/deploy/staging || ( mkdir -p ~/deploy/staging && cd ~/deploy/staging )
# ensure scripts are executable
chmod +x ./scripts/*.sh || true
docker compose -f docker-compose.staging.yml pull || true
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml ps
SSH_END
else
  echo ">> Running locally"
  docker compose -f docker-compose.staging.yml pull || true
  docker compose -f docker-compose.staging.yml up -d
fi

echo ">> Running smoke tests"
"${ROOT_DIR}/scripts/smoke-test.sh"
echo ">> Deploy finished"
