/**
 * Financial Reconciliation Script
 * Relatório diário que cruza pedidos pagos vs conversões entregues
 * Detecta discrepâncias e gera relatórios para contabilidade
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { createObjectCsvWriter } = require('csv-writer');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const logger = require('../../src/utils/secure-logger');

class FinancialReconciliation {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
        });

        this.payment = new Payment(this.mpClient);

        this.outputDir = './reports/financial';
        this.today = new Date().toISOString().split('T')[0];
        
        // Métricas do relatório
        this.metrics = {
            totalOrders: 0,
            paidOrders: 0,
            deliveredConversions: 0,
            pendingDeliveries: 0,
            failedConversions: 0,
            totalRevenue: 0,
            mpFees: 0,
            netRevenue: 0,
            discrepancies: []
        };
    }

    async initialize() {
        // Criar diretório de relatórios
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            logger.info('📊 Iniciando conciliação financeira', {
                date: this.today,
                outputDir: this.outputDir
            });
        } catch (error) {
            logger.error('Erro ao criar diretório de relatórios', { error: error.message });
            throw error;
        }
    }

    /**
     * Executar conciliação completa
     */
    async runReconciliation(date = null) {
        const targetDate = date || this.today;
        
        try {
            await this.initialize();

            logger.info('🔄 Iniciando conciliação', { date: targetDate });

            // 1. Obter dados dos pedidos do dia
            const ordersData = await this.getOrdersData(targetDate);
            
            // 2. Obter dados de conversões do dia
            const conversionsData = await this.getConversionsData(targetDate);
            
            // 3. Sincronizar com Mercado Pago
            const mpData = await this.getMercadoPagoData(targetDate);
            
            // 4. Executar conciliação
            const reconciliationResult = await this.reconcileData(ordersData, conversionsData, mpData);
            
            // 5. Gerar relatórios
            await this.generateReports(reconciliationResult, targetDate);
            
            // 6. Detectar e reportar discrepâncias
            await this.detectDiscrepancies(reconciliationResult);
            
            logger.info('✅ Conciliação finalizada', {
                date: targetDate,
                metrics: this.metrics
            });

            return reconciliationResult;

        } catch (error) {
            logger.error('❌ Erro na conciliação financeira', {
                error: error.message,
                stack: error.stack,
                date: targetDate
            });
            throw error;
        }
    }

    /**
     * Obter dados de pedidos do banco
     */
    async getOrdersData(date) {
        const query = `
            SELECT 
                o.id,
                o.external_reference,
                o.customer_email,
                o.customer_name,
                o.plan_name,
                o.plan_price,
                o.payment_method,
                o.status,
                o.payment_id,
                o.created_at,
                o.updated_at,
                p.mp_fee,
                p.net_amount
            FROM orders o
            LEFT JOIN payments p ON o.payment_id = p.id
            WHERE DATE(o.created_at) = $1
            ORDER BY o.created_at
        `;

        const result = await this.pool.query(query, [date]);
        
        const orders = result.rows.map(row => ({
            ...row,
            plan_price: parseFloat(row.plan_price),
            mp_fee: parseFloat(row.mp_fee) || 0,
            net_amount: parseFloat(row.net_amount) || 0
        }));

        this.metrics.totalOrders = orders.length;
        this.metrics.paidOrders = orders.filter(o => o.status === 'approved').length;

        logger.info('📋 Dados de pedidos obtidos', {
            date: date,
            totalOrders: this.metrics.totalOrders,
            paidOrders: this.metrics.paidOrders
        });

        return orders;
    }

    /**
     * Obter dados de conversões do dia
     */
    async getConversionsData(date) {
        const query = `
            SELECT 
                c.id,
                c.order_id,
                c.file_name,
                c.file_size,
                c.status,
                c.started_at,
                c.completed_at,
                c.error_message,
                c.processing_time_ms,
                o.customer_email,
                o.plan_name
            FROM conversions c
            JOIN orders o ON c.order_id = o.id
            WHERE DATE(c.started_at) = $1
            ORDER BY c.started_at
        `;

        const result = await this.pool.query(query, [date]);
        const conversions = result.rows;

        this.metrics.deliveredConversions = conversions.filter(c => c.status === 'completed').length;
        this.metrics.failedConversions = conversions.filter(c => c.status === 'failed').length;
        this.metrics.pendingDeliveries = conversions.filter(c => c.status === 'processing').length;

        logger.info('🔄 Dados de conversões obtidos', {
            date: date,
            delivered: this.metrics.deliveredConversions,
            failed: this.metrics.failedConversions,
            pending: this.metrics.pendingDeliveries
        });

        return conversions;
    }

    /**
     * Obter dados do Mercado Pago
     */
    async getMercadoPagoData(date) {
        try {
            const startDate = `${date}T00:00:00.000-03:00`;
            const endDate = `${date}T23:59:59.999-03:00`;

            // Buscar pagamentos do período
            const searchParams = {
                begin_date: startDate,
                end_date: endDate,
                sort: 'date_created',
                criteria: 'desc',
                range: 'date_created',
                limit: 1000
            };

            const mpPayments = await this.payment.search(searchParams);

            const payments = mpPayments.results.map(payment => ({
                id: payment.id,
                external_reference: payment.external_reference,
                status: payment.status,
                transaction_amount: payment.transaction_amount,
                fee_amount: payment.fee_details?.reduce((sum, fee) => sum + fee.amount, 0) || 0,
                net_amount: payment.transaction_amount - (payment.fee_details?.reduce((sum, fee) => sum + fee.amount, 0) || 0),
                payment_method: payment.payment_method_id,
                date_created: payment.date_created,
                date_approved: payment.date_approved
            }));

            // Calcular métricas financeiras
            const approvedPayments = payments.filter(p => p.status === 'approved');
            this.metrics.totalRevenue = approvedPayments.reduce((sum, p) => sum + p.transaction_amount, 0);
            this.metrics.mpFees = approvedPayments.reduce((sum, p) => sum + p.fee_amount, 0);
            this.metrics.netRevenue = approvedPayments.reduce((sum, p) => sum + p.net_amount, 0);

            logger.info('💰 Dados do Mercado Pago obtidos', {
                date: date,
                totalPayments: payments.length,
                approvedPayments: approvedPayments.length,
                totalRevenue: this.metrics.totalRevenue,
                mpFees: this.metrics.mpFees,
                netRevenue: this.metrics.netRevenue
            });

            return payments;

        } catch (error) {
            logger.error('Erro ao obter dados do Mercado Pago', {
                error: error.message,
                date: date
            });
            return [];
        }
    }

    /**
     * Executar conciliação entre as fontes de dados
     */
    async reconcileData(orders, conversions, mpPayments) {
        const reconciliation = {
            matched: [],
            unmatched: {
                orders: [],
                mpPayments: [],
                conversions: []
            },
            discrepancies: []
        };

        // Criar índices para busca rápida
        const ordersByPaymentId = new Map();
        const conversionsByOrderId = new Map();
        const mpPaymentsByReference = new Map();

        orders.forEach(order => {
            if (order.payment_id) {
                ordersByPaymentId.set(order.payment_id.toString(), order);
            }
        });

        conversions.forEach(conversion => {
            if (!conversionsByOrderId.has(conversion.order_id)) {
                conversionsByOrderId.set(conversion.order_id, []);
            }
            conversionsByOrderId.get(conversion.order_id).push(conversion);
        });

        mpPayments.forEach(payment => {
            if (payment.external_reference) {
                mpPaymentsByReference.set(payment.external_reference, payment);
            }
        });

        // Conciliar dados
        for (const order of orders) {
            const matchResult = {
                order: order,
                mpPayment: null,
                conversions: [],
                status: 'unmatched',
                issues: []
            };

            // Buscar pagamento correspondente no MP
            const mpPayment = mpPaymentsByReference.get(order.external_reference);
            if (mpPayment) {
                matchResult.mpPayment = mpPayment;
                matchResult.status = 'matched';

                // Verificar consistência de valores
                if (Math.abs(order.plan_price - mpPayment.transaction_amount) > 0.01) {
                    matchResult.issues.push('Divergência de valor');
                    this.metrics.discrepancies.push({
                        type: 'value_mismatch',
                        orderId: order.id,
                        orderAmount: order.plan_price,
                        mpAmount: mpPayment.transaction_amount,
                        difference: Math.abs(order.plan_price - mpPayment.transaction_amount)
                    });
                }

                // Verificar status
                if (order.status !== mpPayment.status) {
                    matchResult.issues.push('Divergência de status');
                    this.metrics.discrepancies.push({
                        type: 'status_mismatch',
                        orderId: order.id,
                        orderStatus: order.status,
                        mpStatus: mpPayment.status
                    });
                }
            }

            // Buscar conversões correspondentes
            const orderConversions = conversionsByOrderId.get(order.id) || [];
            matchResult.conversions = orderConversions;

            // Verificar se pedido pago tem conversão entregue
            if (order.status === 'approved' && orderConversions.length === 0) {
                matchResult.issues.push('Pagamento sem conversão');
                this.metrics.discrepancies.push({
                    type: 'payment_without_conversion',
                    orderId: order.id,
                    customerEmail: order.customer_email,
                    amount: order.plan_price
                });
            }

            if (matchResult.status === 'matched') {
                reconciliation.matched.push(matchResult);
            } else {
                reconciliation.unmatched.orders.push(matchResult);
            }
        }

        // Identificar pagamentos MP sem ordem correspondente
        for (const mpPayment of mpPayments) {
            if (!mpPayment.external_reference || !mpPaymentsByReference.has(mpPayment.external_reference)) {
                reconciliation.unmatched.mpPayments.push(mpPayment);
                this.metrics.discrepancies.push({
                    type: 'mp_payment_without_order',
                    paymentId: mpPayment.id,
                    amount: mpPayment.transaction_amount,
                    externalReference: mpPayment.external_reference
                });
            }
        }

        logger.info('🔍 Conciliação executada', {
            matched: reconciliation.matched.length,
            unmatchedOrders: reconciliation.unmatched.orders.length,
            unmatchedMPPayments: reconciliation.unmatched.mpPayments.length,
            discrepancies: this.metrics.discrepancies.length
        });

        return reconciliation;
    }

    /**
     * Gerar relatórios CSV e JSON
     */
    async generateReports(reconciliationData, date) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 1. Relatório resumido
        await this.generateSummaryReport(date, timestamp);
        
        // 2. Relatório detalhado de transações
        await this.generateTransactionsReport(reconciliationData, date, timestamp);
        
        // 3. Relatório de discrepâncias
        await this.generateDiscrepanciesReport(reconciliationData, date, timestamp);
        
        // 4. Relatório para contabilidade
        await this.generateAccountingReport(reconciliationData, date, timestamp);

        logger.info('📊 Relatórios gerados', {
            date: date,
            outputDir: this.outputDir,
            files: [
                `summary_${date}_${timestamp}.json`,
                `transactions_${date}_${timestamp}.csv`,
                `discrepancies_${date}_${timestamp}.csv`,
                `accounting_${date}_${timestamp}.csv`
            ]
        });
    }

    async generateSummaryReport(date, timestamp) {
        const summary = {
            date: date,
            generatedAt: new Date().toISOString(),
            metrics: this.metrics,
            status: this.metrics.discrepancies.length === 0 ? 'OK' : 'DISCREPANCIES_FOUND'
        };

        const filePath = path.join(this.outputDir, `summary_${date}_${timestamp}.json`);
        await fs.writeFile(filePath, JSON.stringify(summary, null, 2));
    }

    async generateTransactionsReport(reconciliationData, date, timestamp) {
        const csvWriter = createObjectCsvWriter({
            path: path.join(this.outputDir, `transactions_${date}_${timestamp}.csv`),
            header: [
                { id: 'orderId', title: 'Order ID' },
                { id: 'externalReference', title: 'External Reference' },
                { id: 'customerEmail', title: 'Customer Email' },
                { id: 'customerName', title: 'Customer Name' },
                { id: 'planName', title: 'Plan Name' },
                { id: 'orderAmount', title: 'Order Amount' },
                { id: 'mpAmount', title: 'MP Amount' },
                { id: 'mpFee', title: 'MP Fee' },
                { id: 'netAmount', title: 'Net Amount' },
                { id: 'orderStatus', title: 'Order Status' },
                { id: 'mpStatus', title: 'MP Status' },
                { id: 'paymentMethod', title: 'Payment Method' },
                { id: 'conversionsCount', title: 'Conversions Count' },
                { id: 'conversionsStatus', title: 'Conversions Status' },
                { id: 'orderDate', title: 'Order Date' },
                { id: 'paymentDate', title: 'Payment Date' },
                { id: 'issues', title: 'Issues' }
            ]
        });

        const records = reconciliationData.matched.map(match => ({
            orderId: match.order.id,
            externalReference: match.order.external_reference,
            customerEmail: match.order.customer_email,
            customerName: match.order.customer_name,
            planName: match.order.plan_name,
            orderAmount: match.order.plan_price,
            mpAmount: match.mpPayment?.transaction_amount || '',
            mpFee: match.mpPayment?.fee_amount || '',
            netAmount: match.mpPayment?.net_amount || '',
            orderStatus: match.order.status,
            mpStatus: match.mpPayment?.status || '',
            paymentMethod: match.order.payment_method,
            conversionsCount: match.conversions.length,
            conversionsStatus: match.conversions.map(c => c.status).join(', '),
            orderDate: match.order.created_at,
            paymentDate: match.mpPayment?.date_approved || '',
            issues: match.issues.join(', ')
        }));

        await csvWriter.writeRecords(records);
    }

    async generateDiscrepanciesReport(reconciliationData, date, timestamp) {
        const csvWriter = createObjectCsvWriter({
            path: path.join(this.outputDir, `discrepancies_${date}_${timestamp}.csv`),
            header: [
                { id: 'type', title: 'Discrepancy Type' },
                { id: 'orderId', title: 'Order ID' },
                { id: 'paymentId', title: 'Payment ID' },
                { id: 'customerEmail', title: 'Customer Email' },
                { id: 'description', title: 'Description' },
                { id: 'orderAmount', title: 'Order Amount' },
                { id: 'mpAmount', title: 'MP Amount' },
                { id: 'difference', title: 'Difference' },
                { id: 'priority', title: 'Priority' }
            ]
        });

        const records = this.metrics.discrepancies.map(disc => ({
            type: disc.type,
            orderId: disc.orderId || '',
            paymentId: disc.paymentId || '',
            customerEmail: disc.customerEmail || '',
            description: this.getDiscrepancyDescription(disc),
            orderAmount: disc.orderAmount || '',
            mpAmount: disc.mpAmount || '',
            difference: disc.difference || '',
            priority: this.getDiscrepancyPriority(disc)
        }));

        await csvWriter.writeRecords(records);
    }

    async generateAccountingReport(reconciliationData, date, timestamp) {
        const csvWriter = createObjectCsvWriter({
            path: path.join(this.outputDir, `accounting_${date}_${timestamp}.csv`),
            header: [
                { id: 'date', title: 'Date' },
                { id: 'externalReference', title: 'Reference' },
                { id: 'customerName', title: 'Customer' },
                { id: 'description', title: 'Description' },
                { id: 'grossAmount', title: 'Gross Amount' },
                { id: 'fee', title: 'Fee' },
                { id: 'netAmount', title: 'Net Amount' },
                { id: 'paymentMethod', title: 'Payment Method' },
                { id: 'status', title: 'Status' },
                { id: 'taxCategory', title: 'Tax Category' }
            ]
        });

        const records = reconciliationData.matched
            .filter(match => match.order.status === 'approved')
            .map(match => ({
                date: date,
                externalReference: match.order.external_reference,
                customerName: match.order.customer_name,
                description: `Conversor MPP→XML - ${match.order.plan_name}`,
                grossAmount: match.order.plan_price,
                fee: match.mpPayment?.fee_amount || 0,
                netAmount: match.mpPayment?.net_amount || match.order.plan_price,
                paymentMethod: match.order.payment_method,
                status: 'APPROVED',
                taxCategory: 'SOFTWARE_SERVICE'
            }));

        await csvWriter.writeRecords(records);
    }

    /**
     * Detectar e alertar sobre discrepâncias críticas
     */
    async detectDiscrepancies(reconciliationData) {
        const criticalDiscrepancies = this.metrics.discrepancies.filter(disc => 
            disc.type === 'payment_without_conversion' || 
            disc.type === 'mp_payment_without_order' ||
            (disc.type === 'value_mismatch' && disc.difference > 1.00)
        );

        if (criticalDiscrepancies.length > 0) {
            logger.error('🚨 Discrepâncias críticas detectadas', {
                count: criticalDiscrepancies.length,
                discrepancies: criticalDiscrepancies
            });

            // Enviar alerta por email/Slack
            await this.sendDiscrepancyAlert(criticalDiscrepancies);
        }

        // Verificar SLA de entrega de conversões
        const delayedDeliveries = reconciliationData.matched.filter(match => 
            match.order.status === 'approved' && 
            match.conversions.length === 0 &&
            this.getHoursSince(match.order.created_at) > 1 // 1 hora de SLA
        );

        if (delayedDeliveries.length > 0) {
            logger.warn('⏰ Entregas atrasadas detectadas', {
                count: delayedDeliveries.length,
                orders: delayedDeliveries.map(d => d.order.id)
            });
        }
    }

    async sendDiscrepancyAlert(discrepancies) {
        // Implementar integração com Slack/Email
        logger.audit('DISCREPANCY_ALERT', {
            count: discrepancies.length,
            discrepancies: discrepancies
        });
    }

    getDiscrepancyDescription(disc) {
        const descriptions = {
            'value_mismatch': `Diferença de valor: R$ ${disc.difference}`,
            'status_mismatch': `Status divergente: ${disc.orderStatus} vs ${disc.mpStatus}`,
            'payment_without_conversion': 'Pagamento aprovado sem conversão entregue',
            'mp_payment_without_order': 'Pagamento MP sem pedido correspondente'
        };
        return descriptions[disc.type] || disc.type;
    }

    getDiscrepancyPriority(disc) {
        const priorities = {
            'payment_without_conversion': 'HIGH',
            'mp_payment_without_order': 'HIGH',
            'value_mismatch': disc.difference > 1.00 ? 'HIGH' : 'MEDIUM',
            'status_mismatch': 'MEDIUM'
        };
        return priorities[disc.type] || 'LOW';
    }

    getHoursSince(date) {
        return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
    }

    async close() {
        await this.pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    require('dotenv').config();
    
    const reconciliation = new FinancialReconciliation();
    
    const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
    
    reconciliation.runReconciliation(targetDate)
        .then(() => {
            console.log('✅ Conciliação finalizada com sucesso');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro na conciliação:', error.message);
            process.exit(1);
        })
        .finally(() => {
            reconciliation.close();
        });
}

module.exports = FinancialReconciliation;