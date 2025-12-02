/**
 * Logger with Winston and Daily Rotation
 * Provides structured logging with automatic file rotation
 */

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create logger instance with daily rotation
 */
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.printf(({ timestamp, level, message, ...meta }) => {
            let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
            if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
        })
    ),
    transports: [
        // Console transport
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        }),
        
        // Daily rotate file transport - all logs
        new transports.DailyRotateFile({
            filename: path.join(logsDir, '%DATE%-app.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d', // Keep 14 days of logs
            zippedArchive: true,
            format: format.combine(
                format.timestamp(),
                format.json()
            )
        }),
        
        // Daily rotate file transport - errors only
        new transports.DailyRotateFile({
            filename: path.join(logsDir, '%DATE%-error.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d', // Keep 30 days of error logs
            zippedArchive: true,
            format: format.combine(
                format.timestamp(),
                format.json()
            )
        })
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(logsDir, '%DATE%-exceptions.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true
        })
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(logsDir, '%DATE%-rejections.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true
        })
    ],
    exitOnError: false
});

// Log startup info
if (process.env.NODE_ENV !== 'test') {
    logger.info(`Logger initialized`, { 
        level: process.env.LOG_LEVEL || 'info',
        environment: process.env.NODE_ENV || 'development'
    });
}

module.exports = logger;
