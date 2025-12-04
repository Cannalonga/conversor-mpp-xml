/**
 * 📲 IMAGE OPTIMIZER FOR WHATSAPP
 * 
 * Comprime imagens para envio via WhatsApp.
 * WhatsApp tem limite de 16MB, mas imagens menores = envio mais rápido.
 * 
 * Objetivo: Imagens leves (~100-300KB) com boa qualidade visual.
 * 
 * Usa sharp (npm).
 * Install: npm install sharp
 * 
 * Options:
 *   - targetSize: em KB (default: 200)
 *   - maxWidth: pixels (default: 1920)
 *   - maxHeight: pixels (default: 1920)
 *   - quality: 1-100 (default: auto-adjusted)
 *   - format: 'jpg' | 'webp' (default: 'jpg')
 */

const path = require('path');
const fs = require('fs').promises;

const id = 'image-optimize-whatsapp';
const name = 'Optimize Image for WhatsApp';
const description = 'Comprime imagens para WhatsApp (leve e rápido de enviar)';
const inputTypes = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
const outputTypes = ['jpg', 'webp'];
const supportedInputExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
const outputExtension = '.jpg'; // padrão
const requiredTools = ['sharp (npm)'];

let sharp = null;

async function loadSharp() {
    if (!sharp) {
        try { sharp = require('sharp'); } catch (e) { /* */ }
    }
    return sharp;
}

async function checkDependencies() {
    const s = await loadSharp();
    return {
        installed: !!s,
        tool: 'sharp',
        message: s ? 'Sharp available' : 'Missing: sharp. Run: npm install sharp'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };

    // Config
    const targetSizeKB = options.targetSize || 200;
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1920;
    const format = options.format || 'jpg';
    
    // Validar input
    try {
        const stats = await fs.stat(inputPath);
        if (!stats.isFile()) {
            return { success: false, errors: [`${inputPath} is not a file`], metadata };
        }
        metadata.inputSize = stats.size;
    } catch (e) {
        return { success: false, errors: [`File not found: ${inputPath}`], metadata };
    }

    const ext = path.extname(inputPath).toLowerCase();
    if (!supportedInputExtensions.includes(ext)) {
        return { success: false, errors: [`Unsupported format: ${ext}`], metadata };
    }

    // Garantir extensão correta no output
    let finalOutput = outputPath;
    const outExt = path.extname(outputPath).toLowerCase();
    if (outExt !== `.${format}`) {
        finalOutput = outputPath.replace(/\.[^.]+$/, `.${format}`);
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(finalOutput), { recursive: true });
            await fs.writeFile(finalOutput, Buffer.from('DRY_RUN_WHATSAPP_OPTIMIZED'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.outputPath = finalOutput;
            metadata.targetSizeKB = targetSizeKB;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(finalOutput), { recursive: true });

        const s = await loadSharp();
        const targetBytes = targetSizeKB * 1024;

        // Obter metadados da imagem original
        const imgMeta = await s(inputPath).metadata();
        metadata.originalDimensions = { width: imgMeta.width, height: imgMeta.height };

        // Calcular redimensionamento
        let width = imgMeta.width;
        let height = imgMeta.height;

        if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        // Estratégia: começar com qualidade alta e reduzir se necessário
        let quality = 85;
        let outputBuffer;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;

            let pipeline = s(inputPath).resize(width, height, { fit: 'inside', withoutEnlargement: true });

            if (format === 'webp') {
                outputBuffer = await pipeline.webp({ quality }).toBuffer();
            } else {
                outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
            }

            // Verificar tamanho
            if (outputBuffer.length <= targetBytes || quality <= 30) {
                break;
            }

            // Reduzir qualidade
            quality -= 15;
            if (quality < 30) quality = 30;
        }

        await fs.writeFile(finalOutput, outputBuffer);

        const inputSizeKB = Math.round(metadata.inputSize / 1024);
        const outputSizeKB = Math.round(outputBuffer.length / 1024);
        const compressionRatio = ((1 - outputBuffer.length / metadata.inputSize) * 100).toFixed(1);

        metadata.outputSize = outputBuffer.length;
        metadata.outputSizeKB = outputSizeKB;
        metadata.compressionRatio = `${compressionRatio}%`;
        metadata.finalQuality = quality;
        metadata.finalDimensions = { width, height };
        metadata.attempts = attempts;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        console.log(`[WHATSAPP-OPT] ${inputSizeKB}KB → ${outputSizeKB}KB (${compressionRatio}% smaller, q=${quality})`);
        return { success: true, errors: [], metadata };

    } catch (e) {
        return { success: false, errors: [`Optimization failed: ${e.message}`], metadata };
    }
}

function getInfo() {
    return { id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools };
}

module.exports = {
    id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools,
    checkDependencies, convert, getInfo
};
