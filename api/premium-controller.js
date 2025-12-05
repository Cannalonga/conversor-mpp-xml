/**
 * Premium Payment Controller
 * =========================
 * 
 * Controlador para endpoints de pagamento premium
 * Integração REAL com Mercado Pago + Sistema de Créditos
 * 
 * Endpoints:
 * - POST /api/premium/checkout → Criar preferência de pagamento
 * - POST /api/premium/pix → Criar pagamento PIX direto
 * - GET /api/premium/verify/:id → Verificar status
 * - POST /api/premium/webhook → Receber notificações MP
 * - GET /api/premium/status → Status de sessão
 * - GET /api/credits/balance → Saldo de créditos
 * - GET /api/credits/history → Histórico de transações
 * - GET /api/credits/plans → Planos disponíveis
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PaymentRepository, AdminRepository } = require('./database');
const { mercadoPagoService, MercadoPagoService } = require('./services/mercadopago');
const { creditService } = require('./services/credit-service');
const { CREDIT_PLANS, getAllPlans, getPlanById, isValidPlan, CONVERSION_COSTS, getConversionCost } = require('./config/credit-plans');

// ✅ Módulos padronizados MP (Task 1, 4, 9)
const { 
  normalizeMpStatus, 
  isPaid, 
  shouldApplyCredits,
  getStatusInfo 
} = require('../src/lib/payments/mp/normalizeMpStatus');
const { 
  logMpReceived, 
  logMpDuplicate, 
  logMpInvalidSignature, 
  logMpCreditApplied,
  logMpSkipped,
  logMpError 
} = require('../src/lib/payments/mp/mpLogger');

class PremiumController {
  constructor(config = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET_KEY,
      jwtExpiration: config.jwtExpiration || 24,
      pixExpiresIn: config.pixExpiresIn || 30, // 30 minutos
      ...config
    };

    // Inicializar Mercado Pago
    this.mpReady = mercadoPagoService.initialize();
    if (!this.mpReady) {
      console.warn('[PremiumController] ⚠️ Mercado Pago não configurado - usando modo simulação');
    }
  }

  /**
   * POST /api/premium/checkout
   * Criar preferência de pagamento (Checkout Pro do Mercado Pago)
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

      // ✅ Validar plano de créditos
      if (!isValidPlan(plan)) {
        return res.status(400).json({
          success: false,
          error: `Invalid plan. Valid: ${Object.keys(CREDIT_PLANS).join(', ')}`
        });
      }

      const planDetails = getPlanById(plan);

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

      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

      // Mapear plano de créditos para planType do banco (compatibilidade)
      const planTypeMap = {
        'basic': 'MONTHLY',
        'pro': 'QUARTERLY', 
        'business': 'ANNUAL',
        'enterprise': 'ANNUAL',
      };
      const dbPlanType = planTypeMap[plan] || 'MONTHLY';

      // 📝 Criar transação no banco (pendente)
      const transaction = await PaymentRepository.createTransaction({
        cpf: cpfDigits,
        email: customer.email,
        name: customerName,
        planType: dbPlanType,
        amount: planDetails.price,
        mpTransactionId: null,
        mpStatus: 'pending',
      });

      // 🏦 Criar preferência no Mercado Pago
      if (mercadoPagoService.isReady()) {
        try {
          const mpPreference = await mercadoPagoService.createPreference({
            transactionId: transaction.id,
            title: `CannaConvert ${planDetails.name} (${planDetails.credits} créditos)`,
            amount: planDetails.price,
            email: customer.email,
            cpf: cpfDigits,
            name: customerName,
          });

          // Atualizar transação com ID do MP
          await PaymentRepository.updateTransaction(transaction.id, {
            mpTransactionId: mpPreference.preferenceId,
          });

          console.log(`[PremiumController] ✅ Checkout MP criado: ${transaction.id}`);

          return res.status(201).json({
            success: true,
            transaction: {
              id: transaction.id,
              status: 'pending_payment',
              plan: planDetails.name,
              credits: planDetails.credits,
              amount: planDetails.price,
              currency: 'BRL',
              expiresAt: transaction.expiresAt,
            },
            mercadoPago: {
              preferenceId: mpPreference.preferenceId,
              checkoutUrl: mpPreference.initPoint,
              sandboxUrl: mpPreference.sandboxInitPoint,
            }
          });
        } catch (mpError) {
          console.error('[PremiumController] Erro MP:', mpError.message);
          // Fallback para modo simulação se MP falhar
        }
      }

      // 🔄 Modo simulação (quando MP não está configurado)
      console.log(`[PremiumController] ⚠️ Checkout em modo simulação: ${transaction.id}`);

      return res.status(201).json({
        success: true,
        warning: 'Mercado Pago não configurado - modo simulação ativo',
        transaction: {
          id: transaction.id,
          status: 'pending_payment',
          plan: planDetails.name,
          credits: planDetails.credits,
          amount: planDetails.price,
          currency: 'BRL',
          expiresAt: transaction.expiresAt,
        },
        simulation: {
          message: 'Configure MP_ACCESS_TOKEN para pagamentos reais',
          testApproveUrl: `/api/premium/simulate/approve/${transaction.id}`,
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
   * POST /api/premium/pix
   * Criar pagamento PIX direto (sem checkout page)
   */
  async createPix(req, res) {
    try {
      const { plan, customer } = req.body;

      // Validações básicas
      if (!plan || !customer?.email || !customer?.cpf) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: plan, customer.email, customer.cpf'
        });
      }

      // ✅ Validar plano de créditos
      if (!isValidPlan(plan)) {
        return res.status(400).json({
          success: false,
          error: `Invalid plan. Valid: ${Object.keys(CREDIT_PLANS).join(', ')}`
        });
      }

      const planDetails = getPlanById(plan);
      const cpfDigits = customer.cpf?.replace(/\D/g, '') || '';
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

      // ✅ Mapear plan ID para PlanType enum do Prisma
      const planTypeMap = {
        basic: 'MONTHLY',
        pro: 'QUARTERLY',
        business: 'QUARTERLY',
        enterprise: 'ANNUAL'
      };
      const planType = planTypeMap[plan] || 'MONTHLY';

      // Criar transação no banco
      const transaction = await PaymentRepository.createTransaction({
        cpf: cpfDigits,
        email: customer.email,
        name: customerName,
        planType: planType,
        amount: planDetails.price,
        mpStatus: 'pending',
      });

      // Criar PIX via Mercado Pago
      if (mercadoPagoService.isReady()) {
        try {
          const pixResponse = await mercadoPagoService.createPixPayment({
            transactionId: transaction.id,
            amount: planDetails.price,
            email: customer.email,
            cpf: cpfDigits,
            name: customerName,
          });

          // Atualizar transação
          await PaymentRepository.updateTransaction(transaction.id, {
            mpTransactionId: String(pixResponse.paymentId),
            mpStatus: pixResponse.status,
            pixKey: pixResponse.pix?.qrCode,
            pixQRCode: pixResponse.pix?.qrCodeBase64,
          });

          console.log(`[PremiumController] ✅ PIX criado: ${transaction.id}`);

          return res.status(201).json({
            success: true,
            transaction: {
              id: transaction.id,
              status: 'pending_pix',
              plan: planDetails.name,
              amount: planDetails.price,
            },
            pix: {
              qrCode: pixResponse.pix?.qrCode,
              qrCodeBase64: pixResponse.pix?.qrCodeBase64,
              ticketUrl: pixResponse.pix?.ticketUrl,
              expiresAt: pixResponse.expiresAt,
            }
          });
        } catch (mpError) {
          console.error('[PremiumController] Erro PIX MP:', mpError.message);
        }
      }

      // Modo simulação
      const fakePixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomBytes(16).toString('hex')}`;

      return res.status(201).json({
        success: true,
        warning: 'Mercado Pago não configurado - PIX simulado',
        transaction: {
          id: transaction.id,
          status: 'pending_pix',
          plan: planDetails.name,
          amount: planDetails.price,
        },
        pix: {
          qrCode: fakePixCode,
          qrCodeBase64: Buffer.from(fakePixCode).toString('base64'),
          simulation: true,
        }
      });

    } catch (error) {
      console.error('[PremiumController] PIX error:', error);
      return res.status(500).json({
        success: false,
        error: 'PIX generation failed',
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
   * POST /api/premium/webhook ou /api/webhooks/mercadopago
   * Receber notificações IPN do Mercado Pago
   * ✅ ATUALIZADO: Usa módulos padronizados (Task 1, 4, 6, 9)
   */
  async webhookMercadoPago(req, res) {
    try {
      const { type, data, action } = req.body;
      const paymentId = data?.id;

      // ✅ Log padronizado
      logMpReceived({ type, action, paymentId, body: req.body });

      // Validar assinatura (segurança)
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];

      const signatureValidation = mercadoPagoService.validateWebhookSignature(xSignature, xRequestId, req.body);
      
      if (!signatureValidation.valid) {
        logMpInvalidSignature({ reason: signatureValidation.reason, paymentId });
        
        // Em produção, rejeitar webhooks com assinatura inválida
        if (process.env.NODE_ENV === 'production' && signatureValidation.reason !== 'no_secret_configured') {
          return res.status(401).json({
            success: false,
            error: 'Invalid webhook signature',
            reason: signatureValidation.reason,
          });
        }
      }

      // Processar webhook via serviço MP
      if (mercadoPagoService.isReady() && type === 'payment' && paymentId) {
        const result = await mercadoPagoService.processWebhook(req.body);

        // ✅ Normalizar status MP para interno
        const internalStatus = normalizeMpStatus(result.status);
        const statusInfo = getStatusInfo(result.status);

        // ✅ Só processar se deve aplicar créditos
        if (!shouldApplyCredits(result.status)) {
          logMpSkipped({
            paymentId,
            status: result.status,
            normalizedStatus: internalStatus,
            reason: `Status ${result.status} não requer créditos`,
          });
          return res.status(200).json({ 
            received: true, 
            status: internalStatus,
            action: 'skipped',
          });
        }

        if (result.approved && result.transactionId) {
          // Buscar transação interna
          const transaction = await PaymentRepository.getTransactionById(result.transactionId);

          if (transaction && transaction.status !== 'APPROVED') {
            // Confirmar pagamento
            await PaymentRepository.confirmPix(result.transactionId, {
              status: 'APPROVED',
              mpData: JSON.stringify(result),
              confirmedAt: new Date().toISOString(),
            });

            // Atualizar com dados do MP
            await PaymentRepository.updateTransaction(result.transactionId, {
              mpTransactionId: String(result.paymentId),
              mpStatus: result.status,
            });

            // 💰 CREDITAR OS CRÉDITOS DO PLANO (IDEMPOTENTE via PaymentEvent)
            // Mapear amount para planId
            const planById = {
              9.90: 'basic',
              29.90: 'pro',
              59.90: 'business',
              199.90: 'enterprise'
            };
            const planId = planById[transaction.amount] || 'basic';
            const userId = transaction.email; // Email como userId
            
            try {
              const creditResult = await creditService.addCreditsFromPurchase({
                userId,
                planId,
                transactionId: result.transactionId,
                paymentId: String(result.paymentId),
                provider: 'mercadopago',
                amount: transaction.amount,
                rawPayload: JSON.stringify(req.body),
              });

              if (creditResult.alreadyProcessed) {
                // ✅ Log padronizado para duplicata
                logMpDuplicate({
                  paymentId: result.paymentId,
                  existingEventId: creditResult.existingEventId,
                  userId,
                });
              } else {
                // ✅ Log padronizado para crédito aplicado
                logMpCreditApplied({
                  userId,
                  creditsAdded: creditResult.creditsAdded,
                  newBalance: creditResult.newBalance,
                  paymentId: result.paymentId,
                  planId,
                });
              }
            } catch (creditError) {
              // ✅ Log padronizado para erro
              logMpError({
                paymentId: result.paymentId,
                error: creditError,
                context: 'credit_application',
              });
              // Não falha o webhook, mas loga para investigação
            }

            // Gerar token JWT
            const token = jwt.sign(
              {
                transactionId: result.transactionId,
                email: transaction.email,
                plan: transaction.planType,
                type: 'premium',
              },
              this.config.jwtSecret,
              { algorithm: 'HS256', expiresIn: '365d' }
            );

            console.log(`[PremiumController] ✅ Pagamento aprovado via webhook: ${result.transactionId}`);

            // TODO: Enviar email de confirmação ao cliente

            return res.status(200).json({
              success: true,
              message: 'Payment confirmed and credits added',
              transactionId: result.transactionId,
              internalStatus, // ✅ Retornar status normalizado
            });
          }
        }
      }

      // Responder OK para o MP (evitar retries)
      return res.status(200).json({ received: true });

    } catch (error) {
      logMpError({ error, context: 'webhook_processing' });
      // Sempre retornar 200 para o MP não reenviar
      return res.status(200).json({
        received: true,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/premium/webhook/pix (legado)
   * Receber confirmação de pagamento PIX manual
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

  /**
   * POST /api/premium/simulate/approve/:transactionId
   * Simular aprovação de pagamento (APENAS DESENVOLVIMENTO)
   */
  async simulateApprove(req, res) {
    // Apenas em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Simulation not available in production'
      });
    }

    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID required'
        });
      }

      const transaction = await PaymentRepository.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Confirmar pagamento
      await PaymentRepository.confirmPix(transactionId, {
        status: 'APPROVED',
        mpData: JSON.stringify({ simulation: true, approvedAt: new Date().toISOString() }),
        confirmedAt: new Date().toISOString(),
      });

      // 💰 CREDITAR OS CRÉDITOS DO PLANO (igual ao webhook)
      const planById = {
        9.90: 'basic',
        29.90: 'pro',
        59.90: 'business',
        199.90: 'enterprise'
      };
      const planId = planById[transaction.amount] || 'basic';
      const userId = transaction.email;

      let creditsAdded = 0;
      try {
        const creditResult = await creditService.addCreditsFromPurchase({
          userId,
          planId,
          transactionId,
          paymentId: `SIM_${transactionId}`,
          provider: 'simulation',
          amount: transaction.amount,
        });

        if (!creditResult.alreadyProcessed) {
          creditsAdded = creditResult.creditsAdded;
          console.log(`[PremiumController] 💰 ${creditsAdded} créditos simulados adicionados para ${userId}`);
        } else {
          console.log(`[PremiumController] ⚠️ Créditos já foram adicionados anteriormente`);
        }
      } catch (creditError) {
        console.error('[PremiumController] ❌ Erro ao creditar (simulação):', creditError.message);
      }

      // Gerar token JWT
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
        },
        this.config.jwtSecret,
        { algorithm: 'HS256', expiresIn: `${expiresIn}d` }
      );

      console.log(`[PremiumController] 🧪 Pagamento SIMULADO aprovado: ${transactionId}`);

      return res.json({
        success: true,
        message: 'Payment simulated successfully',
        simulation: true,
        creditsAdded,
        token,
        transaction: {
          id: transactionId,
          status: 'approved',
          plan: transaction.planType,
        }
      });

    } catch (error) {
      console.error('[PremiumController] Simulation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Simulation failed',
      });
    }
  }

  /**
   * GET /api/premium/config
   * Retorna configuração pública do pagamento (para frontend)
   */
  async getConfig(req, res) {
    return res.json({
      success: true,
      config: {
        publicKey: process.env.MP_PUBLIC_KEY || null,
        enabled: mercadoPagoService.isReady(),
        plans: getAllPlans(),
        conversionCosts: CONVERSION_COSTS,
        methods: ['pix', 'credit_card'],
      }
    });
  }

  /**
   * GET /api/payments/mp/status/:paymentId
   * Consulta status de um pagamento diretamente no Mercado Pago
   * ✅ ATUALIZADO: Usa normalizador de status (Task 7)
   */
  async getMercadoPagoStatus(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment ID required'
        });
      }

      // Verificar se MP está disponível
      if (!mercadoPagoService.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Mercado Pago service unavailable'
        });
      }

      // Consultar diretamente no Mercado Pago
      const mpStatus = await mercadoPagoService.getPaymentStatus(paymentId);

      if (!mpStatus) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found in Mercado Pago'
        });
      }

      // ✅ Normalizar status MP para interno
      const internalStatus = normalizeMpStatus(mpStatus.status);
      const statusInfo = getStatusInfo(mpStatus.status);

      // Verificar se temos transação interna relacionada
      const internalTransaction = await PaymentRepository.getTransactionByMpId(paymentId);

      return res.json({
        success: true,
        payment: {
          id: mpStatus.id,
          // ✅ Status original e normalizado
          mpStatus: mpStatus.status,
          status: internalStatus,
          statusInfo: statusInfo,
          isPaid: isPaid(mpStatus.status),
          statusDetail: mpStatus.status_detail,
          amount: mpStatus.transaction_amount,
          currency: mpStatus.currency_id,
          paymentMethod: mpStatus.payment_method_id,
          paymentType: mpStatus.payment_type_id,
          dateCreated: mpStatus.date_created,
          dateApproved: mpStatus.date_approved,
          externalReference: mpStatus.external_reference,
        },
        internal: internalTransaction ? {
          id: internalTransaction.id,
          status: internalTransaction.status,
          email: internalTransaction.email,
          plan: internalTransaction.planType,
          creditsAdded: internalTransaction.status === 'APPROVED',
        } : null,
      });
    } catch (error) {
      console.error('[PremiumController] MP Status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check payment status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ========================================
  // 💳 ENDPOINTS DE CRÉDITOS
  // ========================================

  /**
   * GET /api/credits/balance
   * Retorna o saldo de créditos do usuário
   */
  async getCreditsBalance(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required (via auth, query param, or x-user-id header)'
        });
      }

      const balance = await creditService.getBalance(userId);

      return res.json({
        success: true,
        userId,
        balance,
        currency: 'credits',
      });
    } catch (error) {
      console.error('[PremiumController] Get balance error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get balance',
      });
    }
  }

  /**
   * GET /api/credits/history
   * Retorna histórico de transações de créditos
   */
  async getCreditsHistory(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required'
        });
      }

      const { limit = 50, offset = 0, type } = req.query;

      const history = await creditService.getTransactionHistory(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        type: type || null,
      });

      return res.json({
        success: true,
        userId,
        ...history,
      });
    } catch (error) {
      console.error('[PremiumController] Get history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get history',
      });
    }
  }

  /**
   * GET /api/credits/stats
   * Retorna estatísticas de uso de créditos do usuário
   */
  async getCreditsStats(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required'
        });
      }

      const stats = await creditService.getUserStats(userId);

      return res.json({
        success: true,
        userId,
        stats,
      });
    } catch (error) {
      console.error('[PremiumController] Get stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  }

  /**
   * GET /api/credits/plans
   * Retorna planos de créditos disponíveis
   */
  async getCreditPlans(req, res) {
    return res.json({
      success: true,
      plans: getAllPlans(),
      conversionCosts: CONVERSION_COSTS,
    });
  }

  /**
   * POST /api/credits/check
   * Verifica se usuário tem créditos suficientes para uma conversão
   */
  async checkCredits(req, res) {
    try {
      const { userId, converterId } = req.body;
      const userIdParam = userId || req.user?.id || req.headers['x-user-id'];

      if (!userIdParam || !converterId) {
        return res.status(400).json({
          success: false,
          error: 'userId and converterId required'
        });
      }

      const cost = getConversionCost(converterId);
      const balance = await creditService.getBalance(userIdParam);
      const hasEnough = balance >= cost;

      return res.json({
        success: true,
        userId: userIdParam,
        converterId,
        cost,
        balance,
        hasEnough,
        message: hasEnough 
          ? `Você tem ${balance} créditos. Esta conversão custa ${cost}.`
          : `Créditos insuficientes. Você tem ${balance}, mas precisa de ${cost}.`,
      });
    } catch (error) {
      console.error('[PremiumController] Check credits error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check credits',
      });
    }
  }
}

module.exports = PremiumController;
