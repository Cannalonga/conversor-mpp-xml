/**
 * Payment Routes - Integração Mercado Pago
 * Processamento seguro de pagamentos com webhook validation
 */

const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/secure-logger');

const router = express.Router();

// Inicializar Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: {
        timeout: 5000,
        idempotencyKey: 'conversor-mpp-xml'
    }
});

const preference = new Preference(client);
const payment = new Payment(client);

// Database (PostgreSQL)
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * POST /api/payment/create-order
 * Criar pedido e preferência de pagamento
 */
router.post('/create-order', async (req, res) => {
    try {
        const { plan, customer, paymentMethod } = req.body;

        // Validar dados
        if (!plan || !customer || !paymentMethod) {
            return res.status(400).json({
                error: 'Dados incompletos'
            });
        }

        // Gerar order ID único
        const orderId = uuidv4();
        const externalReference = `CONVERSOR-${Date.now()}-${orderId.slice(0, 8)}`;

        // Preparar dados da preferência
        const preferenceData = {
            items: [
                {
                    id: plan.name.toLowerCase().replace(/\s+/g, '-'),
                    title: `Conversor MPP→XML - ${plan.name}`,
                    description: `Plano ${plan.name} - ${plan.period}`,
                    category_id: 'services',
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: plan.price
                }
            ],
            payer: {
                name: customer.firstName,
                surname: customer.lastName,
                email: customer.email,
                identification: {
                    type: customer.document.length === 11 ? 'CPF' : 'CNPJ',
                    number: customer.document
                },
                address: {
                    zip_code: '01310-100', // CEP padrão São Paulo
                    street_name: 'Av. Paulista'
                }
            },
            back_urls: {
                success: `${process.env.BASE_URL}/success?order=${orderId}`,
                failure: `${process.env.BASE_URL}/failure?order=${orderId}`,
                pending: `${process.env.BASE_URL}/pending?order=${orderId}`
            },
            auto_return: 'approved',
            external_reference: externalReference,
            notification_url: `${process.env.BASE_URL}/api/payment/webhook`,
            statement_descriptor: 'CONVERSOR MPP',
            expires: true,
            expiration_date_from: new Date().toISOString(),
            expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
            payment_methods: {
                excluded_payment_methods: [],
                excluded_payment_types: [],
                installments: paymentMethod === 'credit_card' ? 12 : 1
            }
        };

        // Configurar método de pagamento específico
        if (paymentMethod === 'pix') {
            preferenceData.payment_methods.excluded_payment_types = [
                { id: 'credit_card' },
                { id: 'debit_card' },
                { id: 'ticket' }
            ];
        } else if (paymentMethod === 'boleto') {
            preferenceData.payment_methods.excluded_payment_types = [
                { id: 'credit_card' },
                { id: 'debit_card' },
                { id: 'account_money' }
            ];
            preferenceData.payment_methods.included_payment_types = [
                { id: 'ticket' }
            ];
        }

        // Criar preferência no Mercado Pago
        const mpPreference = await preference.create({ body: preferenceData });

        // Salvar pedido no banco
        const orderQuery = `
            INSERT INTO orders (
                id, external_reference, customer_email, customer_name, 
                customer_document, plan_name, plan_price, payment_method,
                preference_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
            RETURNING *
        `;

        const orderValues = [
            orderId,
            externalReference,
            customer.email,
            `${customer.firstName} ${customer.lastName}`,
            customer.document,
            plan.name,
            plan.price,
            paymentMethod,
            mpPreference.id
        ];

        const orderResult = await pool.query(orderQuery, orderValues);

        // Log da criação do pedido
        logger.audit('ORDER_CREATED', {
            orderId: orderId,
            externalReference: externalReference,
            customerEmail: customer.email,
            planName: plan.name,
            planPrice: plan.price,
            paymentMethod: paymentMethod
        });

        // Resposta com dados do pagamento
        const responseData = {
            success: true,
            orderId: orderId,
            preferenceId: mpPreference.id,
            initPoint: mpPreference.init_point,
            sandboxInitPoint: mpPreference.sandbox_init_point
        };

        // Para PIX, gerar QR Code
        if (paymentMethod === 'pix') {
            responseData.pixCode = generatePixCode(mpPreference.id);
        }

        res.json(responseData);

    } catch (error) {
        logger.error('Erro ao criar pedido', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/payment/process-card
 * Processar pagamento com cartão de crédito
 */
router.post('/process-card', async (req, res) => {
    try {
        const { orderId, cardToken } = req.body;

        if (!orderId || !cardToken) {
            return res.status(400).json({
                error: 'Dados incompletos'
            });
        }

        // Buscar pedido
        const orderQuery = 'SELECT * FROM orders WHERE id = $1';
        const orderResult = await pool.query(orderQuery, [orderId]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Pedido não encontrado'
            });
        }

        const order = orderResult.rows[0];

        // Dados do pagamento
        const paymentData = {
            transaction_amount: order.plan_price,
            token: cardToken,
            description: `Conversor MPP→XML - ${order.plan_name}`,
            external_reference: order.external_reference,
            payment_method_id: 'visa', // Será determinado automaticamente pelo MP
            payer: {
                email: order.customer_email,
                identification: {
                    type: order.customer_document.length === 11 ? 'CPF' : 'CNPJ',
                    number: order.customer_document
                }
            },
            installments: req.body.installments || 1,
            notification_url: `${process.env.BASE_URL}/api/payment/webhook`
        };

        // Processar pagamento
        const paymentResult = await payment.create({ body: paymentData });

        // Atualizar pedido
        const updateQuery = `
            UPDATE orders 
            SET payment_id = $1, status = $2, updated_at = NOW()
            WHERE id = $3
        `;

        await pool.query(updateQuery, [
            paymentResult.id,
            paymentResult.status,
            orderId
        ]);

        // Log do processamento
        logger.audit('PAYMENT_PROCESSED', {
            orderId: orderId,
            paymentId: paymentResult.id,
            status: paymentResult.status,
            amount: paymentResult.transaction_amount
        });

        res.json({
            success: paymentResult.status === 'approved',
            paymentId: paymentResult.id,
            status: paymentResult.status,
            statusDetail: paymentResult.status_detail
        });

    } catch (error) {
        logger.error('Erro ao processar cartão', {
            error: error.message,
            stack: error.stack,
            orderId: req.body.orderId
        });

        res.status(500).json({
            error: 'Erro no processamento do pagamento'
        });
    }
});

/**
 * POST /api/payment/webhook
 * Webhook do Mercado Pago para notificações de pagamento
 */
router.post('/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        // Validar assinatura do webhook
        const signature = req.headers['x-signature'];
        if (!validateWebhookSignature(req.body, signature)) {
            logger.warn('Webhook signature inválida', {
                signature: signature,
                body: req.body
            });
            return res.status(401).json({ error: 'Unauthorized' });
        }

        logger.info('Webhook recebido', {
            type: type,
            dataId: data?.id
        });

        if (type === 'payment') {
            await processPaymentNotification(data.id);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        logger.error('Erro no webhook', {
            error: error.message,
            body: req.body
        });

        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/payment/status/:orderId
 * Verificar status do pagamento
 */
router.get('/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        const orderQuery = 'SELECT * FROM orders WHERE id = $1';
        const orderResult = await pool.query(orderQuery, [orderId]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Pedido não encontrado'
            });
        }

        const order = orderResult.rows[0];

        res.json({
            orderId: order.id,
            status: order.status,
            paid: order.status === 'approved',
            paymentMethod: order.payment_method,
            amount: order.plan_price,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        });

    } catch (error) {
        logger.error('Erro ao consultar status', {
            error: error.message,
            orderId: req.params.orderId
        });

        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Funções auxiliares

async function processPaymentNotification(paymentId) {
    try {
        // Buscar dados do pagamento no MP
        const paymentData = await payment.get({ id: paymentId });

        const externalReference = paymentData.external_reference;
        const status = paymentData.status;

        // Atualizar pedido no banco
        const updateQuery = `
            UPDATE orders 
            SET payment_id = $1, status = $2, updated_at = NOW()
            WHERE external_reference = $3
            RETURNING *
        `;

        const updateResult = await pool.query(updateQuery, [
            paymentId,
            status,
            externalReference
        ]);

        if (updateResult.rows.length > 0) {
            const order = updateResult.rows[0];

            logger.audit('PAYMENT_UPDATED', {
                orderId: order.id,
                paymentId: paymentId,
                status: status,
                externalReference: externalReference
            });

            // Se aprovado, processar pedido
            if (status === 'approved') {
                await processApprovedOrder(order);
            }
        }

    } catch (error) {
        logger.error('Erro ao processar notificação de pagamento', {
            error: error.message,
            paymentId: paymentId
        });
        throw error;
    }
}

async function processApprovedOrder(order) {
    try {
        // Enviar para fila de ativação
        const queueManager = req.app.locals.queueManager;

        await queueManager.addPaymentConfirmationJob({
            orderId: order.id,
            customerEmail: order.customer_email,
            planName: order.plan_name,
            paymentId: order.payment_id
        });

        logger.info('Pedido aprovado enviado para processamento', {
            orderId: order.id,
            customerEmail: order.customer_email
        });

    } catch (error) {
        logger.error('Erro ao processar pedido aprovado', {
            error: error.message,
            orderId: order.id
        });
        throw error;
    }
}

function validateWebhookSignature(body, signature) {
    if (!signature || !process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

function generatePixCode(preferenceId) {
    // Em produção, usar a API do MP para gerar o código PIX real
    return `00020126580014br.gov.bcb.pix0136${preferenceId}52040000530398654041000${Date.now()}6009SAO PAULO62070503***6304XXXX`;
}

module.exports = router;