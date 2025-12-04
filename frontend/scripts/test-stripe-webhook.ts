#!/usr/bin/env npx ts-node

/**
 * Stripe Webhook Test Script
 * 
 * This script simulates Stripe webhook events for testing purposes.
 * It can be used to:
 * 1. Test webhook signature verification
 * 2. Test idempotency (duplicate event handling)
 * 3. Test credit addition flow
 * 
 * Usage:
 *   npx ts-node scripts/test-stripe-webhook.ts
 *   
 * Or with environment variables:
 *   WEBHOOK_URL=http://localhost:3000/api/credits/stripe-webhook npx ts-node scripts/test-stripe-webhook.ts
 * 
 * For real Stripe CLI testing:
 *   stripe login
 *   stripe listen --forward-to http://localhost:3000/api/credits/stripe-webhook
 *   stripe trigger checkout.session.completed --override 'data.object.metadata[userId]=<userId>' --override 'data.object.metadata[credits]=50'
 */

import Stripe from 'stripe';
import crypto from 'crypto';

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/credits/stripe-webhook';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder';
const TEST_USER_ID = process.env.TEST_USER_ID || 'cmiqzo42u0000ey62xmk8td2u';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level: 'info' | 'success' | 'error' | 'warn', message: string) {
  const color = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
  }[level];
  
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[level];
  
  console.log(`${color}${prefix} ${message}${colors.reset}`);
}

/**
 * Generate a Stripe webhook signature
 */
function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Create a mock checkout.session.completed event
 */
function createCheckoutSessionCompletedEvent(
  userId: string,
  credits: number = 50,
  sessionId?: string
): Stripe.Event {
  const eventId = `evt_test_${crypto.randomBytes(16).toString('hex')}`;
  const checkoutSessionId = sessionId || `cs_test_${crypto.randomBytes(16).toString('hex')}`;
  
  return {
    id: eventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: checkoutSessionId,
        object: 'checkout.session',
        amount_total: credits * 20, // R$ 0.20 per credit in cents
        currency: 'brl',
        customer_email: 'test@example.com',
        metadata: {
          userId,
          credits: String(credits),
          packageId: `credits_${credits}`,
        },
        mode: 'payment',
        payment_status: 'paid',
        status: 'complete',
      } as unknown as Stripe.Checkout.Session,
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as Stripe.Event;
}

/**
 * Create a mock payment_intent.payment_failed event
 */
function createPaymentFailedEvent(): Stripe.Event {
  const eventId = `evt_test_${crypto.randomBytes(16).toString('hex')}`;
  const paymentIntentId = `pi_test_${crypto.randomBytes(16).toString('hex')}`;
  
  return {
    id: eventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 1000,
        currency: 'brl',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
          type: 'card_error',
        },
      } as unknown as Stripe.PaymentIntent,
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as Stripe.Event;
}

/**
 * Send a webhook request to the server
 */
async function sendWebhook(
  event: Stripe.Event,
  webhookSecret: string
): Promise<{ status: number; body: unknown }> {
  const payload = JSON.stringify(event);
  const signature = generateWebhookSignature(payload, webhookSecret);
  
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  });
  
  const body = await response.json().catch(() => response.text());
  
  return {
    status: response.status,
    body,
  };
}

/**
 * Test: Verify valid signature is accepted
 */
async function testValidSignature() {
  log('info', 'Testing valid signature verification...');
  
  const event = createCheckoutSessionCompletedEvent(TEST_USER_ID, 50);
  const result = await sendWebhook(event, STRIPE_WEBHOOK_SECRET);
  
  if (result.status === 200) {
    log('success', `Valid signature accepted. Response: ${JSON.stringify(result.body)}`);
    return true;
  } else {
    log('error', `Expected 200, got ${result.status}. Response: ${JSON.stringify(result.body)}`);
    return false;
  }
}

/**
 * Test: Verify invalid signature is rejected
 */
async function testInvalidSignature() {
  log('info', 'Testing invalid signature rejection...');
  
  const event = createCheckoutSessionCompletedEvent(TEST_USER_ID, 50);
  const result = await sendWebhook(event, 'whsec_wrong_secret');
  
  if (result.status === 400) {
    log('success', `Invalid signature correctly rejected. Response: ${JSON.stringify(result.body)}`);
    return true;
  } else {
    log('error', `Expected 400, got ${result.status}. Response: ${JSON.stringify(result.body)}`);
    return false;
  }
}

/**
 * Test: Idempotency - same event shouldn't credit twice
 */
async function testIdempotency() {
  log('info', 'Testing idempotency (duplicate event handling)...');
  
  const sessionId = `cs_test_idempotency_${Date.now()}`;
  const event = createCheckoutSessionCompletedEvent(TEST_USER_ID, 50, sessionId);
  
  // Send first time
  log('info', '  Sending event first time...');
  const result1 = await sendWebhook(event, STRIPE_WEBHOOK_SECRET);
  
  if (result1.status !== 200) {
    log('error', `First request failed: ${result1.status}`);
    return false;
  }
  log('info', `  First request: ${JSON.stringify(result1.body)}`);
  
  // Send same event again
  log('info', '  Sending same event second time...');
  const result2 = await sendWebhook(event, STRIPE_WEBHOOK_SECRET);
  
  if (result2.status === 200) {
    const body = result2.body as { status?: string };
    if (body.status === 'already_processed') {
      log('success', 'Duplicate event correctly identified as already processed');
      return true;
    }
    log('warn', `Event processed but may have credited twice: ${JSON.stringify(result2.body)}`);
    return false;
  } else {
    log('error', `Unexpected status: ${result2.status}`);
    return false;
  }
}

