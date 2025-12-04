/**
 * Generic Conversion Handler
 * 
 * Handles various conversions using existing converter modules
 * or spawning child processes for external tools (ffmpeg, LibreOffice, etc.)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUTPUT_DIR = process.env.OUTPUT_DIR || 'uploads/converted';

/**
 * Generic conversion dispatcher
 * 
 * @param {object} params
 * @param {string} params.jobId - Database job ID
 * @param {string} params.userId - User ID
 * @param {object} params.payload - Job payload with inputPath
 * @param {string} params.converter - Converter ID
 * @returns {Promise<{outputs: string[]}>}
 */
async function handleGenericConversion({ jobId, userId, payload, converter }) {
    console.log(`[Generic Handler] Processing ${converter} for job ${jobId}`);
    
    const inputPath = payload.inputPath;
    
    // Validate input
    if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    // Ensure output directory exists
    const outputDir = path.resolve(OUTPUT_DIR);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Dispatch to appropriate handler based on converter type
    switch (converter) {
        // Image converters
        case 'png-to-jpg':
        case 'jpg-to-png':
        case 'image-resize':
        case 'image-optimize-whatsapp':
            return await handleImageConversion({ jobId, inputPath, converter, outputDir, payload });

        // Document converters
        case 'pdf-to-text':
        case 'docx-to-pdf':
        case 'xlsx-to-csv':
            return await handleDocumentConversion({ jobId, inputPath, converter, outputDir, payload });

        // Video/Audio converters
        case 'video-to-mp4':
        case 'audio-to-mp3':
        case 'video-extract-audio':
            return await handleMediaConversion({ jobId, inputPath, converter, outputDir, payload });

        // Default: mock conversion
        default:
            console.log(`[Generic Handler] No specific handler for ${converter}, using mock`);
            return await handleMockConversion({ jobId, inputPath, converter, outputDir });
    }
}

/**
 * Handle image conversions using Sharp
 */
async function handleImageConversion({ jobId, inputPath, converter, outputDir, payload }) {
    console.log(`[Generic Handler] Image conversion: ${converter}`);
    
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.warn(`[Generic Handler] Sharp not available, using mock`);
        return await handleMockConversion({ jobId, inputPath, converter, outputDir });
    }

    const outputExt = getOutputExtension(converter);
    const outputFilename = `${jobId}.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    let pipeline = sharp(inputPath);

    switch (converter) {
        case 'png-to-jpg':
            pipeline = pipeline.jpeg({ quality: 85 });
            break;
        case 'jpg-to-png':
            pipeline = pipeline.png();
            break;
        case 'image-resize':
            const width = payload.options?.width || 800;
            const height = payload.options?.height || null;
            pipeline = pipeline.resize(width, height, { fit: 'inside' });
            break;
        case 'image-optimize-whatsapp':
            // WhatsApp optimization: max 1280px, JPEG 80%
            pipeline = pipeline
                .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 });
            break;
    }

    await pipeline.toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`[Generic Handler] Image output: ${outputPath} (${stats.size} bytes)`);

    return { outputs: [outputPath] };
}

/**
 * Handle document conversions
 */
async function handleDocumentConversion({ jobId, inputPath, converter, outputDir, payload }) {
    console.log(`[Generic Handler] Document conversion: ${converter}`);
    
    const outputExt = getOutputExtension(converter);
    const outputFilename = `${jobId}.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    switch (converter) {
        case 'xlsx-to-csv':
            return await convertXlsxToCsv(inputPath, outputPath);
        
        case 'pdf-to-text':
            // Would need pdf-parse or similar
            console.warn(`[Generic Handler] PDF extraction not implemented, using mock`);
            return await handleMockConversion({ jobId, inputPath, converter, outputDir });
        
        case 'docx-to-pdf':
            // Would need LibreOffice
            return await convertWithLibreOffice(inputPath, outputPath, 'pdf');
        
        default:
            return await handleMockConversion({ jobId, inputPath, converter, outputDir });
    }
}

/**
 * Handle media (video/audio) conversions via FFmpeg
 */
