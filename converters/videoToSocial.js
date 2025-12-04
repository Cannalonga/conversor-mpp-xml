/**
 * 📱 VIDEO TO SOCIAL MEDIA FORMAT
 * 
 * Converte vídeos para formato otimizado para TikTok/Reels/Shorts.
 * - Aspect ratio: 9:16 (vertical)
 * - Resolução: 1080x1920
 * - Duração máxima: 60s (configurável)
 * - Codec: H.264 + AAC
 * 
 * Usa ffmpeg (system).
 * 
 * Options:
 *   - platform: 'tiktok' | 'reels' | 'shorts' | 'stories' (default: 'reels')
 *   - maxDuration: segundos (default: 60)
 *   - cropMode: 'center' | 'top' | 'bottom' (default: 'center')
 *   - addPadding: boolean - adiciona barras pretas se não couber (default: false)
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn, execSync } = require('child_process');

const id = 'video-to-social';
const name = 'Video to Social Media';
const description = 'Converte vídeos para TikTok, Reels, Shorts (9:16)';
const inputTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'];
const outputTypes = ['mp4'];
const supportedInputExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.webm'];
const outputExtension = '.mp4';
const requiredTools = ['ffmpeg (system)'];

// Presets por plataforma
const platformPresets = {
    tiktok: { width: 1080, height: 1920, maxDuration: 180, bitrate: '8M' },
    reels: { width: 1080, height: 1920, maxDuration: 90, bitrate: '8M' },
    shorts: { width: 1080, height: 1920, maxDuration: 60, bitrate: '8M' },
    stories: { width: 1080, height: 1920, maxDuration: 15, bitrate: '6M' }
};

function checkFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function checkDependencies() {
    const installed = checkFfmpeg();
    return {
        installed,
        tool: 'ffmpeg',
        message: installed 
            ? 'FFmpeg available'
            : 'FFmpeg not found. Install: apt-get install ffmpeg'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };

    // Config
    const platform = options.platform || 'reels';
    const preset = platformPresets[platform] || platformPresets.reels;
    const maxDuration = options.maxDuration || preset.maxDuration;
    const cropMode = options.cropMode || 'center';
    const addPadding = options.addPadding || false;
    const timeout = options.timeout || 600000; // 10 min

    const targetWidth = preset.width;
    const targetHeight = preset.height;
    const targetBitrate = preset.bitrate;

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

    let finalOutput = outputPath;
    if (!outputPath.toLowerCase().endsWith('.mp4')) {
        finalOutput = outputPath.replace(/\.[^.]+$/, '.mp4');
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(finalOutput), { recursive: true });
            await fs.writeFile(finalOutput, Buffer.from('DRY_RUN_SOCIAL_VIDEO'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.platform = platform;
            metadata.targetDimensions = { width: targetWidth, height: targetHeight };
            metadata.maxDuration = maxDuration;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(finalOutput), { recursive: true });

        // Filtros de vídeo para 9:16
        // Estratégia: redimensionar mantendo aspect ratio, depois crop ou pad
        let vf;
        if (addPadding) {
            // Adiciona barras pretas para manter toda a imagem
            vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;
        } else {
            // Crop para preencher o frame
            // 1. Scale para cobrir o frame
            // 2. Crop o excesso baseado no modo
            const cropY = cropMode === 'top' ? '0' : (cropMode === 'bottom' ? 'ih-oh' : '(ih-oh)/2');
            vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:0:${cropY}`;
        }

        const args = [
            '-i', inputPath,
            '-t', String(maxDuration), // Limitar duração
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-b:v', targetBitrate,
            '-maxrate', targetBitrate,
            '-bufsize', `${parseInt(targetBitrate) * 2}M`,
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ar', '44100',
            '-movflags', '+faststart',
            '-y',
            finalOutput
        ];

        // Executar ffmpeg
        const result = await new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
            let stderr = '';

            const timer = setTimeout(() => {
                proc.kill('SIGTERM');
                reject(new Error('FFmpeg timeout'));
            }, timeout);

            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('error', (err) => { clearTimeout(timer); reject(err); });
            proc.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0) resolve({ success: true, stderr });
                else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
            });
        });

        const outStats = await fs.stat(finalOutput);
        const inputMB = (metadata.inputSize / 1024 / 1024).toFixed(2);
        const outputMB = (outStats.size / 1024 / 1024).toFixed(2);

        metadata.outputSize = outStats.size;
        metadata.platform = platform;
        metadata.targetDimensions = { width: targetWidth, height: targetHeight };
        metadata.maxDuration = maxDuration;
        metadata.cropMode = cropMode;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        console.log(`[VIDEO-SOCIAL] ${inputMB}MB → ${outputMB}MB (${platform}, ${targetWidth}x${targetHeight}, max ${maxDuration}s)`);

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
