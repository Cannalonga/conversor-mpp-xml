/**
 * Health Check Library
 * 
 * Comprehensive health checks for all system components:
 * - Redis
 * - MPP Microservice
 * - Database
 * - Stripe Webhook status
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  mppService: {
    url: process.env.MPP_SERVICE_URL || 'http://localhost:8080',
    healthEndpoint: '/health',
    timeout: 5000,
  },
  stripeWebhook: {
    maxAgeSeconds: 300, // 5 minutes
  },
};

// Track last successful webhook timestamp
let lastStripeWebhookSuccess = null;

/**
 * Update last successful Stripe webhook timestamp
 */
function updateStripeWebhookSuccess() {
  lastStripeWebhookSuccess = Date.now();
}

/**
 * Get last Stripe webhook success timestamp
 */
function getLastStripeWebhookSuccess() {
  return lastStripeWebhookSuccess;
}

/**
 * Check Redis health and measure latency
 */
async function checkRedis(redisClient) {
  const start = Date.now();
  
  try {
    if (!redisClient || !redisClient.ping) {
      return {
        status: 'unhealthy',
        error: 'Redis client not available',
        latencyMs: null,
      };
    }
    
    await redisClient.ping();
    const latencyMs = Date.now() - start;
    
    return {
      status: 'healthy',
      latencyMs,
      details: {
        host: config.redis.host,
        port: config.redis.port,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check MPP Microservice health
 */
async function checkMppService() {
  const start = Date.now();
  const url = `${config.mppService.url}${config.mppService.healthEndpoint}`;
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: config.mppService.timeout }, (res) => {
      const latencyMs = Date.now() - start;
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let details = {};
          try {
            details = JSON.parse(data);
          } catch (e) {
            details = { raw: data };
          }
          
          resolve({
            status: 'healthy',
            latencyMs,
            httpStatus: res.statusCode,
            details,
          });
        } else {
          resolve({
            status: 'unhealthy',
            latencyMs,
            httpStatus: res.statusCode,
            error: `HTTP ${res.statusCode}`,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        latencyMs: config.mppService.timeout,
        error: 'Connection timeout',
      });
    });
  });
}

/**
 * Check Stripe Webhook health (based on last successful event)
 */
function checkStripeWebhook() {
  if (!lastStripeWebhookSuccess) {
    return {
      status: 'unknown',
      message: 'No webhook events received yet',
      lastSuccess: null,
    };
  }
  
  const ageSeconds = (Date.now() - lastStripeWebhookSuccess) / 1000;
  const isHealthy = ageSeconds < config.stripeWebhook.maxAgeSeconds;
  
  return {
    status: isHealthy ? 'healthy' : 'warning',
    lastSuccess: new Date(lastStripeWebhookSuccess).toISOString(),
    ageSeconds: Math.round(ageSeconds),
    message: isHealthy 
      ? 'Recent webhook activity' 
      : `No webhook events in ${Math.round(ageSeconds)} seconds`,
  };
}

/**
 * Check database health (via Prisma)
 */
async function checkDatabase(prisma) {
  const start = Date.now();
  
  try {
    if (!prisma) {
      return {
        status: 'unhealthy',
        error: 'Prisma client not available',
        latencyMs: null,
      };
    }
    
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    
    return {
      status: 'healthy',
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check BullMQ Queue health
 */
async function checkQueue(queue) {
  try {
    if (!queue) {
      return {
        status: 'unhealthy',
        error: 'Queue not available',
      };
    }
    
    const [waiting, active, delayed, failed, completed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
      queue.getCompletedCount(),
    ]);
    
    // Check for queue congestion
    const isHealthy = waiting < 1000 && failed < 100;
    
    return {
      status: isHealthy ? 'healthy' : 'warning',
      counts: {
        waiting,
        active,
        delayed,
        failed,
        completed,
      },
      message: isHealthy ? 'Queue operating normally' : 'Queue may be congested',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * Run all health checks
 */
async function runAllHealthChecks({ redisClient, prisma, queue } = {}) {
  const [redis, mppService, database, queueHealth] = await Promise.all([
    redisClient ? checkRedis(redisClient) : { status: 'skipped', reason: 'No client provided' },
    checkMppService(),
    prisma ? checkDatabase(prisma) : { status: 'skipped', reason: 'No client provided' },
    queue ? checkQueue(queue) : { status: 'skipped', reason: 'No queue provided' },
  ]);
  
  const stripeWebhook = checkStripeWebhook();
  
  // Determine overall status
  const statuses = [redis.status, mppService.status, database.status, queueHealth.status];
  const hasUnhealthy = statuses.includes('unhealthy');
  const hasWarning = statuses.includes('warning');
  
  let overallStatus = 'healthy';
  if (hasUnhealthy) overallStatus = 'unhealthy';
  else if (hasWarning) overallStatus = 'degraded';
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      redis,
      mppService,
      database,
      queue: queueHealth,
      stripeWebhook,
    },
  };
}

/**
 * Simple liveness check (is the process running?)
 */
function livenessCheck() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

/**
 * Readiness check (is the service ready to accept traffic?)
 */
async function readinessCheck({ redisClient, prisma } = {}) {
  const checks = await runAllHealthChecks({ redisClient, prisma });
  
  const isReady = checks.status !== 'unhealthy';
  
  return {
    ready: isReady,
    status: checks.status,
    timestamp: new Date().toISOString(),
    details: checks.checks,
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Individual checks
  checkRedis,
  checkMppService,
  checkStripeWebhook,
  checkDatabase,
  checkQueue,
  
  // Combined checks
  runAllHealthChecks,
  livenessCheck,
  readinessCheck,
  
  // Stripe webhook tracking
  updateStripeWebhookSuccess,
  getLastStripeWebhookSuccess,
  
  // Configuration
  config,
};
