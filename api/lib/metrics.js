/**
 * Prometheus Metrics Library
 * 
 * Enterprise-grade observability for the MPP Converter system.
 * Exposes counters, histograms, and gauges for all critical operations.
 */

const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// ============================================
// COUNTERS
// ============================================

/**
 * Total conversion jobs by status
 */
const conversionJobsTotal = new client.Counter({
  name: 'conversion_jobs_total',
  help: 'Total number of conversion jobs',
  labelNames: ['status', 'converter'],
  registers: [register],
});

/**
 * Total job failures
 */
const conversionJobFailuresTotal = new client.Counter({
  name: 'conversion_job_failures_total',
  help: 'Total number of failed conversion jobs',
  labelNames: ['converter', 'error_type'],
  registers: [register],
});

/**
 * Total job retries
 */
const conversionJobRetriesTotal = new client.Counter({
  name: 'conversion_job_retries_total',
  help: 'Total number of job retries',
  labelNames: ['converter'],
  registers: [register],
});

/**
 * Stripe webhook events received
 */
const stripeWebhookReceivedTotal = new client.Counter({
  name: 'stripe_webhook_received_total',
  help: 'Total Stripe webhook events received',
  labelNames: ['event_type'],
  registers: [register],
});

/**
 * Stripe webhook failures
 */
const stripeWebhookFailedTotal = new client.Counter({
  name: 'stripe_webhook_failed_total',
  help: 'Total Stripe webhook processing failures',
  labelNames: ['event_type', 'error_type'],
  registers: [register],
});

/**
 * Auto-refunds triggered
 */
const autoRefundTriggeredTotal = new client.Counter({
  name: 'auto_refund_triggered_total',
  help: 'Total auto-refunds triggered',
  labelNames: ['reason', 'stage'],
  registers: [register],
});

/**
 * Credits transactions
 */
const creditsTransactionsTotal = new client.Counter({
  name: 'credits_transactions_total',
  help: 'Total credits transactions',
  labelNames: ['type'], // PURCHASE, CONVERSION, REFUND, BONUS
  registers: [register],
});

/**
 * API requests total
 */
const apiRequestsTotal = new client.Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

// ============================================
// HISTOGRAMS
// ============================================

/**
 * Conversion job duration
 */
