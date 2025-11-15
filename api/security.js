const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Configurações de segurança centralizadas
const securityConfig = {
    // Rate limits
    rateLimits: {
        general: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por janela
            message: 'Muitas tentativas. Tente novamente em 15 minutos.'
        },
        upload: {
            windowMs: 5 * 60 * 1000, // 5 minutos  
            max: 5, // máximo 5 uploads por janela
            skipSuccessfulRequests: true
        },
        payment: {
            windowMs: 10 * 60 * 1000, // 10 minutos
            max: 3 // máximo 3 tentativas de pagamento
        },
        admin: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 10 // máximo 10 tentativas admin
        }
    },
    
    // Configurações de senha
    password: {
        minLength: 12,
        requireNumbers: true,
        requireUppercase: true,
        requireLowercase: true,
        requireSpecial: true,
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 dias
        historySize: 5
    },
    
    // Configurações de sessão
    session: {
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
    },
    
    // Chaves de criptografia
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    SALT_ROUNDS: 12,
    
    // Configurações de upload
    upload: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['.mpp', '.xml'],
        virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
        quarantinePath: './uploads/quarantine/'
    },
    
    // Configurações de monitoramento
    monitoring: {
        logLevel: process.env.LOG_LEVEL || 'info',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        alertThresholds: {
            errorRate: 0.05, // 5%
            responseTime: 2000, // 2s
            failedLogins: 5
        }
    }
};

// Função de hash de senha segura com PBKDF2
function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return {
        hash: hash.toString('hex'),
        salt: salt
    };
}

// Verificação de senha
function verifyPassword(password, hash, salt) {
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return computed.toString('hex') === hash;
}

// Criptografia de dados sensíveis
function encryptSensitiveData(data, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

// Descriptografia de dados sensíveis
function decryptSensitiveData(encryptedData, key) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Classe utilitária de segurança
class SecurityUtils {
    static encrypt(data) {
        return encryptSensitiveData(data, securityConfig.ENCRYPTION_KEY);
    }
    
    static decrypt(encryptedData) {
        return decryptSensitiveData(encryptedData, securityConfig.ENCRYPTION_KEY);
    }
    
    static generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static hashPassword(password, salt) {
        return hashPassword(password, salt);
    }
    
    static verifyPassword(password, hash, salt) {
        return verifyPassword(password, hash, salt);
    }
}

// Função para obter IP do cliente de forma segura
function getClientIP(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    const connectionRemoteAddr = req.connection?.remoteAddress;
    const socketRemoteAddr = req.socket?.remoteAddress;
    const connectionSocketRemoteAddr = req.connection?.socket?.remoteAddress;
    
    let clientIP = xForwardedFor || xRealIP || connectionRemoteAddr || 
                   socketRemoteAddr || connectionSocketRemoteAddr || '127.0.0.1';
    
    // Se houver múltiplos IPs, pegar o primeiro (cliente real)
    if (clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
    }
    
    // Validar formato do IP
    if (!validator.isIP(clientIP)) {
        clientIP = '127.0.0.1';
    }
    
    return clientIP;
}

module.exports = {
    SecurityUtils,
    securityConfig,
    getClientIP,
    hashPassword,
    verifyPassword,
    encryptSensitiveData,
    decryptSensitiveData
};