/**
 * 🖼️ PDF TO IMAGE CONVERTER
 * 
 * Converte páginas de PDF para imagens (PNG/JPG).
 * 
 * Requires system tool: pdftoppm (part of poppler-utils)
 * Install: apt-get install poppler-utils (Linux) / brew install poppler (Mac)
 * Windows: Download from https://github.com/oschwartz10612/poppler-windows
 * 
 * Usage:
 *   const converter = require('./pdf-to-image');
 *   const result = await converter.convert('input.pdf', './output/', { format: 'png', dpi: 150 });
 * 
 * Options:
 *   - format: 'png' | 'jpg' (default: 'png')
 *   - dpi: number (default: 150)
 *   - pages: 'all' | [1, 2, 3] (default: 'all')
 * 
 * Returns:
 *   { success: boolean, errors: string[], metadata: { pages, outputs, durationMs } }
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const rename = promisify(fs.rename);

// Converter metadata
const id = 'pdf-to-image';
const name = 'PDF to Image';
const description = 'Converte páginas de PDF para imagens (PNG ou JPG) usando pdftoppm (poppler).';
const inputTypes = ['pdf'];
const outputTypes = ['png', 'jpg'];
const supportedInputExtensions = ['.pdf'];
const outputExtension = '.png';
const requiredTools = ['pdftoppm'];

/**
 * Verifica se uma ferramenta está instalada no sistema
 */
function whichSync(tool) {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'where' : 'which';
    try {
        const cp = spawnSync(cmd, [tool], { encoding: 'utf8' });
        if (cp.status === 0) {
            const out = (cp.stdout || '').trim().split(/\r?\n/)[0];
            return out || null;
        }
    } catch (e) {
        // Ignore
    }
    return null;
}

/**
 * Verifica se pdftoppm está instalado
 */
async function checkDependencies() {
    const pdftoppmPath = whichSync('pdftoppm');
    return {
        installed: !!pdftoppmPath,
        tool: 'pdftoppm',
        path: pdftoppmPath,
        message: pdftoppmPath 
            ? `pdftoppm found at ${pdftoppmPath}`
            : 'pdftoppm not found. Install poppler-utils: apt-get install poppler-utils (Linux) / brew install poppler (Mac)'
    };
}

/**
 * Converte PDF para imagens
 * @param {string} inputPath - Caminho do arquivo PDF
 * @param {string} outputPath - Caminho de saída (arquivo ou diretório)
 * @param {Object} options - Opções de conversão
 */
