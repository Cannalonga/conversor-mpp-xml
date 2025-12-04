/**
 * 🔌 UNIFIED QUEUE MANAGER
 * 
 * Gerenciador de fila unificado que suporta:
 * - BullMQ (quando Redis disponível)
 * - In-Memory Queue (fallback)
 * 
 * Auto-detecta Redis e usa o backend apropriado.
 */

const EventEmitter = require('events');

class QueueManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            name: options.name || 'file-conversion',
            redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
            forceMemory: options.forceMemory || process.env.QUEUE_FORCE_MEMORY === '1',
            maxConcurrency: options.maxConcurrency || 2,
            ...options
        };
        
        this.backend = null;
        this.backendType = null;
        this.ready = false;
        this.initPromise = null;
    }

    /**
     * Inicializa o backend de fila
     */
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        if (this.options.forceMemory) {
            console.log('[QUEUE] Force memory mode enabled');
            return this._initMemoryBackend();
        }

        // Tentar Redis primeiro
        try {
            await this._initRedisBackend();
            console.log('[QUEUE] Using BullMQ with Redis');
            return true;
        } catch (error) {
            console.warn('[QUEUE] Redis unavailable, falling back to memory queue:', error.message);
            return this._initMemoryBackend();
        }
    }

    /**
     * Inicializa backend Redis/BullMQ
     */
    async _initRedisBackend() {
        const Redis = require('ioredis');
        const { Queue, Worker } = require('bullmq');

        // Test Redis connection
        const testConnection = new Redis(this.options.redisUrl, {
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Don't retry
            connectTimeout: 3000,
            lazyConnect: true
        });

        await testConnection.connect();
        await testConnection.ping();
        await testConnection.quit();

        // Create actual connection
        this.redisConnection = new Redis(this.options.redisUrl, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableReadyCheck: false
        });

        this.queue = new Queue(this.options.name, {
            connection: this.redisConnection,
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 20,
                attempts: 3,
                timeout: parseInt(process.env.JOB_TIMEOUT_MS || '300000'),
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });

        this.backendType = 'bullmq';
        this.ready = true;
        this.emit('ready', { backend: 'bullmq' });
    }

    /**
     * Inicializa backend em memória
     */
    async _initMemoryBackend() {
        const { MemoryQueue } = require('./queue-memory');
        
        this.backend = new MemoryQueue({
            maxWorkers: this.options.maxConcurrency,
            maxRetries: 3
        });

        this.backendType = 'memory';
        this.ready = true;
        this.emit('ready', { backend: 'memory' });
        return true;
    }

    /**
     * Adiciona job à fila
     */
    async addJob(type, data, options = {}) {
        await this.init();

        if (this.backendType === 'bullmq') {
            const job = await this.queue.add(type, data, {
                priority: options.priority || 1,
                delay: options.delay || 0
            });
            
            return {
                id: job.id,
                type,
                status: 'queued',
                backend: 'bullmq',
                createdAt: new Date().toISOString()
            };
        } else {
            return await this.backend.addJob(type, data, options);
        }
    }

    /**
     * Obtém status de um job
     */
    async getJobStatus(jobId) {
        await this.init();

        if (this.backendType === 'bullmq') {
            const job = await this.queue.getJob(jobId);
            
            if (!job) {
                return { status: 'not_found' };
            }

            const state = await job.getState();
            
            return {
                id: job.id,
                status: state,
                progress: job.progress,
                data: job.data,
                backend: 'bullmq',
                createdAt: new Date(job.timestamp).toISOString(),
                finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
                failedReason: job.failedReason || null
            };
        } else {
            const status = this.backend.getJobStatus(jobId);
            return { ...status, backend: 'memory' };
        }
    }

    /**
     * Registra um worker/processor
     */
    async registerWorker(processor) {
        await this.init();

        if (this.backendType === 'bullmq') {
            const { Worker } = require('bullmq');
            
            this.worker = new Worker(this.options.name, processor, {
                connection: this.redisConnection,
                concurrency: this.options.maxConcurrency,
                settings: {
                    lockDuration: 30000,
                    lockRenewTime: 15000,
                    maxStalledCount: 2
                }
            });

            this.worker.on('completed', (job) => {
                this.emit('job:completed', { id: job.id, data: job.data });
            });

            this.worker.on('failed', (job, error) => {
                this.emit('job:failed', { id: job.id, error: error.message });
            });

            console.log(`[QUEUE] BullMQ worker registered (concurrency: ${this.options.maxConcurrency})`);
        } else {
            this.backend.registerWorker(processor);
            
            this.backend.on('job:completed', (job) => {
                this.emit('job:completed', job);
            });

            this.backend.on('job:failed', (job) => {
                this.emit('job:failed', job);
            });

            console.log(`[QUEUE] Memory worker registered`);
        }
    }

    /**
     * Retorna estatísticas da fila
     */
    async getStats() {
        await this.init();

        if (this.backendType === 'bullmq') {
            const [waiting, active, completed, failed] = await Promise.all([
                this.queue.getWaitingCount(),
                this.queue.getActiveCount(),
                this.queue.getCompletedCount(),
                this.queue.getFailedCount()
            ]);

            return {
                backend: 'bullmq',
                waiting,
                active,
                completed,
                failed,
                total: waiting + active + completed + failed
            };
        } else {
            return {
                backend: 'memory',
                ...this.backend.getStats()
            };
        }
    }

    /**
     * Retorna informações do backend
     */
    getInfo() {
        return {
            backend: this.backendType,
            ready: this.ready,
            name: this.options.name,
            redisUrl: this.backendType === 'bullmq' ? this.options.redisUrl : null
        };
    }

    /**
     * Fecha conexões
     */
    async close() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.queue) {
            await this.queue.close();
        }
        if (this.redisConnection) {
            await this.redisConnection.quit();
        }
        if (this.backend && this.backend.close) {
            await this.backend.close();
        }
        
        this.ready = false;
        this.emit('closed');
    }
}

// Singleton instance
let instance = null;

function getQueueManager(options = {}) {
    if (!instance) {
        instance = new QueueManager(options);
    }
    return instance;
}

module.exports = {
    QueueManager,
    getQueueManager
};
