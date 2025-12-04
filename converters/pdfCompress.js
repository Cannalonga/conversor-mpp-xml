/**
 * 📑 PDF COMPRESS
 * 
 * Comprime PDFs reduzindo tamanho do arquivo.
 * Útil para envio por email, upload, etc.
 * 
 * Usa Ghostscript (system).
 * Install: apt-get install ghostscript (Linux) ou download from ghostscript.com (Windows)
 * 
 * Options:
 *   - quality: 'screen' | 'ebook' | 'printer' | 'prepress' (default: 'ebook')
 *     - screen: 72 dpi, menor qualidade, menor tamanho
 *     - ebook: 150 dpi, boa qualidade para leitura em tela
 *     - printer: 300 dpi, boa qualidade para impressão
 *     - prepress: máxima qualidade, maior tamanho
 *   - dpi: número específico (sobrescreve quality)
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn, execSync } = require('child_process');
const os = require('os');

const id = 'pdf-compress';
const name = 'PDF Compress';
const description = 'Comprime PDFs para reduzir tamanho';
const inputTypes = ['pdf'];
const outputTypes = ['pdf'];
const supportedInputExtensions = ['.pdf'];
const outputExtension = '.pdf';
const requiredTools = ['ghostscript (system)'];

function findGhostscript() {
    const commands = os.platform() === 'win32'
        ? ['gswin64c', 'gswin32c', 'gs', 'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe']
        : ['gs', 'ghostscript'];

    for (const cmd of commands) {
        try {
            execSync(`"${cmd}" --version`, { stdio: 'pipe' });
            return cmd;
        } catch { /* continue */ }
    }
    return null;
}

async function checkDependencies() {
    const gs = findGhostscript();
    return {
        installed: !!gs,
        tool: 'ghostscript',
        path: gs,
        message: gs 
            ? `Ghostscript available at ${gs}`
            : 'Ghostscript not found. Install: apt-get install ghostscript (Linux) or download from ghostscript.com'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };
    const timeout = options.timeout || 120000;

    // Config
    const quality = options.quality || 'ebook';
    const dpi = options.dpi || null;

    // Quality presets
    const qualitySettings = {
        screen: '/screen',
        ebook: '/ebook',
        printer: '/printer',
        prepress: '/prepress'
    };

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
    if (ext !== '.pdf') {
        return { success: false, errors: [`Input must be PDF, got: ${ext}`], metadata };
    }

    // Garantir .pdf no output
    let finalOutput = outputPath;
    if (!outputPath.toLowerCase().endsWith('.pdf')) {
        finalOutput = outputPath + '.pdf';
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(finalOutput), { recursive: true });
            await fs.writeFile(finalOutput, Buffer.from('%PDF-1.4\nDRY_RUN_COMPRESSED\n%%EOF'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.quality = quality;
            metadata.outputPath = finalOutput;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    const gs = deps.path;

    try {
        await fs.mkdir(path.dirname(finalOutput), { recursive: true });

        const args = [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            `-dPDFSETTINGS=${qualitySettings[quality] || qualitySettings.ebook}`,
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH'
        ];

        // DPI específico
        if (dpi) {
            args.push(`-dDownsampleColorImages=true`);
            args.push(`-dColorImageResolution=${dpi}`);
            args.push(`-dDownsampleGrayImages=true`);
            args.push(`-dGrayImageResolution=${dpi}`);
            args.push(`-dDownsampleMonoImages=true`);
            args.push(`-dMonoImageResolution=${dpi}`);
        }

        args.push(`-sOutputFile=${finalOutput}`);
        args.push(inputPath);

        // Executar Ghostscript
        await new Promise((resolve, reject) => {
            const proc = spawn(gs, args, { stdio: ['pipe', 'pipe', 'pipe'] });
            let stderr = '';

            const timer = setTimeout(() => {
                proc.kill('SIGTERM');
                reject(new Error('Ghostscript timeout'));
            }, timeout);

            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('error', (err) => { clearTimeout(timer); reject(err); });
            proc.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0) resolve({ success: true });
                else reject(new Error(`Ghostscript exited with code ${code}: ${stderr}`));
            });
        });

        const outStats = await fs.stat(finalOutput);
        const inputKB = Math.round(metadata.inputSize / 1024);
        const outputKB = Math.round(outStats.size / 1024);
        const compressionRatio = ((1 - outStats.size / metadata.inputSize) * 100).toFixed(1);

        // Se compressão negativa (arquivo ficou maior), avisar
        const warning = outStats.size > metadata.inputSize 
            ? ' ⚠ (file got larger - original may already be optimized)'
            : '';

        metadata.outputSize = outStats.size;
        metadata.compressionRatio = `${compressionRatio}%`;
        metadata.quality = quality;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        console.log(`[PDF-COMPRESS] ${inputKB}KB → ${outputKB}KB (${compressionRatio}% ${compressionRatio >= 0 ? 'smaller' : 'larger'})${warning}`);

        return { success: true, errors: [], metadata };

    } catch (e) {
        return { success: false, errors: [`Compression failed: ${e.message}`], metadata };
    }
}

function getInfo() {
    return { id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools };
}

module.exports = {
    id, name, description, inputTypes, outputTypes, supportedInputExtensions, outputExtension, requiredTools,
    checkDependencies, convert, getInfo
};