async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const errors = [];
    const metadata = { pages: 0, outputs: [], durationMs: 0 };

    // Normalizar opções
    const format = (options.format || 'png').toLowerCase();
    const dpi = options.dpi || 150;
    const pages = options.pages || 'all';
    const timeoutMs = parseInt(process.env.CONVERTER_TIMEOUT_MS || '120000', 10);

    // Validar formato
    if (!['png', 'jpg', 'jpeg'].includes(format)) {
        return { success: false, errors: ['Invalid format. Use png or jpg.'], metadata };
    }

    // Verificar se input existe
    try {
        const s = await stat(inputPath);
        if (!s.isFile()) {
            return { success: false, errors: ['inputPath is not a file'], metadata };
        }
    } catch (err) {
        return { success: false, errors: [`inputPath not found: ${err.message}`], metadata };
    }

    // Verificar extensão
    const ext = path.extname(inputPath).toLowerCase();
    if (ext !== '.pdf') {
        return { success: false, errors: [`Invalid input extension: ${ext}. Expected .pdf`], metadata };
    }

    // Dry run mode
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            const outputIsFile = /\.(png|jpg|jpeg)$/i.test(outputPath);
            let outFiles = [];

            if (outputIsFile) {
                await mkdir(path.dirname(outputPath), { recursive: true });
                await writeFile(outputPath, Buffer.from('DRY_RUN_PLACEHOLDER_IMAGE'));
                outFiles.push(outputPath);
            } else {
                await mkdir(outputPath, { recursive: true });
                // Simular 3 páginas
                for (let i = 1; i <= 3; i++) {
                    const p = path.join(outputPath, `page-${i}.${format === 'jpg' ? 'jpg' : 'png'}`);
                    await writeFile(p, Buffer.from(`DRY_RUN_PLACEHOLDER_PAGE_${i}`));
                    outFiles.push(p);
                }
            }

            metadata.pages = outFiles.length;
            metadata.outputs = outFiles;
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;

            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`dry-run failed: ${e.message}`], metadata };
        }
    }

    // Verificar dependências
    const deps = await checkDependencies();
    if (!deps.installed) {
        return { success: false, errors: [deps.message], metadata };
    }

    // Preparar output
    const outputIsFile = /\.(png|jpg|jpeg)$/i.test(outputPath);
    const outputDir = outputIsFile ? path.dirname(outputPath) : outputPath;
    await mkdir(outputDir, { recursive: true });

    // Construir argumentos do pdftoppm
    const tempPrefix = path.join(outputDir, `pdfimg-${Date.now()}`);
    const args = ['-r', String(dpi)];

    // Formato de saída
    if (format === 'png') {
        args.push('-png');
    } else {
        args.push('-jpeg');
    }

    // Seleção de páginas
    if (Array.isArray(pages) && pages.length > 0) {
        const pageNums = pages.map(p => parseInt(p, 10)).filter(Boolean);
        if (pageNums.length === 1) {
            args.push('-f', String(pageNums[0]), '-l', String(pageNums[0]));
        }
        // Para múltiplas páginas não contíguas, exportamos todas e filtramos depois
    }

    args.push(inputPath, tempPrefix);

    // Executar pdftoppm
    let child;
    try {
        child = spawn(deps.path, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
        return { success: false, errors: [`failed to spawn pdftoppm: ${e.message}`], metadata };
    }

    // Timeout handling
    let killed = false;
    const killTimer = setTimeout(() => {
        try {
            killed = true;
            child.kill('SIGKILL');
        } catch (e) {
            // Ignore
        }
    }, timeoutMs);

    const stderrChunks = [];
    child.stderr.on('data', (c) => stderrChunks.push(c));

    const exitCode = await new Promise((resolve) => {
        child.on('close', (code) => resolve(code));
        child.on('error', (err) => {
            errors.push(`spawn error: ${err.message}`);
            resolve(1);
        });
    });

    clearTimeout(killTimer);

    if (killed) {
        errors.push(`pdftoppm killed after timeout ${timeoutMs}ms`);
        metadata.durationMs = Date.now() - start;
        return { success: false, errors, metadata };
    }

    if (exitCode !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        errors.push(`pdftoppm exited with code ${exitCode}: ${stderr}`);
        metadata.durationMs = Date.now() - start;
        return { success: false, errors, metadata };
    }

    // Coletar arquivos gerados
    try {
        const files = await readdir(outputDir);
        const prefix = path.basename(tempPrefix);
        const candidates = files
            .filter(f => f.startsWith(prefix))
            .map(f => path.join(outputDir, f))
            .filter(p => /\.(png|jpg|jpeg)$/i.test(p));

        // Filtrar páginas específicas se solicitado
        let finalOutputs = candidates;
        if (Array.isArray(pages) && pages.length > 1) {
            const want = new Set(pages.map(n => String(n)));
            finalOutputs = candidates.filter(p => {
                const m = p.match(/-(\d+)\.(png|jpg|jpeg)$/i);
                return m && want.has(m[1]);
            });
        }

        // Se output era um arquivo, renomear o primeiro resultado
        if (outputIsFile) {
            if (!finalOutputs.length) {
                errors.push('no output files produced by pdftoppm');
                metadata.durationMs = Date.now() - start;
                return { success: false, errors, metadata };
            }
            await rename(finalOutputs[0], outputPath);
            // Limpar outros arquivos gerados
            for (let i = 1; i < finalOutputs.length; i++) {
                try {
                    await fs.promises.unlink(finalOutputs[i]);
                } catch (e) {
                    // Ignore
                }
            }
            metadata.outputs = [outputPath];
        } else {
            metadata.outputs = finalOutputs;
        }

        metadata.pages = metadata.outputs.length;
        metadata.durationMs = Date.now() - start;

        console.log(`[PDF-TO-IMAGE] Converted ${inputPath} -> ${metadata.pages} images in ${metadata.durationMs}ms`);

        return { success: true, errors: [], metadata };

    } catch (e) {
        errors.push(`error collecting output files: ${e.message}`);
        metadata.durationMs = Date.now() - start;
        return { success: false, errors, metadata };
    }
}

/**
 * Retorna informações do conversor
 */
function getInfo() {
    return {
        id,
        name,
        description,
        inputTypes,
        outputTypes,
        supportedInputExtensions,
        outputExtension,
        requiredTools
    };
}

module.exports = {
    id,
    name,
    description,
    inputTypes,
    outputTypes,
    supportedInputExtensions,
    outputExtension,
    requiredTools,
    checkDependencies,
    convert,
    getInfo
};
