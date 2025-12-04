/**
 * 🧪 TESTE REAL DE TODOS OS CONVERSORES
 * 
 * Executa cada conversor SEM dry-run para validar funcionamento real.
 * Gera relatório detalhado com sucesso/falha de cada um.
 * 
 * USO:
 *   $env:CONVERTER_DRY_RUN="" ; node scripts/test-all-converters.js
 * 
 * IMPORTANTE: Certifique-se de que CONVERTER_DRY_RUN NÃO está definido
 */

const fs = require('fs');
const path = require('path');

// Carregar converters
const convertersDir = path.join(__dirname, '..', 'converters');
const converters = require(convertersDir);

// Diretórios
const sampleDir = path.join(__dirname, 'samples');
const outputRoot = path.join(__dirname, 'outputs');

// Mapeamento de conversores para arquivos de sample
const sampleMapping = {
    // Imagem
    'png-to-jpg': 'sample.png',
    'jpg-to-webp': 'sample.jpg',
    'image-to-pdf': 'sample.png',
    'image-optimize-whatsapp': 'sample.jpg',
    
    // Vídeo
    'video-to-mp4': 'sample.mp4',
    'video-to-social': 'sample.mp4',
    'video-compress-whatsapp': 'sample.mp4',
    
    // Documento
    'pdf-to-image': 'sample.pdf',
    'pdf-compress': 'sample.pdf',
    'docx-to-pdf': 'sample.docx',
    
    // Outros existentes
    'excel-to-csv': 'sample.xlsx',
    'json-to-csv': 'sample.json',
    'mpp-to-xml': 'sample.mpp',
    'xml-to-mpp': 'sample.xml',
    'zip-to-xml': 'sample.zip',
    
    // Genéricos
    'ffmpeg-converter': 'sample.mp4',
    'libreoffice-converter': 'sample.docx',
    'pandoc-converter': 'sample.md',
    'template-converter': 'sample.txt'
};

// Função para encontrar sample apropriado
function findSampleFile(converter) {
    // Primeiro tenta pelo mapeamento
    if (sampleMapping[converter.id]) {
        const mapped = path.join(sampleDir, sampleMapping[converter.id]);
        if (fs.existsSync(mapped)) return mapped;
    }
    
    // Depois tenta pelo primeiro inputType
    if (converter.inputTypes && converter.inputTypes.length > 0) {
        for (const ext of converter.inputTypes) {
            const sample = path.join(sampleDir, `sample.${ext}`);
            if (fs.existsSync(sample)) return sample;
        }
    }
    
    // Tenta pelas extensões suportadas
    if (converter.supportedInputExtensions) {
        for (const ext of converter.supportedInputExtensions) {
            const cleanExt = ext.replace('.', '');
            const sample = path.join(sampleDir, `sample.${cleanExt}`);
            if (fs.existsSync(sample)) return sample;
        }
    }
    
    return null;
}

// Função para determinar output path
function getOutputPath(converter, outDir, converterId) {
    // Pegar extensão do primeiro outputType ou usar outputExtension
    let ext = '.out';
    
    // Conversores específicos que precisam de extensão correta
    const converterExtensionMap = {
        'libreoffice-converter': '.pdf',
        'ffmpeg-converter': '.mp4',
        'pandoc-converter': '.html',
        'docx-to-pdf': '.pdf',
        'pdf-compress': '.pdf',
        'pdf-to-image': '.png',
        'video-to-mp4': '.mp4',
        'video-to-social': '.mp4',
        'video-compress-whatsapp': '.mp4'
    };
    
    if (converterExtensionMap[converterId]) {
        ext = converterExtensionMap[converterId];
    } else if (converter.outputExtension) {
        ext = converter.outputExtension.startsWith('.') ? converter.outputExtension : `.${converter.outputExtension}`;
    } else if (converter.outputTypes && converter.outputTypes.length > 0 && converter.outputTypes[0] !== '*') {
        ext = `.${converter.outputTypes[0]}`;
    }
    
    return path.join(outDir, `output${ext}`);
}

