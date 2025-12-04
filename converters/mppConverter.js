/**
 * MPP Converter Client
 * 
 * Client to communicate with the Java MPP Converter microservice
 * Converts Microsoft Project files to XML using MPXJ
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Microservice URL - configurable via environment
const MPP_CONVERTER_URL = process.env.MPP_CONVERTER_URL || 'http://localhost:8080';

/**
 * Check if the MPP converter microservice is healthy
 * @returns {Promise<{healthy: boolean, details?: object}>}
 */
async function checkHealth() {
    try {
        const response = await fetch(`${MPP_CONVERTER_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            return { healthy: true, details: data };
        }
        return { healthy: false, details: { status: response.status } };
    } catch (error) {
        return { healthy: false, details: { error: error.message } };
    }
}

/**
 * Convert MPP file to XML using the microservice
 * 
 * @param {string} inputFilePath - Path to the MPP file
 * @param {string} outputFilePath - Path where XML will be saved
 * @returns {Promise<{success: boolean, outputPath?: string, metadata?: object, error?: string}>}
 */
async function convertMppToXml(inputFilePath, outputFilePath) {
    // Validate input file exists
    if (!fs.existsSync(inputFilePath)) {
        return { success: false, error: `Input file not found: ${inputFilePath}` };
    }

    const filename = path.basename(inputFilePath);
    const fileStats = fs.statSync(inputFilePath);
    
    console.log(`[MPP-Converter] Starting conversion: ${filename} (${fileStats.size} bytes)`);

    try {
        // Create form data with file
        const formData = new FormData();
        formData.append('file', fs.createReadStream(inputFilePath), {
            filename: filename,
            contentType: 'application/octet-stream'
        });

        // Call microservice
        const response = await fetch(`${MPP_CONVERTER_URL}/convert`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders ? formData.getHeaders() : {}
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[MPP-Converter] Conversion failed: ${response.status}`, errorText);
            return { 
                success: false, 
                error: `Conversion failed: ${response.status} - ${errorText}` 
            };
        }

        // Get XML content
        const xmlBuffer = Buffer.from(await response.arrayBuffer());

        // Extract metadata from headers
        const metadata = {
            conversionTimeMs: response.headers.get('X-Conversion-Time-Ms'),
            tasksCount: response.headers.get('X-Tasks-Count'),
            resourcesCount: response.headers.get('X-Resources-Count')
        };

        // Ensure output directory exists
        const outputDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write XML to file
        fs.writeFileSync(outputFilePath, xmlBuffer);

        console.log(`[MPP-Converter] Conversion successful: ${outputFilePath} (${xmlBuffer.length} bytes)`);

        return {
            success: true,
            outputPath: outputFilePath,
            outputSize: xmlBuffer.length,
            metadata
        };

    } catch (error) {
        console.error(`[MPP-Converter] Error:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get project info without full conversion
 * 
 * @param {string} inputFilePath - Path to the MPP file
 * @returns {Promise<{success: boolean, info?: object, error?: string}>}
 */
async function getProjectInfo(inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
        return { success: false, error: `Input file not found: ${inputFilePath}` };
    }

    const filename = path.basename(inputFilePath);

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(inputFilePath), {
            filename: filename,
            contentType: 'application/octet-stream'
        });

        const response = await fetch(`${MPP_CONVERTER_URL}/info`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders ? formData.getHeaders() : {}
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return { success: false, error: data.error || `Request failed: ${response.status}` };
        }

        return { success: true, info: data };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Check if file is a supported MPP format
 * @param {string} filename 
 * @returns {boolean}
 */
function isSupportedFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.mpp', '.mpx', '.mpt'].includes(ext);
}

module.exports = {
    convertMppToXml,
    getProjectInfo,
    checkHealth,
    isSupportedFormat,
    MPP_CONVERTER_URL
};
