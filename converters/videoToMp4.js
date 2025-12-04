/**
 * 🎬 VIDEO TO MP4 CONVERTER
 * 
 * Converte qualquer vídeo para MP4 (H.264 + AAC).
 * Formato mais compatível para dispositivos e players.
 * 
 * Usa ffmpeg (system).
 * Install: apt-get install ffmpeg (Linux) ou choco install ffmpeg (Windows)
 * 
 * Options:
 *   - quality: 'high' | 'medium' | 'low' (default: 'medium')
 *   - maxWidth: pixels (default: null = original)
 *   - maxHeight: pixels (default: null = original)
 *   - audioBitrate: em kbps (default: 128)
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn, execSync } = require('child_process');

const id = 'video-to-mp4';
const name = 'Video to MP4';
const description = 'Converte vídeos para MP4 (formato universal)';
const inputTypes = ['avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpeg', 'mpg', '3gp', 'ts', 'm4v'];
const outputTypes = ['mp4'];
const supportedInputExtensions = ['.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg', '.3gp', '.ts', '.m4v', '.mp4'];
const outputExtension = '.mp4';
const requiredTools = ['ffmpeg (system)'];

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
            : 'FFmpeg not found. Install: apt-get install ffmpeg (Linux) or choco install ffmpeg (Windows)'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };

    // Config
    const quality = options.quality || 'medium';
    const maxWidth = options.maxWidth || null;
    const maxHeight = options.maxHeight || null;
    const audioBitrate = options.audioBitrate || 128;
    const timeout = options.timeout || 300000; // 5 min default

    // Quality presets (CRF: lower = better quality, higher file)
    const crfMap = { high: 18, medium: 23, low: 28 };
    const crf = crfMap[quality] || 23;

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

    // Garantir extensão .mp4 no output
    let finalOutput = outputPath;
    if (!outputPath.toLowerCase().endsWith('.mp4')) {
        finalOutput = outputPath.replace(/\.[^.]+$/, '.mp4');
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(finalOutput), { recursive: true });
            await fs.writeFile(finalOutput, Buffer.from('DRY_RUN_MP4_VIDEO'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.outputPath = finalOutput;
            metadata.quality = quality;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(finalOutput), { recursive: true });

        // Construir argumentos ffmpeg
        const args = [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', String(crf),
            '-c:a', 'aac',
            '-b:a', `${audioBitrate}k`,
            '-movflags', '+faststart', // Otimização para streaming
            '-y' // Overwrite
        ];

        // Redimensionamento se especificado
        if (maxWidth || maxHeight) {
            const scale = [];
            if (maxWidth) scale.push(`'min(${maxWidth},iw)'`);
            else scale.push('iw');
            if (maxHeight) scale.push(`'min(${maxHeight},ih)'`);
            else scale.push('ih');
            args.push('-vf', `scale=${scale.join(':')}:force_original_aspect_ratio=decrease`);
        }

        args.push(finalOutput);

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
        const compressionRatio = ((1 - outStats.size / metadata.inputSize) * 100).toFixed(1);

        metadata.outputSize = outStats.size;
        metadata.compressionRatio = `${compressionRatio}%`;
        metadata.quality = quality;
        metadata.crf = crf;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        const inputMB = (metadata.inputSize / 1024 / 1024).toFixed(2);
        const outputMB = (outStats.size / 1024 / 1024).toFixed(2);
        console.log(`[VIDEO-TO-MP4] ${inputMB}MB → ${outputMB}MB (${compressionRatio}% change, crf=${crf})`);

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
