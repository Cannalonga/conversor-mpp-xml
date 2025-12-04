/**
 * 📦 CONVERTERS INDEX
 * Exporta todos os conversores disponíveis
 * 
 * Suporta múltiplos padrões:
 * 1. Objeto com { id, convert, ... } - novo padrão
 * 2. Instância de classe com convertX() method - padrão antigo
 */

const fs = require('fs');
const path = require('path');

const converters = {};
const convertersDir = __dirname;

// Lista de arquivos a ignorar
const ignoreFiles = ['index.js', 'utils.js', 'README.md'];

// Carregar todos os conversores automaticamente
const files = fs.readdirSync(convertersDir).filter(f => 
    f.endsWith('.js') && !ignoreFiles.includes(f)
);

for (const file of files) {
    try {
        const mod = require(path.join(convertersDir, file));
        const baseName = file.replace('.js', '');
        
        // Padrão novo: objeto com id e convert
        if (mod && mod.id && typeof mod.convert === 'function') {
            converters[mod.id] = mod;
            continue;
        }
        
        // Padrão antigo: instância de classe com método convert*
        if (mod && typeof mod === 'object') {
            // Procurar método de conversão na instância ou protótipo
            const proto = Object.getPrototypeOf(mod);
            const allMethods = [
                ...Object.keys(mod),
                ...(proto ? Object.getOwnPropertyNames(proto) : [])
            ];
            
            const convertMethod = allMethods.find(k => 
                k.startsWith('convert') && typeof mod[k] === 'function'
            );
            
            if (convertMethod) {
                // Criar ID a partir do nome do arquivo (excelToCsv -> excel-to-csv)
                const id = baseName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
                
                converters[id] = {
                    id,
                    name: baseName,
                    description: `Converter: ${baseName}`,
                    _instance: mod,
                    _method: convertMethod,
                    convert: async (input, output, opts) => {
                        try {
                            const result = await mod[convertMethod](input, output, opts);
                            // Normalizar resultado
                            if (result && typeof result === 'object') {
                                return {
                                    success: result.success !== false,
                                    errors: result.errors || [],
                                    metadata: result.metadata || result
                                };
                            }
                            return { success: true, errors: [], metadata: { result } };
                        } catch (err) {
                            return { success: false, errors: [err.message], metadata: {} };
                        }
                    },
                    checkDependencies: mod.checkDependencies 
                        ? () => mod.checkDependencies() 
                        : async () => ({ installed: true, tool: 'built-in', message: 'No external dependencies' }),
                    inputTypes: mod.supportedExtensions?.map(e => e.replace('.', '')) || ['*'],
                    outputTypes: ['*'],
                    supportedInputExtensions: mod.supportedExtensions || []
                };
            }
        }
    } catch (err) {
        console.warn(`[converters/index] Failed to load ${file}:`, err.message);
    }
}

module.exports = converters;
