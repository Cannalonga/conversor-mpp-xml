const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// ✅ Extensões permitidas
const ALLOWED_EXTENSIONS = new Set(['.mpp', '.xml']);

// ✅ MIME-types esperados (validação rigorosa)
const ALLOWED_MIMES = new Map([
    ['.mpp', ['application/vnd.ms-project', 'application/x-mpp', 'application/octet-stream']],
    ['.xml', ['application/xml', 'text/xml']]
]);

// Tamanho máximo (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ✅ Tamanho máximo para XML (10MB) - prevenir ZIP bomb
const MAX_XML_SIZE = 10 * 1024 * 1024;

// ✅ Magic numbers (file signatures) para validação segura
const MAGIC_NUMBERS = {
    // MPP (Microsoft Project) - começa com "0x0400" ou "0x0800"
    '.mpp': [Buffer.from([0x0F, 0xD0]), Buffer.from([0x0D, 0x00])],
    // XML - começa com "<" (0x3C)
    '.xml': [Buffer.from('<')]
};

/**
 * ✅ Valida magic bytes do arquivo
 */
async function validateMagicBytes(filePath, extension) {
    try {
        const fd = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(512);
        await fd.read(buffer, 0, 512, 0);
        await fd.close();
        
        const magics = MAGIC_NUMBERS[extension] || [];
        const isValid = magics.some(magic => buffer.includes(magic));
        
        return isValid;
    } catch (error) {
        console.error('Erro ao validar magic bytes:', error);
        return false;
    }
}

/**
 * ✅ Detecta MIME-type real lendo o arquivo
 */
async function detectMimeType(filePath) {
    try {
        // Tenta usar file-type se disponível
        try {
            const fileType = require('file-type');
            const detected = await fileType.fromFile(filePath);
            return detected ? detected.mime : null;
        } catch (e) {
            // file-type não instalado, usar fallback
            const fd = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(512);
            await fd.read(buffer, 0, 512, 0);
            await fd.close();
            
            // Fallback: detectar por magic bytes
            if (buffer[0] === 0x3C) return 'application/xml'; // <
            if (buffer[0] === 0x0F) return 'application/vnd.ms-project'; // MPP
            
            return null;
        }
    } catch (error) {
        console.error('Erro ao detectar MIME-type:', error);
        return null;
    }
}

/**
 * ✅ Escaneia conteúdo XML para XXE e ataques conhecidos
 */
function scanXMLContent(content) {
    const xxePatterns = [
        /<!DOCTYPE/gi,           // DOCTYPE declaration
        /SYSTEM\s+["']file:\/\//gi, // File system access
        /SYSTEM\s+["']http:\/\//gi, // HTTP access
        /<!ENTITY/gi,            // Entity definition
        /SYSTEM\s*["']/gi,       // SYSTEM without protocol
        /PUBLIC\s+["']/gi        // PUBLIC declarations
    ];
    
    const findings = [];
    xxePatterns.forEach((pattern, idx) => {
        if (pattern.test(content)) {
            findings.push(`Padrão suspeito detectado: ${pattern}`);
        }
    });
    
    return findings;
}

/**
 * ✅ Valida tamanho do arquivo
 */
function validateFileSize(size, extension = null) {
    if (!size || size <= 0) return false;
    
    // XML tem limite menor (ZIP bomb prevention)
    const maxSize = extension === '.xml' ? MAX_XML_SIZE : MAX_FILE_SIZE;
    return size <= maxSize;
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
    
    return filename
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')
        .replace(/_{2,}/g, '_')
        .trim();
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
 * ✅ NOVO: Validação COMPLETA e SEGURA de upload
 */
async function validateUploadSecure(file, filePath) {
    const errors = [];
    const warnings = [];
    
    if (!file) {
        errors.push('Arquivo não fornecido');
        return { valid: false, errors, warnings };
    }
    
    // 1. Validar extensão
    if (!file.originalname) {
        errors.push('Nome do arquivo é obrigatório');
        return { valid: false, errors, warnings };
    }
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        errors.push('Tipo de arquivo não permitido. Use apenas .mpp ou .xml');
        return { valid: false, errors, warnings };
    }
    
    // 2. Validar tamanho
    if (!validateFileSize(file.size, ext)) {
        const limit = ext === '.xml' ? MAX_XML_SIZE / 1024 / 1024 : MAX_FILE_SIZE / 1024 / 1024;
        errors.push(`Arquivo muito grande. Máximo ${limit}MB`);
    }
    
    // 3. Validar magic bytes
    try {
        const magicValid = await validateMagicBytes(filePath, ext);
        if (!magicValid) {
            errors.push('Conteúdo do arquivo não corresponde à extensão (possível falsificação)');
        }
    } catch (error) {
        warnings.push(`Não foi possível validar magic bytes: ${error.message}`);
    }
    
    // 4. Validar MIME-type
    try {
        const detectedMime = await detectMimeType(filePath);
        const allowedMimes = ALLOWED_MIMES.get(ext) || [];
        
        if (detectedMime && !allowedMimes.includes(detectedMime)) {
            errors.push(`MIME-type suspeito: ${detectedMime}`);
        }
    } catch (error) {
        warnings.push(`Não foi possível detectar MIME-type: ${error.message}`);
    }
    
    // 5. Escanear conteúdo XML
    if (ext === '.xml') {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Detectar XXE
            const xxeFindings = scanXMLContent(content);
            if (xxeFindings.length > 0) {
                errors.push(`Arquivo contém padrões suspeitos: ${xxeFindings.join(', ')}`);
            }
            
            // Detectar ZIP bomb (XML comprimido)
            if (content.length > 10 * 1024 * 1024 && file.size < 1024 * 1024) {
                errors.push('Arquivo XML suspeito (possível ZIP bomb)');
            }
        } catch (error) {
            warnings.push(`Não foi possível escanear conteúdo XML: ${error.message}`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * ✅ Mantém a função antiga para compatibilidade
 */
function validateUpload(file) {
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
    ALLOWED_MIMES,
    MAX_FILE_SIZE,
    MAX_XML_SIZE,
    MAGIC_NUMBERS,
    isAllowedFile,
    generateSafeFilename,
    sanitizeFilename,
    validateFileSize,
    ensureDirectory,
    validateUpload,
    validateUploadSecure,  // ✅ NOVO
    detectMimeType,        // ✅ NOVO
    validateMagicBytes,    // ✅ NOVO
    scanXMLContent,        // ✅ NOVO
    logUploadInfo
};