/**
 * SaaS Usage Model
 * 
 * Rastreia consumo de conversões por usuário
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UsageModel {
  /**
   * Registrar uma conversão (incrementar uso)
   */
  async logConversion(userId, conversionData) {
    try {
      // Buscar ou criar registro de uso do mês atual
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM

      let usage = await prisma.usage.findFirst({
        where: {
          userId,
          month,
        },
      });

      if (!usage) {
        // Criar novo registro de uso
        usage = await prisma.usage.create({
          data: {
            userId,
            month,
            conversionsCount: 1,
            totalBytes: conversionData.size || 0,
            conversions: {
              create: [{
                fileHash: conversionData.hash,
                fileName: conversionData.filename,
                fileSize: conversionData.size,
                status: 'completed',
                timestamp: new Date(),
              }],
            },
          },
        });
      } else {
        // Atualizar registro existente
        usage = await prisma.usage.update({
          where: { id: usage.id },
          data: {
            conversionsCount: { increment: 1 },
            totalBytes: { increment: conversionData.size || 0 },
            conversions: {
              create: [{
                fileHash: conversionData.hash,
                fileName: conversionData.filename,
                fileSize: conversionData.size,
                status: 'completed',
                timestamp: new Date(),
              }],
            },
          },
        });
      }

      console.log(`📊 Usage logged: ${userId} - ${usage.conversionsCount} conversions`);
      return usage;
    } catch (error) {
      console.error('[UsageModel] LogConversion error:', error);
      throw error;
    }
  }

  /**
   * Obter uso do usuário (mês atual)
   */
  async getCurrentUsage(userId) {
    try {
      const month = new Date().toISOString().slice(0, 7);

      const usage = await prisma.usage.findFirst({
        where: {
          userId,
          month,
        },
        include: {
          conversions: { take: 10 }, // Últimas 10 conversões
        },
      });

      return usage || {
        userId,
        month,
        conversionsCount: 0,
        totalBytes: 0,
        conversions: [],
      };
    } catch (error) {
      console.error('[UsageModel] GetCurrentUsage error:', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário pode fazer conversão (não ultrapassou limite)
   */
  async canConvert(userId) {
    try {
      const [usage, subscription] = await Promise.all([
        this.getCurrentUsage(userId),
        prisma.subscription.findFirst({
          where: {
            userId,
            status: 'active',
            endDate: { gt: new Date() },
          },
        }),
      ]);

      // Se não tem assinatura ativa, proibir
      if (!subscription) {
        return { allowed: false, reason: 'No active subscription' };
      }

      // Se limite é infinito, permitir
      if (subscription.conversionsLimit === Infinity) {
        return { allowed: true, remaining: Infinity };
      }

      // Verificar se atingiu limite
      const remaining = subscription.conversionsLimit - (usage.conversionsCount || 0);

      if (remaining <= 0) {
        return { allowed: false, reason: 'Conversion limit exceeded' };
      }

      return { allowed: true, remaining };
    } catch (error) {
      console.error('[UsageModel] CanConvert error:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de uso (últimos 12 meses)
   */
  async getHistory(userId, months = 12) {
    try {
      const usageHistory = await prisma.usage.findMany({
        where: { userId },
        orderBy: { month: 'desc' },
        take: months,
      });

      return usageHistory;
    } catch (error) {
      console.error('[UsageModel] GetHistory error:', error);
      throw error;
    }
  }

  /**
   * Dashboard de uso (admin)
   */
  async getDashboard() {
    try {
      const month = new Date().toISOString().slice(0, 7);

      const totalUsage = await prisma.usage.aggregate({
        where: { month },
        _sum: {
          conversionsCount: true,
          totalBytes: true,
        },
      });

      const topUsers = await prisma.usage.findMany({
        where: { month },
        orderBy: { conversionsCount: 'desc' },
        take: 10,
        include: { user: true },
      });

      return {
        month,
        totalConversions: totalUsage._sum.conversionsCount || 0,
        totalBytes: totalUsage._sum.totalBytes || 0,
        topUsers,
      };
    } catch (error) {
      console.error('[UsageModel] GetDashboard error:', error);
      throw error;
    }
  }
}

module.exports = new UsageModel();
