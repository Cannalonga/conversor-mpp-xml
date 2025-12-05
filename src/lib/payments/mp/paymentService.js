/**
 * 💳 Payment Service - Unified Payment Processing
 * ================================================
 * 
 * Serviço unificado para processamento de pagamentos.
 * Suporta múltiplos providers (Mercado Pago, Stripe) com mesmo fluxo.
 * 
 * Responsabilidades:
 * - Criar PaymentEvent (idempotência)
 * - Normalizar status
 * - Aplicar créditos atomicamente
 * - Logs padronizados
 */

const { PrismaClient } = require('@prisma/client');
const { 
  normalizeMpStatus, 
  shouldApplyCredits, 
  getStatusInfo 
} = require('./normalizeMpStatus');
const {
  logMpCreditApplied,
  logMpDuplicate,
  logMpSkipped,
  logMpError,
  logMpEventCreated,
} = require('./mpLogger');
const { CREDIT_PLANS, getPlanById } = require('../../../../api/config/credit-plans');

// Singleton Prisma
let prisma;
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Processa um pagamento aprovado
 * 
 * Fluxo:
 * 1. Verificar se PaymentEvent já existe (idempotência)
 * 2. Normalizar status
 * 3. Criar PaymentEvent
 * 4. Aplicar créditos se status = paid
 * 5. Registrar CreditTransaction com auditoria
 * 
 * @param {Object} params
 * @param {string} params.provider - 'mercadopago' | 'stripe' | 'simulation'
 * @param {string} params.externalId - ID do pagamento no provider
 * @param {string} params.eventType - Tipo do evento (ex: 'payment.approved')
 * @param {string} params.mpStatus - Status original do provider
 * @param {string} params.userId - ID do usuário (email)
 * @param {number} params.amountBRL - Valor em reais
 * @param {string} params.planId - ID do plano comprado
 * @param {string} params.transactionId - ID da transação interna
 * @param {string} [params.rawPayload] - Payload bruto do webhook
 * @returns {Promise<{success: boolean, alreadyProcessed: boolean, ...}>}
 */
async function processPayment({
  provider,
  externalId,
  eventType,
  mpStatus,
  userId,
  amountBRL,
  planId,
  transactionId,
  rawPayload,
}) {
  const db = getPrisma();
  const statusInfo = getStatusInfo(mpStatus);

  try {
    return await db.$transaction(async (tx) => {
      // 1. Verificar idempotência via PaymentEvent
      const existingEvent = await tx.paymentEvent.findUnique({
        where: {
          provider_externalId: {
            provider,
            externalId: String(externalId),
          }
        }
      });

      if (existingEvent) {
        logMpDuplicate({
          paymentId: externalId,
          userId,
          existingEventId: existingEvent.id,
        });

        return {
          success: true,
          alreadyProcessed: true,
          existingEventId: existingEvent.id,
          creditsAdded: 0,
          status: statusInfo.normalized,
        };
      }

      // 2. Obter plano e calcular créditos
      const plan = getPlanById(planId);
      const creditsToAdd = plan?.credits || 0;

      // 3. Verificar se deve aplicar créditos
      if (!statusInfo.shouldApplyCredits) {
        // Criar evento mas sem créditos
        const event = await tx.paymentEvent.create({
          data: {
            provider,
            externalId: String(externalId),
            eventType,
            status: statusInfo.normalized,
            userId,
            creditsAdded: 0,
            amount: amountBRL,
            rawPayload: rawPayload || null,
          }
        });

        logMpSkipped({
          paymentId: externalId,
          userId,
          mpStatus,
          normalizedStatus: statusInfo.normalized,
          reason: `Status is ${statusInfo.normalized}, not paid`,
        });

        logMpEventCreated({
          paymentId: externalId,
          userId,
          eventId: event.id,
          status: statusInfo.normalized,
        });

        return {
          success: true,
          alreadyProcessed: false,
          eventId: event.id,
          creditsAdded: 0,
          status: statusInfo.normalized,
          reason: 'payment_not_approved',
        };
      }

      // 4. Obter saldo atual do usuário
      let userCredits = await tx.userCredits.findUnique({
        where: { userId }
      });

      const creditsBefore = userCredits?.balance || 0;

      // Criar registro se não existir
      if (!userCredits) {
        userCredits = await tx.userCredits.create({
          data: { userId, balance: 0 }
        });
      }

      // 5. Aplicar créditos
      const updatedCredits = await tx.userCredits.update({
        where: { userId },
        data: {
          balance: { increment: creditsToAdd }
        }
      });

      const creditsAfter = updatedCredits.balance;

      // 6. Criar CreditTransaction com auditoria
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: creditsToAdd,
          type: 'PURCHASE',
          description: `Compra: ${plan?.name || planId} (${creditsToAdd} créditos)`,
          creditsBefore,
          creditsAfter,
          metadata: JSON.stringify({
            provider,
            planId,
            planName: plan?.name,
            price: amountBRL,
            transactionId,
            paymentId: externalId,
            purchaseDate: new Date().toISOString(),
          }),
        }
      });

      // 7. Criar PaymentEvent
      const event = await tx.paymentEvent.create({
        data: {
          provider,
          externalId: String(externalId),
          eventType,
          status: 'processed',
          userId,
          creditsAdded: creditsToAdd,
          amount: amountBRL,
          rawPayload: rawPayload || null,
        }
      });

      logMpCreditApplied({
        paymentId: externalId,
        userId,
        amountBRL,
        credits: creditsToAdd,
        creditsBefore,
        creditsAfter,
        planId,
      });

      logMpEventCreated({
        paymentId: externalId,
        userId,
        eventId: event.id,
        status: 'processed',
      });

      return {
        success: true,
        alreadyProcessed: false,
        eventId: event.id,
        creditsAdded: creditsToAdd,
        creditsBefore,
        creditsAfter,
        newBalance: creditsAfter,
        status: statusInfo.normalized,
        planName: plan?.name,
      };
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

  } catch (error) {
    logMpError({
      paymentId: externalId,
      userId,
      error,
      context: 'processPayment',
    });

    throw error;
  }
}

/**
 * Verifica se um pagamento já foi processado
 * 
 * @param {string} provider - Provider do pagamento
 * @param {string} externalId - ID externo do pagamento
 * @returns {Promise<{exists: boolean, event?: Object}>}
 */
async function checkPaymentProcessed(provider, externalId) {
  const db = getPrisma();
  
  const event = await db.paymentEvent.findUnique({
    where: {
      provider_externalId: {
        provider,
        externalId: String(externalId),
      }
    }
  });

  return {
    exists: !!event,
    event,
  };
}

/**
 * Obtém histórico de eventos de pagamento de um usuário
 * 
 * @param {string} userId - ID do usuário
 * @param {number} [limit=50] - Limite de resultados
 * @returns {Promise<Array>}
 */
async function getUserPaymentEvents(userId, limit = 50) {
  const db = getPrisma();
  
  return db.paymentEvent.findMany({
    where: { userId },
    orderBy: { processedAt: 'desc' },
    take: limit,
  });
}

module.exports = {
  processPayment,
  checkPaymentProcessed,
  getUserPaymentEvents,
  getPrisma,
};
