#!/usr/bin/env node
/**
 * Test Alerts Script
 * 
 * Validates Prometheus alert rules syntax and logic.
 * Also simulates alert conditions for testing.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ALERTS_FILE = path.join(__dirname, '..', 'prometheus', 'alerts.yml');

// Alert severity levels
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

/**
 * Load and parse alerts YAML file
 */
function loadAlerts() {
  try {
    const content = fs.readFileSync(ALERTS_FILE, 'utf8');
    return yaml.load(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Alerts file not found: ${ALERTS_FILE}`);
    }
    if (error.name === 'YAMLException') {
      throw new Error(`YAML syntax error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate alert rule structure
 */
function validateAlertRule(rule, groupName) {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!rule.alert) {
    errors.push('Missing "alert" name');
  }
  
  if (!rule.expr) {
    errors.push('Missing "expr" (PromQL expression)');
  }
  
  // Labels validation
  if (!rule.labels) {
    warnings.push('Missing labels (severity recommended)');
  } else {
    if (!rule.labels.severity) {
      warnings.push('Missing severity label');
    } else if (!SEVERITY_ORDER.includes(rule.labels.severity)) {
      warnings.push(`Unknown severity: ${rule.labels.severity}`);
    }
    
    if (!rule.labels.service) {
      warnings.push('Missing service label (helps with routing)');
    }
  }
  
  // Annotations validation
  if (!rule.annotations) {
    warnings.push('Missing annotations');
  } else {
    if (!rule.annotations.summary) {
      warnings.push('Missing summary annotation');
    }
    if (!rule.annotations.description) {
      warnings.push('Missing description annotation');
    }
  }
  
  // For duration validation
  if (rule.for) {
    const forMatch = rule.for.match(/^(\d+)(s|m|h|d)$/);
    if (!forMatch) {
      errors.push(`Invalid "for" duration: ${rule.for}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Basic PromQL syntax check (not comprehensive)
 */
function checkPromQLSyntax(expr, alertName) {
  const warnings = [];
  
  // Check for common issues
  if (expr.includes('==') && !expr.includes('bool')) {
    // This is fine for alerts
  }
  
  // Check for rate without time range
  if (expr.includes('rate(') && !expr.match(/rate\([^)]+\[\d+[smhd]\]\)/)) {
    warnings.push(`${alertName}: rate() may be missing time range`);
  }
  
  // Check for increase without time range
  if (expr.includes('increase(') && !expr.match(/increase\([^)]+\[\d+[smhd]\]\)/)) {
    warnings.push(`${alertName}: increase() may be missing time range`);
  }
  
  // Check for histogram_quantile usage
  if (expr.includes('histogram_quantile(')) {
    if (!expr.includes('_bucket')) {
      warnings.push(`${alertName}: histogram_quantile should use _bucket metrics`);
    }
  }
  
  return warnings;
}

/**
 * Main validation function
 */
function runValidation() {
  console.log('🔔 CannaConverter Alert Rules Validator\n');
  console.log('='.repeat(60));
  console.log(`📁 Loading: ${ALERTS_FILE}\n`);
  
  let alerts;
  try {
    alerts = loadAlerts();
    console.log('✅ YAML syntax is valid\n');
  } catch (error) {
    console.log(`❌ ${error.message}\n`);
    process.exit(1);
  }
  
  // Validate structure
  if (!alerts.groups || !Array.isArray(alerts.groups)) {
    console.log('❌ Missing "groups" array in alerts file\n');
    process.exit(1);
  }
  
  let totalAlerts = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const alertsBySeverity = {};
  
  // Validate each group and rule
  for (const group of alerts.groups) {
    console.log(`\n📋 Group: ${group.name}`);
    console.log('-'.repeat(40));
    
    if (!group.rules || !Array.isArray(group.rules)) {
      console.log('  ⚠️  No rules in this group');
      continue;
    }
    
    for (const rule of group.rules) {
      totalAlerts++;
      const alertName = rule.alert || '(unnamed)';
      const severity = rule.labels?.severity || 'unknown';
      
      // Track by severity
      alertsBySeverity[severity] = (alertsBySeverity[severity] || 0) + 1;
      
      // Validate rule
      const { errors, warnings } = validateAlertRule(rule, group.name);
      const promqlWarnings = checkPromQLSyntax(rule.expr || '', alertName);
      
      const allWarnings = [...warnings, ...promqlWarnings];
      
      if (errors.length > 0) {
        console.log(`  ❌ ${alertName} (${severity})`);
        errors.forEach(e => console.log(`     Error: ${e}`));
        totalErrors += errors.length;
      } else if (allWarnings.length > 0) {
        console.log(`  ⚠️  ${alertName} (${severity})`);
        allWarnings.forEach(w => console.log(`     Warning: ${w}`));
        totalWarnings += allWarnings.length;
      } else {
        console.log(`  ✅ ${alertName} (${severity})`);
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary');
  console.log('='.repeat(60));
  
  console.log(`\nTotal alerts: ${totalAlerts}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);
  
  console.log('\nAlerts by severity:');
  for (const sev of SEVERITY_ORDER) {
    if (alertsBySeverity[sev]) {
      console.log(`  ${sev}: ${alertsBySeverity[sev]}`);
    }
  }
  if (alertsBySeverity.unknown) {
    console.log(`  unknown: ${alertsBySeverity.unknown}`);
  }
  
  // Coverage check
  console.log('\n📝 Coverage Check:');
  const expectedCategories = [
    { name: 'Service Down', pattern: /down|unavailable/i },
    { name: 'High Latency', pattern: /latency|slow/i },
    { name: 'Queue Issues', pattern: /queue|backlog|failed.*jobs/i },
    { name: 'Payment/Stripe', pattern: /stripe|webhook|refund/i },
    { name: 'Resource Usage', pattern: /memory|cpu|heap/i },
  ];
  
  const allAlertNames = alerts.groups.flatMap(g => g.rules?.map(r => r.alert) || []).join(' ');
  
  for (const cat of expectedCategories) {
    const covered = cat.pattern.test(allAlertNames);
    console.log(`  ${covered ? '✅' : '⚠️ '} ${cat.name}`);
  }
  
  // Final status
  console.log('\n' + '='.repeat(60));
  
  if (totalErrors > 0) {
    console.log('\n❌ Validation FAILED - Please fix the errors above\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation PASSED with warnings\n');
    console.log('Consider addressing the warnings for better alerting.\n');
    process.exit(0);
  } else {
    console.log('\n✅ Validation PASSED\n');
    console.log('All alert rules are properly configured!\n');
    process.exit(0);
  }
}

// Handle missing js-yaml gracefully
try {
  require.resolve('js-yaml');
} catch (e) {
  // Fallback: Just check if file exists and is valid JSON-like
  console.log('⚠️  js-yaml not installed, performing basic check only\n');
  
  try {
    const content = fs.readFileSync(ALERTS_FILE, 'utf8');
    console.log(`✅ Alerts file exists (${content.length} bytes)`);
    
    // Basic YAML checks
    if (!content.includes('groups:')) {
      console.log('❌ Missing "groups:" in alerts file');
      process.exit(1);
    }
    
    if (!content.includes('- alert:')) {
      console.log('❌ No alerts defined (missing "- alert:")');
      process.exit(1);
    }
    
    // Count alerts
    const alertCount = (content.match(/- alert:/g) || []).length;
    console.log(`✅ Found ${alertCount} alert definitions`);
    
    // Check for severity labels
    const hasSeverity = content.includes('severity:');
    console.log(`${hasSeverity ? '✅' : '⚠️ '} Severity labels ${hasSeverity ? 'present' : 'may be missing'}`);
    
    console.log('\n✅ Basic validation passed\n');
    console.log('Install js-yaml for comprehensive validation: npm install js-yaml\n');
    process.exit(0);
    
  } catch (error) {
    console.log(`❌ Cannot read alerts file: ${error.message}`);
    process.exit(1);
  }
}

// Run validation
runValidation();
