/**
 * 📄 LIBREOFFICE CONVERTER
 * 
 * Conversor de documentos usando LibreOffice.
 * 
 * Formatos suportados:
 * - Entrada: doc, docx, odt, xls, xlsx, ods, ppt, pptx, odp, rtf
 * - Saída: pdf, docx, xlsx, pptx, odt, ods, odp, txt, html, csv
 * 
 * Requer: LibreOffice instalado no sistema (soffice command)
 */

const path = require('path');
const fs = require('fs').promises;
const { executeCommand, checkToolInstalled, validateInput, ensureOutputDir, logger } = require('./utils');

const name = 'libreoffice';
const supportedInputExtensions = [
    // Word
    '.doc', '.docx', '.odt', '.rtf', '.txt',
    // Excel
    '.xls', '.xlsx', '.ods', '.csv',
    // PowerPoint
    '.ppt', '.pptx', '.odp',
    // Outros
    '.html', '.htm'
];

const supportedOutputFormats = {
    document: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'],
    spreadsheet: ['pdf', 'xlsx', 'ods', 'csv', 'html'],
    presentation: ['pdf', 'pptx', 'odp', 'html']
};

const requiredTools = ['soffice'];

// Mapeamento de extensão para tipo
const FORMAT_TYPE_MAP = {
    '.doc': 'document', '.docx': 'document', '.odt': 'document', '.rtf': 'document', '.txt': 'document',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.ods': 'spreadsheet', '.csv': 'spreadsheet',
    '.ppt': 'presentation', '.pptx': 'presentation', '.odp': 'presentation'
};

/**
 * Verifica se LibreOffice está instalado
 */
async function checkDependencies() {
    // Tentar diferentes nomes de comando
    const commands = ['soffice', 'libreoffice', 'loffice'];
    
    for (const cmd of commands) {
        const result = await checkToolInstalled(cmd);
        if (result.installed) {
            return {
                installed: true,
                tool: cmd,
                version: result.version || null,
                message: `LibreOffice found (${cmd})${result.version ? ` - ${result.version}` : ''}`
            };
        }
    }
    
    return {
        installed: false,
        tool: 'soffice',
        message: 'LibreOffice not found. Install from https://www.libreoffice.org/'
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
        
        // Garantir diretório de saída
        const outputDir = path.dirname(outputPath);
        await ensureOutputDir(outputPath);
        
        // Determinar formato de saída
        const outputFormat = path.extname(outputPath).slice(1);
        
        // Dry run mode
        if (process.env.CONVERTER_DRY_RUN === '1') {
            await fs.writeFile(outputPath, `[DRY RUN] Would convert ${inputPath} to ${outputFormat}`);
            return {
                success: true,
                metadata: {
                    dryRun: true,
                    tool: deps.tool,
                    outputFormat,
                    duration: Date.now() - startTime
                }
            };
        }
        
        // LibreOffice requer diretório temporário para output
        const tempDir = path.join(outputDir, `.lo_temp_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        
        // Construir argumentos
        const args = [
            '--headless',
            '--convert-to', outputFormat,
            '--outdir', tempDir,
            inputPath
        ];
        
        // Executar conversão
        logger.info(`[LIBREOFFICE] Converting: ${inputPath} -> ${outputFormat}`);
        const result = await executeCommand(deps.tool, args, { timeout: 300000 }); // 5 min timeout
        
        // Encontrar arquivo gerado (LibreOffice pode gerar com nome diferente)
        const tempFiles = await fs.readdir(tempDir);
        const outputFile = tempFiles.find(f => f.endsWith(`.${outputFormat}`));
        
        if (!outputFile) {
            // Limpar temp dir antes de falhar
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            return {
                success: false,
                errors: [`LibreOffice did not generate output file. Stderr: ${result.stderr || 'none'}`]
            };
        }
        
        const tempOutputPath = path.join(tempDir, outputFile);
        
        try {
            await fs.rename(tempOutputPath, outputPath);
        } catch (e) {
            // Se rename falhar, tentar copy + delete
            await fs.copyFile(tempOutputPath, outputPath);
            await fs.unlink(tempOutputPath);
        }
        
        // Limpar temp dir
        await fs.rm(tempDir, { recursive: true, force: true });
        
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
                format: outputFormat,
                tool: deps.tool
            }
        };
        
    } catch (error) {
        logger.error(`[LIBREOFFICE] Error: ${error.message}`);
        return {
            success: false,
            errors: [error.message]
        };
    }
}

/**
 * Converte documento para PDF
 */
async function convertToPdf(inputPath, outputPath) {
    const pdfPath = outputPath || inputPath.replace(/\.[^.]+$/, '.pdf');
    return convert(inputPath, pdfPath);
}

/**
 * Obtém tipo de documento baseado na extensão
 */
function getDocumentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return FORMAT_TYPE_MAP[ext] || 'unknown';
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
        description: 'Document converter using LibreOffice'
    };
}

module.exports = {
    name,
    supportedInputExtensions,
    supportedOutputFormats,
    requiredTools,
    checkDependencies,
    convert,
    convertToPdf,
    getDocumentType,
    getInfo
};
