#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# Prefer docker-compose exec when available
COMPOSE_FILE="${ROOT_DIR}/docker-compose.staging.yml"

echo ">> Checking API health (http://localhost:8080/api/health)"
if ! curl -sSf http://localhost:8080/api/health; then
  echo "API healthcheck failed (trying docker compose exec)"
  if command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
    docker compose -f "${COMPOSE_FILE}" exec -T api curl -sSf http://localhost:3000/api/health || { echo "API health failed inside container"; exit 1; }
  else
    exit 1
  fi
fi

echo ">> Checking converter health (http://localhost:8082/health)"
if ! curl -sSf http://localhost:8082/health; then
  if command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
    docker compose -f "${COMPOSE_FILE}" exec -T converter curl -sSf http://localhost:8082/health || { echo "Converter health failed inside container"; exit 1; }
  else
    exit 1
  fi
fi

echo ">> Pinging Redis"
if command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
  docker compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping | grep -q PONG || { echo "Redis PING failed"; exit 1; }
else
  nc -z localhost 6379 || { echo "Redis not reachable"; exit 1; }
fi

echo ">> Checking Postgres"
if command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
  docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres -d cannaconvert || { echo "Postgres inside container failed"; exit 1; }
else
  nc -z localhost 5432 || { echo "Postgres not reachable"; exit 1; }
fi

echo ">> Smoke tests OK"
exit 0
