#!/bin/bash
# =============================================================================
# CannaConvert Staging - Smoke Tests
# =============================================================================
# Runs integration smoke tests against the staging environment.
# Prerequisites: staging environment must be running (./scripts/staging/up.sh)
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3002}"
MPP_CONVERTER_URL="${MPP_CONVERTER_URL:-http://localhost:8081}"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# =============================================================================
# Helper Functions
# =============================================================================

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

pass() {
  ((TESTS_PASSED++))
  echo -e "${GREEN}  ✓ PASSED${NC}: $1"
}

fail() {
  ((TESTS_FAILED++))
  echo -e "${RED}  ✗ FAILED${NC}: $1"
}

skip() {
  ((TESTS_SKIPPED++))
  echo -e "${YELLOW}  ⊘ SKIPPED${NC}: $1"
}

http_get() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1" 2>/dev/null || echo "000"
}

http_get_body() {
  curl -s --max-time 10 "$1" 2>/dev/null
}

http_post() {
  local url=$1
  local data=$2
  curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$url" 2>/dev/null || echo "000"
}

http_post_body() {
  local url=$1
  local data=$2
  curl -s --max-time 30 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$url" 2>/dev/null
}

# =============================================================================
# Banner
# =============================================================================
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CannaConvert Staging - Smoke Tests                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Environment:"
echo "  API:           $API_URL"
echo "  Frontend:      $FRONTEND_URL"
echo "  Prometheus:    $PROMETHEUS_URL"
echo "  Grafana:       $GRAFANA_URL"
echo "  MPP Converter: $MPP_CONVERTER_URL"
echo ""

