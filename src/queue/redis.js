/**
 * Redis Connection for BullMQ
 * 
 * Provides a shared ioredis connection for all queue operations.
 * Supports both local development and Docker environments.
 */

const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Parse Redis URL for connection options
let connectionOptions;
try {
    const url = new URL(redisUrl);
    connectionOptions = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
            if (times > 10) {
                console.error('[Redis] Max retries reached, giving up');
                return null;
            }
            const delay = Math.min(times * 200, 2000);
            console.log(`[Redis] Retry ${times}, waiting ${delay}ms`);
            return delay;
        }
    };
} catch (e) {
    // Fallback to defaults
    connectionOptions = {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    };
}

const connection = new IORedis(connectionOptions);

connection.on('connect', () => {
    console.log('[Redis] Connected successfully');
});

connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});

connection.on('close', () => {
    console.log('[Redis] Connection closed');
});

/**
 * Create a duplicate connection for subscribers (required by BullMQ)
 */
function createConnection() {
    return new IORedis(connectionOptions);
}

/**
 * Gracefully close Redis connection
 */
async function closeConnection() {
    try {
        await connection.quit();
        console.log('[Redis] Connection closed gracefully');
    } catch (err) {
        console.error('[Redis] Error closing connection:', err.message);
    }
}

/**
 * Check if Redis is healthy
 */
async function healthCheck() {
    try {
        const result = await connection.ping();
        return { healthy: result === 'PONG', latencyMs: 0 };
    } catch (err) {
        return { healthy: false, error: err.message };
    }
}

module.exports = {
    connection,
    createConnection,
    closeConnection,
    healthCheck,
    redisUrl
};
