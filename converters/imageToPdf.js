/**
 * 🖼️ IMAGE TO PDF CONVERTER
 * 
 * Converte imagens (PNG, JPG, WEBP) para PDF.
 * Suporta múltiplas imagens em um único PDF.
 * 
 * Usa sharp + pdfkit (npm).
 * Install: npm install sharp pdfkit
 * 
 * Options:
 *   - pageSize: 'A4' | 'Letter' | 'auto' (default: 'A4')
 *   - margin: number em pontos (default: 40)
 *   - fitToPage: boolean (default: true)
 */

const path = require('path');
const fs = require('fs').promises;

const id = 'image-to-pdf';
const name = 'Image to PDF';
const description = 'Converte imagens para PDF. Suporta PNG, JPG, WEBP.';
const inputTypes = ['png', 'jpg', 'jpeg', 'webp'];
const outputTypes = ['pdf'];
const supportedInputExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
const outputExtension = '.pdf';
const requiredTools = ['sharp (npm)', 'pdfkit (npm)'];

let sharp = null;
let PDFDocument = null;

async function loadDeps() {
    if (!sharp) {
        try { sharp = require('sharp'); } catch (e) { /* */ }
    }
    if (!PDFDocument) {
        try { PDFDocument = require('pdfkit'); } catch (e) { /* */ }
    }
    return { sharp, PDFDocument };
}

async function checkDependencies() {
    const { sharp: s, PDFDocument: p } = await loadDeps();
    const missing = [];
    if (!s) missing.push('sharp');
    if (!p) missing.push('pdfkit');
    
    return {
        installed: missing.length === 0,
        tool: 'sharp + pdfkit',
        message: missing.length === 0 
            ? 'Dependencies available'
            : `Missing: ${missing.join(', ')}. Run: npm install ${missing.join(' ')}`
    };
}

async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const errors = [];
    const metadata = { durationMs: 0 };

    const pageSize = options.pageSize || 'A4';
    const margin = options.margin ?? 40;
    const fitToPage = options.fitToPage !== false;

    // Input pode ser string (um arquivo) ou array (múltiplos arquivos)
    const inputFiles = Array.isArray(inputPath) ? inputPath : [inputPath];

    // Validar inputs
    for (const file of inputFiles) {
        try {
            const stats = await fs.stat(file);
            if (!stats.isFile()) {
                return { success: false, errors: [`${file} is not a file`], metadata };
            }
        } catch (e) {
            return { success: false, errors: [`File not found: ${file}`], metadata };
        }

        const ext = path.extname(file).toLowerCase();
        if (!supportedInputExtensions.includes(ext)) {
            return { success: false, errors: [`Unsupported format: ${ext}`], metadata };
        }
    }

    // Dry run
    if (process.env.CONVERTER_DRY_RUN === '1') {
        try {
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, Buffer.from('%PDF-1.4\nDRY_RUN_PLACEHOLDER\n%%EOF'));
            metadata.durationMs = Date.now() - start;
            metadata.dryRun = true;
            metadata.pages = inputFiles.length;
            return { success: true, errors: [], metadata };
        } catch (e) {
            return { success: false, errors: [`Dry-run failed: ${e.message}`], metadata };
        }
    }

    const deps = await checkDependencies();
    if (!deps.installed) return { success: false, errors: [deps.message], metadata };

    try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Criar PDF
        const doc = new PDFDocument({ size: pageSize, margin });
        const writeStream = require('fs').createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Dimensões da página (em pontos)
        const pageWidth = doc.page.width - margin * 2;
        const pageHeight = doc.page.height - margin * 2;

        for (let i = 0; i < inputFiles.length; i++) {
            if (i > 0) doc.addPage();

            const imgPath = inputFiles[i];
            
            // Obter dimensões da imagem
            const imgMeta = await sharp(imgPath).metadata();
            
            // Calcular escala para caber na página
            let imgWidth = imgMeta.width;
            let imgHeight = imgMeta.height;

            if (fitToPage) {
                const scaleX = pageWidth / imgWidth;
                const scaleY = pageHeight / imgHeight;
                const scale = Math.min(scaleX, scaleY, 1); // Não aumentar, só reduzir
                imgWidth *= scale;
                imgHeight *= scale;
            }

            // Centralizar
            const x = margin + (pageWidth - imgWidth) / 2;
            const y = margin + (pageHeight - imgHeight) / 2;

            // Converter para buffer (pdfkit precisa de buffer ou path)
            const imgBuffer = await sharp(imgPath).toBuffer();
            doc.image(imgBuffer, x, y, { width: imgWidth, height: imgHeight });
        }

        doc.end();

        // Aguardar escrita
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const outStats = await fs.stat(outputPath);
        metadata.outputSize = outStats.size;
        metadata.pages = inputFiles.length;
        metadata.durationMs = Date.now() - start;

        console.log(`[IMAGE-TO-PDF] Created ${outputPath} with ${metadata.pages} pages`);
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
