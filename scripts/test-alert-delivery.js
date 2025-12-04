/**
 * Test Alert Delivery Script
 * Simulates alerts from Alertmanager to test webhook endpoint
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Sample alert payloads for each severity
const testAlerts = {
  critical: {
    status: 'firing',
    groupLabels: {
      alertname: 'APIDown',
      severity: 'critical',
      service: 'api'
    },
    commonLabels: {
      alertname: 'APIDown',
      severity: 'critical',
      service: 'api',
      instance: 'api:3001',
      job: 'api-server'
    },
    commonAnnotations: {
      summary: 'API server is down',
      description: 'The main API server has been unreachable for more than 1 minute.',
      dashboard_url: 'http://localhost:3002/d/system-overview?var-instance=api:3001'
    },
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'APIDown',
          severity: 'critical',
          service: 'api',
          instance: 'api:3001'
        },
        annotations: {
          summary: 'API server is down',
          description: 'The main API server has been unreachable for more than 1 minute.'
        },
        startsAt: new Date().toISOString(),
        fingerprint: 'api_down_123'
      }
    ],
    groupKey: 'api:APIDown',
    externalURL: 'http://localhost:9093'
  },
  
  high: {
    status: 'firing',
    groupLabels: {
      alertname: 'HighMemoryUsage',
      severity: 'high',
      service: 'worker'
    },
    commonLabels: {
      alertname: 'HighMemoryUsage',
      severity: 'high',
      service: 'worker',
      instance: 'worker:3002'
    },
    commonAnnotations: {
      summary: 'Memory usage above 85%',
      description: 'Worker service memory usage is at 87% for the last 5 minutes.',
      dashboard_url: 'http://localhost:3002/d/system-overview'
    },
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'HighMemoryUsage',
          severity: 'high'
        },
        annotations: {
          summary: 'Memory usage above 85%'
        },
        startsAt: new Date().toISOString(),
        fingerprint: 'high_mem_456'
      }
    ],
    groupKey: 'worker:HighMemoryUsage'
  },
  
  medium: {
    status: 'firing',
    groupLabels: {
      alertname: 'SlowResponseTime',
      severity: 'medium',
      service: 'mpp-converter'
    },
    commonLabels: {
      alertname: 'SlowResponseTime',
      severity: 'medium',
      service: 'mpp-converter',
      instance: 'mpp-converter:8080'
    },
    commonAnnotations: {
      summary: 'Response time exceeds threshold',
      description: 'MPP Converter average response time is 2.5s (threshold: 2s)',
      dashboard_url: 'http://localhost:3002/d/mpp-converter'
    },
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'SlowResponseTime',
          severity: 'medium'
        },
        annotations: {
          summary: 'Response time exceeds threshold'
        },
        startsAt: new Date().toISOString(),
        fingerprint: 'slow_resp_789'
      }
    ],
    groupKey: 'mpp-converter:SlowResponseTime'
  },
  
  low: {
    status: 'firing',
    groupLabels: {
      alertname: 'DiskSpaceWarning',
      severity: 'low',
      service: 'system'
    },
    commonLabels: {
      alertname: 'DiskSpaceWarning',
      severity: 'low',
      service: 'system',
      instance: 'localhost:9100'
    },
    commonAnnotations: {
      summary: 'Disk space usage above 70%',
      description: 'Disk usage at 72%. Consider cleanup.',
      dashboard_url: 'http://localhost:3002/d/system-overview'
    },
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'DiskSpaceWarning',
          severity: 'low'
        },
        annotations: {
          summary: 'Disk space usage above 70%'
        },
        startsAt: new Date().toISOString(),
        fingerprint: 'disk_warn_012'
      }
    ],
    groupKey: 'system:DiskSpaceWarning'
  },
  
  resolved: {
    status: 'resolved',
    groupLabels: {
      alertname: 'APIDown',
      severity: 'critical',
      service: 'api'
    },
    commonLabels: {
      alertname: 'APIDown',
      severity: 'critical',
      service: 'api',
      instance: 'api:3001'
    },
    commonAnnotations: {
      summary: 'API server is down',
      description: 'The issue has been resolved.'
    },
    alerts: [
      {
        status: 'resolved',
        labels: {
          alertname: 'APIDown',
          severity: 'critical'
        },
        annotations: {
          summary: 'API server is back up'
        },
        startsAt: new Date(Date.now() - 600000).toISOString(),
        endsAt: new Date().toISOString(),
        fingerprint: 'api_down_123'
      }
    ],
    groupKey: 'api:APIDown'
  }
};

async function sendAlert(alertType, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const url = new URL(`${API_URL}/api/webhooks/alerts`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testSMSEndpoint(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const url = new URL(`${API_URL}/api/webhooks/alerts/sms`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testTelegramEndpoint(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const url = new URL(`${API_URL}/api/webhooks/alerts/telegram`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Alert Delivery Test Suite');
  console.log('=' .repeat(60));
  console.log(`Target: ${API_URL}`);
  console.log('');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Critical Alert
  console.log('📧 Test 1: Critical Alert (should route to all channels)');
  try {
    const response = await sendAlert('critical', testAlerts.critical);
    const passed = response.status === 200 && response.data.success;
    results.tests.push({ name: 'Critical Alert', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - Channels: ${response.data.channels?.join(', ')}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'Critical Alert', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 2: High Severity Alert
  console.log('\n📧 Test 2: High Severity Alert (email + slack + telegram)');
  try {
    const response = await sendAlert('high', testAlerts.high);
    const passed = response.status === 200 && response.data.success;
    results.tests.push({ name: 'High Alert', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - Channels: ${response.data.channels?.join(', ')}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'High Alert', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 3: Medium Severity Alert
  console.log('\n📧 Test 3: Medium Severity Alert (email + slack)');
  try {
    const response = await sendAlert('medium', testAlerts.medium);
    const passed = response.status === 200 && response.data.success;
    results.tests.push({ name: 'Medium Alert', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - Channels: ${response.data.channels?.join(', ')}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'Medium Alert', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 4: Low Severity Alert
  console.log('\n📧 Test 4: Low Severity Alert (email + discord)');
  try {
    const response = await sendAlert('low', testAlerts.low);
    const passed = response.status === 200 && response.data.success;
    results.tests.push({ name: 'Low Alert', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - Channels: ${response.data.channels?.join(', ')}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'Low Alert', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 5: Resolved Alert
  console.log('\n📧 Test 5: Resolved Alert');
  try {
    const response = await sendAlert('resolved', testAlerts.resolved);
    const passed = response.status === 200 && response.data.success;
    results.tests.push({ name: 'Resolved Alert', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - Alert ID: ${response.data.alertId}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'Resolved Alert', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 6: SMS Endpoint
  console.log('\n📱 Test 6: SMS Endpoint (Twilio simulation)');
  try {
    const response = await testSMSEndpoint(testAlerts.critical);
    const passed = response.status === 200;
    results.tests.push({ name: 'SMS Endpoint', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED - ${response.data.message}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'SMS Endpoint', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Test 7: Telegram Endpoint
  console.log('\n📲 Test 7: Telegram Endpoint');
  try {
    const response = await testTelegramEndpoint(testAlerts.high);
    const passed = response.status === 200;
    results.tests.push({ name: 'Telegram Endpoint', passed, response });
    if (passed) {
      results.passed++;
      console.log(`   ✅ PASSED`);
    } else {
      results.failed++;
      console.log(`   ❌ FAILED - ${JSON.stringify(response)}`);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: 'Telegram Endpoint', passed: false, error: e.message });
    console.log(`   ❌ ERROR - ${e.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the API server is running on', API_URL);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
