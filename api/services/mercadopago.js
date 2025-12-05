/**
 * 🏦 Mercado Pago Integration Service
 * ====================================
 * 
 * Integração completa com API do Mercado Pago para:
 * - Checkout Pro (preferência de pagamento)
 * - PIX (QR Code real)
 * - Webhooks IPN (notificações)
 * - Consulta de pagamentos
 * 
 * @see https://www.mercadopago.com.br/developers/pt/docs
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

class MercadoPagoService {
  constructor() {
    this.client = null;
    this.preference = null;
    this.payment = null;
    this.initialized = false;
  }

  /**
   * Inicializar cliente do Mercado Pago
   */
  initialize() {
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      console.warn('[MercadoPago] ⚠️ MP_ACCESS_TOKEN não configurado. Pagamentos desabilitados.');
      return false;
    }

    try {
      this.client = new MercadoPagoConfig({
        accessToken,
        options: {
          timeout: 5000,
        }
      });

      this.preference = new Preference(this.client);
      this.payment = new Payment(this.client);
      this.initialized = true;

      console.log('[MercadoPago] ✅ Serviço inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao inicializar:', error.message);
      return false;
    }
  }

  /**
   * Verificar se o serviço está pronto
   */
  isReady() {
    return this.initialized && this.client !== null;
  }

  /**
   * Criar preferência de pagamento (Checkout Pro)
   * 
   * @param {Object} options - Opções do pagamento
   * @param {string} options.transactionId - ID da transação interna
   * @param {string} options.title - Título do produto
   * @param {number} options.amount - Valor em BRL
   * @param {string} options.email - Email do comprador
   * @param {string} options.cpf - CPF do comprador
   * @param {string} options.name - Nome do comprador
   * @returns {Object} Preferência criada com URLs de checkout
   */
  async createPreference(options) {
    if (!this.isReady()) {
      throw new Error('MercadoPago não inicializado. Configure MP_ACCESS_TOKEN.');
    }

    const { transactionId, title, amount, email, cpf, name } = options;

    // URLs de callback
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const preferenceData = {
      items: [
        {
          id: transactionId,
          title: title || 'CannaConvert Premium',
          description: 'Acesso premium ao CannaConvert - Conversores de arquivos',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(amount),
        }
      ],
      payer: {
        email,
        identification: {
          type: 'CPF',
          number: cpf?.replace(/\D/g, ''),
        },
        first_name: name?.split(' ')[0] || 'Cliente',
        last_name: name?.split(' ').slice(1).join(' ') || 'CannaConvert',
      },
      back_urls: {
        success: `${baseUrl}/payment/success?transaction=${transactionId}`,
        failure: `${baseUrl}/payment/failure?transaction=${transactionId}`,
        pending: `${baseUrl}/payment/pending?transaction=${transactionId}`,
      },
      auto_return: 'approved',
      external_reference: transactionId,
      notification_url: `${backendUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'CANNACONVERT',
      payment_methods: {
        // Aceitar apenas PIX e cartão
        excluded_payment_types: [
          { id: 'ticket' }, // Boleto
        ],
        installments: 1, // Sem parcelamento
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };

    try {
      const response = await this.preference.create({ body: preferenceData });

      console.log(`[MercadoPago] ✅ Preferência criada: ${response.id}`);

      return {
        preferenceId: response.id,
        initPoint: response.init_point, // URL para checkout
        sandboxInitPoint: response.sandbox_init_point, // URL sandbox
        externalReference: transactionId,
      };
    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao criar preferência:', error);
      throw new Error(`Falha ao criar pagamento: ${error.message}`);
    }
  }

  /**
   * Criar pagamento PIX diretamente
   * 
   * @param {Object} options - Opções do pagamento PIX
   * @returns {Object} Dados do PIX (QR Code, copia-e-cola)
   */
  async createPixPayment(options) {
    if (!this.isReady()) {
      throw new Error('MercadoPago não inicializado. Configure MP_ACCESS_TOKEN.');
    }

    const { transactionId, amount, email, cpf, name } = options;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: 'CannaConvert Premium',
      payment_method_id: 'pix',
      payer: {
        email,
        identification: {
          type: 'CPF',
          number: cpf?.replace(/\D/g, ''),
        },
        first_name: name?.split(' ')[0] || 'Cliente',
        last_name: name?.split(' ').slice(1).join(' ') || 'CannaConvert',
      },
      external_reference: transactionId,
      notification_url: `${backendUrl}/api/webhooks/mercadopago`,
    };

    try {
      const response = await this.payment.create({ body: paymentData });

      console.log(`[MercadoPago] ✅ PIX criado: ${response.id}`);

      // Extrair dados do PIX
      const pixData = response.point_of_interaction?.transaction_data;

      return {
        paymentId: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        externalReference: transactionId,
        pix: {
          qrCode: pixData?.qr_code, // String do QR Code
          qrCodeBase64: pixData?.qr_code_base64, // Imagem base64
          ticketUrl: pixData?.ticket_url, // URL do ticket
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      };
    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao criar PIX:', error);
      throw new Error(`Falha ao gerar PIX: ${error.message}`);
    }
  }

  /**
   * Consultar status de um pagamento
   * 
   * @param {string} paymentId - ID do pagamento no Mercado Pago
   * @returns {Object} Dados do pagamento
   */
  async getPayment(paymentId) {
    if (!this.isReady()) {
      throw new Error('MercadoPago não inicializado.');
    }

    try {
      const response = await this.payment.get({ id: paymentId });

      return {
        id: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        externalReference: response.external_reference,
        amount: response.transaction_amount,
        paymentMethod: response.payment_method_id,
        paymentType: response.payment_type_id,
        payer: {
          email: response.payer?.email,
          identification: response.payer?.identification,
        },
        dateCreated: response.date_created,
        dateApproved: response.date_approved,
      };
    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao consultar pagamento:', error);
      throw new Error(`Falha ao consultar pagamento: ${error.message}`);
    }
  }

  /**
   * Consultar status de pagamento (alias direto para API /v1/payments/:id)
   * Retorna dados brutos do MP
   * 
   * @param {string} paymentId - ID do pagamento no Mercado Pago
   * @returns {Object|null} Dados completos do pagamento ou null se não encontrado
   */
  async getPaymentStatus(paymentId) {
    if (!this.isReady()) {
      throw new Error('MercadoPago não inicializado.');
    }

    try {
      const response = await this.payment.get({ id: paymentId });
      return response; // Retorna dados brutos completos
    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao consultar status:', error);
      if (error.message?.includes('404') || error.status === 404) {
        return null; // Pagamento não encontrado
      }
      throw error;
    }
  }

  /**
   * Processar webhook IPN do Mercado Pago
   * 
   * @param {Object} body - Body do webhook
   * @returns {Object} Dados processados
   */
  async processWebhook(body) {
    const { type, data, action } = body;

    console.log(`[MercadoPago] 📬 Webhook recebido: ${type} - ${action}`);

    // Tipos de notificação
    // - payment: Pagamento criado/atualizado
    // - merchant_order: Ordem do merchant atualizada
    // - chargebacks: Disputa de pagamento

    if (type === 'payment' && data?.id) {
      try {
        const payment = await this.getPayment(data.id);
        
        return {
          type: 'payment',
          paymentId: payment.id,
          status: payment.status,
          statusDetail: payment.statusDetail,
          transactionId: payment.externalReference,
          amount: payment.amount,
          approved: payment.status === 'approved',
        };
      } catch (error) {
        console.error('[MercadoPago] ❌ Erro ao processar webhook:', error);
        throw error;
      }
    }

    return {
      type,
      action,
      processed: false,
      reason: 'Tipo de notificação não processado',
    };
  }

  /**
   * Validar assinatura do webhook (segurança)
   * 
   * Implementação seguindo documentação do Mercado Pago:
   * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
   * 
   * O header x-signature contém: ts=<timestamp>,v1=<hash>
   * O hash é calculado com: HMAC-SHA256(template, webhookSecret)
   * Template: "id:{id};request-id:{x-request-id};ts:{ts};{payload}" ou simplificado
   * 
   * @param {string} xSignature - Header x-signature (formato: ts=xxx,v1=hash)
   * @param {string} xRequestId - Header x-request-id
   * @param {Object} body - Body do webhook
   * @returns {{valid: boolean, reason?: string}} Resultado da validação
   */
  validateWebhookSignature(xSignature, xRequestId, body) {
    const crypto = require('crypto');

    // Em ambiente de desenvolvimento, skip validação
    if (process.env.NODE_ENV === 'development') {
      console.log('[MercadoPago] ⚠️ Webhook signature validation skipped (development)');
      return { valid: true, reason: 'development_mode' };
    }

    // Verificar se secret está configurado
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[MercadoPago] ⚠️ MP_WEBHOOK_SECRET não configurado - validação desabilitada');
      return { valid: true, reason: 'no_secret_configured' };
    }

    // Verificar headers obrigatórios
    if (!xSignature || !xRequestId) {
      console.warn('[MercadoPago] ❌ Headers de assinatura ausentes');
      return { valid: false, reason: 'missing_headers' };
    }

    try {
      // Parse do x-signature (formato: ts=123456,v1=abc123...)
      const parts = xSignature.split(',');
      const signatureParts = {};
      
      for (const part of parts) {
        const [key, value] = part.split('=');
        signatureParts[key.trim()] = value?.trim();
      }

      const timestamp = signatureParts['ts'];
      const receivedHash = signatureParts['v1'];

      if (!timestamp || !receivedHash) {
        console.warn('[MercadoPago] ❌ Formato de x-signature inválido');
        return { valid: false, reason: 'invalid_signature_format' };
      }

      // Verificar timestamp (evitar replay attacks - 5 minutos de tolerância)
      const timestampMs = parseInt(timestamp);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (Math.abs(now - timestampMs) > fiveMinutes) {
        console.warn('[MercadoPago] ❌ Timestamp do webhook muito antigo ou futuro');
        return { valid: false, reason: 'timestamp_expired' };
      }

      // Construir template para hash
      // Formato: id:{data.id};request-id:{x-request-id};ts:{timestamp};
      const dataId = body?.data?.id || '';
      const template = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;

      // Calcular HMAC-SHA256
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(template)
        .digest('hex');

      // Comparação segura (timing-safe)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );

      if (!isValid) {
        console.warn('[MercadoPago] ❌ Hash do webhook não confere');
        return { valid: false, reason: 'invalid_hash' };
      }

      console.log('[MercadoPago] ✅ Webhook signature válida');
      return { valid: true, reason: 'signature_valid' };

    } catch (error) {
      console.error('[MercadoPago] ❌ Erro ao validar assinatura:', error.message);
      return { valid: false, reason: `error: ${error.message}` };
    }
  }

  /**
   * Mapear status do MP para status interno
   * 
   * @param {string} mpStatus - Status do Mercado Pago
   * @returns {string} Status interno
   */
  static mapStatus(mpStatus) {
    const statusMap = {
      'pending': 'PENDING_PIX',
      'approved': 'APPROVED',
      'authorized': 'APPROVED',
      'in_process': 'PENDING_PIX',
      'in_mediation': 'PENDING_PIX',
      'rejected': 'REJECTED',
      'cancelled': 'CANCELLED',
      'refunded': 'REFUNDED',
      'charged_back': 'CHARGED_BACK',
    };

    return statusMap[mpStatus] || 'UNKNOWN';
  }
}

// Singleton
const mercadoPagoService = new MercadoPagoService();

module.exports = {
  MercadoPagoService,
  mercadoPagoService,
};
