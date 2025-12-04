/**
 * Conversion Worker
 * 
 * BullMQ worker that processes conversion jobs from the Redis queue.
 * Updates job status in database and records metrics.
 * 
 * Run with: node src/workers/conversion-worker.js
 */

require('dotenv').config();

const { Worker } = require('bullmq');
const { connection, closeConnection } = require('../queue/redis');
const { getProcessorConfig } = require('../queues/processor-map');
const { recordMetric, updateQueueSize } = require('../lib/metrics');
const { prisma, disconnectPrisma } = require('../lib/prisma-client');
const { conversionQueue } = require('../queue/queue');

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_NAME = process.env.WORKER_NAME || `worker-${process.pid}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 2;

console.log('═══════════════════════════════════════════════════════════════');
console.log('   CANNACONVERTER - Conversion Worker');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Worker Name:  ${WORKER_NAME}`);
console.log(`Concurrency:  ${CONCURRENCY}`);
console.log(`Redis URL:    ${process.env.REDIS_URL || 'redis://127.0.0.1:6379'}`);
console.log(`Database:     ${process.env.DATABASE_URL || 'default'}`);
console.log('═══════════════════════════════════════════════════════════════');

// =============================================================================
// HANDLERS IMPORT (lazy load to avoid circular deps)
// =============================================================================

let handleMppToXml, handleGenericConversion;

function loadHandlers() {
    try {
        handleMppToXml = require('../handlers/processors/mpp-to-xml').handleMppToXml;
    } catch (e) {
        console.warn('[Worker] MPP handler not found, will use generic');
        handleMppToXml = null;
    }

    try {
        handleGenericConversion = require('../handlers/processors/generic').handleGenericConversion;
    } catch (e) {
        console.warn('[Worker] Generic handler not found');
        handleGenericConversion = null;
    }
}

// =============================================================================
// JOB PROCESSOR
// =============================================================================

async function processJob(job) {
    const { jobId, userId, payload } = job.data;
    const converter = job.name;
    const startTime = Date.now();

    console.log(`[Worker] Processing job ${jobId} (converter: ${converter})`);

    // Record active job metric
    recordMetric('active_inc', converter);

    try {
        // Update job status to 'processing' in database
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'processing',
                startedAt: new Date(),
                progress: 10
            }
        });

        // Update progress
        await job.updateProgress(10);

        // Route to appropriate handler
        let result;

        if (converter === 'mpp-to-xml' && handleMppToXml) {
            console.log(`[Worker] Using MPXJ handler for ${jobId}`);
            result = await handleMppToXml({ jobId, userId, payload });
        } else if (handleGenericConversion) {
            console.log(`[Worker] Using generic handler for ${jobId}`);
            result = await handleGenericConversion({ jobId, userId, payload, converter });
        } else {
            // Fallback: mock conversion
            console.log(`[Worker] No handler found, using mock for ${jobId}`);
            result = await mockConversion({ jobId, userId, payload, converter });
        }

        // Update progress
        await job.updateProgress(90);

        // Calculate duration
        const durationMs = Date.now() - startTime;

        // Update job to 'completed' in database
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'completed',
                finishedAt: new Date(),
                progress: 100,
                outputPath: result.outputs ? result.outputs[0] : null,
                metadata: JSON.stringify({
                    outputs: result.outputs || [],
                    durationMs,
                    workerName: WORKER_NAME
                })
            }
        });

        // Record metrics
        recordMetric('processed', converter, { durationMs });
        recordMetric('active_dec', converter);

        console.log(`[Worker] Job ${jobId} completed in ${durationMs}ms`);

        return result;

    } catch (err) {
        const durationMs = Date.now() - startTime;
        console.error(`[Worker] Job ${jobId} failed after ${durationMs}ms:`, err.message);

        // Update job to 'failed' in database
        try {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    finishedAt: new Date(),
                    error: err.message,
                    metadata: JSON.stringify({
                        error: err.message,
                        stack: err.stack,
                        durationMs,
                        workerName: WORKER_NAME,
                        attempt: job.attemptsMade + 1
                    })
                }
            });
        } catch (dbErr) {
            console.error(`[Worker] Failed to update job ${jobId} in DB:`, dbErr.message);
        }

        // Record failure metric
        recordMetric('failed', converter, { 
            errorType: err.code || 'UNKNOWN' 
        });
        recordMetric('active_dec', converter);

        // Re-throw to let BullMQ handle retries
        throw err;
    }
}

// =============================================================================
// MOCK CONVERSION (fallback when no handler available)
// =============================================================================

async function mockConversion({ jobId, userId, payload, converter }) {
    console.log(`[Worker] Mock conversion for ${converter}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const outputPath = `uploads/converted/${jobId}_mock.xml`;
    
    // Create mock output file
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<ConversionResult>
  <JobId>${jobId}</JobId>
  <Converter>${converter}</Converter>
  <Status>MockCompleted</Status>
  <Timestamp>${new Date().toISOString()}</Timestamp>
  <Note>This is a mock conversion - real handlers not available</Note>
</ConversionResult>`;
    
    fs.writeFileSync(outputPath, mockXml);
    
    return { outputs: [outputPath] };
}

// =============================================================================
// WORKER INSTANCE
// =============================================================================

loadHandlers();

const worker = new Worker('conversion', processJob, {
    connection,
    concurrency: CONCURRENCY,
    limiter: {
        max: 10,           // Max 10 jobs per duration
        duration: 1000     // Per second
    },
    settings: {
        stalledInterval: 30000,    // Check for stalled jobs every 30s
        maxStalledCount: 2         // Mark as failed after 2 stalls
    }
});

// =============================================================================
// WORKER EVENT HANDLERS
// =============================================================================

worker.on('ready', () => {
    console.log('[Worker] Ready and listening for jobs');
});

worker.on('active', (job) => {
    console.log(`[Worker] Started job ${job.id} (${job.name})`);
});

worker.on('completed', (job, result) => {
    console.log(`[Worker] Completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Failed job ${job?.id || 'unknown'}:`, err.message);
    
    // Check if this was the last attempt
    if (job && job.attemptsMade >= job.opts.attempts) {
        console.log(`[Worker] Job ${job.id} exhausted all ${job.opts.attempts} attempts`);
        // Could trigger refund here if policy dictates
    }
});

worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
});

worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
});

// =============================================================================
// QUEUE STATS REPORTER (every 30s)
// =============================================================================

const statsInterval = setInterval(async () => {
    try {
        const stats = await conversionQueue.getJobCounts();
        console.log(`[Worker] Queue stats:`, stats);
        
        // Update Prometheus gauge
        updateQueueSize('conversion', stats.waiting || 0);
    } catch (err) {
        console.error('[Worker] Error getting stats:', err.message);
    }
}, 30000);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown(signal) {
    console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`);
    
    clearInterval(statsInterval);

    try {
        // Close worker (wait for current jobs to complete)
        await worker.close();
        console.log('[Worker] Worker closed');

        // Close Redis
        await closeConnection();

        // Close Prisma
        await disconnectPrisma();

        console.log('[Worker] Shutdown complete');
        process.exit(0);
    } catch (err) {
        console.error('[Worker] Error during shutdown:', err.message);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('[Worker] Uncaught exception:', err);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('[Worker] Starting...');
