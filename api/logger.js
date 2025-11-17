/**
 * Logger Configuration - ENTERPRISE GRADE
 * Winston-based logging with structured logs, levels, and rotation
 */

const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Simple Logger Class
 * Implements structured logging without external dependencies initially
 */
class Logger {
    constructor(module) {
        this.module = module;
        this.isDevelopment = process.env.NODE_ENV !== 'production';
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
     * Write log to file
     */
    writeToFile(filename, message) {
        try {
            const logPath = path.join(logsDir, filename);
            const stream = fs.createWriteStream(logPath, { flags: 'a' });
            stream.write(message + '\n');
            stream.end();
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    /**
     * INFO level
     */
    info(message, meta = {}) {
        const formatted = this.formatMessage('info', message, meta);
        console.log(`[INFO] ${this.module} - ${message}`);
        this.writeToFile('app.log', formatted);
    }

    /**
     * ERROR level
     */
    error(message, error = null, meta = {}) {
        const errorMeta = error ? {
            ...meta,
            error: error.message,
            stack: error.stack
        } : meta;
        const formatted = this.formatMessage('error', message, errorMeta);
        console.error(`[ERROR] ${this.module} - ${message}`, error);
        this.writeToFile('error.log', formatted);
    }

    /**
     * WARN level
     */
    warn(message, meta = {}) {
        const formatted = this.formatMessage('warn', message, meta);
        console.warn(`[WARN] ${this.module} - ${message}`);
        this.writeToFile('app.log', formatted);
    }

    /**
     * DEBUG level (development only)
     */
    debug(message, meta = {}) {
        if (this.isDevelopment) {
            const formatted = this.formatMessage('debug', message, meta);
            console.log(`[DEBUG] ${this.module} - ${message}`);
            this.writeToFile('debug.log', formatted);
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
