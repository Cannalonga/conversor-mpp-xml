/**
 * 📝 PANDOC CONVERTER
 * 
 * Conversor de documentos usando Pandoc.
 * Excelente para Markdown, HTML, LaTeX, etc.
 * 
 * Formatos suportados:
 * - Entrada: md, markdown, html, tex, rst, org, docx, epub
 * - Saída: html, pdf, docx, epub, md, rst, tex, txt
 * 
 * Requer: Pandoc instalado (e LaTeX para PDF)
 */

const path = require('path');
const fs = require('fs').promises;
const { executeCommand, checkToolInstalled, validateInput, ensureOutputDir, logger } = require('./utils');

const name = 'pandoc';
const supportedInputExtensions = [
    '.md', '.markdown', '.html', '.htm', '.tex', '.latex',
    '.rst', '.org', '.docx', '.epub', '.txt', '.json'
];

const supportedOutputFormats = {
    markup: ['html', 'html5', 'markdown', 'md', 'rst', 'org', 'tex', 'latex'],
    document: ['docx', 'odt', 'rtf', 'pdf', 'epub'],
    text: ['plain', 'txt']
};

const requiredTools = ['pandoc'];

/**
 * Verifica se Pandoc está instalado
 */
async function checkDependencies() {
    const pandocResult = await checkToolInstalled('pandoc');
    const pdflatexResult = await checkToolInstalled('pdflatex');
    
    return {
        installed: pandocResult.installed,
        tool: 'pandoc',
        version: pandocResult.version || null,
        pdfSupport: pdflatexResult.installed,
        message: pandocResult.installed 
            ? `Pandoc found${pandocResult.version ? ` (${pandocResult.version})` : ''}${pdflatexResult.installed ? ' with PDF support' : ' (no PDF support - install LaTeX)'}`
            : 'Pandoc not found. Install from https://pandoc.org/'
    };
}

/**
 * Converte documento
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
        
        // Verificar suporte a PDF
        const outputFormat = path.extname(outputPath).slice(1);
        if (outputFormat === 'pdf' && !deps.pdfSupport) {
            return { 
                success: false, 
                errors: ['PDF output requires LaTeX. Install texlive or miktex.'] 
            };
        }
        
        // Garantir diretório de saída
        await ensureOutputDir(outputPath);
        
        // Dry run mode
        if (process.env.CONVERTER_DRY_RUN === '1') {
            await fs.writeFile(outputPath, `[DRY RUN] Would convert ${inputPath} to ${outputFormat}`);
            return {
                success: true,
                metadata: {
                    dryRun: true,
                    outputFormat,
                    duration: Date.now() - startTime
                }
            };
        }
        
        // Construir argumentos
        const args = buildPandocArgs(inputPath, outputPath, options);
        
        // Executar conversão
        logger.info(`[PANDOC] Converting: ${inputPath} -> ${outputPath}`);
        const result = await executeCommand('pandoc', args, { timeout: 120000 }); // 2 min timeout
        
        if (result.exitCode !== 0) {
            return {
                success: false,
                errors: [`Pandoc exited with code ${result.exitCode}: ${result.stderr}`]
            };
        }
        
        // Verificar output
        const stats = await fs.stat(outputPath);
        
        return {
            success: true,
            metadata: {
                inputPath,
                outputPath,
                inputSize: inputValidation.size,
                outputSize: stats.size,
                duration: Date.now() - startTime,
                format: outputFormat
            }
        };
        
    } catch (error) {
        logger.error(`[PANDOC] Error: ${error.message}`);
        return {
            success: false,
            errors: [error.message]
        };
    }
}

/**
 * Constrói argumentos do Pandoc
 */
function buildPandocArgs(inputPath, outputPath, options) {
    const args = [];
    
    // Input format (auto-detect por padrão)
    if (options.from) {
        args.push('-f', options.from);
    }
    
    // Output format
    if (options.to) {
        args.push('-t', options.to);
    }
    
    // Standalone (documento completo)
    if (options.standalone !== false) {
        args.push('-s');
    }
    
    // Template
    if (options.template) {
        args.push('--template', options.template);
    }
    
    // CSS (para HTML)
    if (options.css) {
        args.push('--css', options.css);
    }
    
    // Table of contents
    if (options.toc) {
        args.push('--toc');
        if (options.tocDepth) {
            args.push('--toc-depth', options.tocDepth.toString());
        }
    }
    
    // Variables
    if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
            args.push('-V', `${key}=${value}`);
        }
    }
    
    // Metadata
    if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
            args.push('-M', `${key}=${value}`);
        }
    }
    
    // PDF engine
    if (options.pdfEngine) {
        args.push('--pdf-engine', options.pdfEngine);
    }
    
    // Input and output
    args.push('-o', outputPath);
    args.push(inputPath);
    
    return args;
}

/**
 * Converte Markdown para HTML
 */
async function markdownToHtml(inputPath, outputPath, options = {}) {
    return convert(inputPath, outputPath, {
        from: 'markdown',
        to: 'html5',
        standalone: true,
        ...options
    });
}

/**
 * Converte Markdown para PDF
 */
async function markdownToPdf(inputPath, outputPath, options = {}) {
    return convert(inputPath, outputPath, {
        from: 'markdown',
        ...options
    });
}

/**
 * Converte HTML para Markdown
 */
async function htmlToMarkdown(inputPath, outputPath, options = {}) {
    return convert(inputPath, outputPath, {
        from: 'html',
        to: 'markdown',
        ...options
    });
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
        description: 'Document converter using Pandoc'
    };
}

module.exports = {
    name,
    supportedInputExtensions,
    supportedOutputFormats,
    requiredTools,
    checkDependencies,
    convert,
    markdownToHtml,
    markdownToPdf,
    htmlToMarkdown,
    getInfo
};
