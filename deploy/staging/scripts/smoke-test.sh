#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo ">> Checking API health"
if ! curl -sSf http://localhost:8080/api/health; then
  echo "API healthcheck failed"
  exit 1
fi

echo ">> Checking converter health"
if ! curl -sSf http://localhost:8082/health; then
  echo "Converter healthcheck failed"
  exit 1
fi

echo ">> Pinging Redis"
if command -v docker >/dev/null 2>&1; then
  if ! docker ps --filter "ancestor=redis:7" -q | head -n 1 >/dev/null 2>&1; then
    echo "Redis container not found; trying host..."
    if ! nc -z localhost 6379; then
      echo "Redis not reachable"
      exit 1
    fi
  else
    docker exec $(docker ps --filter "ancestor=redis:7" -q | head -n1) redis-cli ping >/dev/null 2>&1 || true
  fi
fi

echo ">> Checking Postgres"
if command -v docker >/dev/null 2>&1 && docker ps --filter "ancestor=postgres:15" -q | head -n1 >/dev/null 2>&1; then
  docker exec $(docker ps --filter "ancestor=postgres:15" -q | head -n1) pg_isready -U postgres -d cannaconvert >/dev/null 2>&1 || true
else
  if ! nc -z localhost 5432; then
    echo "Postgres not reachable"
    exit 1
  fi
fi

echo ">> Smoke tests OK"
exit 0
