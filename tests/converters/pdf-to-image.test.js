/**
 * Test: PDF to Image Converter (dry-run)
 */
const path = require('path');
const fs = require('fs').promises;
const converter = require('../../converters/pdfToImage');

const tmpDir = path.join(__dirname, '..', 'tmp', 'pdf-to-image-test');
const fixturesDir = path.join(__dirname, 'fixtures');
const samplePdf = path.join(fixturesDir, 'sample.pdf');

async function setup() {
    // Ativar dry-run
    process.env.CONVERTER_DRY_RUN = '1';
    
    // Criar diretórios
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.mkdir(fixturesDir, { recursive: true });
    
    // Criar PDF placeholder se não existe
    try {
        await fs.stat(samplePdf);
    } catch (e) {
        await fs.writeFile(samplePdf, '%PDF-1.4\n%placeholder for testing\n%%EOF');
    }
}

async function cleanup() {
    try {
        const files = await fs.readdir(tmpDir);
        for (const f of files) {
            await fs.unlink(path.join(tmpDir, f));
        }
        await fs.rmdir(tmpDir);
    } catch (e) {
        // Ignore
    }
    delete process.env.CONVERTER_DRY_RUN;
}

async function testGetInfo() {
    console.log('TEST: getInfo()');
    const info = converter.getInfo();
    
    const checks = [
        info.id === 'pdf-to-image',
        info.inputTypes.includes('pdf'),
        info.outputTypes.includes('png'),
        info.outputTypes.includes('jpg'),
        info.requiredTools.includes('pdftoppm')
    ];
    
    if (checks.every(c => c)) {
        console.log('  ✓ PASS: getInfo returns correct structure');
        return true;
    } else {
        console.log('  ✗ FAIL: getInfo missing required fields');
        console.log('  Info:', JSON.stringify(info, null, 2));
        return false;
    }
}

async function testConvertToDirectory() {
    console.log('TEST: convert to directory (dry-run)');
    
    const outDir = path.join(tmpDir, 'out-dir');
    const result = await converter.convert(samplePdf, outDir, { format: 'png', dpi: 150 });
    
    if (!result.success) {
        console.log('  ✗ FAIL: conversion failed');
        console.log('  Errors:', result.errors);
        return false;
    }
    
    if (!result.metadata.dryRun) {
        console.log('  ✗ FAIL: dryRun flag not set');
        return false;
    }
    
    if (result.metadata.outputs.length === 0) {
        console.log('  ✗ FAIL: no outputs generated');
        return false;
    }
    
    // Verificar se arquivos existem
    for (const p of result.metadata.outputs) {
        try {
            await fs.stat(p);
        } catch (e) {
            console.log(`  ✗ FAIL: output file not found: ${p}`);
            return false;
        }
    }
    
    console.log(`  ✓ PASS: Generated ${result.metadata.outputs.length} files`);
    console.log(`  Duration: ${result.metadata.durationMs}ms`);
    return true;
}

async function testConvertToFile() {
    console.log('TEST: convert to single file (dry-run)');
    
    const outFile = path.join(tmpDir, 'single-output.png');
    const result = await converter.convert(samplePdf, outFile, { format: 'png' });
    
    if (!result.success) {
        console.log('  ✗ FAIL: conversion failed');
        console.log('  Errors:', result.errors);
        return false;
    }
    
    try {
        await fs.stat(outFile);
        console.log('  ✓ PASS: Single file output created');
        return true;
    } catch (e) {
        console.log('  ✗ FAIL: output file not found');
        return false;
    }
}

async function testInvalidInput() {
    console.log('TEST: invalid input handling');
    
    const result = await converter.convert('/nonexistent/file.pdf', tmpDir);
    
    if (result.success) {
        console.log('  ✗ FAIL: should have failed for nonexistent input');
        return false;
    }
    
    if (result.errors.length === 0) {
        console.log('  ✗ FAIL: should have error message');
        return false;
    }
    
    console.log('  ✓ PASS: Correctly rejected invalid input');
    return true;
}

async function runTests() {
    console.log('='.repeat(50));
    console.log('PDF-TO-IMAGE CONVERTER TESTS (DRY-RUN)');
    console.log('='.repeat(50));
    console.log('');
    
    await setup();
    
    const results = [];
    
    results.push(await testGetInfo());
    results.push(await testConvertToDirectory());
    results.push(await testConvertToFile());
    results.push(await testInvalidInput());
    
    await cleanup();
    
    console.log('');
    console.log('='.repeat(50));
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    if (passed === total) {
        console.log(`✓ ALL TESTS PASSED (${passed}/${total})`);
        process.exit(0);
    } else {
        console.log(`✗ SOME TESTS FAILED (${passed}/${total})`);
        process.exit(1);
    }
}

runTests().catch(e => {
    console.error('Test error:', e);
    process.exit(1);
});
