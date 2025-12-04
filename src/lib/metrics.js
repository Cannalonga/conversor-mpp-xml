/**
 * Prometheus Metrics for Conversion Workers
 * 
 * Provides prom-client based metrics for monitoring job processing.
 */

let client;
let metricsEnabled = false;

// Lazy-load prom-client to avoid errors if not installed
try {
    client = require('prom-client');
    metricsEnabled = true;
} catch (e) {
    console.warn('[Metrics] prom-client not installed, metrics disabled');
}

// =============================================================================
// METRIC DEFINITIONS
// =============================================================================

let jobsEnqueued, jobsProcessed, jobsFailed, jobDuration, activeJobs, queueSize;

if (metricsEnabled) {
    // Counter: Total jobs enqueued
    jobsEnqueued = new client.Counter({
        name: 'canna_jobs_enqueued_total',
        help: 'Total number of jobs enqueued',
        labelNames: ['converter']
    });

    // Counter: Total jobs processed successfully
    jobsProcessed = new client.Counter({
        name: 'canna_jobs_processed_total',
        help: 'Total number of jobs processed successfully',
        labelNames: ['converter']
    });

    // Counter: Total jobs failed
    jobsFailed = new client.Counter({
        name: 'canna_jobs_failed_total',
        help: 'Total number of jobs failed',
        labelNames: ['converter', 'error_type']
    });

    // Histogram: Job processing duration
    jobDuration = new client.Histogram({
        name: 'canna_job_duration_seconds',
        help: 'Duration of job processing in seconds',
        labelNames: ['converter'],
        buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600]
    });

    // Gauge: Currently active jobs
    activeJobs = new client.Gauge({
        name: 'canna_jobs_active',
        help: 'Number of currently processing jobs',
        labelNames: ['converter']
    });

    // Gauge: Queue size (waiting jobs)
    queueSize = new client.Gauge({
        name: 'canna_queue_size',
        help: 'Number of jobs waiting in queue',
        labelNames: ['queue']
    });

    // Collect default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ prefix: 'canna_' });
}

// =============================================================================
// METRIC RECORDING FUNCTIONS
// =============================================================================

/**
 * Record a metric event
 * @param {'enqueued'|'processed'|'failed'} event 
 * @param {string} converter 
 * @param {object} extra - Extra data (errorType for failed, durationMs for processed)
 */
function recordMetric(event, converter, extra = {}) {
    if (!metricsEnabled) return;

    try {
        switch (event) {
            case 'enqueued':
                jobsEnqueued.inc({ converter });
                break;

            case 'processed':
                jobsProcessed.inc({ converter });
                if (extra.durationMs) {
                    jobDuration.observe({ converter }, extra.durationMs / 1000);
                }
                break;

            case 'failed':
                jobsFailed.inc({ 
                    converter, 
                    error_type: extra.errorType || 'unknown' 
                });
                break;

            case 'active_inc':
                activeJobs.inc({ converter });
                break;

            case 'active_dec':
                activeJobs.dec({ converter });
                break;

            default:
                console.warn(`[Metrics] Unknown event: ${event}`);
        }
    } catch (err) {
        console.error('[Metrics] Error recording metric:', err.message);
    }
}

/**
 * Update queue size metric
 * @param {string} queueName 
 * @param {number} size 
 */
function updateQueueSize(queueName, size) {
    if (!metricsEnabled) return;
    try {
        queueSize.set({ queue: queueName }, size);
    } catch (err) {
        console.error('[Metrics] Error updating queue size:', err.message);
    }
}

/**
 * Get metrics in Prometheus format
 * @returns {Promise<string>} Prometheus metrics text
 */
async function getMetrics() {
    if (!metricsEnabled) {
        return '# Metrics disabled - prom-client not installed\n';
    }
    return client.register.metrics();
}

/**
 * Get metrics as JSON
 * @returns {Promise<object>} Metrics as JSON
 */
async function getMetricsJson() {
    if (!metricsEnabled) {
        return { enabled: false };
    }
    return client.register.getMetricsAsJSON();
}

/**
 * Reset all metrics (useful for testing)
 */
function resetMetrics() {
    if (!metricsEnabled) return;
    client.register.resetMetrics();
}

module.exports = {
    recordMetric,
    updateQueueSize,
    getMetrics,
    getMetricsJson,
    resetMetrics,
    metricsEnabled
};
