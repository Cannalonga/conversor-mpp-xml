/**
 * 🖼️ PNG TO JPG CONVERTER
 * 
 * Converte imagens PNG para JPG com controle de qualidade.
 * Usa sharp (npm) - muito mais rápido que ImageMagick.
 * 
 * Install: npm install sharp
 * 
 * Options:
 *   - quality: 1-100 (default: 85)
 *   - background: cor de fundo para transparência (default: '#ffffff')
 */

const path = require('path');
const fs = require('fs').promises;

const id = 'png-to-jpg';
const name = 'PNG to JPG';
const description = 'Converte imagens PNG para JPG com controle de qualidade.';
const inputTypes = ['png'];
const outputTypes = ['jpg', 'jpeg'];
const supportedInputExtensions = ['.png'];
const outputExtension = '.jpg';
const requiredTools = ['sharp (npm)'];

let sharp = null;

/**
 * Carrega sharp dinamicamente
 */
async function loadSharp() {
    if (!sharp) {
        try {
            sharp = require('sharp');
        } catch (e) {
            return null;
        }
    }
    return sharp;
}

/**
 * Verifica dependências
 */
async function checkDependencies() {
    const sharpModule = await loadSharp();
    return {
        installed: !!sharpModule,
        tool: 'sharp',
        message: sharpModule 
            ? 'sharp module is available'
            : 'sharp not installed. Run: npm install sharp'
    };
}

/**
 * Converte PNG para JPG
 */
async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const errors = [];
    const metadata = { durationMs: 0 };

    const quality = options.quality || 85;
    const background = options.background || '#ffffff';

    // Validar input
    try {
        const stats = await fs.stat(inputPath);
        if (!stats.isFile()) {
            return { success: false, errors: ['Input is not a file'], metadata };
        }
        metadata.inputSize = stats.size;
    } catch (e) {
        return { success: false, errors: [`Input not found: ${e.message}`], metadata };
    }

    // Verificar extensão
    const ext = path.extname(inputPath).toLowerCase();
    if (ext !== '.png') {
        return { success: false, errors: [`Invalid extension: ${ext}. Expected .png`], metadata };
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, Buffer.from('DRY_RUN_JPG_PLACEHOLDER'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.outputPath = outputPath;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    // Verificar sharp
    const deps = await checkDependencies();
    if (!deps.installed) {
        return { success: false, errors: [deps.message], metadata };
    }

    // Converter
    try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        await sharp(inputPath)
            .flatten({ background })  // Remove transparência
            .jpeg({ quality })
            .toFile(outputPath);

        const outStats = await fs.stat(outputPath);
        metadata.outputSize = outStats.size;
        metadata.outputPath = outputPath;
        metadata.quality = quality;
        metadata.compressionRatio = ((1 - outStats.size / metadata.inputSize) * 100).toFixed(1) + '%';
        metadata.durationMs = Date.now() - start;

        console.log(`[PNG-TO-JPG] ${inputPath} -> ${outputPath} (${metadata.compressionRatio} reduction)`);

        return { success: true, errors: [], metadata };

    } catch (e) {
        errors.push(`Conversion failed: ${e.message}`);
        metadata.durationMs = Date.now() - start;
        return { success: false, errors, metadata };
    }
}

function getInfo() {
    return { id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools };
}

module.exports = {
    id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools,
    checkDependencies, convert, getInfo
};
