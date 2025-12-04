#!/usr/bin/env node
/**
 * 🔍 AUDIT SCRIPT - Converters Analysis
 * 
 * Este script audita todos os conversores do projeto e gera um relatório JSON
 * com informações sobre implementação, testes e status.
 * 
 * Uso: npm run audit:converters
 * 
 * Saída: ./reports/converters-audit-YYYYMMDD-HHMMSS.json
 */

const fs = require('fs');
const path = require('path');

// Configuração
const MIN_CONVERTERS = parseInt(process.env.MIN_CONVERTERS || '5', 10);
const CONVERTERS_DIR = path.join(__dirname, '../converters');
const TESTS_DIR = path.join(__dirname, '../tests/converters');
const REPORTS_DIR = path.join(__dirname, '../reports');

// Cores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, prefix, message) {
    console.log(`${colors[color]}${prefix}${colors.reset} ${message}`);
}

/**
 * Analisa um arquivo de conversor para detectar exports e funcionalidades
 */
function analyzeConverterFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
        hasConvertFunction: false,
        hasClassExport: false,
        hasRequiredTools: false,
        exportedMethods: [],
        requiredTools: [],
        supportedExtensions: [],
        linesOfCode: content.split('\n').length,
        hasDryRunMode: false,
        hasErrorHandling: false,
        hasLogging: false
    };

    // Detectar função convert
    if (content.match(/async\s+(function\s+)?convert\s*\(|convert\s*=\s*async|convertMPPtoXML|convertExcelToCsv|convertJsonToCsv|convertZipToXml|convertXmlToMpp/i)) {
        analysis.hasConvertFunction = true;
    }

    // Detectar classe exportada
    if (content.match(/class\s+\w+Converter|module\.exports\s*=\s*\w+Converter|module\.exports\s*=\s*new/)) {
        analysis.hasClassExport = true;
    }

    // Detectar requiredTools
    const toolsMatch = content.match(/requiredTools\s*[=:]\s*\[(.*?)\]/s);
    if (toolsMatch) {
        analysis.hasRequiredTools = true;
        analysis.requiredTools = toolsMatch[1].match(/'[^']+'/g)?.map(t => t.replace(/'/g, '')) || [];
    }

    // Detectar extensões suportadas
    const extMatch = content.match(/supportedExtensions\s*[=:]\s*\[(.*?)\]/s);
    if (extMatch) {
        analysis.supportedExtensions = extMatch[1].match(/'\.[^']+'/g)?.map(e => e.replace(/'/g, '')) || [];
    }

    // Detectar métodos exportados
    const methodMatches = content.matchAll(/async\s+(\w+)\s*\([^)]*\)\s*{/g);
    for (const match of methodMatches) {
        analysis.exportedMethods.push(match[1]);
    }

    // Detectar dry-run mode
    if (content.match(/DRY_RUN|dryRun|dry-run|simulate/i)) {
        analysis.hasDryRunMode = true;
    }

    // Detectar error handling
    if (content.match(/try\s*{[\s\S]*catch\s*\(/)) {
        analysis.hasErrorHandling = true;
    }

    // Detectar logging
    if (content.match(/console\.(log|info|warn|error)|logger\./)) {
        analysis.hasLogging = true;
    }

    return analysis;
}

/**
 * Verifica se existe teste para um conversor
 */
function checkTestExists(converterName) {
    const possibleTestFiles = [
        path.join(TESTS_DIR, `${converterName}.test.js`),
        path.join(TESTS_DIR, `${converterName}.spec.js`),
        path.join(__dirname, '../tests', `${converterName}.test.js`),
        path.join(__dirname, '../scripts', `test-all-converters.js`)
    ];

    for (const testFile of possibleTestFiles) {
        if (fs.existsSync(testFile)) {
            // Verificar se o teste menciona este conversor
            const content = fs.readFileSync(testFile, 'utf8');
            if (content.toLowerCase().includes(converterName.toLowerCase())) {
                return { exists: true, path: testFile };
            }
        }
    }

    return { exists: false, path: null };
}

/**
 * Tenta carregar e testar o conversor
 */
function testConverterLoad(filePath) {
    try {
        const converter = require(filePath);
        return {
            loadable: true,
            type: typeof converter,
            isClass: typeof converter === 'function' && converter.toString().startsWith('class'),
            isInstance: typeof converter === 'object' && converter !== null,
            methods: Object.keys(converter).filter(k => typeof converter[k] === 'function')
        };
    } catch (error) {
        return {
            loadable: false,
            error: error.message
        };
    }
}

/**
 * Gera timestamp para nome do arquivo
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:-]/g, '').replace('T', '-').split('.')[0];
}

/**
 * Main audit function
 */
async function runAudit() {
    console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║  🔍 CONVERTERS AUDIT SCRIPT                                  ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

    // Criar diretório de reports se não existir
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
        log('green', '📁', `Created reports directory: ${REPORTS_DIR}`);
    }

    // Verificar se diretório de conversores existe
    if (!fs.existsSync(CONVERTERS_DIR)) {
        log('red', '❌', `Converters directory not found: ${CONVERTERS_DIR}`);
        process.exit(1);
    }

    // Listar arquivos de conversores
    const files = fs.readdirSync(CONVERTERS_DIR)
        .filter(f => f.endsWith('.js') && !f.startsWith('_') && !f.includes('test'));

    log('blue', '📊', `Found ${files.length} converter files`);
    console.log('');

    const report = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            minConvertersThreshold: MIN_CONVERTERS
        },
        summary: {
            totalConverters: 0,
            withConvertFunction: 0,
            withTests: 0,
            withDryRun: 0,
            withErrorHandling: 0,
            fullyImplemented: 0,
            totalLinesOfCode: 0
        },
        converters: [],
        recommendations: []
    };

    // Analisar cada conversor
    for (const file of files) {
        const filePath = path.join(CONVERTERS_DIR, file);
        const name = path.basename(file, '.js');

        log('cyan', '🔄', `Analyzing: ${file}`);

        const analysis = analyzeConverterFile(filePath);
        const testInfo = checkTestExists(name);
        const loadTest = testConverterLoad(filePath);

        const converterReport = {
            name,
            path: `converters/${file}`,
            hasExportedConvert: analysis.hasConvertFunction || analysis.hasClassExport,
            hasTest: testInfo.exists,
            testPath: testInfo.path,
            analysis: {
                ...analysis,
                ...loadTest
            },
            status: 'unknown',
            notes: []
        };

        // Determinar status
        if (analysis.hasConvertFunction || analysis.hasClassExport) {
            if (testInfo.exists && analysis.hasErrorHandling) {
                converterReport.status = 'fully-implemented';
                report.summary.fullyImplemented++;
            } else if (testInfo.exists || analysis.hasErrorHandling) {
                converterReport.status = 'partially-implemented';
            } else {
                converterReport.status = 'basic-implementation';
            }
            report.summary.withConvertFunction++;
        } else {
            converterReport.status = 'stub-only';
            converterReport.notes.push('Missing convert function export');
        }

        // Adicionar notas
        if (!testInfo.exists) {
            converterReport.notes.push('No dedicated test file found');
        }
        if (!analysis.hasDryRunMode) {
            converterReport.notes.push('No dry-run mode implemented');
        }
        if (!analysis.hasErrorHandling) {
            converterReport.notes.push('Missing try-catch error handling');
        }
        if (analysis.supportedExtensions.length > 0) {
            converterReport.notes.push(`Supports: ${analysis.supportedExtensions.join(', ')}`);
        }

        // Contadores
        if (testInfo.exists) report.summary.withTests++;
        if (analysis.hasDryRunMode) report.summary.withDryRun++;
        if (analysis.hasErrorHandling) report.summary.withErrorHandling++;
        report.summary.totalLinesOfCode += analysis.linesOfCode;

        report.converters.push(converterReport);

        // Output visual
        const statusIcon = {
            'fully-implemented': '✅',
            'partially-implemented': '🔶',
            'basic-implementation': '⚠️',
            'stub-only': '❌'
        }[converterReport.status];

        console.log(`   ${statusIcon} ${name}`);
        console.log(`      Convert: ${analysis.hasConvertFunction ? '✓' : '✗'} | Test: ${testInfo.exists ? '✓' : '✗'} | Errors: ${analysis.hasErrorHandling ? '✓' : '✗'} | LOC: ${analysis.linesOfCode}`);
    }

    report.summary.totalConverters = files.length;

    // Gerar recomendações
    if (report.summary.withTests < report.summary.totalConverters) {
        report.recommendations.push({
            priority: 'high',
            message: `Add tests for ${report.summary.totalConverters - report.summary.withTests} converters without tests`
        });
    }
    if (report.summary.withDryRun < report.summary.totalConverters) {
        report.recommendations.push({
            priority: 'medium',
            message: 'Implement dry-run mode for testing without external tools'
        });
    }
    if (report.summary.withErrorHandling < report.summary.totalConverters) {
        report.recommendations.push({
            priority: 'high',
            message: 'Add proper error handling (try-catch) to all converters'
        });
    }

    // Salvar relatório
    const reportFileName = `converters-audit-${getTimestamp()}.json`;
    const reportPath = path.join(REPORTS_DIR, reportFileName);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Output summary
    console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║  📊 AUDIT SUMMARY                                            ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Total Converters:${colors.reset}        ${report.summary.totalConverters}
