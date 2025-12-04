/**
 * 📄 DOCX TO PDF CONVERTER
 * 
 * Converte documentos Word (.docx) para PDF.
 * Usa LibreOffice em modo headless (alta fidelidade).
 * 
 * Usa soffice/libreoffice (system).
 * Install: apt-get install libreoffice (Linux) ou download from libreoffice.org (Windows)
 * 
 * Options:
 *   - timeout: ms (default: 120000)
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn, execSync } = require('child_process');
const os = require('os');

const id = 'docx-to-pdf';
const name = 'DOCX to PDF';
const description = 'Converte documentos Word para PDF';
const inputTypes = ['docx', 'doc', 'odt', 'rtf'];
const outputTypes = ['pdf'];
const supportedInputExtensions = ['.docx', '.doc', '.odt', '.rtf'];
const outputExtension = '.pdf';
const requiredTools = ['libreoffice (system)'];

function findLibreOffice() {
    const commands = os.platform() === 'win32'
        ? ['soffice', 'C:\\Program Files\\LibreOffice\\program\\soffice.exe', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe']
        : ['soffice', 'libreoffice'];

    for (const cmd of commands) {
        try {
            execSync(`"${cmd}" --version`, { stdio: 'pipe' });
            return cmd;
        } catch { /* continue */ }
    }
    return null;
}

async function checkDependencies() {
    const soffice = findLibreOffice();
    return {
        installed: !!soffice,
        tool: 'libreoffice',
        path: soffice,
        message: soffice 
            ? `LibreOffice available at ${soffice}`
            : 'LibreOffice not found. Install: apt-get install libreoffice (Linux) or download from libreoffice.org'
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const metadata = { durationMs: 0 };
    const timeout = options.timeout || 120000;

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

    // Garantir .pdf no output
    let finalOutput = outputPath;
    if (!outputPath.toLowerCase().endsWith('.pdf')) {
        finalOutput = outputPath.replace(/\.[^.]+$/, '.pdf');
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(finalOutput), { recursive: true });
            await fs.writeFile(finalOutput, Buffer.from('%PDF-1.4\nDRY_RUN_DOCX_TO_PDF\n%%EOF'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.outputPath = finalOutput;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    const soffice = deps.path;

    try {
        // LibreOffice precisa de um diretório de saída, não arquivo
        const outDir = path.dirname(finalOutput);
        await fs.mkdir(outDir, { recursive: true });

        // Criar diretório temporário para user profile (evita conflitos)
        const tmpProfile = path.join(os.tmpdir(), `lo_profile_${Date.now()}`);
        await fs.mkdir(tmpProfile, { recursive: true });

        const args = [
            `--headless`,
            `-env:UserInstallation=file://${tmpProfile.replace(/\\/g, '/')}`,
            `--convert-to`, `pdf`,
            `--outdir`, outDir,
            inputPath
        ];

        // Executar LibreOffice
        await new Promise((resolve, reject) => {
            const proc = spawn(soffice, args, { stdio: ['pipe', 'pipe', 'pipe'] });
            let stderr = '';

            const timer = setTimeout(() => {
                proc.kill('SIGTERM');
                reject(new Error('LibreOffice timeout'));
            }, timeout);

            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('error', (err) => { clearTimeout(timer); reject(err); });
            proc.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0) resolve({ success: true });
                else reject(new Error(`LibreOffice exited with code ${code}: ${stderr}`));
            });
        });

        // Limpar profile temporário
        try { await fs.rm(tmpProfile, { recursive: true }); } catch { /* ignore */ }

        // LibreOffice gera arquivo com mesmo nome mas extensão .pdf
        const baseName = path.basename(inputPath, ext);
        const generatedPdf = path.join(outDir, baseName + '.pdf');

        // Renomear se necessário
        if (generatedPdf !== finalOutput) {
            try {
                await fs.rename(generatedPdf, finalOutput);
            } catch {
                // Se renomear falhar, verificar se já está no lugar certo
                try {
                    await fs.stat(finalOutput);
                } catch {
                    // Arquivo não existe em nenhum lugar
                    return { success: false, errors: ['PDF not generated'], metadata };
                }
            }
        }

        const outStats = await fs.stat(finalOutput);
        const inputKB = Math.round(metadata.inputSize / 1024);
        const outputKB = Math.round(outStats.size / 1024);

        metadata.outputSize = outStats.size;
        metadata.durationMs = Date.now() - start;
        metadata.outputPath = finalOutput;

        console.log(`[DOCX-TO-PDF] ${inputKB}KB → ${outputKB}KB`);

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
