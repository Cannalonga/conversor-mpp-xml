/**
 * Upload Validation Utility
 * MÉDIO FIX #4: Validate file buffers for empty files, size limits, and MIME types
 */

const fileType = require('file-type');

/**
 * Comprehensive buffer validation
 * @param {Buffer} buffer - File buffer to validate
 * @param {Array<string>} allowedMimes - Allowed MIME types (empty = no restriction)
 * @param {number} maxBytes - Maximum file size in bytes
 * @returns {Promise<{mime: string, ext: string}>}
 * @throws {Error} If validation fails
 */
async function validateBuffer(buffer, allowedMimes = [], maxBytes = 50 * 1024 * 1024) {
    // MÉDIO FIX #4a: Reject empty files
    if (!buffer || buffer.length === 0) {
        const err = new Error('FILE_EMPTY');
        err.code = 'FILE_EMPTY';
        err.statusCode = 400;
        throw err;
    }

    // MÉDIO FIX #4b: Reject files exceeding size limit
    if (buffer.length > maxBytes) {
        const err = new Error(`FILE_TOO_LARGE: Max ${maxBytes / 1024 / 1024}MB`);
        err.code = 'FILE_TOO_LARGE';
        err.statusCode = 413;
        throw err;
    }

    // Detect file type from magic bytes
    let ft;
    try {
        ft = await fileType.fromBuffer(buffer);
    } catch (err) {
        const e = new Error('UNABLE_TO_DETERMINE_FILETYPE');
        e.code = 'FILETYPE_ERROR';
        e.statusCode = 400;
        throw e;
    }

    // Reject unknown file types
    if (!ft) {
        const err = new Error('UNKNOWN_FILETYPE');
        err.code = 'UNKNOWN_FILETYPE';
        err.statusCode = 400;
        throw err;
    }

    // Check against whitelist if provided
    if (allowedMimes && allowedMimes.length > 0 && !allowedMimes.includes(ft.mime)) {
        const err = new Error(`INVALID_MIME: Got ${ft.mime}, expected one of ${allowedMimes.join(', ')}`);
        err.code = 'INVALID_MIME';
        err.statusCode = 400;
        err.mime = ft.mime;
        err.allowed = allowedMimes;
        throw err;
    }

    return {
        mime: ft.mime,
        ext: ft.ext,
        size: buffer.length
    };
}

/**
 * Validate MPP file specifically
 * @param {Buffer} buffer - MPP file buffer
 * @returns {Promise<{mime: string, ext: string}>}
 */
async function validateMPPFile(buffer) {
    // MPP files typically have signature: 0xD0CF11E0A1B11AE1 (OLE format)
    // But we rely on file-type for detection
    return validateBuffer(buffer, ['application/vnd.ms-project', 'application/octet-stream'], 100 * 1024 * 1024);
}

/**
 * Quick file size validation (without full detection)
 * @param {number} size - File size in bytes
 * @param {number} maxBytes - Max allowed bytes
 * @returns {boolean}
 */
function isValidFileSize(size, maxBytes = 50 * 1024 * 1024) {
    return size > 0 && size <= maxBytes;
}

module.exports = {
    validateBuffer,
    validateMPPFile,
    isValidFileSize
};
