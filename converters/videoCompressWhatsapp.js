/**
 * 📲 VIDEO COMPRESS FOR WHATSAPP
 * 
 * Comprime vídeos para envio via WhatsApp.
 * Limite do WhatsApp: 16MB (pode variar por país/versão).
 * Objetivo: máxima qualidade dentro do limite de tamanho.
 * 
 * Usa ffmpeg (system).
 * 
 * Options:
 *   - targetSizeMB: tamanho alvo em MB (default: 15)
 *   - maxWidth: pixels (default: 848)
 *   - maxHeight: pixels (default: 480)
 *   - audioQuality: 'low' | 'medium' | 'high' (default: 'medium')
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn, execSync } = require('child_process');

const id = 'video-compress-whatsapp';
const name = 'Video Compress for WhatsApp';
const description = 'Comprime vídeos para WhatsApp (max 16MB)';
const inputTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'];
const outputTypes = ['mp4'];
const supportedInputExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.webm'];
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
            : 'FFmpeg not found. Install: apt-get install ffmpeg'
    };
}

// Obter duração do vídeo em segundos
async function getVideoDuration(inputPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            inputPath
        ]);
        
        let stdout = '';
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0) {
                const duration = parseFloat(stdout.trim());
                resolve(isNaN(duration) ? 60 : duration);
            } else {
                resolve(60); // fallback
            }
        });
    });
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };

    // Config
    const targetSizeMB = options.targetSizeMB || 15;
    const maxWidth = options.maxWidth || 848;
    const maxHeight = options.maxHeight || 480;
    const audioQuality = options.audioQuality || 'medium';
    const timeout = options.timeout || 600000; // 10 min

    // Audio bitrate por qualidade
    const audioBitrateMap = { low: 64, medium: 96, high: 128 };
    const audioBitrate = audioBitrateMap[audioQuality] || 96;

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
            await fs.writeFile(finalOutput, Buffer.from('DRY_RUN_WHATSAPP_VIDEO'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.targetSizeMB = targetSizeMB;
            metadata.maxDimensions = { width: maxWidth, height: maxHeight };
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(finalOutput), { recursive: true });

        // Obter duração para calcular bitrate ideal
        let duration;
        try {
            duration = await getVideoDuration(inputPath);
        } catch {
            duration = 60; // fallback
        }
        metadata.videoDuration = duration;

        // Calcular bitrate de vídeo para atingir tamanho alvo
        // Fórmula: bitrate (kbps) = (tamanho_MB * 8192) / duração_segundos - audio_bitrate
        const targetBits = targetSizeMB * 8 * 1024 * 1024;
        const audioBits = audioBitrate * 1000 * duration;
        const videoBits = targetBits - audioBits;
        const videoBitrateKbps = Math.max(200, Math.floor(videoBits / duration / 1000));

        metadata.calculatedVideoBitrate = `${videoBitrateKbps}k`;

        const args = [
            '-i', inputPath,
            '-vf', `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
            '-c:v', 'libx264',
            '-preset', 'slow', // Melhor compressão
            '-b:v', `${videoBitrateKbps}k`,
            '-maxrate', `${Math.floor(videoBitrateKbps * 1.5)}k`,
            '-bufsize', `${videoBitrateKbps}k`,
            '-c:a', 'aac',
            '-b:a', `${audioBitrate}k`,
            '-ar', '44100',
            '-ac', '2',
            '-movflags', '+faststart',
            '-y',
            finalOutput
        ];

        // Primeira passagem - tentar atingir tamanho
        await new Promise((resolve, reject) => {
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
                if (code === 0) resolve({ success: true });
                else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
            });
        });

        // Verificar tamanho final
        let outStats = await fs.stat(finalOutput);
        const outputSizeMB = outStats.size / 1024 / 1024;

        // Se ainda muito grande, fazer segunda passagem com bitrate mais baixo
        if (outputSizeMB > targetSizeMB) {
            const adjustedBitrate = Math.floor(videoBitrateKbps * (targetSizeMB / outputSizeMB) * 0.9);
            
            const args2 = [
                '-i', inputPath,
                '-vf', `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
                '-c:v', 'libx264',
                '-preset', 'slow',
                '-b:v', `${adjustedBitrate}k`,
                '-maxrate', `${Math.floor(adjustedBitrate * 1.2)}k`,
                '-bufsize', `${adjustedBitrate}k`,
                '-c:a', 'aac',
                '-b:a', `${Math.max(32, audioBitrate - 32)}k`,
                '-ar', '44100',
                '-movflags', '+faststart',
                '-y',
                finalOutput
            ];

            await new Promise((resolve, reject) => {
                const proc = spawn('ffmpeg', args2, { stdio: ['pipe', 'pipe', 'pipe'] });
                const timer = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error('Timeout')); }, timeout);
                proc.on('error', (err) => { clearTimeout(timer); reject(err); });
                proc.on('close', (code) => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('Second pass failed')); });
            });

            outStats = await fs.stat(finalOutput);
            metadata.secondPass = true;
        }

        const inputMB = (metadata.inputSize / 1024 / 1024).toFixed(2);
        const finalMB = (outStats.size / 1024 / 1024).toFixed(2);
        const compressionRatio = ((1 - outStats.size / metadata.inputSize) * 100).toFixed(1);

        metadata.outputSize = outStats.size;
        metadata.outputSizeMB = parseFloat(finalMB);
        metadata.compressionRatio = `${compressionRatio}%`;
        metadata.withinLimit = outStats.size <= targetSizeMB * 1024 * 1024;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        const status = metadata.withinLimit ? '✓' : '⚠ (over limit)';
        console.log(`[WHATSAPP-VIDEO] ${inputMB}MB → ${finalMB}MB (${compressionRatio}% smaller) ${status}`);

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