const conversionJobDurationSeconds = new client.Histogram({
  name: 'conversion_job_duration_seconds',
  help: 'Duration of conversion jobs in seconds',
  labelNames: ['converter', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

/**
 * Worker processing duration
 */
const workerProcessingDurationSeconds = new client.Histogram({
  name: 'worker_processing_duration_seconds',
  help: 'Duration of worker processing in seconds',
  labelNames: ['stage'], // PRE_PROCESS, CONVERSION, POST_PROCESS
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/**
 * API response time
 */
const apiResponseTimeSeconds = new client.Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Microservice response time
 */
const microserviceResponseTimeSeconds = new client.Histogram({
  name: 'microservice_response_time_seconds',
  help: 'MPP Microservice response time in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// ============================================
// GAUGES
// ============================================

/**
 * Redis latency
 */
const redisLatencyMs = new client.Gauge({
  name: 'redis_latency_ms',
  help: 'Redis ping latency in milliseconds',
  registers: [register],
});

/**
 * Queue waiting jobs
 */
const queueWaitingJobs = new client.Gauge({
  name: 'queue_waiting_jobs',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * Queue active jobs
 */
const queueActiveJobs = new client.Gauge({
  name: 'queue_active_jobs',
  help: 'Number of active jobs being processed',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * Queue delayed jobs
 */
const queueDelayedJobs = new client.Gauge({
  name: 'queue_delayed_jobs',
  help: 'Number of delayed jobs in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * Queue failed jobs
 */
const queueFailedJobs = new client.Gauge({
  name: 'queue_failed_jobs',
  help: 'Number of failed jobs in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

/**
 * MPP Microservice status
 */
const mppMicroserviceStatus = new client.Gauge({
  name: 'mpp_microservice_status',
  help: 'MPP Microservice status (1 = UP, 0 = DOWN)',
  registers: [register],
});

/**
 * Refund recovery pending
 */
const refundRecoveryPending = new client.Gauge({
  name: 'refund_recovery_pending',
  help: 'Number of pending refund recoveries',
  registers: [register],
});

/**
 * User credits balance (aggregate)
 */
const userCreditsTotal = new client.Gauge({
  name: 'user_credits_total',
  help: 'Total user credits in system',
  registers: [register],
});

/**
 * Active users (last 24h)
 */
const activeUsersGauge = new client.Gauge({
  name: 'active_users_24h',
  help: 'Number of active users in last 24 hours',
  registers: [register],
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Record a conversion job
 */
function recordConversionJob(converter, status, durationSeconds) {
  conversionJobsTotal.labels(status, converter).inc();
  if (durationSeconds !== undefined) {
    conversionJobDurationSeconds.labels(converter, status).observe(durationSeconds);
  }
}

/**
 * Record a job failure
 */
function recordJobFailure(converter, errorType) {
  conversionJobFailuresTotal.labels(converter, errorType).inc();
}

/**
 * Record a job retry
 */
function recordJobRetry(converter) {
  conversionJobRetriesTotal.labels(converter).inc();
}

/**
 * Record Stripe webhook event
 */
function recordStripeWebhook(eventType, success = true, errorType = null) {
  stripeWebhookReceivedTotal.labels(eventType).inc();
  if (!success && errorType) {
    stripeWebhookFailedTotal.labels(eventType, errorType).inc();
  }
}

/**
 * Record auto-refund
 */
function recordAutoRefund(reason, stage) {
  autoRefundTriggeredTotal.labels(reason, stage).inc();
}

/**
 * Record credits transaction
 */
function recordCreditsTransaction(type) {
  creditsTransactionsTotal.labels(type).inc();
}

/**
 * Record API request
 */
function recordApiRequest(method, path, statusCode, durationSeconds) {
  apiRequestsTotal.labels(method, path, statusCode.toString()).inc();
  if (durationSeconds !== undefined) {
    apiResponseTimeSeconds.labels(method, path).observe(durationSeconds);
  }
}

/**
 * Record worker processing stage
 */
function recordWorkerStage(stage, durationSeconds) {
  workerProcessingDurationSeconds.labels(stage).observe(durationSeconds);
}

/**
 * Record microservice response time
 */
function recordMicroserviceResponse(endpoint, durationSeconds) {
  microserviceResponseTimeSeconds.labels(endpoint).observe(durationSeconds);
}

/**
 * Update Redis latency
 */
function updateRedisLatency(latencyMs) {
  redisLatencyMs.set(latencyMs);
}

/**
 * Update queue metrics
 */
function updateQueueMetrics(queueName, { waiting, active, delayed, failed }) {
  if (waiting !== undefined) queueWaitingJobs.labels(queueName).set(waiting);
  if (active !== undefined) queueActiveJobs.labels(queueName).set(active);
  if (delayed !== undefined) queueDelayedJobs.labels(queueName).set(delayed);
  if (failed !== undefined) queueFailedJobs.labels(queueName).set(failed);
}

/**
 * Update MPP microservice status
 */
function updateMppStatus(isUp) {
  mppMicroserviceStatus.set(isUp ? 1 : 0);
}

/**
 * Update refund recovery pending count
 */
function updateRefundRecoveryPending(count) {
  refundRecoveryPending.set(count);
}

/**
 * Update total user credits
 */
function updateUserCreditsTotal(total) {
  userCreditsTotal.set(total);
}

/**
 * Update active users count
 */
function updateActiveUsers(count) {
  activeUsersGauge.set(count);
}

/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
  return register.metrics();
}

/**
 * Get content type for Prometheus
 */
function getContentType() {
  return register.contentType;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Registry
  register,
  
  // Raw metrics (for advanced use)
  metrics: {
    conversionJobsTotal,
    conversionJobFailuresTotal,
    conversionJobRetriesTotal,
    stripeWebhookReceivedTotal,
    stripeWebhookFailedTotal,
    autoRefundTriggeredTotal,
    creditsTransactionsTotal,
    apiRequestsTotal,
    conversionJobDurationSeconds,
    workerProcessingDurationSeconds,
    apiResponseTimeSeconds,
    microserviceResponseTimeSeconds,
    redisLatencyMs,
    queueWaitingJobs,
    queueActiveJobs,
    queueDelayedJobs,
    queueFailedJobs,
    mppMicroserviceStatus,
    refundRecoveryPending,
    userCreditsTotal,
    activeUsersGauge,
  },
  
  // Helper functions
  recordConversionJob,
  recordJobFailure,
  recordJobRetry,
  recordStripeWebhook,
  recordAutoRefund,
  recordCreditsTransaction,
  recordApiRequest,
  recordWorkerStage,
  recordMicroserviceResponse,
  updateRedisLatency,
  updateQueueMetrics,
  updateMppStatus,
  updateRefundRecoveryPending,
  updateUserCreditsTotal,
  updateActiveUsers,
  
  // Output functions
  getMetrics,
  getContentType,
};