/**
 * Test: Missing user ID should fail
 */
async function testMissingUserId() {
  log('info', 'Testing missing userId handling...');
  
  const event = createCheckoutSessionCompletedEvent('', 50);
  // Clear the userId
  (event.data.object as Stripe.Checkout.Session).metadata = { credits: '50' };
  
  const result = await sendWebhook(event, STRIPE_WEBHOOK_SECRET);
  
  if (result.status === 400) {
    log('success', `Missing userId correctly rejected. Response: ${JSON.stringify(result.body)}`);
    return true;
  } else {
    log('error', `Expected 400, got ${result.status}. Response: ${JSON.stringify(result.body)}`);
    return false;
  }
}

/**
 * Test: Payment failed event
 */
async function testPaymentFailed() {
  log('info', 'Testing payment_failed event handling...');
  
  const event = createPaymentFailedEvent();
  const result = await sendWebhook(event, STRIPE_WEBHOOK_SECRET);
  
  if (result.status === 200) {
    log('success', `Payment failed event handled. Response: ${JSON.stringify(result.body)}`);
    return true;
  } else {
    log('error', `Expected 200, got ${result.status}. Response: ${JSON.stringify(result.body)}`);
    return false;
  }
}

/**
 * Test: Get metrics endpoint
 */
async function testMetricsEndpoint() {
  log('info', 'Testing metrics endpoint...');
  
  const response = await fetch(WEBHOOK_URL, { method: 'GET' });
  const body = await response.json();
  
  if (response.status === 200 && body.metrics) {
    log('success', `Metrics retrieved: ${JSON.stringify(body.metrics)}`);
    return true;
  } else {
    log('error', `Failed to get metrics: ${response.status}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '🧪 Stripe Webhook Integration Tests' + colors.reset);
  console.log('='.repeat(60));
  console.log(`${colors.blue}Webhook URL:${colors.reset} ${WEBHOOK_URL}`);
  console.log(`${colors.blue}Test User ID:${colors.reset} ${TEST_USER_ID}`);
  console.log('='.repeat(60) + '\n');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests
  try {
    results.push({ name: 'Valid Signature', passed: await testValidSignature() });
  } catch (e) {
    log('error', `Valid Signature test error: ${e}`);
    results.push({ name: 'Valid Signature', passed: false });
  }

  try {
    results.push({ name: 'Invalid Signature', passed: await testInvalidSignature() });
  } catch (e) {
    log('error', `Invalid Signature test error: ${e}`);
    results.push({ name: 'Invalid Signature', passed: false });
  }

  try {
    results.push({ name: 'Idempotency', passed: await testIdempotency() });
  } catch (e) {
    log('error', `Idempotency test error: ${e}`);
    results.push({ name: 'Idempotency', passed: false });
  }

  try {
    results.push({ name: 'Missing UserId', passed: await testMissingUserId() });
  } catch (e) {
    log('error', `Missing UserId test error: ${e}`);
    results.push({ name: 'Missing UserId', passed: false });
  }

  try {
    results.push({ name: 'Payment Failed', passed: await testPaymentFailed() });
  } catch (e) {
    log('error', `Payment Failed test error: ${e}`);
    results.push({ name: 'Payment Failed', passed: false });
  }

  try {
    results.push({ name: 'Metrics Endpoint', passed: await testMetricsEndpoint() });
  } catch (e) {
    log('error', `Metrics Endpoint test error: ${e}`);
    results.push({ name: 'Metrics Endpoint', passed: false });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '📊 Test Results Summary' + colors.reset);
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const color = r.passed ? colors.green : colors.red;
    console.log(`${color}${icon} ${r.name}${colors.reset}`);
  });
  
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  // Exit with error code if any test failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Show help if running with --help
if (process.argv.includes('--help')) {
  console.log(`
${colors.cyan}Stripe Webhook Test Script${colors.reset}

Usage:
  npx ts-node scripts/test-stripe-webhook.ts [options]

Options:
  --help    Show this help message

Environment Variables:
  WEBHOOK_URL           Webhook endpoint URL (default: http://localhost:3000/api/credits/stripe-webhook)
  STRIPE_SECRET_KEY     Stripe secret key (for real API calls)
  STRIPE_WEBHOOK_SECRET Webhook secret for signature generation
  TEST_USER_ID          User ID to use in test events

For real Stripe CLI testing:
  1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
  2. Login: stripe login
  3. Forward webhooks: stripe listen --forward-to http://localhost:3000/api/credits/stripe-webhook
  4. Trigger events: stripe trigger checkout.session.completed

Example with custom user:
  stripe trigger checkout.session.completed \\
    --override 'data.object.metadata[userId]=your-user-id' \\
    --override 'data.object.metadata[credits]=50' \\
    --override 'data.object.metadata[packageId]=credits_50'
`);
  process.exit(0);
}

// Run tests
runTests().catch(err => {
  log('error', `Test runner failed: ${err}`);
  process.exit(1);
});
