import Stripe from 'stripe';

// ============================================
// Environment Validation (Runtime only)
// ============================================

const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

// Only validate in production runtime (not during build)
if (isProduction && !isBuildTime) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('🚨 STRIPE_SECRET_KEY is required in production');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('🚨 STRIPE_WEBHOOK_SECRET is required in production');
  }
}

// Warn in development if not configured
if (!isProduction && !isBuildTime) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY not set - Stripe features will be disabled');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set - Webhook verification will fail');
  }
}

// ============================================
// Stripe Client Instance
// ============================================

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null;

// ============================================
// Webhook Signature Verification
// ============================================

export interface WebhookVerifyResult {
  success: boolean;
  event?: Stripe.Event;
  error?: string;
}

/**
 * Verify Stripe webhook signature and parse event
 * @param payload - Raw request body as string
 * @param signature - stripe-signature header value
 * @returns Verification result with parsed event or error
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): WebhookVerifyResult {
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return { success: false, error: 'STRIPE_WEBHOOK_SECRET not configured' };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return { success: true, event };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Webhook signature verification failed: ${message}` };
  }
}

// ============================================
// Credit Package Mapping
// ============================================

// Map Stripe price IDs to credit amounts
// These should match the prices configured in your Stripe dashboard
export const priceToCreditsMap: Record<string, number> = {
  [process.env.STRIPE_PRICE_50 || 'price_50']: 50,
  [process.env.STRIPE_PRICE_200 || 'price_200']: 200,
  [process.env.STRIPE_PRICE_500 || 'price_500']: 500,
};

// Expected amounts in cents for each package (for validation)
export const priceToAmountMap: Record<string, number> = {
  [process.env.STRIPE_PRICE_50 || 'price_50']: 1000,   // R$ 10.00
  [process.env.STRIPE_PRICE_200 || 'price_200']: 3000, // R$ 30.00
  [process.env.STRIPE_PRICE_500 || 'price_500']: 6000, // R$ 60.00
};

/**
 * Get credits from session metadata or price ID
 */
export function getCreditsFromSession(session: Stripe.Checkout.Session): number | null {
  // First try metadata (most reliable)
  if (session.metadata?.credits) {
    const credits = parseInt(session.metadata.credits, 10);
    if (!isNaN(credits) && credits > 0) {
      return credits;
    }
  }

  // Fallback: try to get from line items (requires expanded session)
  // This is less reliable and requires API call, prefer metadata
  return null;
}

/**
 * Validate payment amount matches expected price
 */
export function validatePaymentAmount(
  session: Stripe.Checkout.Session,
  expectedCredits: number
): boolean {
  const amountTotal = session.amount_total;
  
  if (!amountTotal) {
    return false;
  }

  // Get expected amount for credits
  const priceId = session.metadata?.packageId;
  if (priceId && priceToAmountMap[priceId]) {
    return amountTotal === priceToAmountMap[priceId];
  }

  // Fallback: use simple validation (R$ 0.20 per credit in cents)
  const expectedAmount = expectedCredits * 20; // 20 cents per credit
  const tolerance = expectedAmount * 0.1; // 10% tolerance for discounts
  
  return amountTotal >= expectedAmount - tolerance;
}

export default stripe;
