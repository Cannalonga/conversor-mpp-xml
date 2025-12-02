/**
 * Upload Validation Tests
 * Testing empty file, size limits, and MIME type detection
 */

const { validateBuffer, isValidFileSize } = require('../api/utils/upload-validator');

// Test utilities
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(description, testFn) {
    testsRun++;
    try {
        testFn();
        testsPassed++;
        console.log(`✅ PASS: ${description}`);
    } catch (error) {
        testsFailed++;
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
    }
}

function expect(value) {
    return {
        toThrow: (expectedError) => {
            if (!expectedError) throw new Error('Expected to throw');
        },
        toBe: (expected) => {
            if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`);
        },
        toBeGreaterThan: (min) => {
            if (value <= min) throw new Error(`Expected > ${min}, got ${value}`);
        },
        toBeLessThan: (max) => {
            if (value >= max) throw new Error(`Expected < ${max}, got ${value}`);
        },
        toEqual: (expected) => {
            if (JSON.stringify(value) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
            }
        }
    };
}

async function expectRejects(promise, expectedCode) {
    try {
        await promise;
        throw new Error(`Expected promise to reject with ${expectedCode}`);
    } catch (err) {
        if (err.code !== expectedCode) {
            throw new Error(`Expected code ${expectedCode}, got ${err.code}`);
        }
    }
}

// ===== TEST SUITE =====
console.log('\n📋 UPLOAD VALIDATION TEST SUITE\n');

// Test 1: Empty file should be rejected
test('rejects empty buffer', async () => {
    await expectRejects(validateBuffer(Buffer.alloc(0)), 'FILE_EMPTY');
});

// Test 2: Null/undefined should be rejected
test('rejects null/undefined buffer', async () => {
    await expectRejects(validateBuffer(null), 'FILE_EMPTY');
});

// Test 3: File size validation
test('validates file size correctly', () => {
    expect(isValidFileSize(1000)).toBe(true);
    expect(isValidFileSize(0)).toBe(false);
    expect(isValidFileSize(60 * 1024 * 1024)).toBe(false); // > 50MB
});

// Test 4: Large file rejected
test('rejects files exceeding size limit', async () => {
    const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
    await expectRejects(validateBuffer(largeBuffer), 'FILE_TOO_LARGE');
});

// Test 5: MIME type restriction works
test('rejects file with non-allowed MIME type', async () => {
    // Create a minimal PNG file (PNG header: 89 50 4E 47 0D 0A 1A 0A)
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const pngBuffer = Buffer.concat([
        pngHeader,
        Buffer.alloc(100) // Minimal PNG data
    ]);
    
    // Should fail because application/vnd.ms-project is not image/png
    await expectRejects(
        validateBuffer(pngBuffer, ['application/vnd.ms-project']),
        'INVALID_MIME'
    );
});

// Test 6: Valid file passes validation
test('accepts valid buffer with correct MIME', async () => {
    // Create a minimal PNG file
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const pngBuffer = Buffer.concat([
        pngHeader,
        Buffer.alloc(100)
    ]);
    
    // Should pass: image/png is allowed
    const result = await validateBuffer(pngBuffer, ['image/png']);
    expect(result.mime).toBe('image/png');
});

// ===== RESULTS =====
console.log('\n' + '═'.repeat(50));
console.log('TEST RESULTS');
console.log('═'.repeat(50));
console.log(`Total Tests:  ${testsRun}`);
console.log(`Passed:       ${testsPassed} ✓`);
console.log(`Failed:       ${testsFailed} ✗`);
console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(0)}%`);
console.log('═'.repeat(50) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
