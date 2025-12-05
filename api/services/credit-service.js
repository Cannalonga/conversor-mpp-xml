/**
 * 💳 Credit Service
 * =================
 * 
 * Serviço para gerenciar créditos dos usuários:
 * - Adicionar créditos (compra, bônus, reembolso)
 * - Debitar créditos (conversões)
 * - Consultar saldo
 * - Histórico de transações
 */

const { PrismaClient } = require('@prisma/client');
const { CREDIT_PLANS, CONVERSION_COSTS, WELCOME_BONUS, FREE_TIER, getPlanById, getConversionCost } = require('../config/credit-plans');

// Singleton Prisma
let prisma;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

class CreditService {
  constructor() {
    this.prisma = getPrisma();
  }

  /**
   * Obter ou criar registro de créditos do usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<{id: string, userId: string, balance: number}>}
   */
  async getOrCreateUserCredits(userId) {
    let userCredits = await this.prisma.userCredits.findUnique({
      where: { userId }
    });

    if (!userCredits) {
      // Criar com bônus de boas-vindas se habilitado
      const initialBalance = WELCOME_BONUS.enabled ? WELCOME_BONUS.credits : 0;
      
      userCredits = await this.prisma.userCredits.create({
        data: {
          userId,
          balance: initialBalance,
        }
      });

      // Registrar transação de bônus
      if (initialBalance > 0) {
        await this.prisma.creditTransaction.create({
          data: {
            userId,
            amount: initialBalance,
            type: 'BONUS',
            description: WELCOME_BONUS.description,
            metadata: JSON.stringify({ type: 'welcome_bonus' }),
          }
        });
      }

      console.log(`[CreditService] ✅ Usuário ${userId} criado com ${initialBalance} créditos`);
    }

    return userCredits;
  }

  /**
   * Consultar saldo de créditos
   * @param {string} userId - ID do usuário
   * @returns {Promise<number>} Saldo de créditos
   */
  async getBalance(userId) {
    const userCredits = await this.getOrCreateUserCredits(userId);
    return userCredits.balance;
  }

  /**
   * Adicionar créditos após compra aprovada
   * IDEMPOTENTE: Usa PaymentEvent para garantir processamento único
   * 
   * @param {Object} options
   * @param {string} options.userId - ID do usuário (email)
   * @param {string} options.planId - ID do plano comprado
   * @param {string} options.transactionId - ID da transação interna
   * @param {string} options.paymentId - ID do pagamento no Mercado Pago/Stripe
   * @param {string} options.provider - Provider: 'mercadopago' | 'stripe'
   * @param {number} options.amount - Valor pago em reais
   * @param {string} options.rawPayload - Payload do webhook (opcional)
   * @returns {Promise<{success: boolean, newBalance: number, creditsAdded: number}>}
   */
  async addCreditsFromPurchase({ userId, planId, transactionId, paymentId, provider = 'mercadopago', amount, rawPayload }) {
    const plan = getPlanById(planId);
    
    if (!plan) {
      throw new Error(`Plano inválido: ${planId}`);
    }

    // Usar paymentId como identificador externo único
    const externalId = paymentId || transactionId;

    return await this.prisma.$transaction(async (tx) => {
      // ✅ IDEMPOTÊNCIA: Verificar se pagamento já foi processado via PaymentEvent
      const existingEvent = await tx.paymentEvent.findUnique({
        where: {
          provider_externalId: {
            provider,
            externalId: String(externalId),
          }
        }
      });

      if (existingEvent) {
        console.log(`[CreditService] ⚠️ Pagamento ${provider}:${externalId} já processado`);
        const currentCredits = await tx.userCredits.findUnique({
          where: { userId }
        });
        return {
          success: true,
          newBalance: currentCredits?.balance || 0,
          creditsAdded: 0,
          alreadyProcessed: true,
          existingEventId: existingEvent.id,
        };
      }

      // Obter ou criar registro do usuário
      let userCredits = await tx.userCredits.findUnique({
        where: { userId }
      });

      if (!userCredits) {
        userCredits = await tx.userCredits.create({
          data: { userId, balance: 0 }
        });
      }

      // ✅ AUDITORIA: Capturar saldo antes da alteração
      const creditsBefore = userCredits.balance;

      // Adicionar créditos
      const updatedCredits = await tx.userCredits.update({
        where: { userId },
        data: {
          balance: { increment: plan.credits }
        }
      });

      // ✅ AUDITORIA: Capturar saldo após a alteração
      const creditsAfter = updatedCredits.balance;

      // ✅ Registrar PaymentEvent (idempotência garantida pelo unique constraint)
      await tx.paymentEvent.create({
        data: {
          provider,
          externalId: String(externalId),
          eventType: 'payment.approved',
          status: 'processed',
          userId,
          creditsAdded: plan.credits,
          amount: amount || plan.price,
          rawPayload: rawPayload || null,
        }
      });

      // Registrar transação de crédito COM AUDITORIA
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: plan.credits,
          type: 'PURCHASE',
          description: `Compra: ${plan.name} (${plan.credits} créditos)`,
          creditsBefore,  // ✅ Saldo antes
          creditsAfter,   // ✅ Saldo depois
          metadata: JSON.stringify({
            planId,
            planName: plan.name,
            price: plan.price,
            transactionId,
            paymentId,
            provider,
            purchaseDate: new Date().toISOString(),
          }),
        }
      });

