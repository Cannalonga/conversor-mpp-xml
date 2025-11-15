const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Extensões permitidas
const ALLOWED_EXTENSIONS = new Set(['.mpp', '.xml']);

// Tamanho máximo (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Valida o magic header do arquivo para verificar tipo real
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} filename - Nome do arquivo
 * @returns {boolean} - True se válido
 */
function validateFileHeader(buffer, filename) {
    if (!buffer || buffer.length < 4) {
        return false;
    }
    
    const ext = path.extname(filename).toLowerCase();
    const header = buffer.slice(0, 4).toString('hex').toLowerCase();
    
    // Magic numbers conhecidos
    const magicNumbers = {
        // MPP files (Microsoft Project) - geralmente ZIP-based
        '.mpp': ['504b0304', '504b0506', '504b0708'], // ZIP signatures
        // XML files
        '.xml': ['3c3f786d', '3c786d6c', 'efbbbf3c', 'fffe3c00'] // <?xml, <xml, BOM+<, UTF-16
    };
    
    const allowedHeaders = magicNumbers[ext];
    if (!allowedHeaders) {
        return false;
    }
    
    // Verificar se header corresponde a algum magic number válido
    return allowedHeaders.some(magic => header.startsWith(magic));
}

/**
 * Verifica se a extensão do arquivo é permitida
 */
function isAllowedFile(filename) {
    if (!filename) return false;
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Gera um nome de arquivo seguro com UUID
 */
function generateSafeFilename(originalFilename) {
    if (!originalFilename) {
        throw new Error('Nome do arquivo é obrigatório');
    }
    
    const ext = path.extname(originalFilename).toLowerCase();
    const uuid = crypto.randomUUID();
    return `${uuid}${ext}`;
}

/**
 * Sanitiza o nome original do arquivo
 */
function sanitizeFilename(filename) {
    if (!filename) return '';
    
    // Remove caracteres perigosos e mantém apenas alfanuméricos, pontos, hífens e underscores
    return filename
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')
        .replace(/_{2,}/g, '_')
        .trim();
}

/**
 * Valida o tamanho do arquivo
 */
function validateFileSize(size) {
    return size && size <= MAX_FILE_SIZE;
}

/**
 * Garante que o diretório existe
 */
async function ensureDirectory(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        console.error(`Erro ao criar diretório ${dirPath}:`, error);
        return false;
    }
}

/**
 * Valida completamente um arquivo de upload
 * @param {Object} file - Arquivo do multer
 * @param {Buffer} fileBuffer - Buffer do arquivo para validação de header
 * @returns {Object} - Resultado da validação
 */
function validateUpload(file, fileBuffer = null) {
    const errors = [];
    
    if (!file) {
        errors.push('Arquivo não fornecido');
        return { valid: false, errors };
    }
    
    if (!file.originalname) {
        errors.push('Nome do arquivo é obrigatório');
    } else if (!isAllowedFile(file.originalname)) {
        errors.push('Tipo de arquivo não permitido. Use apenas .mpp ou .xml');
    }
    
    if (!validateFileSize(file.size)) {
        errors.push(`Arquivo muito grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // 🔐 SECURITY: Magic header validation
    if (fileBuffer && file.originalname) {
        if (!validateFileHeader(fileBuffer, file.originalname)) {
            errors.push('Arquivo não corresponde ao tipo esperado (magic header inválido)');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Registra informações de upload de forma segura
 */
function logUploadInfo(file, safeFilename) {
    const logData = {
        timestamp: new Date().toISOString(),
        originalName: sanitizeFilename(file.originalname),
        safeFilename: safeFilename,
        size: file.size,
        mimetype: file.mimetype
    };
    
    console.log('📁 Upload seguro:', JSON.stringify(logData));
    return logData;
}

module.exports = {
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    isAllowedFile,
    generateSafeFilename,
    sanitizeFilename,
    validateFileSize,
    validateFileHeader,
    ensureDirectory,
    validateUpload,
    logUploadInfo
};