/**
 * Logger Configuration - ENTERPRISE GRADE
 * Winston-based logging with structured logs, levels, and rotation
 * FIX #3: Medium priority - Daily rotation with retention policy
 */

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston Logger Configuration with Daily Rotation
 * FIX #3: Medium priority security fix
 * - Rotates daily
 * - Keeps max 14 days of logs
 * - Max size per file: 10MB
 */
const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'conversor-mpp' },
    transports: [
        // Daily rotate file for all logs
        new DailyRotateFile({
            filename: path.join(logsDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m', // 10MB per file
            maxDays: process.env.LOG_MAX_FILES || '14d', // Keep 14 days
            format: winston.format.json(),
            level: 'info'
        }),
        // Daily rotate file for errors only
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m',
            maxDays: process.env.LOG_MAX_FILES || '14d',
            format: winston.format.json(),
            level: 'error'
        }),
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            ),
            level: process.env.LOG_LEVEL || 'info'
        })
    ]
});

/**
 * Enhanced Logger Class wrapping Winston
 */
class Logger {
    constructor(module) {
        this.module = module;
        this.isDevelopment = process.env.NODE_ENV !== 'production';
        this.winston = winstonLogger;
    }

    /**
     * Get timestamp in ISO format
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message
     */
    formatMessage(level, message, meta = {}) {
        const log = {
            timestamp: this.getTimestamp(),
            level: level.toUpperCase(),
            module: this.module,
            message,
            ...meta
        };
        return JSON.stringify(log);
    }

    /**
     * INFO level - Uses Winston
     */
    info(message, meta = {}) {
        this.winston.info(message, { ...meta, module: this.module });
    }

    /**
     * ERROR level - Uses Winston
     */
    error(message, error = null, meta = {}) {
        const errorMeta = error ? {
            ...meta,
            error: error.message,
            stack: error.stack
        } : meta;
        this.winston.error(message, { ...errorMeta, module: this.module });
    }

    /**
     * WARN level - Uses Winston
     */
    warn(message, meta = {}) {
        this.winston.warn(message, { ...meta, module: this.module });
    }

    /**
     * DEBUG level - Uses Winston (development only)
     */
    debug(message, meta = {}) {
        if (this.isDevelopment) {
            this.winston.debug(message, { ...meta, module: this.module });
        }
    }

    /**
     * Log HTTP requests
     */
    http(method, path, statusCode, responseTime) {
        const message = `${method} ${path} - ${statusCode} (${responseTime}ms)`;
        this.info(message, {
            type: 'http',
            method,
            path,
            statusCode,
            responseTime
        });
    }

    /**
     * Log API calls
     */
    api(endpoint, method, statusCode, meta = {}) {
        this.info(`API: ${method} ${endpoint}`, {
            type: 'api',
            endpoint,
            method,
            statusCode,
            ...meta
        });
    }

    /**
     * Log security events
     */
    security(event, details = {}) {
        this.warn(`SECURITY: ${event}`, {
            type: 'security',
            event,
            ...details
        });
    }

    /**
     * Log database operations
     */
    database(operation, query, duration, meta = {}) {
        this.debug(`DB: ${operation}`, {
            type: 'database',
            operation,
            query: query.substring(0, 100), // Truncate long queries
            duration,
            ...meta
        });
    }

    /**
     * Log file operations
     */
    file(operation, filename, meta = {}) {
        this.debug(`FILE: ${operation} - ${filename}`, {
            type: 'file',
            operation,
            filename,
            ...meta
        });
    }
}

/**
 * Export factory function for convenience
 */
module.exports = Logger;
module.exports.createLogger = (moduleName) => new Logger(moduleName);
module.exports.getWinstonLogger = () => winstonLogger;
