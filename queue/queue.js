const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Configuração do Redis
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true
});

// Criação da fila de conversão
const convertQueue = new Queue('file-conversion', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: 10, // Manter apenas 10 jobs completos
        removeOnFail: 20,     // Manter 20 jobs falhos para debug
        attempts: 3,          // Tentar 3 vezes em caso de falha
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

class FileConversionQueue {
    constructor() {
        this.queue = convertQueue;
        this.setupEventHandlers();
    }

    /**
     * Adiciona job de conversão à fila
     * @param {string} filename - Nome do arquivo
     * @param {object} metadata - Metadados do arquivo
     * @returns {Promise<object>} Job criado
     */
    async addConversionJob(filename, metadata = {}) {
        try {
            const jobData = {
                filename,
                originalName: metadata.originalName,
                size: metadata.size,
                uploadedAt: new Date().toISOString(),
                userId: metadata.userId || 'anonymous'
            };

            const job = await this.queue.add('convert-mpp-to-xml', jobData, {
                priority: 1,
                delay: 0
            });

            console.log(`📋 Job criado: ${job.id} para arquivo ${filename}`);
            return {
                jobId: job.id,
                status: 'queued',
                filename,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erro ao criar job:', error);
            throw error;
        }
    }

    /**
     * Obtém status de um job
     * @param {string} jobId - ID do job
     * @returns {Promise<object>} Status do job
     */
    async getJobStatus(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            
            if (!job) {
                return { status: 'not_found' };
            }

            const state = await job.getState();
            const progress = job.progress;
            
            return {
                id: job.id,
                status: state,
                progress,
                data: job.data,
                createdAt: new Date(job.timestamp).toISOString(),
                processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
                finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
                failedReason: job.failedReason || null
            };
        } catch (error) {
            console.error('❌ Erro ao obter status do job:', error);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Lista todos os jobs ativos
     * @returns {Promise<Array>} Lista de jobs
     */
    async getActiveJobs() {
        try {
            const waiting = await this.queue.getWaiting();
            const active = await this.queue.getActive();
            const completed = await this.queue.getCompleted();
            const failed = await this.queue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length
            };
        } catch (error) {
            console.error('❌ Erro ao listar jobs:', error);
            return { error: error.message };
        }
    }

    /**
     * Configura handlers de eventos da fila
     */
    setupEventHandlers() {
        this.queue.on('completed', (job) => {
            console.log(`✅ Job ${job.id} completado: ${job.data.filename}`);
        });

        this.queue.on('failed', (job, err) => {
            console.error(`❌ Job ${job.id} falhou: ${err.message}`);
        });

        this.queue.on('progress', (job, progress) => {
            console.log(`📊 Job ${job.id} progresso: ${progress}%`);
        });
    }

    /**
     * Limpa jobs antigos
     */
    async cleanOldJobs() {
        try {
            await this.queue.clean(24 * 60 * 60 * 1000, 0, 'completed');
            await this.queue.clean(24 * 60 * 60 * 1000, 0, 'failed');
            console.log('🧹 Jobs antigos limpos');
        } catch (error) {
            console.error('❌ Erro na limpeza de jobs:', error);
        }
    }
}

module.exports = new FileConversionQueue();