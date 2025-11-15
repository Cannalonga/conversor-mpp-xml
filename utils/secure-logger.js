/**
 * Sistema de Logging Seguro - Evita vazamento de dados sensíveis
 * @author Rafael Cannalonga
 * @date 2025-11-14
 */

const path = require('path');

class SecureLogger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = {
            error: 0,
            warn: 1, 
            info: 2,
            debug: 3
        };
        
        // Padrões de dados sensíveis para mascarar
        this.sensitivePatterns = [
            /password['":\s]*['"]*([^'",\s}]+)/gi,
            /token['":\s]*['"]*([^'",\s}]+)/gi,
            /secret['":\s]*['"]*([^'",\s}]+)/gi,
            /authorization['":\s]*['"]*([^'",\s}]+)/gi,
            /pix['":\s]*['"]*([0-9]{11})/gi,
            /cpf['":\s]*['"]*([0-9]{11})/gi,
            /cnpj['":\s]*['"]*([0-9]{14})/gi,
            /email['":\s]*['"]*([^'",\s}@]+@[^'",\s}]+)/gi,
            /card['":\s]*['"]*([0-9]{4}[\s\-]*[0-9]{4}[\s\-]*[0-9]{4}[\s\-]*[0-9]{4})/gi
        ];
    }
    
    /**
     * Máscara dados sensíveis em strings
     */
    maskSensitiveData(message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        
        let masked = message;
        
        this.sensitivePatterns.forEach(pattern => {
            masked = masked.replace(pattern, (match, group1) => {
                const prefix = match.substring(0, match.indexOf(group1));
                const masked = group1.length > 4 
                    ? group1.substring(0, 2) + '*'.repeat(group1.length - 4) + group1.substring(group1.length - 2)
                    : '***';
                return prefix + masked;
            });
        });
        
        return masked;
    }
    
    /**
     * Verifica se deve logar baseado no nível
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }
    
    /**
     * Formatar timestamp
     */
    formatTimestamp() {
        return new Date().toISOString();
    }
    
    /**
     * Log de erro
     */
    error(message, meta = {}) {
        if (!this.shouldLog('error')) return;
        
        const sanitizedMessage = this.maskSensitiveData(message);
        const sanitizedMeta = this.maskSensitiveData(JSON.stringify(meta));
        
        console.error(`[${this.formatTimestamp()}] [ERROR] ${sanitizedMessage}`, 
            sanitizedMeta !== '{}' ? JSON.parse(sanitizedMeta) : '');
    }
    
    /**
     * Log de warning
     */
    warn(message, meta = {}) {
        if (!this.shouldLog('warn')) return;
        
        const sanitizedMessage = this.maskSensitiveData(message);
        const sanitizedMeta = this.maskSensitiveData(JSON.stringify(meta));
        
        console.warn(`[${this.formatTimestamp()}] [WARN] ${sanitizedMessage}`, 
            sanitizedMeta !== '{}' ? JSON.parse(sanitizedMeta) : '');
    }
    
    /**
     * Log de info
     */
    info(message, meta = {}) {
        if (!this.shouldLog('info')) return;
        
        const sanitizedMessage = this.maskSensitiveData(message);
        const sanitizedMeta = this.maskSensitiveData(JSON.stringify(meta));
        
        console.log(`[${this.formatTimestamp()}] [INFO] ${sanitizedMessage}`, 
            sanitizedMeta !== '{}' ? JSON.parse(sanitizedMeta) : '');
    }
    
    /**
     * Log de debug (apenas em desenvolvimento)
     */
    debug(message, meta = {}) {
        if (!this.shouldLog('debug') || process.env.NODE_ENV === 'production') return;
        
        const sanitizedMessage = this.maskSensitiveData(message);
        const sanitizedMeta = this.maskSensitiveData(JSON.stringify(meta));
        
        console.debug(`[${this.formatTimestamp()}] [DEBUG] ${sanitizedMessage}`, 
            sanitizedMeta !== '{}' ? JSON.parse(sanitizedMeta) : '');
    }
    
    /**
     * Log de auditoria (sempre registrado)
     */
    audit(event, details = {}) {
        const auditData = {
            timestamp: this.formatTimestamp(),
            event: event,
            details: this.maskSensitiveData(JSON.stringify(details)),
            pid: process.pid
        };
        
        console.log(`[AUDIT] ${JSON.stringify(auditData)}`);
    }
    
    /**
     * Log de segurança (sempre registrado, alta prioridade)
     */
    security(event, details = {}) {
        const securityData = {
            timestamp: this.formatTimestamp(),
            type: 'SECURITY',
            event: event,
            details: this.maskSensitiveData(JSON.stringify(details)),
            pid: process.pid
        };
        
        console.error(`[SECURITY] ${JSON.stringify(securityData)}`);
    }
}

// Singleton instance
const logger = new SecureLogger(process.env.LOG_LEVEL || 'info');

module.exports = logger;