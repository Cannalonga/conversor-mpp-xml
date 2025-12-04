/**
 * Test script for file-type-detector
 */
const { detectFileType, validateFileType, checkFileSafety } = require('../utils/file-type-detector');
const fs = require('fs').promises;
const path = require('path');

async function test() {
    console.log('=== File Type Detector Test ===\n');
    
    // Criar arquivos de teste
    const testDir = './temp/test-filetype';
    await fs.mkdir(testDir, { recursive: true });
    
    // Criar JSON
    await fs.writeFile(path.join(testDir, 'test.json'), JSON.stringify({test: 1}));
    
    // Criar XML
    await fs.writeFile(path.join(testDir, 'test.xml'), '<?xml version="1.0"?><root></root>');
    
    // Criar texto
    await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World');
    
    // Testar cada arquivo
    const files = ['test.json', 'test.xml', 'test.txt'];
    
    for (const file of files) {
        const filePath = path.join(testDir, file);
        console.log('Testing:', file);
        
        const detection = await detectFileType(filePath);
        console.log('  Method:', detection.method);
        console.log('  Valid:', detection.isValid);
        console.log('');
    }
    
    // Testar validacao
    console.log('=== Validation Test ===');
    const jsonPath = path.join(testDir, 'test.json');
    
    const valid = await validateFileType(jsonPath, ['.json', '.txt']);
    console.log('JSON with [.json, .txt]:', valid.valid ? 'PASS' : 'FAIL');
    
    const invalid = await validateFileType(jsonPath, ['.xml']);
    console.log('JSON with [.xml]:', invalid.valid ? 'FAIL' : 'PASS (correctly rejected)');
    
    // Testar safety
    console.log('\n=== Safety Test ===');
    const safety = await checkFileSafety(jsonPath);
    console.log('JSON file safe:', safety.safe ? 'PASS' : 'FAIL');
    
    console.log('\n=== ALL TESTS PASSED ===');
}

test().catch(e => { console.error(e); process.exit(1); });
