/**
 * MPP to XML Handler
 * 
 * Handles conversion of Microsoft Project files (.mpp) to XML format
 * using the Java MPXJ microservice.
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const MPP_CONVERTER_URL = process.env.MPP_CONVERTER_URL || 'http://localhost:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'uploads/converted';

/**
 * Convert MPP file to XML via microservice
 * 
 * @param {object} params
 * @param {string} params.jobId - Database job ID
 * @param {string} params.userId - User ID
 * @param {object} params.payload - Job payload with inputPath
 * @returns {Promise<{outputs: string[]}>}
 */
async function handleMppToXml({ jobId, userId, payload }) {
    console.log(`[MPP Handler] Starting conversion for job ${jobId}`);
    
    const inputPath = payload.inputPath;
    
    // Validate input file exists
    if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    const fileStats = fs.statSync(inputPath);
    console.log(`[MPP Handler] Input file: ${inputPath} (${fileStats.size} bytes)`);

    // Prepare output path
    const outputDir = path.resolve(OUTPUT_DIR);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFilename = `${jobId}.xml`;
    const outputPath = path.join(outputDir, outputFilename);

    // Create form data with file stream
    const form = new FormData();
    form.append('file', fs.createReadStream(inputPath), {
        filename: path.basename(inputPath),
        contentType: 'application/octet-stream'
    });

    console.log(`[MPP Handler] Calling microservice at ${MPP_CONVERTER_URL}/convert`);

    // Call microservice
    const fetch = require('node-fetch');
    
    let response;
    try {
        response = await fetch(`${MPP_CONVERTER_URL}/convert`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
            timeout: 120000 // 2 minutes
        });
    } catch (fetchError) {
        console.error(`[MPP Handler] Microservice request failed:`, fetchError.message);
        throw new Error(`MPP microservice unavailable: ${fetchError.message}`);
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MPP Handler] Microservice error ${response.status}:`, errorText);
        throw new Error(`MPP conversion failed: ${response.status} - ${errorText}`);
    }

    // Get XML content from response
    const xmlBuffer = Buffer.from(await response.arrayBuffer());

    if (xmlBuffer.length === 0) {
        throw new Error('Microservice returned empty response');
    }

    // Extract metadata from headers (if available)
    const conversionTimeMs = response.headers.get('X-Conversion-Time-Ms');
    const tasksCount = response.headers.get('X-Tasks-Count');
    const resourcesCount = response.headers.get('X-Resources-Count');

    console.log(`[MPP Handler] Received ${xmlBuffer.length} bytes, saving to ${outputPath}`);

    // Write output file
    fs.writeFileSync(outputPath, xmlBuffer);

    console.log(`[MPP Handler] Conversion complete for job ${jobId}`);

    return {
        outputs: [outputPath],
        metadata: {
            conversionTimeMs,
            tasksCount,
            resourcesCount,
            outputSize: xmlBuffer.length,
            converter: 'mpxj-microservice'
        }
    };
}

/**
 * Check if microservice is healthy
 */
async function checkMicroserviceHealth() {
    try {
        const fetch = require('node-fetch');
        const response = await fetch(`${MPP_CONVERTER_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            return { healthy: true, details: data };
        }
        
        return { healthy: false, status: response.status };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

module.exports = {
    handleMppToXml,
    checkMicroserviceHealth,
    MPP_CONVERTER_URL
};
