/**
 * 🔌 CONVERTERS API ROUTES (v1)
 * 
 * Endpoints:
 * - GET /api/v1/converters - Lista todos os conversores disponíveis
 * - GET /api/v1/converters/:id - Detalhes de um conversor específico
 * 
 * Estes endpoints complementam o /health existente.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { checkToolInstalled } = require('../../converters/utils');

const router = express.Router();

// Cache de conversores (atualizado a cada 5 minutos)
let convertersCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega informações de todos os conversores dinamicamente
 */
async function loadConverters() {
    const now = Date.now();
    
    // Retornar cache se válido
    if (convertersCache && (now - cacheTimestamp) < CACHE_TTL) {
        return convertersCache;
    }

    const convertersDir = path.join(__dirname, '../../converters');
    const files = fs.readdirSync(convertersDir)
        .filter(f => f.endsWith('.js') && 
                    !f.startsWith('_') && 
                    !f.includes('test') &&
                    f !== 'utils.js' &&
                    f !== 'template-converter.js' &&
                    f !== 'README.md');

    const converters = [];

    for (const file of files) {
        try {
            const converterPath = path.join(convertersDir, file);
            const converter = require(converterPath);
            
            const id = path.basename(file, '.js');
            
            // Extrair informações do conversor
            const info = {
                id,
                name: converter.name || id,
                inputTypes: converter.supportedInputExtensions || 
                           converter.supportedExtensions || 
                           [],
                outputTypes: converter.outputExtension ? 
                            [converter.outputExtension] : 
                            [],
                requiredTools: converter.requiredTools || [],
                installed: true, // Será verificado abaixo
                notes: [],
                path: `converters/${file}`,
                hasConvert: typeof converter.convert === 'function' ||
                           typeof converter.convertMPPtoXML === 'function' ||
                           typeof converter.convertExcelToCsv === 'function' ||
                           typeof converter.convertJsonToCsv === 'function' ||
                           typeof converter.convertZipToXml === 'function' ||
                           typeof converter.convertXmlToMpp === 'function'
            };

            // Verificar ferramentas necessárias
            if (info.requiredTools.length > 0) {
                const missingTools = [];
                for (const tool of info.requiredTools) {
                    const check = await checkToolInstalled(tool);
                    if (!check.installed) {
                        missingTools.push(tool);
                    }
                }
                if (missingTools.length > 0) {
                    info.installed = false;
                    info.notes.push(`Missing tools: ${missingTools.join(', ')}`);
                }
            }

            // Adicionar notas úteis
            if (!info.hasConvert) {
                info.notes.push('No convert function exported');
            }
            if (info.inputTypes.length === 0) {
                info.notes.push('Input types not specified');
            }

            converters.push(info);
        } catch (error) {
            // Conversor com erro de carregamento
            converters.push({
                id: path.basename(file, '.js'),
                name: path.basename(file, '.js'),
                inputTypes: [],
                outputTypes: [],
                requiredTools: [],
                installed: false,
                notes: [`Load error: ${error.message}`],
                path: `converters/${file}`,
                hasConvert: false
            });
        }
    }

    // Atualizar cache
    convertersCache = converters;
    cacheTimestamp = now;

    return converters;
}

/**
 * GET /api/v1/converters
 * Lista todos os conversores disponíveis
 */
router.get('/', async (req, res) => {
    try {
        const converters = await loadConverters();
        
        // Filtrar por status se solicitado
        const { status, installed } = req.query;
        
        let filtered = converters;
        
        if (installed !== undefined) {
            const isInstalled = installed === 'true';
            filtered = filtered.filter(c => c.installed === isInstalled);
        }
        
        if (status === 'ready') {
            filtered = filtered.filter(c => c.installed && c.hasConvert);
        }

        res.json({
            success: true,
            count: filtered.length,
            converters: filtered,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error loading converters:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load converters',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/converters/:id
 * Detalhes de um conversor específico
 */
router.get('/:id', async (req, res) => {
    try {
        const converters = await loadConverters();
        const converter = converters.find(c => c.id === req.params.id);
        
        if (!converter) {
            return res.status(404).json({
                success: false,
                error: 'Converter not found',
                availableConverters: converters.map(c => c.id)
            });
        }

        res.json({
            success: true,
            converter,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get converter details',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/converters/supported/inputs
 * Lista todos os tipos de entrada suportados
 */
router.get('/supported/inputs', async (req, res) => {
    try {
        const converters = await loadConverters();
        
        const inputTypes = new Set();
        converters.forEach(c => {
            c.inputTypes.forEach(t => inputTypes.add(t));
        });

        res.json({
            success: true,
            inputTypes: Array.from(inputTypes).sort(),
            count: inputTypes.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/converters/supported/outputs
 * Lista todos os tipos de saída suportados
 */
router.get('/supported/outputs', async (req, res) => {
    try {
        const converters = await loadConverters();
        
        const outputTypes = new Set();
        converters.forEach(c => {
            c.outputTypes.forEach(t => outputTypes.add(t));
        });

        res.json({
            success: true,
            outputTypes: Array.from(outputTypes).sort(),
            count: outputTypes.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Exportar função de carregamento para uso em outros módulos
router.loadConverters = loadConverters;

module.exports = router;
