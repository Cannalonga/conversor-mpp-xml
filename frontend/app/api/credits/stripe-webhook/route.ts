import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import stripe, { verifyWebhookSignature, getCreditsFromSession } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// ============================================
// Structured Logging
// ============================================

interface LogContext {
  eventId?: string;
  sessionId?: string;
  userId?: string;
  eventType?: string;
  credits?: number;
  amountPaid?: number;
  error?: string;
  duration?: number;
}

function log(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'stripe-webhook',
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// ============================================
// Metrics (optional Prometheus-style counters)
// ============================================

const metrics = {
  webhookReceived: 0,
  webhookVerified: 0,
  webhookFailed: 0,
  webhookDuplicate: 0,
  creditsAdded: 0,
  totalCreditsProcessed: 0,
};

// Internal function to get metrics (used by GET handler)
function getMetricsData() {
  return { ...metrics };
}

// ============================================
// Idempotency Check
// ============================================

async function isEventProcessed(eventId: string, sessionId?: string): Promise<boolean> {
  // Check by event ID first
  const existingByEvent = await prisma.stripeEvent.findUnique({
    where: { stripeEventId: eventId },
  });

  if (existingByEvent) {
    return true;
  }

  // For checkout events, also check by session ID
  if (sessionId) {
    const existingBySession = await prisma.stripeEvent.findUnique({
      where: { stripeSessionId: sessionId },
    });
    return !!existingBySession;
  }

  return false;
}

// ============================================
// Event Handlers
// ============================================

async function handleCheckoutCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  const startTime = Date.now();
  const eventId = event.id;
  const sessionId = session.id;
  const userId = session.metadata?.userId;
  
  const logCtx: LogContext = { eventId, sessionId, userId, eventType: event.type };

  // Validate userId
  if (!userId) {
    log('error', 'Missing userId in session metadata', logCtx);
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'missing_user_id', message: 'userId not found in session metadata' },
      { status: 400 }
    );
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    log('error', 'User not found in database', logCtx);
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'user_not_found', message: `User ${userId} not found` },
      { status: 400 }
    );
  }

  // Get credits from metadata
  const credits = getCreditsFromSession(session);
  if (!credits || credits <= 0) {
    log('error', 'Invalid credits amount in session', { ...logCtx, credits: credits ?? 0 });
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'invalid_credits', message: 'Credits amount is missing or invalid' },
      { status: 400 }
    );
  }

  logCtx.credits = credits;
  logCtx.amountPaid = session.amount_total ?? 0;

  // Record event and add credits atomically
  try {
    await prisma.$transaction(async (tx) => {
      // Record the Stripe event (idempotency record)
      await tx.stripeEvent.create({
        data: {
          stripeEventId: eventId,
          stripeSessionId: sessionId,
          eventType: event.type,
          status: 'processed',
          userId,
          creditsAdded: credits,
          amountPaid: session.amount_total,
          metadata: JSON.stringify({
            packageId: session.metadata?.packageId,
            customerEmail: session.customer_email,
            currency: session.currency,
          }),
        },
      });

      // Get or create user credits
      let userCredits = await tx.userCredits.findUnique({
        where: { userId },
      });

      if (!userCredits) {
        // First time user
        userCredits = await tx.userCredits.create({
          data: { userId, balance: 10 + credits },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: 10,
            type: 'BONUS',
            description: 'Bônus de boas-vindas',
          },
        });
      } else {
        userCredits = await tx.userCredits.update({
          where: { userId },
          data: { balance: { increment: credits } },
        });
      }

      // Record purchase
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: 'PURCHASE',
          description: `Compra: ${credits} créditos via Stripe`,
          metadata: JSON.stringify({
            stripeSessionId: sessionId,
            stripeEventId: eventId,
            packageId: session.metadata?.packageId,
            amountPaid: session.amount_total,
          }),
        },
      });

      return userCredits.balance;
    });

    metrics.creditsAdded++;
    metrics.totalCreditsProcessed += credits;

    const duration = Date.now() - startTime;
    log('info', 'Successfully credited user', { ...logCtx, duration });

    return NextResponse.json({ received: true, credits_added: credits }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a unique constraint violation (duplicate)
    if (message.includes('Unique constraint')) {
      log('info', 'Duplicate event detected (constraint violation)', logCtx);
      metrics.webhookDuplicate++;
      return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });
    }

    log('error', 'Failed to process checkout', { ...logCtx, error: message });
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'processing_failed', message },
      { status: 500 }
    );
  }
}

