/**
 * Health Check Service - ENTERPRISE STANDARD
 * Monitors application health and dependencies
 */

const os = require('os');
const Logger = require('./logger');
const logger = new Logger('HealthCheck');

class HealthCheckService {
    constructor() {
        this.startTime = Date.now();
        this.checks = new Map();
        this.registerDefaultChecks();
    }

    /**
     * Register default health checks
     */
    registerDefaultChecks() {
        this.register('system', this.checkSystem.bind(this));
        this.register('memory', this.checkMemory.bind(this));
    }

    /**
     * Register custom health check
     */
    register(name, fn) {
        this.checks.set(name, fn);
    }

    /**
     * Check system resources
     */
    checkSystem() {
        const uptime = process.uptime();
        const now = Date.now();
        const appUptime = (now - this.startTime) / 1000;
        
        return {
            status: 'ok',
            uptime: Math.floor(appUptime),
            systemUptime: Math.floor(os.uptime()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Check memory usage
     */
    checkMemory() {
        const usage = process.memoryUsage();
        const total = os.totalmem();
        const free = os.freemem();
        
        const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
        const systemUsedPercent = ((total - free) / total) * 100;
        
        let status = 'ok';
        if (heapUsedPercent > 90) {
            status = 'warning';
        } else if (heapUsedPercent > 95) {
            status = 'critical';
        }
        
        return {
            status,
            heap: {
                used: Math.round(usage.heapUsed / 1024 / 1024),
                total: Math.round(usage.heapTotal / 1024 / 1024),
                percent: heapUsedPercent.toFixed(2)
            },
            system: {
                used: Math.round((total - free) / 1024 / 1024),
                total: Math.round(total / 1024 / 1024),
                percent: systemUsedPercent.toFixed(2)
            },
            external: Math.round(usage.external / 1024 / 1024)
        };
    }

    /**
     * Run all health checks
     */
    async runAll() {
        const results = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: {},
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
        
        for (const [name, check] of this.checks) {
            try {
                const result = await Promise.resolve(check());
                results.checks[name] = {
                    status: result.status || 'ok',
                    ...result
                };
                
                if (result.status === 'critical') {
                    results.status = 'critical';
                } else if (result.status === 'warning' && results.status !== 'critical') {
                    results.status = 'warning';
                }
            } catch (error) {
                logger.error(`Health check failed: ${name}`, error);
                results.checks[name] = {
                    status: 'error',
                    error: error.message
                };
                results.status = 'critical';
            }
        }
        
        return results;
    }

    /**
     * Get quick health status
     */
    async getQuickStatus() {
        const health = await this.runAll();
        return health.status === 'ok';
    }
}

module.exports = HealthCheckService;