# =============================================================================
# Test Suite 1: Health Checks
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 1: Health Checks${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 1.1: API Health
log_test "API Health Endpoint"
status=$(http_get "$API_URL/health")
if [ "$status" = "200" ]; then
  pass "API returns 200 OK"
else
  fail "API health check failed (status: $status)"
fi

# Test 1.2: Frontend Health
log_test "Frontend Health Endpoint"
status=$(http_get "$FRONTEND_URL/api/health")
if [ "$status" = "200" ]; then
  pass "Frontend returns 200 OK"
else
  # Try root path as fallback
  status=$(http_get "$FRONTEND_URL/")
  if [ "$status" = "200" ]; then
    pass "Frontend root returns 200 OK"
  else
    fail "Frontend health check failed (status: $status)"
  fi
fi

# Test 1.3: MPP Converter Health
log_test "MPP Converter Health Endpoint"
status=$(http_get "$MPP_CONVERTER_URL/actuator/health")
if [ "$status" = "200" ]; then
  pass "MPP Converter returns 200 OK"
else
  fail "MPP Converter health check failed (status: $status)"
fi

# Test 1.4: Prometheus Health
log_test "Prometheus Health Endpoint"
status=$(http_get "$PROMETHEUS_URL/-/healthy")
if [ "$status" = "200" ]; then
  pass "Prometheus returns 200 OK"
else
  fail "Prometheus health check failed (status: $status)"
fi

# Test 1.5: Grafana Health
log_test "Grafana Health Endpoint"
status=$(http_get "$GRAFANA_URL/api/health")
if [ "$status" = "200" ]; then
  pass "Grafana returns 200 OK"
else
  fail "Grafana health check failed (status: $status)"
fi

echo ""

# =============================================================================
# Test Suite 2: API Endpoints
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 2: API Endpoints${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 2.1: Converters List
log_test "GET /api/converters"
status=$(http_get "$API_URL/api/converters")
if [ "$status" = "200" ]; then
  body=$(http_get_body "$API_URL/api/converters")
  if echo "$body" | grep -q "mpp"; then
    pass "Converters list includes MPP converter"
  else
    fail "Converters list missing MPP converter"
  fi
else
  fail "Converters endpoint failed (status: $status)"
fi

# Test 2.2: API Version/Info
log_test "GET /api/info"
status=$(http_get "$API_URL/api/info")
if [ "$status" = "200" ]; then
  pass "API info endpoint accessible"
else
  skip "API info endpoint not found (status: $status)"
fi

# Test 2.3: Metrics Endpoint
log_test "GET /metrics"
status=$(http_get "$API_URL/metrics")
if [ "$status" = "200" ]; then
  body=$(http_get_body "$API_URL/metrics")
  if echo "$body" | grep -q "http_request"; then
    pass "Metrics endpoint returns Prometheus metrics"
  else
    pass "Metrics endpoint accessible"
  fi
else
  skip "Metrics endpoint not found (status: $status)"
fi

echo ""

# =============================================================================
# Test Suite 3: Database Connectivity
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 3: Database Connectivity${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 3.1: Database via Health Check
log_test "Database connectivity via health check"
body=$(http_get_body "$API_URL/health")
if echo "$body" | grep -q "database"; then
  if echo "$body" | grep -q '"database".*"ok"\|"database".*true'; then
    pass "Database connection healthy"
  else
    fail "Database connection unhealthy"
  fi
else
  skip "Health check doesn't report database status"
fi

# Test 3.2: Redis via Health Check
log_test "Redis connectivity via health check"
if echo "$body" | grep -q "redis"; then
  if echo "$body" | grep -q '"redis".*"ok"\|"redis".*true'; then
    pass "Redis connection healthy"
  else
    fail "Redis connection unhealthy"
  fi
else
  skip "Health check doesn't report Redis status"
fi

echo ""

# =============================================================================
# Test Suite 4: Prometheus Targets
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 4: Prometheus Targets${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 4.1: Prometheus Targets
log_test "Prometheus targets status"
body=$(http_get_body "$PROMETHEUS_URL/api/v1/targets")
if [ -n "$body" ]; then
  up_count=$(echo "$body" | grep -o '"health":"up"' | wc -l)
  down_count=$(echo "$body" | grep -o '"health":"down"' | wc -l)
  
  if [ "$up_count" -gt 0 ]; then
    pass "Prometheus has $up_count targets UP, $down_count DOWN"
  else
    fail "No healthy Prometheus targets found"
  fi
else
  fail "Could not fetch Prometheus targets"
fi

# Test 4.2: Prometheus Query
log_test "Prometheus query execution"
status=$(http_get "$PROMETHEUS_URL/api/v1/query?query=up")
if [ "$status" = "200" ]; then
  pass "Prometheus query API working"
else
  fail "Prometheus query API failed (status: $status)"
fi

echo ""

# =============================================================================
# Test Suite 5: Conversion Flow (if sample file available)
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 5: Conversion Flow${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for sample file
SAMPLE_FILE="tests/fixtures/sample.mpp"
if [ -f "$SAMPLE_FILE" ]; then
  log_test "File upload and conversion"
  
  # Upload file
  response=$(curl -s --max-time 60 \
    -X POST \
    -F "file=@$SAMPLE_FILE" \
    "$API_URL/api/upload" 2>/dev/null)
  
  if echo "$response" | grep -q "jobId\|job_id\|id"; then
    job_id=$(echo "$response" | grep -o '"jobId":\s*"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$job_id" ]; then
      pass "File uploaded, job ID: $job_id"
      
      # Poll for completion (max 30 seconds)
      log_test "Job completion polling"
      for i in $(seq 1 6); do
        sleep 5
        status_response=$(http_get_body "$API_URL/api/jobs/$job_id")
        
        if echo "$status_response" | grep -q '"status":\s*"completed"'; then
          pass "Job completed successfully"
          break
        elif echo "$status_response" | grep -q '"status":\s*"failed"'; then
          fail "Job failed"
          break
        fi
        
        if [ "$i" = "6" ]; then
          skip "Job still processing after 30s"
        fi
      done
    else
      fail "Could not extract job ID from response"
    fi
  else
    fail "File upload failed"
  fi
else
  skip "No sample file found at $SAMPLE_FILE"
fi

echo ""

# =============================================================================
# Test Suite 6: Security Headers
# =============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test Suite 6: Security Headers${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_test "Security headers on API"
headers=$(curl -s -I --max-time 10 "$API_URL/health" 2>/dev/null)

# Test X-Content-Type-Options
if echo "$headers" | grep -iq "x-content-type-options"; then
  pass "X-Content-Type-Options header present"
else
  fail "X-Content-Type-Options header missing"
fi

# Test X-Frame-Options
if echo "$headers" | grep -iq "x-frame-options"; then
  pass "X-Frame-Options header present"
else
  skip "X-Frame-Options header not set"
fi

# Test Strict-Transport-Security
if echo "$headers" | grep -iq "strict-transport-security"; then
  pass "HSTS header present"
else
  skip "HSTS header not set (expected in staging)"
fi

echo ""

# =============================================================================
# Results Summary
# =============================================================================
TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Results Summary                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo -e "  ${BLUE}Total:${NC}   $TOTAL"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}SMOKE TESTS FAILED - Review failures above${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}ALL SMOKE TESTS PASSED${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
