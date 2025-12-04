/**
 * Test MPP Converter Microservice Integration
 * 
 * Este script testa a comunicação entre o backend Node.js
 * e o microserviço Java MPXJ para conversão real de arquivos MPP.
 * 
 * Usage:
 *   1. Start microservice: docker run -p 8080:8080 canna/mpp-converter
 *   2. Run test: node scripts/test-mpp-microservice.js
 */

const mppConverter = require('../converters/mppConverter');
const fs = require('fs');
const path = require('path');

const TEST_TIMEOUT = 30000;

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   MPP CONVERTER MICROSERVICE - INTEGRATION TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Microservice URL: ${mppConverter.MPP_CONVERTER_URL}`);
    console.log(`Test started at: ${new Date().toISOString()}`);
    console.log('');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    };

    // ==========================================================================
    // TEST 1: Health Check
    // ==========================================================================
    console.log('TEST 1: Health Check');
    console.log('─────────────────────────────────────────────────────────────────');
    results.total++;
    
    try {
        const health = await mppConverter.checkHealth();
        
        if (health.healthy) {
            console.log('✅ PASS: Microservice is healthy');
            console.log(`   Details: ${JSON.stringify(health.details)}`);
            results.passed++;
        } else {
            console.log('❌ FAIL: Microservice is not healthy');
            console.log(`   Details: ${JSON.stringify(health.details)}`);
            console.log('');
            console.log('⚠️  IMPORTANT: Microservice not running!');
            console.log('   Start it with: docker run -p 8080:8080 canna/mpp-converter');
            console.log('   Or build manually:');
            console.log('   cd microservices/mpp-converter && mvn clean package');
            console.log('   java -jar target/mpp-converter-1.0.0.jar');
            console.log('');
            results.failed++;
            
            // Se microserviço não está rodando, pular outros testes
            console.log('Skipping remaining tests...');
            printSummary(results);
            return;
        }
    } catch (error) {
        console.log('❌ FAIL: Health check error');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        printSummary(results);
        return;
    }
    console.log('');

    // ==========================================================================
    // TEST 2: File Format Detection
    // ==========================================================================
    console.log('TEST 2: File Format Detection');
    console.log('─────────────────────────────────────────────────────────────────');
    results.total++;

    const testCases = [
        { filename: 'project.mpp', expected: true },
        { filename: 'project.MPP', expected: true },
        { filename: 'project.mpx', expected: true },
        { filename: 'project.mpt', expected: true },
        { filename: 'project.xml', expected: false },
        { filename: 'project.pdf', expected: false },
    ];

    let formatTestPassed = true;
    for (const tc of testCases) {
        const result = mppConverter.isSupportedFormat(tc.filename);
        const status = result === tc.expected ? '✓' : '✗';
        if (result !== tc.expected) formatTestPassed = false;
        console.log(`   ${status} ${tc.filename} → ${result} (expected: ${tc.expected})`);
    }

    if (formatTestPassed) {
        console.log('✅ PASS: Format detection working correctly');
        results.passed++;
    } else {
        console.log('❌ FAIL: Format detection has issues');
        results.failed++;
    }
    console.log('');

    // ==========================================================================
    // TEST 3: Conversion with Sample File (if exists)
    // ==========================================================================
    console.log('TEST 3: Real MPP Conversion');
    console.log('─────────────────────────────────────────────────────────────────');
    
    // Look for sample MPP files
    const sampleDirs = [
        './scripts/samples',
        './uploads/incoming',
        './test/fixtures',
        '.'
    ];

    let sampleMppPath = null;
    for (const dir of sampleDirs) {
        const fullDir = path.resolve(dir);
        if (fs.existsSync(fullDir)) {
            const files = fs.readdirSync(fullDir);
            const mppFile = files.find(f => f.toLowerCase().endsWith('.mpp'));
            if (mppFile) {
                sampleMppPath = path.join(fullDir, mppFile);
                break;
            }
        }
    }

    if (!sampleMppPath) {
        console.log('⏭️  SKIP: No sample .mpp file found');
        console.log('   Place a .mpp file in ./scripts/samples/ to test conversion');
        results.skipped++;
        results.total++;
    } else {
        results.total++;
        console.log(`   Using sample file: ${sampleMppPath}`);
        
        const outputPath = path.resolve('./uploads/converted', `test_conversion_${Date.now()}.xml`);
        
        try {
            const result = await mppConverter.convertMppToXml(sampleMppPath, outputPath);
            
            if (result.success) {
                console.log('✅ PASS: Conversion successful!');
                console.log(`   Output: ${result.outputPath}`);
                console.log(`   Size: ${result.outputSize} bytes`);
                console.log(`   Metadata: ${JSON.stringify(result.metadata)}`);
                
                // Verify output file exists and has valid XML
                if (fs.existsSync(outputPath)) {
                    const content = fs.readFileSync(outputPath, 'utf-8');
                    if (content.includes('<?xml') && content.includes('<Project')) {
                        console.log('   ✓ Output is valid MS Project XML');
                    } else {
                        console.log('   ⚠️  Output may not be valid MS Project XML');
                    }
                }
                
                results.passed++;
            } else {
                console.log('❌ FAIL: Conversion failed');
                console.log(`   Error: ${result.error}`);
                results.failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Conversion threw error');
            console.log(`   Error: ${error.message}`);
            results.failed++;
        }
    }
    console.log('');

    // ==========================================================================
    // TEST 4: Project Info Extraction
    // ==========================================================================
    if (sampleMppPath) {
        console.log('TEST 4: Project Info Extraction');
        console.log('─────────────────────────────────────────────────────────────────');
        results.total++;

        try {
            const result = await mppConverter.getProjectInfo(sampleMppPath);
            
            if (result.success) {
                console.log('✅ PASS: Info extraction successful!');
                console.log(`   Project Name: ${result.info.projectName || 'N/A'}`);
                console.log(`   Tasks: ${result.info.taskCount || 'N/A'}`);
                console.log(`   Resources: ${result.info.resourceCount || 'N/A'}`);
                console.log(`   Start Date: ${result.info.startDate || 'N/A'}`);
                console.log(`   Finish Date: ${result.info.finishDate || 'N/A'}`);
                results.passed++;
            } else {
                console.log('❌ FAIL: Info extraction failed');
                console.log(`   Error: ${result.error}`);
                results.failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Info extraction threw error');
            console.log(`   Error: ${error.message}`);
            results.failed++;
        }
        console.log('');
    }

    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    printSummary(results);
}

function printSummary(results) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Total:   ${results.total}`);
    console.log(`   Passed:  ${results.passed} ✅`);
    console.log(`   Failed:  ${results.failed} ❌`);
    console.log(`   Skipped: ${results.skipped} ⏭️`);
    console.log('');
    
    if (results.failed === 0 && results.total > 0) {
        console.log('   🎉 All tests passed!');
    } else if (results.failed > 0) {
        console.log('   ⚠️  Some tests failed. Check output above.');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
