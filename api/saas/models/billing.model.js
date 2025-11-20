/**
 * SaaS Billing Model
 * 
 * Histórico de pagamentos e faturas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BillingModel {
  /**
   * Criar invoice
   */
  async createInvoice(invoiceData) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId: invoiceData.userId,
          subscriptionId: invoiceData.subscriptionId,
          amount: invoiceData.amount,
          status: 'pending', // 'pending', 'paid', 'failed', 'cancelled'
          dueDate: invoiceData.dueDate,
          description: invoiceData.description,
          pixQrCode: invoiceData.pixQrCode || null,
          pixCopyPaste: invoiceData.pixCopyPaste || null,
          metadata: JSON.stringify(invoiceData.metadata || {}),
        },
      });

      console.log(`💳 Invoice created: ${invoice.id} (R$ ${invoice.amount})`);
      return invoice;
    } catch (error) {
      console.error('[BillingModel] CreateInvoice error:', error);
      throw error;
    }
  }

  /**
   * Marcar invoice como paga
   */
  async markAsPaid(invoiceId, paymentData) {
    try {
      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paidAmount: paymentData.amount,
          paymentMethod: paymentData.method, // 'pix', 'credit_card', 'boleto'
          externalTransactionId: paymentData.transactionId,
        },
      });

      console.log(`✅ Invoice marked as paid: ${invoice.id}`);
      return invoice;
    } catch (error) {
      console.error('[BillingModel] MarkAsPaid error:', error);
      throw error;
    }
  }

  /**
   * Obter faturas do usuário
   */
  async getUserInvoices(userId, limit = 50, offset = 0) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
      return invoices;
    } catch (error) {
      console.error('[BillingModel] GetUserInvoices error:', error);
      throw error;
    }
  }

  /**
   * Obter faturas pendentes
   */
  async getPendingInvoices(limit = 50, offset = 0) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { status: 'pending' },
        take: limit,
        skip: offset,
        orderBy: { dueDate: 'asc' },
        include: { user: true },
      });
      return invoices;
    } catch (error) {
      console.error('[BillingModel] GetPendingInvoices error:', error);
      throw error;
    }
  }

  /**
   * Dashboard de receita (admin)
   */
  async getRevenueDashboard() {
    try {
      const today = new Date();
      const month = today.toISOString().slice(0, 7);
      const year = today.getFullYear();

      // Receita do mês
      const monthlyRevenue = await prisma.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: new Date(`${month}-01`),
            lt: new Date(year, today.getMonth() + 1, 1),
          },
        },
        _sum: { paidAmount: true },
      });

      // Receita anual
      const yearlyRevenue = await prisma.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: new Date(`${year}-01-01`),
          },
        },
        _sum: { paidAmount: true },
      });

      // Faturas pendentes
      const pendingInvoices = await prisma.invoice.aggregate({
        where: { status: 'pending' },
        _count: { id: true },
        _sum: { amount: true },
      });

      return {
        month,
        monthlyRevenue: monthlyRevenue._sum.paidAmount || 0,
        yearlyRevenue: yearlyRevenue._sum.paidAmount || 0,
        pendingCount: pendingInvoices._count.id,
        pendingAmount: pendingInvoices._sum.amount || 0,
      };
    } catch (error) {
      console.error('[BillingModel] GetRevenueDashboard error:', error);
      throw error;
    }
  }

  /**
   * Relatório de faturas por período
   */
  async getReport(startDate, endDate) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });

      const summary = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        pending: invoices.filter(i => i.status === 'pending').length,
        failed: invoices.filter(i => i.status === 'failed').length,
        totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
        paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.paidAmount || 0), 0),
      };

      return { invoices, summary };
    } catch (error) {
      console.error('[BillingModel] GetReport error:', error);
      throw error;
    }
  }
}

module.exports = new BillingModel();
