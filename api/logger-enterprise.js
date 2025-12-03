/**
 * Enterprise Logger - Logging avançado com rotação e gestão
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnterpriseLogger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(__dirname, '../logs');
        this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
        this.maxDays = options.maxDays || 30;
        this.level = options.level || 'info';
        
        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    log(message, level = 'info', meta = {}) {
        if (this.levels[level] > this.levels[this.level]) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };

        const formattedLog = `${timestamp} [${level.toUpperCase()}] ${message}`;
        
        if (meta && Object.keys(meta).length > 0) {
            console.log(formattedLog, JSON.stringify(meta));
        } else {
            console.log(formattedLog);
        }

        this.writeToFile(level, formattedLog);
    }

    writeToFile(level, logEntry) {
        try {
            const logFile = path.join(this.logDir, `${level}.log`);
            const mainLogFile = path.join(this.logDir, 'server.log');

            fs.appendFileSync(logFile, logEntry + '\n');
            fs.appendFileSync(mainLogFile, logEntry + '\n');

            // Check if rotation needed
            this.checkRotation(logFile);
            this.checkRotation(mainLogFile);
        } catch (error) {
            console.error('Erro ao escrever log:', error.message);
        }
    }

    checkRotation(logFile) {
        try {
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.maxSize) {
                    this.rotateLog(logFile);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar rotação:', error.message);
        }
    }

    rotateLog(logFile) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = `${logFile}.${timestamp}`;
            fs.renameSync(logFile, rotatedFile);
            fs.appendFileSync(logFile, ''); // Create new empty log
            this.cleanOldLogs();
        } catch (error) {
            console.error('Erro ao rotacionar log:', error.message);
        }
    }

    cleanOldLogs() {
        try {
            const cutoffDate = Date.now() - (this.maxDays * 24 * 60 * 60 * 1000);
            const files = fs.readdirSync(this.logDir);

            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtimeMs < cutoffDate && file.includes('.')) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {
            console.error('Erro ao limpar logs antigos:', error.message);
        }
    }

    error(message, meta) {
        this.log(message, 'error', meta);
    }

    warn(message, meta) {
        this.log(message, 'warn', meta);
    }

    info(message, meta) {
        this.log(message, 'info', meta);
    }

    debug(message, meta) {
        this.log(message, 'debug', meta);
    }

    requestLog(req, res, responseTime) {
        const meta = {
            method: req.method,
            path: req.path,
            ip: req.ip,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('user-agent')
        };
        this.info(`${req.method} ${req.path}`, meta);
    }
}

module.exports = EnterpriseLogger;
