/**
 * BullMQ Queue Configuration
 * 
 * Provides the conversion queue for job processing.
 * Uses Redis as backing store for distributed, persistent queues.
 */

const { Queue, QueueEvents } = require('bullmq');
const { connection, createConnection } = require('./redis');

// =============================================================================
// CONVERSION QUEUE
// =============================================================================

const conversionQueue = new Queue('conversion', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            count: 1000,      // Keep last 1000 completed jobs
            age: 24 * 3600    // Remove jobs older than 24h
        },
        removeOnFail: {
            count: 500,       // Keep last 500 failed jobs
            age: 7 * 24 * 3600 // Remove failed jobs older than 7 days
        }
    }
});

// Queue events for monitoring (uses separate connection)
const queueEvents = new QueueEvents('conversion', {
    connection: createConnection()
});

// =============================================================================
// EVENT HANDLERS (for logging/metrics)
// =============================================================================

queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[Queue] Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`[Queue] Job ${jobId} progress: ${JSON.stringify(data)}`);
});

queueEvents.on('stalled', ({ jobId }) => {
    console.warn(`[Queue] Job ${jobId} stalled - will be retried`);
});

// =============================================================================
// QUEUE HELPERS
// =============================================================================

/**
 * Add a conversion job to the queue
 * 
 * @param {string} converterId - The converter to use (e.g., 'mpp-to-xml')
 * @param {object} data - Job data { jobId, userId, payload }
 * @param {object} options - Optional job options override
 * @returns {Promise<Job>} The created BullMQ job
 */
async function addConversionJob(converterId, data, options = {}) {
    const job = await conversionQueue.add(converterId, data, {
        ...options,
        jobId: data.jobId // Use our jobId as BullMQ jobId for idempotency
    });
    
    console.log(`[Queue] Added job ${job.id} for converter '${converterId}'`);
    return job;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        conversionQueue.getWaitingCount(),
        conversionQueue.getActiveCount(),
        conversionQueue.getCompletedCount(),
        conversionQueue.getFailedCount(),
        conversionQueue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
}

/**
 * Get a specific job by ID
 */
async function getJob(jobId) {
    return conversionQueue.getJob(jobId);
}

/**
 * Gracefully shutdown queues
 */
async function shutdownQueues() {
    console.log('[Queue] Shutting down...');
    try {
        await queueEvents.close();
        await conversionQueue.close();
        console.log('[Queue] Shutdown complete');
    } catch (err) {
        console.error('[Queue] Shutdown error:', err.message);
    }
}

/**
 * Pause/Resume queue processing
 */
async function pauseQueue() {
    await conversionQueue.pause();
    console.log('[Queue] Paused');
}

async function resumeQueue() {
    await conversionQueue.resume();
    console.log('[Queue] Resumed');
}

/**
 * Drain queue (remove all waiting jobs)
 */
async function drainQueue() {
    await conversionQueue.drain();
    console.log('[Queue] Drained');
}

/**
 * Clean old jobs
 */
async function cleanJobs(grace = 3600 * 1000, limit = 1000, type = 'completed') {
    const removed = await conversionQueue.clean(grace, limit, type);
    console.log(`[Queue] Cleaned ${removed.length} ${type} jobs`);
    return removed.length;
}

module.exports = {
    conversionQueue,
    queueEvents,
    addConversionJob,
    getQueueStats,
    getJob,
    shutdownQueues,
    pauseQueue,
    resumeQueue,
    drainQueue,
    cleanJobs
};
