/**
 * 📝 Mercado Pago Logger
 * =======================
 * 
 * Logger padronizado para eventos de pagamento do Mercado Pago.
 * Em DEV: console.log com cores
 * Em PROD: pode enviar para audit_log table
 * 
 * Estrutura padrão:
 * {
 *   provider: "mercadopago",
 *   event: "...",
 *   paymentId,
 *   amountBRL,
 *   credits,
 *   status,
 *   userId,
 *   timestamp
 * }
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Cores para console (apenas em dev)
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Formata timestamp ISO
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Estrutura base do log
 */
function createLogEntry(event, data = {}) {
  return {
    provider: 'mercadopago',
    event,
    timestamp: getTimestamp(),
    ...data,
  };
}

/**
 * Output do log
 */
function output(level, entry, color = colors.reset) {
  if (isDev) {
    const prefix = `[MP:${entry.event}]`;
    const message = JSON.stringify(entry, null, 2);
    console.log(`${color}${prefix}${colors.reset}`, message);
  } else {
    // Em produção, estrutura para sistemas de log (ELK, CloudWatch, etc)
    console[level](JSON.stringify(entry));
  }
  
  // TODO: Em produção, salvar em audit_log table
  // if (!isDev && prisma) {
  //   await prisma.auditLog.create({ data: entry });
  // }
}

// ============================================================================
// FUNÇÕES DE LOG
// ============================================================================

/**
 * Log: Webhook recebido do Mercado Pago
 */
function logMpReceived({ paymentId, type, action, xRequestId }) {
  output('info', createLogEntry('WEBHOOK_RECEIVED', {
    paymentId,
    type,
    action,
    xRequestId,
  }), colors.blue);
}

/**
 * Log: Pagamento duplicado (já processado)
 */
function logMpDuplicate({ paymentId, userId, existingEventId }) {
  output('warn', createLogEntry('DUPLICATE_PAYMENT', {
    paymentId,
    userId,
    existingEventId,
    message: 'Payment already processed - skipping',
  }), colors.yellow);
}

/**
 * Log: Assinatura inválida no webhook
 */
function logMpInvalidSignature({ paymentId, reason, xSignature, xRequestId }) {
  output('warn', createLogEntry('INVALID_SIGNATURE', {
    paymentId,
    reason,
    xSignature: xSignature ? `${xSignature.substring(0, 20)}...` : null,
    xRequestId,
    message: 'Webhook signature validation failed',
  }), colors.red);
}

/**
 * Log: Créditos aplicados com sucesso
 */
function logMpCreditApplied({ paymentId, userId, amountBRL, credits, creditsBefore, creditsAfter, planId }) {
  output('info', createLogEntry('CREDITS_APPLIED', {
    paymentId,
    userId,
    amountBRL,
    credits,
    creditsBefore,
    creditsAfter,
    planId,
    message: `Applied ${credits} credits to user ${userId}`,
  }), colors.green);
}

/**
 * Log: Pagamento ignorado (não aprovado)
 */
function logMpSkipped({ paymentId, userId, mpStatus, normalizedStatus, reason }) {
  output('info', createLogEntry('PAYMENT_SKIPPED', {
    paymentId,
    userId,
    mpStatus,
    normalizedStatus,
    reason,
    message: `Payment skipped: ${reason}`,
  }), colors.cyan);
}

/**
 * Log: Erro ao processar pagamento
 */
function logMpError({ paymentId, userId, error, context }) {
  output('error', createLogEntry('PAYMENT_ERROR', {
    paymentId,
    userId,
    error: error?.message || error,
    stack: isDev ? error?.stack : undefined,
    context,
    message: 'Error processing payment',
  }), colors.red);
}

/**
 * Log: PaymentEvent criado
 */
function logMpEventCreated({ paymentId, userId, eventId, status }) {
  output('info', createLogEntry('EVENT_CREATED', {
    paymentId,
    userId,
    eventId,
    status,
    message: 'PaymentEvent record created',
  }), colors.magenta);
}

/**
 * Log: Status consultado
 */
function logMpStatusChecked({ paymentId, mpStatus, normalizedStatus, alreadyProcessed }) {
  output('info', createLogEntry('STATUS_CHECKED', {
    paymentId,
    mpStatus,
    normalizedStatus,
    alreadyProcessed,
  }), colors.cyan);
}

/**
 * Log: PIX criado
 */
function logMpPixCreated({ paymentId, transactionId, amountBRL, userId }) {
  output('info', createLogEntry('PIX_CREATED', {
    paymentId,
    transactionId,
    amountBRL,
    userId,
    message: 'PIX payment created',
  }), colors.green);
}

/**
 * Log: Checkout criado
 */
function logMpCheckoutCreated({ preferenceId, transactionId, amountBRL, userId, planId }) {
  output('info', createLogEntry('CHECKOUT_CREATED', {
    preferenceId,
    transactionId,
    amountBRL,
    userId,
    planId,
    message: 'Checkout preference created',
  }), colors.green);
}

module.exports = {
  logMpReceived,
  logMpDuplicate,
  logMpInvalidSignature,
  logMpCreditApplied,
  logMpSkipped,
  logMpError,
  logMpEventCreated,
  logMpStatusChecked,
  logMpPixCreated,
  logMpCheckoutCreated,
};
