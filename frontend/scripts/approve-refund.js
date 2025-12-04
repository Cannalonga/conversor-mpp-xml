#!/usr/bin/env node

/**
 * CLI Script: Approve/Reject Refund Requests
 * 
 * Usage:
 *   node scripts/approve-refund.js list [--pending] [--status=PENDING|APPROVED|REJECTED]
 *   node scripts/approve-refund.js approve <refund-id>
 *   node scripts/approve-refund.js reject <refund-id> --reason="Reason for rejection"
 * 
 * Environment Variables:
 *   ADMIN_PASSWORD - Required admin password
 *   API_BASE_URL   - Base URL (default: http://localhost:3000)
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(colors.red, `✗ Error: ${message}`);
}

function logSuccess(message) {
  log(colors.green, `✓ ${message}`);
}

function logInfo(message) {
  log(colors.cyan, `ℹ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠ ${message}`);
}

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': ADMIN_PASSWORD,
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  
  return data;
}

async function listRefunds(args) {
  const params = new URLSearchParams();
  
  if (args.includes('--pending')) {
    params.set('pending', 'true');
  }
  
  const statusArg = args.find(a => a.startsWith('--status='));
  if (statusArg) {
    params.set('status', statusArg.split('=')[1]);
  }
  
  const limitArg = args.find(a => a.startsWith('--limit='));
  if (limitArg) {
    params.set('limit', limitArg.split('=')[1]);
  }
  
  try {
    const data = await fetchAPI(`/api/admin/refund-requests?${params}`);
    
    console.log('');
    log(colors.bold, `📋 Refund Requests (Total: ${data.total})`);
    console.log('═'.repeat(80));
    
    if (data.requests.length === 0) {
      logInfo('No refund requests found matching criteria.');
      return;
    }
    
    for (const req of data.requests) {
      const statusColor = {
        PENDING: colors.yellow,
        APPROVED: colors.green,
        REJECTED: colors.red,
      }[req.status] || colors.reset;
      
      console.log('');
      log(colors.bold, `ID: ${req.id}`);
      console.log(`  User:       ${req.user?.email || req.userId}`);
      console.log(`  Job ID:     ${req.jobId}`);
      console.log(`  Amount:     ${req.amount} credits`);
      console.log(`  Status:     ${statusColor}${req.status}${colors.reset}`);
      console.log(`  Reason:     ${req.reason || 'N/A'}`);
      console.log(`  Created:    ${new Date(req.createdAt).toLocaleString()}`);
      if (req.autoRefund) {
        log(colors.cyan, '  Auto-Refund: Yes (PRE_PROCESS failure)');
      }
      if (req.adminNotes) {
        console.log(`  Admin Notes: ${req.adminNotes}`);
      }
      console.log('─'.repeat(80));
    }
    
    console.log('');
    logInfo(`Page ${data.page} of ${Math.ceil(data.total / data.limit)}`);
    
  } catch (error) {
    logError(`Failed to list refunds: ${error.message}`);
    process.exit(1);
  }
}

async function approveRefund(refundId) {
  if (!refundId) {
    logError('Refund ID is required');
    showUsage();
    process.exit(1);
  }
  
  try {
    logInfo(`Approving refund request: ${refundId}`);
    
    const data = await fetchAPI(`/api/admin/refund-requests/${refundId}/approve`, {
      method: 'POST',
    });
    
    logSuccess(`Refund approved successfully!`);
    console.log('');
    console.log(`  Request ID:  ${data.request.id}`);
    console.log(`  User:        ${data.request.userId}`);
    console.log(`  Credits:     ${data.refund.creditsRefunded} credits refunded`);
    console.log(`  New Balance: ${data.refund.newBalance} credits`);
    console.log('');
    
  } catch (error) {
    logError(`Failed to approve refund: ${error.message}`);
    process.exit(1);
  }
}

async function rejectRefund(refundId, args) {
  if (!refundId) {
    logError('Refund ID is required');
    showUsage();
    process.exit(1);
  }
  
  const reasonArg = args.find(a => a.startsWith('--reason='));
  if (!reasonArg) {
    logError('Rejection reason is required (--reason="...")');
    showUsage();
    process.exit(1);
  }
  
  const notes = reasonArg.split('=').slice(1).join('=');
  
  try {
    logInfo(`Rejecting refund request: ${refundId}`);
    
    const data = await fetchAPI(`/api/admin/refund-requests/${refundId}/approve`, {
      method: 'DELETE',
      body: JSON.stringify({ notes }),
    });
    
    logSuccess(`Refund rejected.`);
    console.log('');
    console.log(`  Request ID: ${data.request.id}`);
    console.log(`  User:       ${data.request.userId}`);
    console.log(`  Reason:     ${notes}`);
    console.log('');
    
  } catch (error) {
    logError(`Failed to reject refund: ${error.message}`);
    process.exit(1);
  }
}

function showUsage() {
  console.log('');
  log(colors.bold, 'Usage:');
  console.log('  node scripts/approve-refund.js list [--pending] [--status=STATUS]');
  console.log('  node scripts/approve-refund.js approve <refund-id>');
  console.log('  node scripts/approve-refund.js reject <refund-id> --reason="Reason"');
  console.log('');
  log(colors.bold, 'Commands:');
  console.log('  list     List refund requests');
  console.log('  approve  Approve a refund request and credit the user');
  console.log('  reject   Reject a refund request with a reason');
  console.log('');
  log(colors.bold, 'Options:');
  console.log('  --pending         Show only pending requests');
  console.log('  --status=STATUS   Filter by status (PENDING, APPROVED, REJECTED)');
  console.log('  --limit=N         Limit results (default: 20)');
  console.log('  --reason="..."    Rejection reason (required for reject)');
  console.log('');
  log(colors.bold, 'Environment:');
  console.log('  ADMIN_PASSWORD    Admin password (required)');
  console.log('  API_BASE_URL      API base URL (default: http://localhost:3000)');
  console.log('');
  log(colors.bold, 'Examples:');
  console.log('  ADMIN_PASSWORD=secret node scripts/approve-refund.js list --pending');
  console.log('  ADMIN_PASSWORD=secret node scripts/approve-refund.js approve abc123');
  console.log('  ADMIN_PASSWORD=secret node scripts/approve-refund.js reject abc123 --reason="Invalid request"');
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    showUsage();
    process.exit(0);
  }
  
  if (!ADMIN_PASSWORD) {
    logError('ADMIN_PASSWORD environment variable is required');
    console.log('');
    console.log('Set it with: ADMIN_PASSWORD=your-password node scripts/approve-refund.js ...');
    process.exit(1);
  }
  
  switch (command) {
    case 'list':
      await listRefunds(args.slice(1));
      break;
      
    case 'approve':
      await approveRefund(args[1]);
      break;
      
    case 'reject':
      await rejectRefund(args[1], args.slice(2));
      break;
      
    default:
      logError(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