async function testConverter(id, converter) {
    const result = {
        id,
        name: converter.name || id,
        success: false,
        errors: [],
        warnings: [],
        metadata: {},
        inputFile: null,
        outputFiles: [],
        duration: 0,
        dependenciesOk: false
    };
    
    const startTime = Date.now();
    
    try {
        // 1. Verificar dependências
        console.log(`   📋 Checking dependencies...`);
        if (typeof converter.checkDependencies === 'function') {
            const deps = await converter.checkDependencies();
            result.dependenciesOk = deps.installed;
            if (!deps.installed) {
                result.errors.push(`Dependencies missing: ${deps.message}`);
                console.log(`   ❌ Dependencies: ${deps.message}`);
                return result;
            }
            console.log(`   ✅ Dependencies OK: ${deps.tool || 'all'}`);
        } else {
            result.dependenciesOk = true;
            result.warnings.push('No checkDependencies function');
        }
        
        // 2. Encontrar arquivo de sample
        const inputFile = findSampleFile(converter);
        if (!inputFile) {
            result.errors.push(`No sample file found for inputTypes: ${converter.inputTypes?.join(', ')}`);
            console.log(`   ❌ No sample file available`);
            return result;
        }
        result.inputFile = inputFile;
        console.log(`   📂 Input: ${path.basename(inputFile)}`);
        
        // 3. Criar diretório de output
        const outDir = path.join(outputRoot, id);
        await fs.promises.mkdir(outDir, { recursive: true });
        
        // 4. Determinar output path
        const outputPath = getOutputPath(converter, outDir, id);
        console.log(`   📂 Output: ${outputPath}`);
        
        // 5. EXECUTAR CONVERSÃO
        console.log(`   ⚡ Converting...`);
        const convResult = await converter.convert(inputFile, outputPath, { timeout: 60000 });
        
        result.metadata = convResult.metadata || {};
        result.duration = Date.now() - startTime;
        
        if (!convResult.success) {
            result.errors = convResult.errors || ['Conversion failed'];
            console.log(`   ❌ Conversion failed: ${result.errors.join(', ')}`);
            return result;
        }
        
        // 6. Verificar arquivos de output
        console.log(`   🔍 Checking outputs...`);
        
        // Verificar se outputPath existe
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            result.outputFiles.push({
                path: outputPath,
                size: stats.size,
                isFile: stats.isFile()
            });
        }
        
        // Verificar também metadata.outputs se existir
        if (convResult.metadata?.outputs) {
            for (const out of convResult.metadata.outputs) {
                if (fs.existsSync(out) && !result.outputFiles.find(f => f.path === out)) {
                    const stats = fs.statSync(out);
                    result.outputFiles.push({
                        path: out,
                        size: stats.size,
                        isFile: stats.isFile()
                    });
                }
            }
        }
        
        // Verificar diretório de output por arquivos gerados
        const outFiles = fs.readdirSync(outDir);
        for (const f of outFiles) {
            const fullPath = path.join(outDir, f);
            if (!result.outputFiles.find(o => o.path === fullPath)) {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    result.outputFiles.push({
                        path: fullPath,
                        size: stats.size,
                        isFile: true
                    });
                }
            }
        }
        
        if (result.outputFiles.length === 0) {
            result.errors.push('No output files produced');
            console.log(`   ❌ No output files found`);
            return result;
        }
        
        // Verificar se outputs têm conteúdo
        const emptyFiles = result.outputFiles.filter(f => f.size === 0);
        if (emptyFiles.length > 0) {
            result.warnings.push(`${emptyFiles.length} empty output files`);
        }
        
        result.success = true;
        console.log(`   ✅ SUCCESS: ${result.outputFiles.length} files, ${result.outputFiles.reduce((a, f) => a + f.size, 0)} bytes total`);
        
    } catch (err) {
        result.errors.push(String(err));
        result.duration = Date.now() - startTime;
        console.log(`   ❌ EXCEPTION: ${err.message}`);
    }
    
    return result;
}

