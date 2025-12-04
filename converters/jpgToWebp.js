/**
 * 🖼️ JPG TO WEBP CONVERTER
 * 
 * Converte imagens JPG/JPEG para WebP (formato moderno, menor tamanho).
 * Usa sharp (npm).
 * 
 * Options:
 *   - quality: 1-100 (default: 80)
 *   - lossless: boolean (default: false)
 */

const path = require('path');
const fs = require('fs').promises;

const id = 'jpg-to-webp';
const name = 'JPG to WebP';
const description = 'Converte JPG para WebP - formato moderno com melhor compressão.';
const inputTypes = ['jpg', 'jpeg'];
const outputTypes = ['webp'];
const supportedInputExtensions = ['.jpg', '.jpeg'];
const outputExtension = '.webp';
const requiredTools = ['sharp (npm)'];

let sharp = null;

async function loadSharp() {
    if (!sharp) {
        try { sharp = require('sharp'); } catch (e) { return null; }
    }
    return sharp;
}

async function checkDependencies() {
    const sharpModule = await loadSharp();
    return {
        installed: !!sharpModule,
        tool: 'sharp',
        message: sharpModule ? 'sharp is available' : 'sharp not installed. Run: npm install sharp'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const errors = [];
    const metadata = { durationMs: 0 };

    const quality = options.quality || 80;
    const lossless = options.lossless || false;

    // Validar input
    try {
        const stats = await fs.stat(inputPath);
        if (!stats.isFile()) return { success: false, errors: ['Input is not a file'], metadata };
        metadata.inputSize = stats.size;
    } catch (e) {
        return { success: false, errors: [`Input not found: ${e.message}`], metadata };
    }

    const ext = path.extname(inputPath).toLowerCase();
    if (!['.jpg', '.jpeg'].includes(ext)) {
        return { success: false, errors: [`Invalid extension: ${ext}`], metadata };
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, Buffer.from('DRY_RUN_WEBP_PLACEHOLDER'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        await sharp(inputPath)
            .webp({ quality, lossless })
            .toFile(outputPath);

        const outStats = await fs.stat(outputPath);
        metadata.outputSize = outStats.size;
        metadata.quality = quality;
        metadata.compressionRatio = ((1 - outStats.size / metadata.inputSize) * 100).toFixed(1) + '%';
        metadata.durationMs = Date.now() - start;

        console.log(`[JPG-TO-WEBP] ${inputPath} -> ${outputPath} (${metadata.compressionRatio} reduction)`);
        return { success: true, errors: [], metadata };

    } catch (e) {
        return { success: false, errors: [`Conversion failed: ${e.message}`], metadata };
    }
}

function getInfo() {
    return { id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools };
}

module.exports = {
    id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools,
    checkDependencies, convert, getInfo
};
