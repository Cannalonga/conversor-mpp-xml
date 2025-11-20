/**
 * Premium Payment Controller
 * =========================
 * 
 * Controlador para endpoints de pagamento premium
 * Usa Prisma + Repository Pattern para operações de banco
 * 
 * Endpoints:
 * - POST /api/premium/checkout → Criar transação PIX
 * - GET /api/premium/verify/:id → Verificar status
 * - POST /api/premium/webhook/pix → Confirmar pagamento
 * - GET /api/premium/status → Status de sessão
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PaymentRepository, AdminRepository } = require('./database');

class PremiumController {
  constructor(config = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET_KEY,
      jwtExpiration: config.jwtExpiration || 24,
      pixExpiresIn: config.pixExpiresIn || 30, // 30 minutos
      ...config
    };
  }

  /**
   * POST /api/premium/checkout
   * Criar transação de pagamento PIX
   */
  async checkout(req, res) {
    try {
      const { plan, payment, customer } = req.body;

      // ✅ Validar entrada
      if (!plan || !payment || !customer) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: plan, payment, customer'
        });
      }

      // ✅ Validar plano
      const validPlans = {
        monthly: { price: 10.00, duration: 30, name: 'Plano Mensal' },
        quarterly: { price: 25.00, duration: 90, name: 'Plano Trimestral' },
        annual: { price: 70.00, duration: 365, name: 'Plano Anual' }
      };

      if (!validPlans[plan]) {
        return res.status(400).json({
          success: false,
          error: `Invalid plan. Valid: ${Object.keys(validPlans).join(', ')}`
        });
      }

      // ✅ Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customer.email || !emailRegex.test(customer.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address'
        });
      }

      // ✅ Validar CPF (11 dígitos)
      const cpfDigits = customer.cpf?.replace(/\D/g, '') || '';
      if (cpfDigits.length !== 11) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CPF (must be 11 digits)'
        });
      }

      // ✅ Validar método de pagamento
      if (!['pix', 'credit_card'].includes(payment)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method (pix or credit_card)'
        });
      }

      const planDetails = validPlans[plan];

      // 🎯 Gerar PIX
      let pixKey = null;
      let pixQRCode = null;

      if (payment === 'pix') {
        // Simular PIX (em produção: integrar com Mercado Pago/Banco)
        pixKey = `00020126580014br.gov.bcb.pix0136${crypto.randomBytes(16).toString('hex')}`;
        pixQRCode = Buffer.from(pixKey).toString('base64'); // Simulado
      }

      // 📝 Criar transação no banco
      const transaction = await PaymentRepository.createTransaction({
        cpf: cpfDigits,
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        planType: plan.toUpperCase(),
        amount: planDetails.price,
        pixKey,
        pixQRCode,
        mpTransactionId: null,
        mpStatus: null,
      });

      console.log(`[PremiumController] Checkout criado: ${transaction.id}`);

      return res.status(201).json({
        success: true,
        transaction: {
          id: transaction.id,
          status: payment === 'pix' ? 'pending_pix' : 'pending_payment',
          plan: planDetails.name,
          amount: planDetails.price,
          currency: 'BRL',
          pixKey: payment === 'pix' ? pixKey : null,
          pixQRCode: payment === 'pix' ? pixQRCode : null,
          expiresAt: transaction.expiresAt,
          createdAt: transaction.createdAt,
        }
      });

    } catch (error) {
      console.error('[PremiumController] Checkout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Checkout failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/premium/verify/:transactionId
   * Verificar status de transação
   */
  async verify(req, res) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID required'
        });
      }

      // 🔍 Buscar no banco
      const transaction = await PaymentRepository.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
          status: 'not_found'
        });
      }

      // ⏰ Verificar expiração
      if (transaction.status === 'PENDING_PIX' && new Date() > transaction.expiresAt) {
        await PaymentRepository.updateTransactionStatus(transactionId, 'EXPIRED');
        return res.status(410).json({
          success: false,
          error: 'Transaction expired',
          status: 'expired'
        });
      }

      return res.json({
        success: true,
        transaction: {
          id: transaction.id,
          status: transaction.status.toLowerCase(),
          plan: transaction.planType,
          amount: transaction.amount,
          currency: 'BRL',
          createdAt: transaction.createdAt,
          completedAt: transaction.completedAt,
          expiresAt: transaction.expiresAt,
        }
      });

    } catch (error) {
      console.error('[PremiumController] Verify error:', error);
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/premium/webhook/pix
   * Receber confirmação de pagamento PIX (do Mercado Pago ou banco)
   */
  async webhookPix(req, res) {
    try {
      const { transactionId, status, mpData } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID required'
        });
      }

      if (!['approved', 'confirmed', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      // 🔍 Buscar transação
      const transaction = await PaymentRepository.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // ✅ Confirmar pagamento
      await PaymentRepository.confirmPix(transactionId, {
        status: 'APPROVED',
        mpData: mpData || {},
        confirmedAt: new Date().toISOString(),
      });

      // 🎫 Gerar JWT token para acesso premium
      const planExpiry = {
        MONTHLY: 30,
        QUARTERLY: 90,
        ANNUAL: 365
      };

      const expiresIn = planExpiry[transaction.planType] || 30;
      const token = jwt.sign(
        {
          transactionId,
          email: transaction.email,
          plan: transaction.planType,
          type: 'premium',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (expiresIn * 24 * 60 * 60),
        },
        this.config.jwtSecret,
        { algorithm: 'HS256', expiresIn: `${expiresIn}d` }
      );

      console.log(`[PremiumController] Webhook confirmou pagamento: ${transactionId}`);

      return res.json({
        success: true,
        message: 'Payment confirmed successfully',
        token,
        transaction: {
          id: transaction.id,
          status: 'completed',
          plan: transaction.planType,
          expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
        }
      });

    } catch (error) {
      console.error('[PremiumController] Webhook error:', error);
      return res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/premium/status
   * Verificar status de sessão premium (requer JWT)
   */
  async getStatus(req, res) {
    try {
      // ✅ Validar JWT
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - missing or invalid token'
        });
      }

      const token = authHeader.substring(7);

      let decoded;
      try {
        decoded = jwt.verify(token, this.config.jwtSecret);
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - invalid token',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      // 🔍 Buscar transação original
      const transaction = await PaymentRepository.getTransactionById(decoded.transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      return res.json({
        success: true,
        status: 'active',
        premium: {
          email: transaction.email,
          plan: transaction.planType,
          status: transaction.status.toLowerCase(),
          activatedAt: transaction.completedAt,
          expiresAt: transaction.expiresAt,
        },
        token: {
          expiresIn: Math.floor((decoded.exp * 1000 - Date.now()) / 1000),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
        }
      });

    } catch (error) {
      console.error('[PremiumController] Status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Status check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = PremiumController;
