/**
 * IN-MEMORY FILE CONVERSION QUEUE
 * 
 * Lightweight queue system that doesn't require Redis
 * Suitable for single-server deployments
 * 
 * Features:
 * ✅ No external dependencies
 * ✅ Fast job processing
 * ✅ In-memory persistence (can be extended to DB)
 * ✅ Event-based callbacks
 * ✅ Job state tracking
 * ✅ Retry logic
 * ✅ Auto-cleanup
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class MemoryQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.jobs = new Map();
        this.workers = [];
        this.maxWorkers = options.maxWorkers || 4;
        this.isProcessing = false;
        this.jobCounter = 0;
        
        // Default retry config
        this.retryConfig = {
            maxRetries: options.maxRetries || 3,
            backoffDelay: options.backoffDelay || 2000
        };
        
        // Auto-cleanup interval
        this.cleanupInterval = setInterval(() => {
            this._cleanup();
        }, 60 * 1000); // Every minute
    }

    /**
     * Add job to queue
     */
    async addJob(type, data, options = {}) {
        const jobId = crypto.randomUUID();
        
        const job = {
            id: jobId,
            type,
            data,
            status: 'queued',
            createdAt: new Date(),
            updatedAt: new Date(),
            attempts: 0,
            maxAttempts: options.maxAttempts || this.retryConfig.maxRetries,
            result: null,
            error: null,
            priority: options.priority || 0,
            callbacks: []
        };
        
        this.jobs.set(jobId, job);
        this.emit('job-added', job);
        
        // Start processing if not already running
        this._processNextJob();
        
        return jobId;
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return null;
        
        return {
            id: job.id,
            status: job.status,
            type: job.type,
            progress: job.progress || 0,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            result: job.result,
            error: job.error,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts
        };
    }

    /**
     * Process next job in queue
     */
    async _processNextJob() {
        if (this.isProcessing) return;
        if (this.workers.length >= this.maxWorkers) return;
        
        // Get next job (highest priority first)
        const sortedJobs = Array.from(this.jobs.values())
            .filter(j => j.status === 'queued')
            .sort((a, b) => b.priority - a.priority);
        
        if (sortedJobs.length === 0) return;
        
        const job = sortedJobs[0];
        await this._executeJob(job);
    }

    /**
     * Execute a job
     */
    async _executeJob(job) {
        job.status = 'processing';
        job.updatedAt = new Date();
        job.attempts++;
        
        this.emit('job-started', job);
        
        try {
            // Simulate job processing based on type
            const result = await this._runJobHandler(job);
            
            job.status = 'completed';
            job.result = result;
            job.updatedAt = new Date();
            
            this.emit('job-completed', job);
            
            // Schedule cleanup after 24 hours
            setTimeout(() => {
                if (this.jobs.has(job.id)) {
                    this.jobs.delete(job.id);
                }
            }, 24 * 60 * 60 * 1000);
            
        } catch (error) {
            job.error = error.message;
            job.updatedAt = new Date();
            
            // Retry if attempts remain
            if (job.attempts < job.maxAttempts) {
                job.status = 'queued';
                this.emit('job-failed-retry', job);
                
                // Schedule retry with backoff
                setTimeout(() => {
                    this._processNextJob();
                }, this.retryConfig.backoffDelay * job.attempts);
            } else {
                job.status = 'failed';
                this.emit('job-failed', job);
            }
        }
        
        // Process next job
        setTimeout(() => this._processNextJob(), 100);
    }

    /**
     * Run job handler based on type
     */
    async _runJobHandler(job) {
        switch (job.type) {
            case 'convert-mpp-to-xml':
                return await this._handleMppConversion(job);
            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }
    }

    /**
     * Handle MPP to XML conversion
     */
    async _handleMppConversion(job) {
        const { filename, originalName } = job.data;
        
        // Simulate conversion time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return simulated result
        return {
            success: true,
            originalFile: filename,
            originalName: originalName,
            convertedFile: filename.replace('.mpp', '.xml'),
            format: 'xml',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        const jobs = Array.from(this.jobs.values());
        
        return {
            totalJobs: jobs.length,
            queued: jobs.filter(j => j.status === 'queued').length,
            processing: jobs.filter(j => j.status === 'processing').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
            activeWorkers: this.workers.length,
            maxWorkers: this.maxWorkers
        };
    }

    /**
     * Clean up old jobs
     */
    _cleanup() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [jobId, job] of this.jobs.entries()) {
            if ((now - job.updatedAt) > maxAge && (job.status === 'completed' || job.status === 'failed')) {
                this.jobs.delete(jobId);
            }
        }
    }

    /**
     * Shutdown queue
     */
    async shutdown() {
        clearInterval(this.cleanupInterval);
        
        // Wait for all jobs to complete
        const maxWait = 5000; // 5 seconds
        const startTime = Date.now();
        
        while (this.workers.length > 0 && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

/**
 * Public API for backward compatibility with Bull
 */
class FileConversionQueue {
    constructor() {
        this.queue = new MemoryQueue();
    }

    async addConversionJob(filename, metadata = {}) {
        const jobId = await this.queue.addJob('convert-mpp-to-xml', {
            filename,
            originalName: metadata.originalName,
            size: metadata.size,
            userId: metadata.userId
        }, {
            priority: 1,
            maxAttempts: 3
        });
        
        return {
            jobId,
            status: 'queued',
            createdAt: new Date()
        };
    }

    async getJobStatus(jobId) {
        return this.queue.getJobStatus(jobId);
    }

    async getActiveJobs() {
        return this.queue.getStats();
    }

    setupEventHandlers() {
        this.queue.on('job-started', (job) => {
            console.log(`[QUEUE] Job ${job.id} started (${job.type})`);
        });
        
        this.queue.on('job-completed', (job) => {
            console.log(`[QUEUE] Job ${job.id} completed`);
        });
        
        this.queue.on('job-failed', (job) => {
            console.error(`[QUEUE] Job ${job.id} failed: ${job.error}`);
        });
        
        this.queue.on('job-failed-retry', (job) => {
            console.warn(`[QUEUE] Job ${job.id} retrying (attempt ${job.attempts}/${job.maxAttempts})`);
        });
    }
}

// Create singleton instance
const fileQueue = new FileConversionQueue();
fileQueue.setupEventHandlers();

module.exports = fileQueue;
module.exports.FileConversionQueue = FileConversionQueue;
module.exports.MemoryQueue = MemoryQueue;
