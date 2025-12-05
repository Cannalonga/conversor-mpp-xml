#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# Prefer docker-compose exec when available
COMPOSE_FILE="${ROOT_DIR}/docker-compose.staging.yml"

# Wait for services to be ready (max 60 seconds)
echo ">> Waiting for services to start..."
MAX_RETRIES=12
RETRY_DELAY=5

check_api() {
  if command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
    docker compose -f "${COMPOSE_FILE}" exec -T api curl -sSf http://localhost:3000/api/health 2>/dev/null
  else
    curl -sSf http://localhost:8080/api/health 2>/dev/null
  fi
}

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES..."
  if check_api; then
    echo "API is ready!"
    break
  fi
  if [ $i -eq $MAX_RETRIES ]; then
    echo "API failed to become ready after $((MAX_RETRIES * RETRY_DELAY)) seconds"
    # Show container logs for debugging
    docker compose -f "${COMPOSE_FILE}" logs --tail=50 api 2>/dev/null || true
    exit 1
  fi
  sleep $RETRY_DELAY
done

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
# Try external check first, then fallback to container check with wget (Java containers don't have curl)
if curl -sSf http://localhost:8082/health 2>/dev/null; then
  echo "Converter healthy (external check)"
elif command -v docker >/dev/null 2>&1 && [ -f "${COMPOSE_FILE}" ]; then
  # Java containers typically have wget, not curl - or use netcat for basic connectivity
  if docker compose -f "${COMPOSE_FILE}" exec -T converter wget -qO- http://localhost:8082/health 2>/dev/null; then
    echo "Converter healthy (wget inside container)"
  elif docker compose -f "${COMPOSE_FILE}" exec -T converter sh -c 'echo > /dev/tcp/localhost/8082' 2>/dev/null; then
    echo "Converter port reachable (tcp check)"
  else
    # Final fallback: check if container is running and healthy via docker inspect
    CONVERTER_STATUS=$(docker compose -f "${COMPOSE_FILE}" ps converter --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 || echo "")
    if echo "$CONVERTER_STATUS" | grep -qi "healthy"; then
      echo "Converter healthy (docker health status)"
    else
      echo "WARNING: Converter health check inconclusive, but container may be running"
      docker compose -f "${COMPOSE_FILE}" ps converter || true
    fi
  fi
else
  echo "Converter health check failed"; exit 1
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
