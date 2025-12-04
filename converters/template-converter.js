/**
 * 📋 TEMPLATE CONVERTER
 * 
 * Este é o template padrão para criar novos conversores.
 * Copie este arquivo e adapte conforme necessário.
 * 
 * REQUISITOS:
 * 1. Exportar função convert(inputPath, outputPath, options)
 * 2. Retornar { success: boolean, errors?: string[], metadata?: object }
 * 3. Implementar dry-run mode via CONVERTER_DRY_RUN=1
 * 4. Ter tratamento de erros robusto
 * 5. Usar os utilitários de converters/utils.js
 * 
 * @example
 * const result = await converter.convert('input.ext', 'output.ext', { quality: 80 });
 * // => { success: true, metadata: { ... } }
 */

const path = require('path');
const fs = require('fs').promises;
const {
    fileExists,
    ensureOutputDir,
    getFileInfo,
    checkDependenciesSync,
    ensureDirSync,
    logger,
    measureTime
} = require('./utils');

// Configuração do conversor
const id = 'template-converter';
const name = 'Template Converter';
const description = 'Template converter example - copy and modify for new converters';
const inputTypes = ['txt'];
const outputTypes = ['txt'];
const supportedInputExtensions = ['.txt'];
const outputExtension = '.txt';
const requiredTools = []; // Sem dependências externas para o template

/**
 * Verifica se as dependências estão instaladas
 * @returns {{ installed: boolean, tool: string, message: string }}
 */
function checkDependencies() {
    // Se não tem ferramentas requeridas, sempre OK
    if (requiredTools.length === 0) {
        return {
            installed: true,
            tool: 'none required',
            message: 'No external dependencies'
        };
    }
    
    const { present, missing } = checkDependenciesSync(requiredTools);
    
    if (missing.length > 0) {
        return {
            installed: false,
            tool: requiredTools.join(', '),
            message: `Missing tools: ${missing.join(', ')}`
        };
    }
    
    return {
        installed: true,
        tool: requiredTools.join(', '),
        message: 'All dependencies available',
        paths: present
    };
}

/**
 * Converte arquivo de entrada para o formato de saída
 * 
 * @param {string} inputPath - Caminho do arquivo de entrada
 * @param {string} outputPath - Caminho do arquivo de saída
 * @param {object} options - Opções de conversão
 * @returns {Promise<{success: boolean, errors: string[], metadata: object}>}
 */
async function convert(inputPath, outputPath, options = {}) {
    const start = Date.now();
    const errors = [];
    const metadata = {
        converter: id,
        inputPath,
        outputPath,
        outputs: [],
        durationMs: 0
    };

    try {
        // 1. Verificar dependências
        const deps = checkDependencies();
        if (!deps.installed) {
            return {
                success: false,
                errors: [`missing_tools:${requiredTools.join(',')}`],
                metadata
            };
        }

        // 2. Validar entrada
        if (!(await fileExists(inputPath))) {
            return {
                success: false,
                errors: [`Input file not found: ${inputPath}`],
                metadata
            };
        }

        // 3. Verificar extensão
        const ext = path.extname(inputPath).toLowerCase();
        if (!supportedInputExtensions.includes(ext) && supportedInputExtensions[0] !== '.*') {
            return {
                success: false,
                errors: [`Unsupported input extension: ${ext}`],
                metadata
            };
        }

        // 4. Dry-run mode
        if (process.env.CONVERTER_DRY_RUN === '1') {
            ensureDirSync(path.dirname(outputPath));
            await fs.writeFile(outputPath, `DRY_RUN_${id.toUpperCase()}`);
            metadata.dryRun = true;
            metadata.outputs.push(outputPath);
            metadata.durationMs = Date.now() - start;
            return { success: true, errors: [], metadata };
        }

        // 5. Garantir diretório de saída
        ensureDirSync(path.dirname(outputPath));

        // 6. EXECUTAR CONVERSÃO
        // Para o template, apenas copia o arquivo
        const content = await fs.readFile(inputPath);
        await fs.writeFile(outputPath, content);

        // 7. Verificar saída
        if (!(await fileExists(outputPath))) {
            return {
                success: false,
                errors: ['Output file was not created'],
                metadata
            };
        }

        // 8. Coletar metadata
        const inputInfo = await getFileInfo(inputPath);
        const outputInfo = await getFileInfo(outputPath);
        
        metadata.inputSize = inputInfo.size;
        metadata.outputSize = outputInfo.size;
        metadata.outputs.push(outputPath);
        metadata.durationMs = Date.now() - start;

        return { success: true, errors: [], metadata };

    } catch (error) {
        errors.push(error.message);
        metadata.durationMs = Date.now() - start;
        return { success: false, errors, metadata };
    }
}

/**
 * Retorna informações sobre o conversor
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