async function handlePaymentFailed(
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent
): Promise<NextResponse> {
  const logCtx: LogContext = { 
    eventId: event.id, 
    eventType: event.type,
  };

  log('warn', 'Payment failed', { 
    ...logCtx, 
    error: paymentIntent.last_payment_error?.message 
  });

  // Record the failed event for audit
  try {
    await prisma.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: 'processed',
        metadata: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          errorCode: paymentIntent.last_payment_error?.code,
          errorMessage: paymentIntent.last_payment_error?.message,
        }),
      },
    });
  } catch (error) {
    // Ignore duplicate event errors
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('Unique constraint')) {
      log('error', 'Failed to record payment_failed event', { ...logCtx, error: message });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleChargeRefunded(
  event: Stripe.Event,
  charge: Stripe.Charge
): Promise<NextResponse> {
  const logCtx: LogContext = { 
    eventId: event.id, 
    eventType: event.type,
  };

  log('info', 'Charge refunded', logCtx);

  // Record refund event - in production you'd want to:
  // 1. Find the original purchase
  // 2. Deduct credits or mark them as refunded
  // 3. Send notification to user
  
  try {
    await prisma.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: 'processed',
        amountPaid: charge.amount_refunded ? -charge.amount_refunded : null,
        metadata: JSON.stringify({
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          refundReason: charge.refunds?.data[0]?.reason,
        }),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('Unique constraint')) {
      log('error', 'Failed to record charge.refunded event', { ...logCtx, error: message });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ============================================
// Main Webhook Handler
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  metrics.webhookReceived++;

  // Check if Stripe is configured
  if (!stripe) {
    log('error', 'Stripe not configured', {});
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Stripe integration is not available' },
      { status: 503 }
    );
  }

  // Get raw body for signature verification
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    log('error', 'Missing stripe-signature header', {});
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'missing_signature', message: 'stripe-signature header is required' },
      { status: 400 }
    );
  }

  // Verify webhook signature
  const verifyResult = verifyWebhookSignature(body, signature);
  
  if (!verifyResult.success || !verifyResult.event) {
    log('error', 'Webhook signature verification failed', { error: verifyResult.error });
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'invalid_signature', message: verifyResult.error },
      { status: 400 }
    );
  }

  metrics.webhookVerified++;
  const event = verifyResult.event;
  const logCtx: LogContext = { eventId: event.id, eventType: event.type };

  log('info', 'Webhook received', logCtx);

  // Idempotency check - return early if already processed
  const sessionId = event.type.includes('checkout.session') 
    ? (event.data.object as Stripe.Checkout.Session).id 
    : undefined;

  const alreadyProcessed = await isEventProcessed(event.id, sessionId);
  if (alreadyProcessed) {
    log('info', 'Event already processed (idempotency check)', logCtx);
    metrics.webhookDuplicate++;
    return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });
  }

  // Route to appropriate handler
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        return await handleCheckoutCompleted(event, session);
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return await handlePaymentFailed(event, paymentIntent);
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        return await handleChargeRefunded(event, charge);
      }

      default: {
        log('info', 'Unhandled event type', logCtx);
        
        // Record unhandled events for monitoring
        try {
          await prisma.stripeEvent.create({
            data: {
              stripeEventId: event.id,
              eventType: event.type,
              status: 'processed',
              metadata: JSON.stringify({ note: 'unhandled_event_type' }),
            },
          });
        } catch {
          // Ignore duplicate errors
        }
        
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Webhook handler error', { ...logCtx, error: message });
    metrics.webhookFailed++;
    return NextResponse.json(
      { error: 'handler_error', message },
      { status: 500 }
    );
  }
}

// Expose metrics endpoint for monitoring
export async function GET() {
  return NextResponse.json({
    service: 'stripe-webhook',
    metrics: getMetricsData(),
    timestamp: new Date().toISOString(),
  });
}
