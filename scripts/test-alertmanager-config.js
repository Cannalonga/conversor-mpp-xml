/**
 * Alertmanager Configuration Validator
 * Validates the alertmanager.yml configuration file
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const configPath = path.join(__dirname, '..', 'alertmanager', 'alertmanager.yml');

console.log('🔍 Alertmanager Configuration Validator');
console.log('='.repeat(60));

// Required receivers for enterprise setup
const requiredReceivers = [
  'email-primary',
  'critical-all-channels',
  'high-multi-channel',
  'medium-slack',
  'discord-notifications'
];

// Required route severities
const requiredSeverities = ['critical', 'high', 'medium', 'low'];

const results = {
  errors: [],
  warnings: [],
  info: []
};

function validateConfig() {
  // Check if file exists
  if (!fs.existsSync(configPath)) {
    results.errors.push(`Configuration file not found: ${configPath}`);
    return;
  }
  
  results.info.push(`Found configuration file: ${configPath}`);
  
  // Parse YAML
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(content);
    results.info.push('YAML syntax is valid');
  } catch (e) {
    results.errors.push(`YAML parse error: ${e.message}`);
    return;
  }
  
  // Validate global section
  if (!config.global) {
    results.warnings.push('No global section defined');
  } else {
    if (config.global.smtp_smarthost) {
      results.info.push(`SMTP host configured: ${config.global.smtp_smarthost}`);
    } else {
      results.warnings.push('No SMTP host configured - email notifications will not work');
    }
    
    if (config.global.resolve_timeout) {
      results.info.push(`Resolve timeout: ${config.global.resolve_timeout}`);
    }
  }
  
  // Validate templates
  if (!config.templates || config.templates.length === 0) {
    results.warnings.push('No templates configured');
  } else {
    results.info.push(`Templates configured: ${config.templates.join(', ')}`);
    
    // Check if template files exist
    config.templates.forEach(template => {
      const templatePath = path.join(__dirname, '..', 'alertmanager', template.replace('/etc/alertmanager/', ''));
      if (template.includes('*.tmpl') || template.includes('*.html')) {
        // Glob pattern - skip existence check
        results.info.push(`Template pattern: ${template}`);
      }
    });
  }
  
  // Validate receivers
  if (!config.receivers || config.receivers.length === 0) {
    results.errors.push('No receivers defined');
  } else {
    const receiverNames = config.receivers.map(r => r.name);
    results.info.push(`Receivers defined: ${receiverNames.length}`);
    
    requiredReceivers.forEach(required => {
      if (receiverNames.includes(required)) {
        results.info.push(`✓ Required receiver '${required}' found`);
      } else {
        results.warnings.push(`Missing recommended receiver: ${required}`);
      }
    });
    
    // Check receiver configurations
    config.receivers.forEach(receiver => {
      const channels = [];
      if (receiver.email_configs) channels.push('email');
      if (receiver.slack_configs) channels.push('slack');
      if (receiver.pagerduty_configs) channels.push('pagerduty');
      if (receiver.webhook_configs) channels.push('webhook');
      if (receiver.discord_configs) channels.push('discord');
      
      if (channels.length === 0) {
        results.warnings.push(`Receiver '${receiver.name}' has no notification channels configured`);
      } else {
        results.info.push(`Receiver '${receiver.name}': ${channels.join(', ')}`);
      }
    });
  }
  
  // Validate route
  if (!config.route) {
    results.errors.push('No route configuration defined');
  } else {
    if (!config.route.receiver) {
      results.errors.push('No default receiver in route');
    } else {
      results.info.push(`Default receiver: ${config.route.receiver}`);
    }
    
    if (!config.route.group_by || config.route.group_by.length === 0) {
      results.warnings.push('No group_by configuration');
    } else {
      results.info.push(`Group by: ${config.route.group_by.join(', ')}`);
    }
    
    // Check child routes for severity routing
    if (config.route.routes && config.route.routes.length > 0) {
      const severityRoutes = [];
      
      function checkRoutes(routes, level = 0) {
        routes.forEach(route => {
          if (route.match && route.match.severity) {
            severityRoutes.push(route.match.severity);
          }
          if (route.match_re && route.match_re.severity) {
            severityRoutes.push('regex:' + route.match_re.severity);
          }
          if (route.routes) {
            checkRoutes(route.routes, level + 1);
          }
        });
      }
      
      checkRoutes(config.route.routes);
      
      requiredSeverities.forEach(sev => {
        if (severityRoutes.some(s => s === sev || s.includes(sev))) {
          results.info.push(`✓ Severity '${sev}' has routing configured`);
        } else {
          results.warnings.push(`No specific route for severity: ${sev}`);
        }
      });
    }
  }
  
  // Validate inhibit_rules
  if (config.inhibit_rules && config.inhibit_rules.length > 0) {
    results.info.push(`Inhibit rules defined: ${config.inhibit_rules.length}`);
  }
}

validateConfig();

// Print results
console.log('\n📋 Validation Results');
console.log('-'.repeat(60));

if (results.errors.length > 0) {
  console.log('\n❌ ERRORS:');
  results.errors.forEach(e => console.log(`   • ${e}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach(w => console.log(`   • ${w}`));
}

if (results.info.length > 0) {
  console.log('\nℹ️  INFO:');
  results.info.forEach(i => console.log(`   • ${i}`));
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary');
console.log('='.repeat(60));
console.log(`Errors: ${results.errors.length}`);
console.log(`Warnings: ${results.warnings.length}`);
console.log(`Info: ${results.info.length}`);

if (results.errors.length > 0) {
  console.log('\n❌ Configuration has errors that must be fixed');
  process.exit(1);
} else if (results.warnings.length > 0) {
  console.log('\n⚠️  Configuration is valid but has warnings');
  process.exit(0);
} else {
  console.log('\n✅ Configuration is valid');
  process.exit(0);
}
