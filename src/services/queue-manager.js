/**
 * Queue Manager - Sistema de Filas para Processamento Assíncrono
 * Utiliza Bull + Redis para alta performance e escalabilidade
 */

const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/secure-logger');

class QueueManager {
    constructor() {
        // Configuração do Redis
        this.redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || null,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        };

        // Inicializar filas
        this.queues = {
            conversion: new Queue('conversion', { redis: this.redisConfig }),
            cleanup: new Queue('cleanup', { redis: this.redisConfig }),
            notification: new Queue('notification', { redis: this.redisConfig }),
            payment: new Queue('payment-processing', { redis: this.redisConfig })
        };

        // Configurar filas
        this.setupQueues();
        
        logger.info('🔄 Queue Manager inicializado', {
            queues: Object.keys(this.queues),
            redis: `${this.redisConfig.host}:${this.redisConfig.port}`
        });
    }

    setupQueues() {
        // Configurações de retry e rate limiting
        const defaultJobOptions = {
            removeOnComplete: 50, // Manter apenas 50 jobs completos
            removeOnFail: 100,    // Manter 100 jobs com falha para debug
            attempts: 3,          // 3 tentativas
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        };

        // Configurar cada fila
        Object.entries(this.queues).forEach(([name, queue]) => {
            queue.defaultJobOptions = defaultJobOptions;
            
            // Event listeners para monitoring
            queue.on('completed', (job) => {
                logger.info(`✅ Job ${name} completado`, {
                    jobId: job.id,
                    duration: Date.now() - job.processedOn
                });
            });

            queue.on('failed', (job, err) => {
                logger.error(`❌ Job ${name} falhou`, {
                    jobId: job.id,
                    error: err.message,
                    attempts: job.attemptsMade
                });
            });

            queue.on('stalled', (job) => {
                logger.warn(`⏸️ Job ${name} travou`, {
                    jobId: job.id,
                    stalledCount: job.opts.attempts - job.attemptsMade
                });
            });
        });

        logger.info('🔧 Filas configuradas com sucesso');
    }

    /**
     * Adicionar job de conversão MPP→XML
     */
    async addConversionJob(data) {
        const job = await this.queues.conversion.add('convert-mpp-xml', {
            fileId: data.fileId,
            originalName: data.originalName,
            uploadPath: data.uploadPath,
            userId: data.userId,
            orderId: data.orderId,
            priority: data.priority || 'normal'
        }, {
            priority: data.priority === 'high' ? 1 : 5,
            delay: data.delay || 0,
            jobId: `conversion-${data.fileId}` // Evita duplicatas
        });

        logger.audit('CONVERSION_JOB_ADDED', {
            jobId: job.id,
            fileId: data.fileId,
            orderId: data.orderId
        });

        return job;
    }

    /**
     * Adicionar job de limpeza de arquivos
     */
    async addCleanupJob(data) {
        const job = await this.queues.cleanup.add('cleanup-files', {
            filesToClean: data.filesToClean,
            olderThan: data.olderThan || '24h',
            directories: data.directories || ['temp', 'expired']
        }, {
            delay: data.delay || 3600000, // 1 hora de delay padrão
            repeat: { cron: '0 2 * * *' } // Todo dia às 2h
        });

        return job;
    }

    /**
     * Adicionar job de notificação
     */
    async addNotificationJob(data) {
        const job = await this.queues.notification.add('send-notification', {
            type: data.type, // email, sms, webhook
            recipient: data.recipient,
            template: data.template,
            variables: data.variables,
            priority: data.priority || 'normal'
        }, {
            priority: data.priority === 'urgent' ? 1 : 10
        });

        return job;
    }

    /**
     * Adicionar job de processamento de pagamento
     */
    async addPaymentJob(data) {
        const job = await this.queues.payment.add('process-payment', {
            paymentId: data.paymentId,
            orderId: data.orderId,
            amount: data.amount,
            method: data.method,
            webhook: data.webhook
        }, {
            priority: 1, // Alta prioridade para pagamentos
            attempts: 5,  // Mais tentativas para pagamentos
            jobId: `payment-${data.paymentId}`
        });

        logger.audit('PAYMENT_JOB_ADDED', {
            jobId: job.id,
            paymentId: data.paymentId,
            orderId: data.orderId,
            amount: data.amount
        });

        return job;
    }

    /**
     * Obter estatísticas das filas
     */
    async getQueueStats() {
        const stats = {};
        
        for (const [name, queue] of Object.entries(this.queues)) {
            stats[name] = {
                waiting: await queue.getWaiting().then(jobs => jobs.length),
                active: await queue.getActive().then(jobs => jobs.length),
                completed: await queue.getCompleted().then(jobs => jobs.length),
                failed: await queue.getFailed().then(jobs => jobs.length),
                delayed: await queue.getDelayed().then(jobs => jobs.length)
            };
        }

        return stats;
    }

    /**
     * Pausar/despausar fila
     */
    async pauseQueue(queueName) {
        if (this.queues[queueName]) {
            await this.queues[queueName].pause();
            logger.info(`⏸️ Fila ${queueName} pausada`);
        }
    }

    async resumeQueue(queueName) {
        if (this.queues[queueName]) {
            await this.queues[queueName].resume();
            logger.info(`▶️ Fila ${queueName} retomada`);
        }
    }

    /**
     * Limpar filas (manutenção)
     */
    async cleanQueue(queueName, grace = 5000) {
        if (this.queues[queueName]) {
            await this.queues[queueName].clean(grace, 'completed');
            await this.queues[queueName].clean(grace, 'failed');
            logger.info(`🧹 Fila ${queueName} limpa`);
        }
    }

    /**
     * Shutdown graceful
     */
    async shutdown() {
        logger.info('🛑 Iniciando shutdown das filas...');
        
        const promises = Object.entries(this.queues).map(async ([name, queue]) => {
            await queue.close();
            logger.info(`📴 Fila ${name} fechada`);
        });

        await Promise.all(promises);
        logger.info('✅ Todas as filas foram fechadas');
    }
}

// Singleton instance
const queueManager = new QueueManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
    await queueManager.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await queueManager.shutdown();
    process.exit(0);
});

module.exports = queueManager;