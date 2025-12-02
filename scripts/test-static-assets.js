#!/usr/bin/env node

/**
 * Test Script: Validate Static Assets Serving
 * Verifica se CSS, JS e assets estão sendo servidos corretamente
 * e não retornando index.html como fallback
 */

const http = require('http');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TESTS = [
    {
        name: 'CSS Main',
        path: '/css/style-v2.css',
        expectedContentType: 'text/css',
        shouldNotBe: 'text/html'
    },
    {
        name: 'CSS Style',
        path: '/css/style.css',
        expectedContentType: 'text/css',
        shouldNotBe: 'text/html'
    },
    {
        name: 'JavaScript',
        path: '/js/app_clean_new.js',
        expectedContentType: 'application/javascript',
        shouldNotBe: 'text/html'
    },
    {
        name: 'Index HTML',
        path: '/',
        expectedContentType: 'text/html',
        shouldNotBe: null
    },
    {
        name: 'Index HTML (explicit)',
        path: '/index.html',
        expectedContentType: 'text/html',
        shouldNotBe: null
    },
    {
        name: 'Non-existent Asset',
        path: '/css/nonexistent.css',
        expectedStatusCode: 404
    },
    {
        name: 'Non-existent JS',
        path: '/js/nonexistent.js',
        expectedStatusCode: 404
    },
    {
        name: 'Health Check',
        path: '/health',
        expectedStatusCode: 200
    }
];

let passed = 0;
let failed = 0;

function testAsset(test) {
    return new Promise((resolve) => {
        const url = new URL(BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: test.path,
            method: 'HEAD',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let statusOk = true;
            let contentTypeOk = true;
            let errors = [];

            // Verificar status code
            if (test.expectedStatusCode && res.statusCode !== test.expectedStatusCode) {
                statusOk = false;
                errors.push(`Status: ${res.statusCode} (esperado: ${test.expectedStatusCode})`);
            }

            // Verificar Content-Type
            if (test.expectedContentType) {
                const contentType = res.headers['content-type'] || '';
                if (!contentType.includes(test.expectedContentType)) {
                    contentTypeOk = false;
                    errors.push(`Content-Type: ${contentType} (esperado: ${test.expectedContentType})`);
                }
                
                if (test.shouldNotBe && contentType.includes(test.shouldNotBe)) {
                    contentTypeOk = false;
                    errors.push(`❌ ERRO CRÍTICO: Retornando ${test.shouldNotBe} em vez de ${test.expectedContentType}`);
                }
            }

            const success = statusOk && contentTypeOk && errors.length === 0;
            
            if (success) {
                console.log(`  ✅ ${test.name}`);
                passed++;
            } else {
                console.log(`  ❌ ${test.name}`);
                errors.forEach(err => console.log(`     └─ ${err}`));
                failed++;
            }

            resolve();
        });

        req.on('error', (err) => {
            console.log(`  ❌ ${test.name}`);
            console.log(`     └─ Erro de conexão: ${err.message}`);
            failed++;
            resolve();
        });

        req.on('timeout', () => {
            console.log(`  ❌ ${test.name}`);
            console.log(`     └─ Timeout (5s)`);
            req.destroy();
            failed++;
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 STATIC ASSETS TEST SUITE');
    console.log('='.repeat(70));
    console.log(`\n🔗 Testing: ${BASE_URL}\n`);

    for (const test of TESTS) {
        await testAsset(test);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`📊 RESULTADOS: ${passed} ✅ | ${failed} ❌`);
    console.log('='.repeat(70));

    if (failed === 0) {
        console.log('\n✨ Todos os testes passaram! Assets estão sendo servidos corretamente.\n');
        process.exit(0);
    } else {
        console.log(`\n⚠️  ${failed} teste(s) falharam.\n`);
        process.exit(1);
    }
}

runTests();