      console.log(`[CreditService] ✅ ${plan.credits} créditos adicionados para ${userId} via ${provider}`);

      return {
        success: true,
        newBalance: updatedCredits.balance,
        creditsAdded: plan.credits,
        plan: plan.name,
        provider,
      };
    });
  }

  /**
   * Debitar créditos para uma conversão
   * @param {Object} options
   * @param {string} options.userId - ID do usuário
   * @param {string} options.converterId - ID do conversor
   * @param {string} options.jobId - ID do job de conversão
   * @param {number} options.cost - Custo em créditos (opcional, usa padrão se não informado)
   * @returns {Promise<{success: boolean, newBalance: number, cost: number}>}
   */
  async debitCredits({ userId, converterId, jobId, cost }) {
    const creditCost = cost ?? getConversionCost(converterId);

    return await this.prisma.$transaction(async (tx) => {
      const userCredits = await tx.userCredits.findUnique({
        where: { userId }
      });

      if (!userCredits) {
        throw new Error('CREDITS_NOT_FOUND');
      }

      if (userCredits.balance < creditCost) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // ✅ AUDITORIA: Capturar saldo antes
      const creditsBefore = userCredits.balance;

      // Debitar
      const updatedCredits = await tx.userCredits.update({
        where: { userId },
        data: {
          balance: { decrement: creditCost }
        }
      });

      // ✅ AUDITORIA: Capturar saldo depois
      const creditsAfter = updatedCredits.balance;

      // Registrar transação COM AUDITORIA
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -creditCost,
          type: 'CONVERSION',
          description: `Conversão: ${converterId}`,
          jobId,
          creditsBefore,  // ✅ Saldo antes
          creditsAfter,   // ✅ Saldo depois
          metadata: JSON.stringify({
            converterId,
            cost: creditCost,
            timestamp: new Date().toISOString(),
          }),
        }
      });

      console.log(`[CreditService] 💸 ${creditCost} créditos debitados de ${userId} (saldo: ${updatedCredits.balance})`);

      return {
        success: true,
        newBalance: updatedCredits.balance,
        cost: creditCost,
      };
    });
  }

  /**
   * Reembolsar créditos (job falhou, erro, etc)
   * @param {Object} options
   * @param {string} options.userId - ID do usuário  
   * @param {number} options.amount - Quantidade a reembolsar
   * @param {string} options.reason - Motivo do reembolso
   * @param {string} options.jobId - ID do job relacionado
   * @returns {Promise<{success: boolean, newBalance: number}>}
   */
  async refundCredits({ userId, amount, reason, jobId }) {
    return await this.prisma.$transaction(async (tx) => {
      // ✅ AUDITORIA: Buscar saldo antes
      const currentCredits = await tx.userCredits.findUnique({
        where: { userId }
      });
      const creditsBefore = currentCredits?.balance || 0;

      const updatedCredits = await tx.userCredits.update({
        where: { userId },
        data: {
          balance: { increment: amount }
        }
      });

      // ✅ AUDITORIA: Saldo depois
      const creditsAfter = updatedCredits.balance;

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: amount,
          type: 'REFUND',
          description: `Reembolso: ${reason}`,
          jobId,
          creditsBefore,  // ✅ Saldo antes
          creditsAfter,   // ✅ Saldo depois
          metadata: JSON.stringify({
            reason,
            refundDate: new Date().toISOString(),
          }),
        }
      });

      console.log(`[CreditService] 🔄 ${amount} créditos reembolsados para ${userId}`);

      return {
        success: true,
        newBalance: updatedCredits.balance,
        refunded: amount,
      };
    });
  }

  /**
   * Obter histórico de transações do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e filtro
   * @returns {Promise<Array>}
   */
  async getTransactionHistory(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      type = null, // 'PURCHASE', 'CONVERSION', 'REFUND', 'BONUS'
    } = options;

    const where = { userId };
    if (type) {
      where.type = type;
    }

    const transactions = await this.prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.creditTransaction.count({ where });

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      }
    };
  }

  /**
   * Verificar se usuário tem créditos suficientes
   * @param {string} userId 
   * @param {number} required 
   * @returns {Promise<boolean>}
   */
  async hasEnoughCredits(userId, required) {
    const balance = await this.getBalance(userId);
    return balance >= required;
  }

  /**
   * Obter estatísticas de uso do usuário
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    const [balance, totalPurchased, totalUsed, totalRefunded] = await Promise.all([
      this.getBalance(userId),
      this.prisma.creditTransaction.aggregate({
        where: { userId, type: 'PURCHASE' },
        _sum: { amount: true }
      }),
      this.prisma.creditTransaction.aggregate({
        where: { userId, type: 'CONVERSION' },
        _sum: { amount: true }
      }),
      this.prisma.creditTransaction.aggregate({
        where: { userId, type: 'REFUND' },
        _sum: { amount: true }
      }),
    ]);

    const conversionsCount = await this.prisma.creditTransaction.count({
      where: { userId, type: 'CONVERSION' }
    });

    return {
      balance,
      totalPurchased: totalPurchased._sum.amount || 0,
      totalUsed: Math.abs(totalUsed._sum.amount || 0),
      totalRefunded: totalRefunded._sum.amount || 0,
      conversionsCount,
    };
  }
}

// Singleton instance
const creditService = new CreditService();

module.exports = {
  CreditService,
  creditService,
};
