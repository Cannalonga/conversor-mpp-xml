/**
 * SaaS Subscription Model
 * 
 * Representa planos/assinaturas dos usuários
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SubscriptionModel {
  /**
   * Criar nova assinatura
   */
  async create(subscriptionData) {
    try {
      const subscription = await prisma.subscription.create({
        data: {
          userId: subscriptionData.userId,
          planType: subscriptionData.planType, // 'free', 'pro', 'enterprise'
          status: 'active', // 'active', 'inactive', 'suspended', 'cancelled'
          startDate: new Date(),
          endDate: subscriptionData.endDate,
          conversionsLimit: this.getLimitForPlan(subscriptionData.planType),
          price: this.getPriceForPlan(subscriptionData.planType),
          billingCycle: subscriptionData.billingCycle || 'monthly', // 'monthly', 'yearly'
          metadata: JSON.stringify(subscriptionData.metadata || {}),
        },
      });

      console.log(`✅ Subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      console.error('[SubscriptionModel] Create error:', error);
      throw error;
    }
  }

  /**
   * Obter plano ativo do usuário
   */
  async getActiveSubscription(userId) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
          endDate: { gt: new Date() },
        },
      });
      return subscription;
    } catch (error) {
      console.error('[SubscriptionModel] GetActive error:', error);
      throw error;
    }
  }

  /**
   * Upgrade de plano
   */
  async upgrade(userId, newPlanType) {
    try {
      // Cancelar plano anterior
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: 'active',
        },
        data: {
          status: 'cancelled',
          endDate: new Date(),
        },
      });

      // Criar novo plano
      const newSubscription = await this.create({
        userId,
        planType: newPlanType,
      });

      return newSubscription;
    } catch (error) {
      console.error('[SubscriptionModel] Upgrade error:', error);
      throw error;
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancel(subscriptionId) {
    try {
      const subscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          endDate: new Date(),
        },
      });
      return subscription;
    } catch (error) {
      console.error('[SubscriptionModel] Cancel error:', error);
      throw error;
    }
  }

  /**
   * Obter limite de conversões por plano
   */
  getLimitForPlan(planType) {
    const limits = {
      free: 3, // 3 conversões/mês grátis
      pro: 100, // 100 conversões/mês
      enterprise: Infinity, // Ilimitado
    };
    return limits[planType] || 0;
  }

  /**
   * Obter preço por plano
   */
  getPriceForPlan(planType) {
    const prices = {
      free: 0,
      pro: 99.90, // R$ 99,90 / mês
      enterprise: 299.90, // R$ 299,90 / mês
    };
    return prices[planType] || 0;
  }

  /**
   * Listar assinaturas ativas (admin)
   */
  async listActive(limit = 50, offset = 0) {
    try {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          endDate: { gt: new Date() },
        },
        take: limit,
        skip: offset,
        orderBy: { startDate: 'desc' },
        include: { user: true },
      });
      return subscriptions;
    } catch (error) {
      console.error('[SubscriptionModel] ListActive error:', error);
      throw error;
    }
  }

  /**
   * Contar assinaturas por plano
   */
  async countByPlan() {
    try {
      const counts = await prisma.subscription.groupBy({
        by: ['planType'],
        where: { status: 'active' },
        _count: { id: true },
      });

      return counts.map(g => ({
        planType: g.planType,
        count: g._count.id,
      }));
    } catch (error) {
      console.error('[SubscriptionModel] CountByPlan error:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionModel();
