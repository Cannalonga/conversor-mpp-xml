/**
 * BullMQ Queue Monitor
 * 
 * Monitors queue metrics and updates Prometheus gauges:
 * - Queue sizes (waiting, active, delayed, failed)
 * - Job completion rates
 * - Worker health
 */

const { Queue, QueueEvents } = require('bullmq');
const metrics = require('../lib/metrics');

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const QUEUE_NAME = process.env.QUEUE_NAME || 'mpp-conversion';

// Connection config
const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

// Queue instance for metrics collection
let monitorQueue = null;
let queueEvents = null;
let updateInterval = null;

/**
 * Initialize queue monitor
 */
async function initMonitor(existingQueue = null) {
  try {
    // Use existing queue or create new one for monitoring
    monitorQueue = existingQueue || new Queue(QUEUE_NAME, { connection });
    
    // Create queue events for real-time monitoring
    queueEvents = new QueueEvents(QUEUE_NAME, { connection });
    
    // Set up event listeners
    setupEventListeners();
    
    // Start periodic metrics collection
    startMetricsCollection();
    
    console.log('[Monitor] Queue monitor initialized');
    
    return { queue: monitorQueue, events: queueEvents };
  } catch (error) {
    console.error('[Monitor] Failed to initialize:', error.message);
    throw error;
  }
}

/**
 * Set up BullMQ event listeners for real-time metrics
 */
function setupEventListeners() {
  if (!queueEvents) return;
  
  // Job completed
  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    metrics.recordConversionJob('completed');
    console.log(`[Monitor] Job ${jobId} completed`);
  });
  
  // Job failed
  queueEvents.on('failed', ({ jobId, failedReason }) => {
    metrics.recordConversionJob('failed');
    metrics.recordJobFailure(failedReason || 'unknown');
    console.log(`[Monitor] Job ${jobId} failed: ${failedReason}`);
  });
  
  // Job delayed (retry)
  queueEvents.on('delayed', ({ jobId, delay }) => {
    metrics.recordJobRetry();
    console.log(`[Monitor] Job ${jobId} delayed for ${delay}ms`);
  });
  
  // Job started (active)
  queueEvents.on('active', ({ jobId, prev }) => {
    if (prev === 'waiting') {
      metrics.recordConversionJob('started');
    }
    console.log(`[Monitor] Job ${jobId} active`);
  });
  
  // Job stalled
  queueEvents.on('stalled', ({ jobId }) => {
    metrics.recordJobFailure('stalled');
    console.log(`[Monitor] Job ${jobId} stalled`);
  });
}

/**
 * Collect queue metrics periodically
 */
async function collectQueueMetrics() {
  if (!monitorQueue) return;
  
  try {
    const [waiting, active, delayed, failed, completed] = await Promise.all([
      monitorQueue.getWaitingCount(),
      monitorQueue.getActiveCount(),
      monitorQueue.getDelayedCount(),
      monitorQueue.getFailedCount(),
      monitorQueue.getCompletedCount(),
    ]);
    
    // Update Prometheus gauges
    metrics.updateQueueMetrics({
      waiting,
      active,
      delayed,
      failed,
    });
    
    // Log summary periodically
    console.log(`[Monitor] Queue stats - W:${waiting} A:${active} D:${delayed} F:${failed} C:${completed}`);
    
    return { waiting, active, delayed, failed, completed };
  } catch (error) {
    console.error('[Monitor] Failed to collect metrics:', error.message);
    return null;
  }
}

/**
 * Check Redis latency
 */
async function checkRedisLatency() {
  if (!monitorQueue) return;
  
  try {
    const client = await monitorQueue.client;
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    
    metrics.setRedisLatency(latency);
    
    return latency;
  } catch (error) {
    console.error('[Monitor] Redis latency check failed:', error.message);
    return null;
  }
}

/**
 * Start periodic metrics collection
 */
function startMetricsCollection(intervalMs = 10000) {
  // Clear existing interval if any
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Collect immediately
  collectQueueMetrics();
  checkRedisLatency();
  
  // Then collect periodically
  updateInterval = setInterval(async () => {
    await collectQueueMetrics();
    await checkRedisLatency();
  }, intervalMs);
  
  console.log(`[Monitor] Metrics collection started (interval: ${intervalMs}ms)`);
}

/**
 * Stop metrics collection
 */
function stopMetricsCollection() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log('[Monitor] Metrics collection stopped');
  }
}

/**
 * Get current queue statistics
 */
async function getQueueStats() {
  if (!monitorQueue) {
    return { error: 'Queue not initialized' };
  }
  
  try {
    const [waiting, active, delayed, failed, completed, paused] = await Promise.all([
      monitorQueue.getWaitingCount(),
      monitorQueue.getActiveCount(),
      monitorQueue.getDelayedCount(),
      monitorQueue.getFailedCount(),
      monitorQueue.getCompletedCount(),
      monitorQueue.isPaused(),
    ]);
    
    return {
      name: QUEUE_NAME,
      counts: {
        waiting,
        active,
        delayed,
        failed,
        completed,
      },
      paused,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get failed jobs for analysis
 */
async function getFailedJobs(limit = 10) {
  if (!monitorQueue) {
    return { error: 'Queue not initialized' };
  }
  
  try {
    const jobs = await monitorQueue.getFailed(0, limit - 1);
    
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    }));
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get job by ID
 */
async function getJob(jobId) {
  if (!monitorQueue) {
    return { error: 'Queue not initialized' };
  }
  
  try {
    const job = await monitorQueue.getJob(jobId);
    
    if (!job) {
      return { error: 'Job not found' };
    }
    
    const state = await job.getState();
    const progress = job.progress;
    
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Retry failed job
 */
async function retryJob(jobId) {
  if (!monitorQueue) {
    return { error: 'Queue not initialized' };
  }
  
  try {
    const job = await monitorQueue.getJob(jobId);
    
    if (!job) {
      return { error: 'Job not found' };
    }
    
    await job.retry();
    
    return { success: true, jobId };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Clean old jobs
 */
async function cleanOldJobs(grace = 3600000, limit = 1000) {
  if (!monitorQueue) {
    return { error: 'Queue not initialized' };
  }
  
  try {
    const [completed, failed] = await Promise.all([
      monitorQueue.clean(grace, limit, 'completed'),
      monitorQueue.clean(grace, limit, 'failed'),
    ]);
    
    return {
      success: true,
      cleaned: {
        completed: completed.length,
        failed: failed.length,
      },
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Shutdown monitor gracefully
 */
async function shutdown() {
  stopMetricsCollection();
  
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  
  // Only close queue if we created it
  if (monitorQueue && !monitorQueue._externalQueue) {
    await monitorQueue.close();
    monitorQueue = null;
  }
  
  console.log('[Monitor] Shutdown complete');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Initialization
  initMonitor,
  shutdown,
  
  // Metrics collection
  collectQueueMetrics,
  checkRedisLatency,
  startMetricsCollection,
  stopMetricsCollection,
  
  // Queue operations
  getQueueStats,
  getFailedJobs,
  getJob,
  retryJob,
  cleanOldJobs,
  
  // Configuration
  connection,
  QUEUE_NAME,
};
