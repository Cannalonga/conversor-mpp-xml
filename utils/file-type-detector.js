/**
 * 🔍 FILE TYPE DETECTOR
 * 
 * Detecta o tipo real do arquivo baseado em magic bytes,
 * não confia apenas na extensão do arquivo.
 * 
 * Uso:
 *   const { detectFileType, validateFileType } = require('./file-type-detector');
 *   const type = await detectFileType('/path/to/file');
 *   const isValid = await validateFileType('/path/to/file', ['.xlsx', '.xls']);
 */

const fs = require('fs').promises;
const path = require('path');

// Tentar importar file-type (ESM module)
let fileTypeFromBuffer = null;
let fileTypeFromFile = null;

// Lazy load do módulo file-type (é ESM)
async function loadFileType() {
    if (!fileTypeFromBuffer) {
        try {
            const fileType = await import('file-type');
            fileTypeFromBuffer = fileType.fileTypeFromBuffer;
            fileTypeFromFile = fileType.fileTypeFromFile;
        } catch (error) {
            console.warn('[FILE-TYPE] Module not available, using fallback detection');
        }
    }
}

/**
 * Mapeamento de extensões para MIME types esperados
 */
const EXTENSION_MIME_MAP = {
    // Documentos Office
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
    '.xls': ['application/vnd.ms-excel', 'application/x-cfb'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    '.doc': ['application/msword', 'application/x-cfb'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
    '.ppt': ['application/vnd.ms-powerpoint', 'application/x-cfb'],
    '.mpp': ['application/vnd.ms-project', 'application/x-cfb', 'application/octet-stream'],
    
    // Arquivos de dados
    '.xml': ['application/xml', 'text/xml'],
    '.json': ['application/json', 'text/plain'],
    '.csv': ['text/csv', 'text/plain'],
    
    // Arquivos compactados
    '.zip': ['application/zip'],
    '.gz': ['application/gzip'],
    '.tar': ['application/x-tar'],
    '.rar': ['application/x-rar-compressed', 'application/vnd.rar'],
    '.7z': ['application/x-7z-compressed'],
    
    // Imagens
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.svg': ['image/svg+xml', 'text/plain'],
    '.bmp': ['image/bmp'],
    '.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
    
    // Áudio
    '.mp3': ['audio/mpeg'],
    '.wav': ['audio/wav', 'audio/x-wav'],
    '.ogg': ['audio/ogg'],
    '.flac': ['audio/flac'],
    '.m4a': ['audio/mp4', 'audio/x-m4a'],
    
    // Vídeo
    '.mp4': ['video/mp4'],
    '.webm': ['video/webm'],
    '.avi': ['video/x-msvideo'],
    '.mkv': ['video/x-matroska'],
    '.mov': ['video/quicktime'],
    
    // Texto
    '.txt': ['text/plain'],
    '.html': ['text/html', 'text/plain'],
    '.css': ['text/css', 'text/plain'],
    '.js': ['application/javascript', 'text/javascript', 'text/plain'],
    '.md': ['text/markdown', 'text/plain'],
    
    // PDF
    '.pdf': ['application/pdf']
};

/**
 * Magic bytes para detecção de fallback
 */
const MAGIC_BYTES = {
    // ZIP (usado por xlsx, docx, etc)
    'application/zip': [0x50, 0x4B, 0x03, 0x04],
    // PDF
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    // PNG
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    // JPEG
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    // GIF
    'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
    // XML
    'application/xml': [0x3C, 0x3F, 0x78, 0x6D, 0x6C], // <?xml
    // CFB (arquivos Office antigos, .mpp, .xls, .doc)
    'application/x-cfb': [0xD0, 0xCF, 0x11, 0xE0],
    // RAR
    'application/x-rar-compressed': [0x52, 0x61, 0x72, 0x21], // Rar!
    // 7z
    'application/x-7z-compressed': [0x37, 0x7A, 0xBC, 0xAF],
    // GZIP
    'application/gzip': [0x1F, 0x8B]
};

/**
 * Detecta tipo do arquivo usando magic bytes (fallback)
 */
async function detectByMagicBytes(filePath) {
    try {
        const buffer = Buffer.alloc(16);
        const fd = await fs.open(filePath, 'r');
        await fd.read(buffer, 0, 16, 0);
        await fd.close();
        
        for (const [mime, bytes] of Object.entries(MAGIC_BYTES)) {
            let match = true;
            for (let i = 0; i < bytes.length; i++) {
                if (buffer[i] !== bytes[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return { mime, ext: getExtForMime(mime) };
            }
        }
        
        // Verificar se é texto/JSON/XML pelo conteúdo
        const textContent = buffer.toString('utf8').trim();
        if (textContent.startsWith('{') || textContent.startsWith('[')) {
            return { mime: 'application/json', ext: 'json' };
        }
        if (textContent.startsWith('<')) {
            return { mime: 'application/xml', ext: 'xml' };
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Obtém extensão para um MIME type
 */
function getExtForMime(mime) {
    for (const [ext, mimes] of Object.entries(EXTENSION_MIME_MAP)) {
        if (mimes.includes(mime)) {
            return ext.replace('.', '');
        }
    }
    return null;
}

/**
 * Detecta o tipo real do arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<Object>} Informações do tipo detectado
 */
async function detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    
    let detected = null;
    let method = 'unknown';
    
    // Tentar usar file-type primeiro
    await loadFileType();
    
    if (fileTypeFromFile) {
        try {
            detected = await fileTypeFromFile(filePath);
            method = 'file-type';
        } catch (error) {
            // Fallback
        }
    }
    
    // Fallback para magic bytes
    if (!detected) {
        detected = await detectByMagicBytes(filePath);
        method = detected ? 'magic-bytes' : 'extension';
    }
    
    // Se não detectou, usar extensão
    const expectedMimes = EXTENSION_MIME_MAP[ext] || [];
    
    return {
        filePath,
        basename,
        extension: ext,
        detected: detected ? {
            mime: detected.mime,
            ext: detected.ext
        } : null,
        expected: {
            extension: ext,
            mimes: expectedMimes
        },
        method,
        isValid: detected ? expectedMimes.includes(detected.mime) : true, // Se não detectou, confia na extensão
        timestamp: new Date().toISOString()
    };
}

/**
 * Valida se o arquivo corresponde às extensões esperadas
 * @param {string} filePath - Caminho do arquivo
 * @param {string[]} allowedExtensions - Extensões permitidas (ex: ['.xlsx', '.xls'])
 * @returns {Promise<Object>} Resultado da validação
 */
async function validateFileType(filePath, allowedExtensions) {
    const detection = await detectFileType(filePath);
    const ext = detection.extension;
    
    // Verificar extensão
    const extensionAllowed = allowedExtensions
        .map(e => e.toLowerCase())
        .includes(ext.toLowerCase());
    
    if (!extensionAllowed) {
        return {
            valid: false,
            reason: 'extension_not_allowed',
            message: `Extension ${ext} not in allowed list: ${allowedExtensions.join(', ')}`,
            detection
        };
    }
    
    // Verificar magic bytes
    if (detection.detected && !detection.isValid) {
        return {
            valid: false,
            reason: 'mime_mismatch',
            message: `File claims to be ${ext} but detected as ${detection.detected.mime}`,
            detection
        };
    }
    
    return {
        valid: true,
        reason: 'ok',
        message: 'File type validated successfully',
        detection
    };
}

/**
 * Verifica se arquivo é potencialmente perigoso
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<Object>} Resultado da verificação
 */
async function checkFileSafety(filePath) {
    const detection = await detectFileType(filePath);
    
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar', '.msi', '.dll'];
    const dangerousMimes = ['application/x-msdownload', 'application/x-executable', 'application/x-dosexec'];
    
    const isDangerousExt = dangerousExtensions.includes(detection.extension.toLowerCase());
    const isDangerousMime = detection.detected && dangerousMimes.includes(detection.detected.mime);
    
    // Double extension attack (ex: file.pdf.exe)
    const basename = path.basename(filePath);
    const hasDoubleExtension = (basename.match(/\./g) || []).length > 1;
    
    return {
        safe: !isDangerousExt && !isDangerousMime,
        warnings: [
            ...(isDangerousExt ? [`Dangerous extension: ${detection.extension}`] : []),
            ...(isDangerousMime ? [`Dangerous MIME type: ${detection.detected.mime}`] : []),
            ...(hasDoubleExtension ? [`Possible double extension attack: ${basename}`] : [])
        ],
        detection
    };
}

module.exports = {
    detectFileType,
    validateFileType,
    checkFileSafety,
    EXTENSION_MIME_MAP,
    MAGIC_BYTES
};