${colors.bright}With Convert Function:${colors.reset}   ${report.summary.withConvertFunction}
${colors.bright}With Tests:${colors.reset}              ${report.summary.withTests}
${colors.bright}With Error Handling:${colors.reset}     ${report.summary.withErrorHandling}
${colors.bright}Fully Implemented:${colors.reset}       ${report.summary.fullyImplemented}
${colors.bright}Total Lines of Code:${colors.reset}     ${report.summary.totalLinesOfCode}

${colors.green}📄 Report saved to:${colors.reset} ${reportPath}
`);

    // Verificar threshold
    if (report.summary.totalConverters < MIN_CONVERTERS) {
        log('red', '❌', `FAILED: Only ${report.summary.totalConverters} converters found (minimum: ${MIN_CONVERTERS})`);
        log('yellow', '💡', `Set MIN_CONVERTERS env var to change threshold`);
        process.exit(1);
    }

    log('green', '✅', `PASSED: ${report.summary.totalConverters} converters found (minimum: ${MIN_CONVERTERS})`);
    
    // Listar converters por status
    console.log(`
${colors.cyan}📋 CONVERTERS BY STATUS:${colors.reset}
`);
    
    const byStatus = {};
    report.converters.forEach(c => {
        if (!byStatus[c.status]) byStatus[c.status] = [];
        byStatus[c.status].push(c.name);
    });

    Object.entries(byStatus).forEach(([status, names]) => {
        const icon = {
            'fully-implemented': '✅',
            'partially-implemented': '🔶',
            'basic-implementation': '⚠️',
            'stub-only': '❌'
        }[status];
        console.log(`${icon} ${status}: ${names.join(', ')}`);
    });

    return report;
}

// Executar
runAudit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
