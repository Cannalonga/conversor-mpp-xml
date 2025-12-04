/**
 * 🎬 FFMPEG CONVERTER
 * 
 * Conversor de áudio/vídeo usando FFmpeg.
 * 
 * Formatos suportados:
 * - Vídeo: mp4, webm, avi, mkv, mov
 * - Áudio: mp3, wav, ogg, flac, m4a
 * 
 * Requer: ffmpeg instalado no sistema
 */

const path = require('path');
const { executeCommand, checkToolInstalled, validateInput, ensureOutputDir, logger } = require('./utils');

const name = 'ffmpeg';
const supportedInputExtensions = [
    // Vídeo
    '.mp4', '.webm', '.avi', '.mkv', '.mov', '.wmv', '.flv',
    // Áudio
    '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'
];

const supportedOutputFormats = {
    video: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'gif'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac']
};

const requiredTools = ['ffmpeg'];

/**
 * Verifica se FFmpeg está instalado
 */
async function checkDependencies() {
    const result = await checkToolInstalled('ffmpeg');
    return {
        installed: result.installed,
        tool: 'ffmpeg',
        version: result.version || null,
        message: result.installed 
            ? `FFmpeg is available${result.version ? ` (${result.version})` : ''}` 
            : 'FFmpeg not found. Install from https://ffmpeg.org/ or run: scripts/install-ffmpeg.ps1'
    };
}

/**
 * Converte arquivo de mídia
 * @param {string} inputPath - Caminho do arquivo de entrada
 * @param {string} outputPath - Caminho do arquivo de saída
 * @param {Object} options - Opções de conversão
 */
async function convert(inputPath, outputPath, options = {}) {
    const startTime = Date.now();
    
    try {
        // Validar entrada
        const inputValidation = await validateInput(inputPath, supportedInputExtensions);
        if (!inputValidation.valid) {
            return { success: false, errors: [inputValidation.error] };
        }
        
        // Verificar dependências
        const deps = await checkDependencies();
        if (!deps.installed) {
            return { success: false, errors: [deps.message] };
        }
        
        // Garantir diretório de saída
        await ensureOutputDir(outputPath);
        
        // Construir argumentos do ffmpeg
        const args = buildFFmpegArgs(inputPath, outputPath, options);
        
        // Dry run mode
        if (process.env.CONVERTER_DRY_RUN === '1') {
            const fs = require('fs').promises;
            await fs.writeFile(outputPath, `[DRY RUN] Would run: ffmpeg ${args.join(' ')}`);
            return {
                success: true,
                metadata: {
                    dryRun: true,
                    command: `ffmpeg ${args.join(' ')}`,
                    duration: Date.now() - startTime
                }
            };
        }
        
        // Executar conversão
        logger.info(`[FFMPEG] Converting: ${inputPath} -> ${outputPath}`);
        const result = await executeCommand('ffmpeg', args, { timeout: 600000 }); // 10 min timeout
        
        if (result.exitCode !== 0) {
            return {
                success: false,
                errors: [`FFmpeg exited with code ${result.exitCode}: ${result.stderr}`]
            };
        }
        
        // Verificar se output foi criado
        const fs = require('fs').promises;
        const stats = await fs.stat(outputPath);
        
        return {
            success: true,
            metadata: {
                inputPath,
                outputPath,
                inputSize: inputValidation.size,
                outputSize: stats.size,
                duration: Date.now() - startTime,
                format: path.extname(outputPath).slice(1)
            }
        };
        
    } catch (error) {
        logger.error(`[FFMPEG] Error: ${error.message}`);
        return {
            success: false,
            errors: [error.message]
        };
    }
}

/**
 * Constrói argumentos do FFmpeg
 */
function buildFFmpegArgs(inputPath, outputPath, options) {
    const args = ['-y']; // Overwrite output
    
    // Input
    args.push('-i', inputPath);
    
    // Video options
    if (options.videoCodec) {
        args.push('-c:v', options.videoCodec);
    }
    if (options.videoBitrate) {
        args.push('-b:v', options.videoBitrate);
    }
    if (options.resolution) {
        args.push('-s', options.resolution);
    }
    if (options.fps) {
        args.push('-r', options.fps.toString());
    }
    
    // Audio options
    if (options.audioCodec) {
        args.push('-c:a', options.audioCodec);
    }
    if (options.audioBitrate) {
        args.push('-b:a', options.audioBitrate);
    }
    if (options.sampleRate) {
        args.push('-ar', options.sampleRate.toString());
    }
    
    // Quality preset
    if (options.preset) {
        args.push('-preset', options.preset);
    }
    
    // CRF (quality)
    if (options.crf) {
        args.push('-crf', options.crf.toString());
    }
    
    // Duration limit
    if (options.duration) {
        args.push('-t', options.duration.toString());
    }
    
    // Start time
    if (options.startTime) {
        args.push('-ss', options.startTime.toString());
    }
    
    // Output
    args.push(outputPath);
    
    return args;
}

/**
 * Extrai thumbnail de vídeo
 */
async function extractThumbnail(inputPath, outputPath, options = {}) {
    const time = options.time || '00:00:01';
    
    return convert(inputPath, outputPath, {
        ...options,
        startTime: time,
        duration: 1,
        videoCodec: 'mjpeg',
        frames: 1
    });
}

/**
 * Obtém informações do arquivo de mídia
 */
async function getMediaInfo(filePath) {
    const deps = await checkDependencies();
    if (!deps.installed) {
        return { success: false, error: deps.message };
    }
    
    try {
        const result = await executeCommand('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ]);
        
        return {
            success: true,
            info: JSON.parse(result.stdout)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Retorna informações do conversor
 */
function getInfo() {
    return {
        name,
        supportedInputExtensions,
        supportedOutputFormats,
        requiredTools,
        description: 'Audio/video converter using FFmpeg'
    };
}

module.exports = {
    name,
    supportedInputExtensions,
    supportedOutputFormats,
    requiredTools,
    checkDependencies,
    convert,
    extractThumbnail,
    getMediaInfo,
    getInfo
};
