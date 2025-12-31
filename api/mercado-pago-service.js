/**
 * Mercado Pago Payment Service
 * ============================
 * Integração completa com API do Mercado Pago
 * Suporta: QR Code PIX, Link de pagamento, Webhook
 */

const axios = require('axios');
const crypto = require('crypto');

class MercadoPagoService {
  constructor(config = {}) {
    this.accessToken = config.accessToken || process.env.MP_ACCESS_TOKEN;
    this.publicKey = config.publicKey || process.env.MP_PUBLIC_KEY;
    this.environment = config.environment || process.env.MERCADO_PAGO_ENVIRONMENT || 'test';
    this.webhookSecret = config.webhookSecret || process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    
    // URLs da API
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.mercadopago.com'
      : 'https://api.sandbox.mercadopago.com';
    
    // Cliente HTTP
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!this.accessToken) {
      console.warn('[MercadoPagoService] ⚠️ Access token não configurado. Pagamentos não funcionarão!');
    }
  }

  /**
   * Criar preferência de pagamento (PIX + Link)
   * Retorna: QR Code PIX, Link de pagamento, ID da transação
   */
  async createPaymentPreference(data) {
    try {
      const {
        amount,
        description,
        email,
        cpf,
        plan,
        returnUrl,
        backUrl,
        notificationUrl
      } = data;

      // Validar dados obrigatórios
      if (!amount || !description || !email) {
        throw new Error('Missing required fields: amount, description, email');
      }

      // Construir payload
      const paymentPreference = {
        items: [
          {
            title: description,
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: 'BRL'
          }
        ],
        payer: {
          email: email,
          identification: {
            type: 'CPF',
            number: cpf ? cpf.replace(/\D/g, '') : '00000000000'
          }
        },
        payment_methods: {
          excluded_payment_types: [
            { id: 'atm' },
            { id: 'ticket' }
          ],
          installments: 1
        },
        back_urls: {
          success: backUrl || `${process.env.APP_URL || 'http://localhost:3000'}/pagamento/sucesso`,
          failure: backUrl || `${process.env.APP_URL || 'http://localhost:3000'}/pagamento/erro`,
          pending: backUrl || `${process.env.APP_URL || 'http://localhost:3000'}/pagamento/pendente`
        },
        auto_return: 'approved',
        external_reference: plan || 'credits',
        notification_url: notificationUrl || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook/mercadopago`,
        statement_descriptor: 'CANNACONVERT',
        expires: false
      };

      console.log('[MercadoPagoService] Criando preferência de pagamento...');
      const response = await this.client.post('/checkout/preferences', paymentPreference);

      if (response.status !== 201) {
        throw new Error(`Failed to create preference: ${response.status}`);
      }

      const preference = response.data;

      console.log(`[MercadoPagoService] ✅ Preferência criada: ${preference.id}`);

      return {
        success: true,
        preferenceId: preference.id,
        checkoutUrl: preference.init_point,
        checkoutQR: preference.sandbox_init_point || preference.init_point, // URL do checkout
        qrCode: null, // PIX QR Code será gerado via webhook
        pixKey: null,
        transactionId: preference.id,
        amount: amount,
        status: 'pending'
      };

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao criar preferência:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Criar pagamento PIX (QR Code)
   * Retorna QR Code estático do PIX
   */
  async createPixPayment(data) {
    try {
      const {
        amount,
        description,
        email,
        cpf,
        orderId
      } = data;

      // Validar dados
      if (!amount || !description) {
        throw new Error('Missing required fields: amount, description');
      }

      // Payload do pagamento PIX
      const paymentPayload = {
        transaction_amount: parseFloat(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: email || 'anonymous@example.com',
          identification: {
            type: 'CPF',
            number: cpf ? cpf.replace(/\D/g, '') : '00000000000'
          }
        },
        external_reference: orderId || crypto.randomBytes(8).toString('hex')
      };

      console.log('[MercadoPagoService] Criando pagamento PIX...');
      const response = await this.client.post('/v1/payments', paymentPayload);

      if (!response.data) {
        throw new Error('Invalid response from API');
      }

      const payment = response.data;

      // Verificar se tem QR Code
      if (payment.point_of_interaction?.transaction_data?.qr_code) {
        const qrCode = payment.point_of_interaction.transaction_data.qr_code;

        console.log(`[MercadoPagoService] ✅ PIX criado: ${payment.id}`);

        return {
          success: true,
          transactionId: payment.id,
          orderId: payment.external_reference,
          qrCode: qrCode,
          pixKey: qrCode, // No MP, o "pixKey" é o QR code mesmo
          amount: amount,
          status: payment.status,
          statusDetail: payment.status_detail
        };
      } else {
        throw new Error('QR Code não gerado pelo Mercado Pago');
      }

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao criar PIX:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar status de pagamento
   */
  async getPaymentStatus(paymentId) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID required');
      }

      const response = await this.client.get(`/v1/payments/${paymentId}`);
      const payment = response.data;

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        amount: payment.transaction_amount,
        payer: payment.payer?.email,
        approvedAt: payment.date_approved,
        createdAt: payment.date_created
      };

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao buscar status:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar status de preferência (checkout)
   */
  async getPreferenceStatus(preferenceId) {
    try {
      if (!preferenceId) {
        throw new Error('Preference ID required');
      }

      const response = await this.client.get(`/checkout/preferences/${preferenceId}`);
      const preference = response.data;

      return {
        success: true,
        preferenceId: preference.id,
        status: 'active',
        checkoutUrl: preference.init_point,
        paymentsMade: preference.payments
      };

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao buscar preferência:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validar webhook (verificar assinatura)
   */
  validateWebhook(body, headers) {
    try {
      const xSignature = headers['x-signature'];
      const xRequestId = headers['x-request-id'];

      if (!xSignature || !xRequestId) {
        return false;
      }

      // Criar hash da requisição
      // Formato: timestamp|id|signature_v1|signature_v2
      const parts = xSignature.split(',');
      if (parts.length < 3) return false;

      // Extrair timestamp e signature v1
      const timestampPart = parts[0].split('=')[1];
      const signaturePart = parts[1].split('=')[1];

      // Construir string para hash
      const payload = `id=${body.data?.id},request-id=${xRequestId},timestamp=${timestampPart}`;

      // Criar HMAC
      const hash = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return hash === signaturePart;

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao validar webhook:', error.message);
      return false;
    }
  }

  /**
   * Processar webhook de pagamento
   */
  async processWebhook(body) {
    try {
      const { type, data } = body;

      if (type === 'payment') {
        const paymentId = data.id;
        const paymentStatus = await this.getPaymentStatus(paymentId);

        return {
          success: true,
          type: 'payment',
          paymentId: paymentId,
          status: paymentStatus.status,
          amount: paymentStatus.amount,
          payer: paymentStatus.payer
        };
      }

      return {
        success: true,
        type: type,
        message: 'Webhook processed'
      };

    } catch (error) {
      console.error('[MercadoPagoService] Erro ao processar webhook:', error.message);
      throw error;
    }
  }
}

module.exports = MercadoPagoService;
