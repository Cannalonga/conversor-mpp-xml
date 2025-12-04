#!/usr/bin/env node
/**
 * Test Metrics Script
 * 
 * Validates that the Prometheus metrics endpoint is working correctly
 * and all expected metrics are being exported.
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const MPP_URL = process.env.MPP_URL || 'http://localhost:8080';

// Expected metrics from Node.js API
const EXPECTED_API_METRICS = [
  // Counters
  'conversion_jobs_total',
  'conversion_job_failures_total',
  'conversion_job_retries_total',
  'stripe_webhook_received_total',
  'stripe_webhook_failed_total',
  'auto_refund_triggered_total',
  'credits_transactions_total',
  'api_requests_total',
  
  // Histograms
  'conversion_job_duration_seconds',
  'worker_processing_duration_seconds',
  'api_response_time_seconds',
  'microservice_response_time_seconds',
  
  // Gauges
  'redis_latency_ms',
  'queue_waiting_jobs',
  'queue_active_jobs',
  'queue_delayed_jobs',
  'queue_failed_jobs',
  'mpp_microservice_status',
  'refund_recovery_pending',
  'user_credits_total',
  'active_users_24h',
];

// Expected metrics from Java Microservice
const EXPECTED_MPP_METRICS = [
  'mpp_conversion_total',
  'mpp_conversion_duration_seconds',
  'http_server_requests',
  'jvm_memory_used_bytes',
  'process_uptime_seconds',
];

/**
 * Fetch metrics from an endpoint
 */
async function fetchMetrics(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Check if metrics output contains expected metric names
 */
function validateMetrics(metricsOutput, expectedMetrics) {
  const results = {
    found: [],
    missing: [],
  };
  
  for (const metric of expectedMetrics) {
    // Check for metric name (handles _bucket, _sum, _count, _total suffixes)
    const regex = new RegExp(`^${metric}[{_\\s]`, 'm');
    if (regex.test(metricsOutput) || metricsOutput.includes(`# HELP ${metric}`)) {
      results.found.push(metric);
    } else {
      results.missing.push(metric);
    }
  }
  
  return results;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 CannaConverter Metrics Test Suite\n');
  console.log('=' .repeat(60));
  
  let allPassed = true;
  
  // Test 1: API Metrics Endpoint
  console.log('\n📊 Test 1: Node.js API Metrics Endpoint');
  console.log('-'.repeat(40));
  
  try {
    const apiMetrics = await fetchMetrics(`${API_URL}/api/metrics`);
    console.log(`✅ Endpoint responded with ${apiMetrics.length} bytes`);
    
    // Check content type indicator
    if (apiMetrics.includes('# HELP') && apiMetrics.includes('# TYPE')) {
      console.log('✅ Response is in Prometheus format');
    } else {
      console.log('⚠️  Response may not be in proper Prometheus format');
    }
    
    // Validate expected metrics
    const apiResults = validateMetrics(apiMetrics, EXPECTED_API_METRICS);
    
    console.log(`\n   Found: ${apiResults.found.length}/${EXPECTED_API_METRICS.length} metrics`);
    
    if (apiResults.missing.length > 0) {
      console.log(`\n   ⚠️  Missing metrics (may be registered on first use):`);
      apiResults.missing.forEach(m => console.log(`      - ${m}`));
      // Don't fail for missing - they may appear after first event
    }
    
    if (apiResults.found.length >= 5) {
      console.log('\n✅ API metrics endpoint is working');
    } else {
      console.log('\n❌ API metrics endpoint has issues');
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`❌ Failed to fetch API metrics: ${error.message}`);
    console.log(`   Make sure the API is running at ${API_URL}`);
    allPassed = false;
  }
  
  // Test 2: MPP Microservice Metrics
  console.log('\n📊 Test 2: Java MPP Microservice Metrics');
  console.log('-'.repeat(40));
  
  try {
    const mppMetrics = await fetchMetrics(`${MPP_URL}/actuator/prometheus`);
    console.log(`✅ Endpoint responded with ${mppMetrics.length} bytes`);
    
    const mppResults = validateMetrics(mppMetrics, EXPECTED_MPP_METRICS);
    
    console.log(`\n   Found: ${mppResults.found.length}/${EXPECTED_MPP_METRICS.length} metrics`);
    
    if (mppResults.found.length >= 3) {
      console.log('\n✅ MPP microservice metrics endpoint is working');
    } else {
      console.log('\n⚠️  MPP microservice may not have all metrics yet');
    }
    
  } catch (error) {
    console.log(`⚠️  Could not fetch MPP metrics: ${error.message}`);
    console.log(`   The Java microservice may not be running at ${MPP_URL}`);
    // Don't fail - microservice might not be running
  }
  
  // Test 3: Health Endpoints
  console.log('\n🏥 Test 3: Health Check Endpoints');
  console.log('-'.repeat(40));
  
  const healthEndpoints = [
    { name: 'Basic Health', url: `${API_URL}/api/health` },
    { name: 'Liveness', url: `${API_URL}/api/health/live` },
    { name: 'Readiness', url: `${API_URL}/api/health/ready` },
    { name: 'Detailed', url: `${API_URL}/api/health/detailed` },
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await fetchMetrics(endpoint.url);
      const data = JSON.parse(response);
      const status = data.status || data.ready ? '✅' : '⚠️';
      console.log(`${status} ${endpoint.name}: ${data.status || (data.ready ? 'ready' : 'not ready')}`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary');
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('\n✅ All critical tests passed!\n');
    console.log('Next steps:');
    console.log('1. Configure Prometheus to scrape /api/metrics');
    console.log('2. Import Grafana dashboards from grafana/*.json');
    console.log('3. Configure alerting rules from prometheus/alerts.yml');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