async function run() {
    console.log('\n' + '═'.repeat(70));
    console.log('  🧪 REAL CONVERTER VALIDATION TEST');
    console.log('  Mode: REAL (no dry-run)');
    console.log('  Date:', new Date().toISOString());
    console.log('═'.repeat(70) + '\n');
    
    // Verificar se dry-run está desativado
    if (process.env.CONVERTER_DRY_RUN === '1') {
        console.log('⚠️  WARNING: CONVERTER_DRY_RUN=1 is set!');
        console.log('   To test for real, run: $env:CONVERTER_DRY_RUN="" ; node scripts/test-all-converters.js\n');
    }
    
    // Criar diretórios
    await fs.promises.mkdir(sampleDir, { recursive: true });
    await fs.promises.mkdir(outputRoot, { recursive: true });
    
    // Listar samples disponíveis
    let availableSamples = [];
    try {
        availableSamples = fs.readdirSync(sampleDir);
    } catch {}
    
    console.log(`📁 Samples directory: ${sampleDir}`);
    console.log(`   Available: ${availableSamples.length > 0 ? availableSamples.join(', ') : '(none - create sample files!)'}\n`);
    
    if (availableSamples.length === 0) {
        console.log('❌ No sample files found!');
        console.log('   Create sample files in scripts/samples/');
        console.log('   Needed: sample.png, sample.jpg, sample.pdf, sample.docx, sample.mp4, etc.\n');
        
        // Criar README com instruções
        const readmePath = path.join(sampleDir, 'README.md');
        await fs.promises.writeFile(readmePath, `# Sample Files Needed

Create these files to test converters:

## Image
- sample.png (any small PNG)
- sample.jpg (any small JPG)

## Video
- sample.mp4 (short video, 1-5 seconds)

## Document
- sample.pdf (any small PDF)
- sample.docx (any Word document)
- sample.xlsx (any Excel file)
- sample.txt (any text file)

## Project-specific
- sample.mpp (Microsoft Project file)
- sample.xml (XML file)
- sample.json (JSON file)
- sample.zip (ZIP with XML inside)
`);
        console.log(`   Created ${readmePath} with instructions.\n`);
    }
    
    // Carregar lista de conversores
    const converterIds = Object.keys(converters);
    console.log(`📦 Found ${converterIds.length} converters to test\n`);
    
    const results = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const id of converterIds) {
        const converter = converters[id];
        console.log(`\n🔄 Testing: ${id}`);
        console.log('─'.repeat(50));
        
        const result = await testConverter(id, converter);
        results.push(result);
        
        if (result.success) passed++;
        else if (result.errors.some(e => e.includes('No sample file'))) skipped++;
        else failed++;
    }
    
    // Gerar relatório
    console.log('\n' + '═'.repeat(70));
    console.log('  📊 VALIDATION REPORT');
    console.log('═'.repeat(70) + '\n');
    
    console.log(`Total: ${converterIds.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped (no sample): ${skipped}\n`);
    
    // Tabela de resultados
    console.log('─'.repeat(70));
    console.log('| ID'.padEnd(30) + '| Status'.padEnd(12) + '| Output Files'.padEnd(15) + '| Duration |');
    console.log('─'.repeat(70));
    
    for (const r of results) {
        const status = r.success ? '✅ PASS' : (r.errors.some(e => e.includes('No sample')) ? '⏭️ SKIP' : '❌ FAIL');
        const files = r.outputFiles.length > 0 ? `${r.outputFiles.length} files` : '-';
        const duration = r.duration ? `${r.duration}ms` : '-';
        console.log(`| ${r.id.padEnd(28)}| ${status.padEnd(10)}| ${files.padEnd(13)}| ${duration.padEnd(8)} |`);
    }
    console.log('─'.repeat(70));
    
    // Listar falhas detalhadas
    const failures = results.filter(r => !r.success && !r.errors.some(e => e.includes('No sample')));
    if (failures.length > 0) {
        console.log('\n❌ FAILURES DETAIL:\n');
        for (const f of failures) {
            console.log(`  ${f.id}:`);
            for (const err of f.errors) {
                console.log(`    - ${err}`);
            }
        }
    }
    
    // Salvar relatório JSON
    const reportPath = path.join(outputRoot, 'report.json');
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: converterIds.length,
            passed,
            failed,
            skipped
        },
        dryRunMode: process.env.CONVERTER_DRY_RUN === '1',
        results
    };
    
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
