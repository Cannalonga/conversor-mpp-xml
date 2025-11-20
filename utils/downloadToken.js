const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class DownloadTokenManager {
    constructor() {
        this.secretKey = process.env.SECRET_KEY || 'fallback-secret-key-change-me';
        // SEGURANÇA: Validar que DOWNLOAD_TOKEN_EXPIRY é número válido (não NaN)
        const expiryEnv = parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY);
        this.expiryMinutes = (Number.isNaN(expiryEnv) || expiryEnv <= 0) ? 15 : expiryEnv;
        
        if (!process.env.DOWNLOAD_TOKEN_EXPIRY) {
            console.warn('⚠️ DOWNLOAD_TOKEN_EXPIRY não definido em .env, usando padrão 15 minutos');
        }
    }

    /**
     * Gera token temporário seguro para download
     * @param {string} filename - Nome do arquivo
     * @param {object} metadata - Metadados opcionais
     * @returns {string} Token JWT assinado
     */
    gerarToken(filename, metadata = {}) {
        const payload = {
            filename,
            metadata,
            type: 'download',
            timestamp: Date.now()
        };

        const options = {
            expiresIn: `${this.expiryMinutes}m`,
            issuer: 'mpp-converter',
            subject: 'file-download'
        };

        return jwt.sign(payload, this.secretKey, options);
    }

    /**
     * Valida token de download
     * @param {string} token - Token JWT
     * @returns {object} Payload decodificado ou null se inválido
     */
    validarToken(token) {
        try {
            const options = {
                issuer: 'mpp-converter',
                subject: 'file-download'
            };

            const payload = jwt.verify(token, this.secretKey, options);
            
            // Verificação adicional de tipo
            if (payload.type !== 'download') {
                console.log('⚠️ Token inválido: tipo incorreto');
                return null;
            }

            return payload;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.log('⚠️ Token expirado');
            } else if (error.name === 'JsonWebTokenError') {
                console.log('⚠️ Token malformado');
            } else {
                console.error('❌ Erro na validação do token:', error);
            }
            return null;
        }
    }

    /**
     * Gera hash seguro para validação adicional
     * @param {string} filename 
     * @returns {string} Hash SHA256
     */
    generateFileHash(filename) {
        return crypto
            .createHash('sha256')
            .update(filename + this.secretKey)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Valida hash de arquivo
     * @param {string} filename 
     * @param {string} hash 
     * @returns {boolean}
     */
    validateFileHash(filename, hash) {
        const expectedHash = this.generateFileHash(filename);
        return hash === expectedHash;
    }
}

module.exports = new DownloadTokenManager();