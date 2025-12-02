// ============================================================================
// K6 SMOKE TEST - v0.1.1-security
// Load testing + smoke test for staging/production
// 
// Install: brew install k6  (macOS) or download from https://k6.io
// Run: k6 run k6-smoke-test.js --vus 20 --duration 30s
// ============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_HEALTH = `${BASE_URL}/api/health`;
const API_UPLOAD = `${BASE_URL}/api/upload`;

// Test scenarios
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '15s', target: 20 },  // Ramp up to 20 users
    { duration: '20s', target: 20 },  // Hold 20 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // 95th percentile < 500ms
    'http_req_failed': ['rate<0.1'],     // Error rate < 10%
    'http_reqs': ['rate>10'],            // At least 10 req/sec
  },
};

// ============================================================================
// TEST 1: HEALTH CHECK
// ============================================================================

export function testHealth() {
  group('Health Check', function() {
    const res = http.get(API_HEALTH);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response contains ok': (r) => r.body.includes('ok'),
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    sleep(0.5);
  });
}

// ============================================================================
// TEST 2: RATE LIMITING
// ============================================================================

export function testRateLimiting() {
  group('Rate Limiting', function() {
    let successCount = 0;
    let rateLimitCount = 0;
    
    // Send 15 requests in quick succession
    for (let i = 0; i < 15; i++) {
      const res = http.get(API_HEALTH);
      
      if (res.status === 200) {
        successCount++;
      } else if (res.status === 429) {
        rateLimitCount++;
      }
    }
    
    check(null, {
      'received some 429 responses': () => rateLimitCount > 0,
      'rate limiting active': () => rateLimitCount > 0 && successCount > 0,
    });
    
    sleep(0.5);
  });
}

// ============================================================================
// TEST 3: UPLOAD ENDPOINT
// ============================================================================

export function testUpload() {
  group('Upload Endpoint', function() {
    // Test with binary data (simulating file upload)
    const payload = new ArrayBuffer(1024); // 1KB test file
    
    const res = http.post(API_UPLOAD, payload, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    
    check(res, {
      'upload endpoint responds': (r) => r.status === 200 || r.status === 400,
      'no 500 errors': (r) => r.status !== 500,
    });
    
    sleep(0.5);
  });
}

// ============================================================================
// TEST 4: CONCURRENT REQUESTS (Stress Test)
// ============================================================================

export function testConcurrent() {
  group('Concurrent Requests', function() {
    const responses = [];
    
    // Send 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      responses.push(
        http.get(API_HEALTH, {
          tags: { name: 'ConcurrentHealth' },
        })
      );
    }
    
    // Check results
    let successCount = responses.filter(r => r.status === 200).length;
    let failureCount = responses.filter(r => r.status >= 500).length;
    
    check(null, {
      'most requests succeeded': () => successCount >= 7,
      'no server errors': () => failureCount === 0,
    });
    
    sleep(0.5);
  });
}

// ============================================================================
// TEST 5: PERFORMANCE UNDER LOAD
// ============================================================================

export function testPerformance() {
  group('Performance', function() {
    const res = http.get(API_HEALTH);
    
    check(res, {
      'response time acceptable': (r) => r.timings.duration < 500,
      'response time good': (r) => r.timings.duration < 200,
      'time to first byte < 100ms': (r) => r.timings.waiting < 100,
    });
    
    sleep(1);
  });
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

export default function() {
  // Distribute tests across VUs (virtual users)
  const testNum = __VU % 5;
  
  switch (testNum) {
    case 0:
      testHealth();
      break;
    case 1:
      testRateLimiting();
      break;
    case 2:
      testUpload();
      break;
    case 3:
      testConcurrent();
      break;
    case 4:
      testPerformance();
      break;
  }
}

// ============================================================================
// SUMMARY (printed after test)
// ============================================================================

export function handleSummary(data) {
  return {
    'stdout': formatSummary(data),
  };
}

function formatSummary(data) {
  const metrics = data.metrics;
  
  return `
╔════════════════════════════════════════════════════════════════╗
║                   K6 SMOKE TEST RESULTS                        ║
╚════════════════════════════════════════════════════════════════╝

📊 METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Requests:     ${metrics.http_reqs?.value || 0}
Successful (2xx):   ${metrics.http_req_success?.value || 0}
Failed (5xx):       ${metrics.http_req_failed?.value || 0}
Rate Limited (429): ${metrics.http_responses?.value?.['429'] || 0}

Response Times:
  Average:          ${(metrics.http_req_duration?.value || 0).toFixed(2)} ms
  P95:              ${metrics.http_req_duration?.value?.['p95'] || 0} ms
  Max:              ${metrics.http_req_duration?.value?.['max'] || 0} ms

Requests/sec:       ${(metrics.http_reqs?.value / 30).toFixed(2)}

VU Peak:            ${data.options.stages[1].target}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PASS CRITERIA:
  ${metrics.http_req_duration?.thresholds['p(95)<500'] ? '✓' : '✗'} P95 Response time < 500ms
  ${metrics.http_req_failed?.thresholds['rate<0.1'] ? '✓' : '✗'} Error rate < 10%
  ${metrics.http_reqs?.thresholds['rate>10'] ? '✓' : '✗'} Throughput > 10 req/sec

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${metrics.http_req_failed?.value > 100 ? '⚠️ WARNING: High error rate detected!' : '✅ Test completed successfully'}
  `;
}
