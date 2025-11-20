/**
 * Database Repository - Payment Transactions
 * ==========================================
 * 
 * Abstração de operações com banco de dados
 * Segue padrão Repository Pattern
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PaymentRepository {
  /**
   * Criar nova transação de pagamento
   */
  async createTransaction(data) {
    try {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          cpf: data.cpf,
          email: data.email,
          name: data.name,
          status: 'PENDING_PIX',
          planType: data.planType || 'MONTHLY',
          amount: data.amount || 10.00,
          pixKey: data.pixKey,
          pixQRCode: data.pixQRCode,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
          mpTransactionId: data.mpTransactionId,
          mpStatus: data.mpStatus,
        },
      });
      return transaction;
    } catch (error) {
      console.error('[PaymentRepository] Erro ao criar transação:', error);
      throw error;
    }
  }

  /**
   * Buscar transação por ID
   */
  async getTransactionById(id) {
    try {
      return await prisma.paymentTransaction.findUnique({
        where: { id },
        include: {
          premiumSession: true,
          conversions: true,
        },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao buscar transação:', error);
      throw error;
    }
  }

  /**
   * Buscar transação por CPF
   */
  async getTransactionByCpf(cpf) {
    try {
      return await prisma.paymentTransaction.findFirst({
        where: { cpf },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao buscar por CPF:', error);
      throw error;
    }
  }

  /**
   * Buscar transações por email
   */
  async getTransactionsByEmail(email) {
    try {
      return await prisma.paymentTransaction.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao buscar por email:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de transação
   */
  async updateTransactionStatus(id, status) {
    try {
      return await prisma.paymentTransaction.update({
        where: { id },
        data: {
          status,
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Confirmar pagamento PIX
   */
  async confirmPix(transactionId, mpData) {
    try {
      return await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          mpStatus: mpData.status,
          mpWebhookData: JSON.stringify(mpData),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao confirmar PIX:', error);
      throw error;
    }
  }

  /**
   * Listar transações expiradas
   */
  async getExpiredTransactions() {
    try {
      return await prisma.paymentTransaction.findMany({
        where: {
          status: 'PENDING_PIX',
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('[PaymentRepository] Erro ao listar expiradas:', error);
      throw error;
    }
  }

  /**
   * Limpar transações expiradas
   */
  async deleteExpiredTransactions() {
    try {
      const result = await prisma.paymentTransaction.deleteMany({
        where: {
          status: 'EXPIRED',
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error('[PaymentRepository] Erro ao limpar expiradas:', error);
      throw error;
    }
  }

  /**
   * Relatório de receitas
   */
  async getRevenueReport(startDate, endDate) {
    try {
      const transactions = await prisma.paymentTransaction.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          conversions: true,
        },
      });

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalConversions = transactions.reduce((sum, t) => sum + t.conversions.length, 0);

      return {
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        totalTransactions: transactions.length,
        totalAmount,
        totalConversions,
        average: transactions.length > 0 ? totalAmount / transactions.length : 0,
        transactions,
      };
    } catch (error) {
      console.error('[PaymentRepository] Erro no relatório:', error);
      throw error;
    }
  }
}

/**
 * Admin Repository
 */
class AdminRepository {
  /**
   * Buscar admin por username
   */
  async getByUsername(username) {
    try {
      return await prisma.adminUser.findUnique({
        where: { username },
      });
    } catch (error) {
      console.error('[AdminRepository] Erro ao buscar admin:', error);
      throw error;
    }
  }

  /**
   * Criar sessão admin
   */
  async createSession(adminId, token, expiresAt, ipAddress, userAgent) {
    try {
      return await prisma.adminSession.create({
        data: {
          adminId,
          token,
          tokenExpiresAt: expiresAt,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('[AdminRepository] Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Validar token de sessão
   */
  async validateToken(token) {
    try {
      const session = await prisma.adminSession.findUnique({
        where: { token },
        include: { admin: true },
      });

      if (!session || session.revokedAt || new Date() > session.tokenExpiresAt) {
        return null;
      }

      return session;
    } catch (error) {
      console.error('[AdminRepository] Erro ao validar token:', error);
      throw error;
    }
  }

  /**
   * Registrar ação de auditoria
   */
  async logAction(adminId, action, resource, resourceId, details, ipAddress, userAgent, status = 'SUCCESS') {
    try {
      return await prisma.auditLog.create({
        data: {
          adminId,
          action,
          resource,
          resourceId,
          details,
          ipAddress,
          userAgent,
          status,
        },
      });
    } catch (error) {
      console.error('[AdminRepository] Erro ao registrar auditoria:', error);
      throw error;
    }
  }

  /**
   * Listar logs de auditoria
   */
  async getAuditLogs(adminId, limit = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('[AdminRepository] Erro ao listar logs:', error);
      throw error;
    }
  }
}

/**
 * File Conversion Repository
 */
class FileRepository {
  /**
   * Criar registro de conversão
   */
  async createConversion(transactionId, fileData) {
    try {
      return await prisma.fileConversion.create({
        data: {
          transactionId,
          originalFilename: fileData.filename,
          mimeType: fileData.mimeType,
          fileSizeBytes: fileData.size,
          fileHash: fileData.hash,
          status: 'PENDING',
          inputPath: fileData.inputPath,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
      });
    } catch (error) {
      console.error('[FileRepository] Erro ao criar registro:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de conversão
   */
  async updateConversionStatus(id, status, outputPath = null, errorMessage = null, processingTimeMs = null) {
    try {
      return await prisma.fileConversion.update({
        where: { id },
        data: {
          status,
          outputPath,
          errorMessage,
          processingTimeMs,
          completedAt: status === 'COMPLETED' ? new Date() : null,
          startedAt: status === 'PROCESSING' ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('[FileRepository] Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Listar arquivos expirados
   */
  async getExpiredFiles() {
    try {
      return await prisma.fileConversion.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          status: {
            in: ['COMPLETED', 'FAILED'],
          },
        },
      });
    } catch (error) {
      console.error('[FileRepository] Erro ao listar expirados:', error);
      throw error;
    }
  }
}

module.exports = {
  PaymentRepository: new PaymentRepository(),
  AdminRepository: new AdminRepository(),
  FileRepository: new FileRepository(),
  prisma,
};