async function handleMediaConversion({ jobId, inputPath, converter, outputDir, payload }) {
    console.log(`[Generic Handler] Media conversion: ${converter}`);
    
    const outputExt = getOutputExtension(converter);
    const outputFilename = `${jobId}.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    let ffmpegArgs;
    
    switch (converter) {
        case 'video-to-mp4':
            ffmpegArgs = [
                '-i', inputPath,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-movflags', '+faststart',
                '-y', outputPath
            ];
            break;
        
        case 'audio-to-mp3':
            ffmpegArgs = [
                '-i', inputPath,
                '-c:a', 'libmp3lame',
                '-q:a', '2',
                '-y', outputPath
            ];
            break;
        
        case 'video-extract-audio':
            ffmpegArgs = [
                '-i', inputPath,
                '-vn',
                '-c:a', 'libmp3lame',
                '-q:a', '2',
                '-y', outputPath
            ];
            break;
        
        default:
            return await handleMockConversion({ jobId, inputPath, converter, outputDir });
    }

    await runCommand('ffmpeg', ffmpegArgs);
    
    if (!fs.existsSync(outputPath)) {
        throw new Error('FFmpeg did not produce output file');
    }

    return { outputs: [outputPath] };
}

/**
 * Convert XLSX to CSV using xlsx library
 */
async function convertXlsxToCsv(inputPath, outputPath) {
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch (e) {
        throw new Error('xlsx library not available');
    }

    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    
    fs.writeFileSync(outputPath, csv);
    
    return { outputs: [outputPath] };
}

/**
 * Convert using LibreOffice (if installed)
 */
async function convertWithLibreOffice(inputPath, outputPath, format) {
    const outputDir = path.dirname(outputPath);
    
    // LibreOffice command
    const args = [
        '--headless',
        '--convert-to', format,
        '--outdir', outputDir,
        inputPath
    ];

    try {
        await runCommand('soffice', args);
    } catch (e) {
        // Try libreoffice command on Linux
        await runCommand('libreoffice', args);
    }

    // LibreOffice generates output with original name, rename to our format
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const generatedPath = path.join(outputDir, `${baseName}.${format}`);
    
    if (fs.existsSync(generatedPath) && generatedPath !== outputPath) {
        fs.renameSync(generatedPath, outputPath);
    }

    if (!fs.existsSync(outputPath)) {
        throw new Error('LibreOffice did not produce output file');
    }

    return { outputs: [outputPath] };
}

/**
 * Mock conversion for unsupported/demo converters
 */
async function handleMockConversion({ jobId, inputPath, converter, outputDir }) {
    console.log(`[Generic Handler] Mock conversion for ${converter}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const outputExt = getOutputExtension(converter);
    const outputFilename = `${jobId}_mock.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Create mock output
    const mockContent = `Mock conversion result
Job ID: ${jobId}
Converter: ${converter}
Input: ${inputPath}
Timestamp: ${new Date().toISOString()}

This is a placeholder - actual converter not implemented.
`;

    fs.writeFileSync(outputPath, mockContent);
    
    return { 
        outputs: [outputPath],
        mock: true
    };
}

/**
 * Run external command with promise
 */
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`[Generic Handler] Running: ${command} ${args.join(' ')}`);
        
        const proc = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`${command} exited with code ${code}: ${stderr}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start ${command}: ${err.message}`));
        });
    });
}

/**
 * Get output file extension for converter
 */
function getOutputExtension(converter) {
    const extensions = {
        'png-to-jpg': 'jpg',
        'jpg-to-png': 'png',
        'image-resize': 'jpg',
        'image-optimize-whatsapp': 'jpg',
        'pdf-to-text': 'txt',
        'docx-to-pdf': 'pdf',
        'xlsx-to-csv': 'csv',
        'video-to-mp4': 'mp4',
        'audio-to-mp3': 'mp3',
        'video-extract-audio': 'mp3',
        'mpp-to-xml': 'xml',
        'xml-to-mpp': 'mpp'
    };
    
    return extensions[converter] || 'out';
}

module.exports = {
    handleGenericConversion,
    handleImageConversion,
    handleDocumentConversion,
    handleMediaConversion,
    handleMockConversion,
    getOutputExtension
};
