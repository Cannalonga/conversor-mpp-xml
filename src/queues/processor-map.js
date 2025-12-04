/**
 * Processor Configuration Map
 * 
 * Defines retry, backoff, concurrency and timeout settings for each converter.
 * These settings are used by the worker to configure job processing.
 */

const ProcessorConfig = {
    // ==========================================================================
    // DOCUMENT CONVERTERS
    // ==========================================================================
    
    'mpp-to-xml': {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        concurrency: 2,
        timeoutMs: 120000,  // 2 minutes
        cost: 1,            // Credits cost
        priority: 1         // Lower = higher priority
    },
    
    'xml-to-mpp': {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        concurrency: 2,
        timeoutMs: 120000,
        cost: 1,
        priority: 1
    },

    'pdf-to-text': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        concurrency: 4,
        timeoutMs: 60000,   // 1 minute
        cost: 1,
        priority: 2
    },

    'docx-to-pdf': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
        concurrency: 2,
        timeoutMs: 180000,  // 3 minutes (LibreOffice)
        cost: 1,
        priority: 2
    },

    'xlsx-to-csv': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        concurrency: 4,
        timeoutMs: 60000,
        cost: 1,
        priority: 2
    },

    // ==========================================================================
    // IMAGE CONVERTERS
    // ==========================================================================

    'image-optimize-whatsapp': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        concurrency: 6,
        timeoutMs: 30000,   // 30 seconds
        cost: 1,
        priority: 3
    },

    'png-to-jpg': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        concurrency: 6,
        timeoutMs: 30000,
        cost: 1,
        priority: 3
    },

    'jpg-to-png': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        concurrency: 6,
        timeoutMs: 30000,
        cost: 1,
        priority: 3
    },

    'image-resize': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        concurrency: 4,
        timeoutMs: 60000,
        cost: 1,
        priority: 3
    },

    // ==========================================================================
    // VIDEO/MEDIA CONVERTERS
    // ==========================================================================

    'video-to-mp4': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        concurrency: 1,     // Heavy - one at a time
        timeoutMs: 600000,  // 10 minutes
        cost: 3,            // Higher cost for heavy processing
        priority: 5
    },

    'audio-to-mp3': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
        concurrency: 2,
        timeoutMs: 300000,  // 5 minutes
        cost: 2,
        priority: 4
    },

    'video-extract-audio': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        concurrency: 1,
        timeoutMs: 600000,
        cost: 2,
        priority: 5
    },

    // ==========================================================================
    // DEFAULT CONFIG (fallback for unknown converters)
    // ==========================================================================

    'default': {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        concurrency: 2,
        timeoutMs: 180000,  // 3 minutes default
        cost: 1,
        priority: 5
    }
};

/**
 * Get configuration for a specific converter
 * @param {string} converterId 
 * @returns {object} Configuration object
 */
function getProcessorConfig(converterId) {
    return ProcessorConfig[converterId] || ProcessorConfig['default'];
}

/**
 * Get BullMQ job options for a converter
 * @param {string} converterId 
 * @returns {object} BullMQ job options
 */
function getBullJobOptions(converterId) {
    const config = getProcessorConfig(converterId);
    return {
        attempts: config.attempts,
        backoff: config.backoff,
        priority: config.priority,
        timeout: config.timeoutMs
    };
}

/**
 * Get cost in credits for a converter
 * @param {string} converterId 
 * @returns {number} Cost in credits
 */
function getConverterCost(converterId) {
    const config = getProcessorConfig(converterId);
    return config.cost;
}

/**
 * List all configured converters
 * @returns {string[]} Array of converter IDs
 */
function listConverters() {
    return Object.keys(ProcessorConfig).filter(k => k !== 'default');
}

module.exports = {
    ProcessorConfig,
    getProcessorConfig,
    getBullJobOptions,
    getConverterCost,
    listConverters
};
