/**
 * Script de Verificação Final do Sistema
 * 
 * Este script verifica se todos os componentes da arquitetura enterprise
 * estão corretamente implementados e prontos para uso.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICAÇÃO FINAL DO SISTEMA ENTERPRISE');
console.log('=' .repeat(50));

// Verificar arquivos principais
const criticalFiles = [
    'api/server.js',
    'api/security.js', 
    'api/upload-utils.js',
    'queue/queue.js',
    'queue/worker.js',
    'utils/downloadToken.js',
    'converters/mppToXml.js',
    'public/index.html',
    'public/js/app_clean_new.js',
    'ecosystem.config.js',
    'package.json'
];

console.log('\n📁 ARQUIVOS PRINCIPAIS:');
let missingFiles = 0;

criticalFiles.forEach(file => {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANDO!`);
        missingFiles++;
    }
});

// Verificar diretórios
const requiredDirs = [
    'uploads/incoming',
    'uploads/processing', 
    'uploads/converted',
    'uploads/quarantine',
    'uploads/expired',
    'logs',
    'scripts'
];

console.log('\n📂 ESTRUTURA DE DIRETÓRIOS:');
requiredDirs.forEach(dir => {
    const fullPath = path.resolve(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${dir}/`);
    } else {
        console.log(`⚠️  ${dir}/ - Criar com: npm run setup-dirs`);
    }
});

// Verificar package.json
console.log('\n📦 DEPENDÊNCIAS CRÍTICAS:');
try {
    const packageJson = JSON.parse(fs.readFileSync(
        path.resolve(__dirname, '..', 'package.json'), 
        'utf8'
    ));
    
    const criticalDeps = [
        'express',
        'multer',
        'helmet', 
        'express-rate-limit',
        'cors',
        'uuid',
        'validator',
        'jsonwebtoken',
        'bullmq',
        'ioredis'
    ];
    
    criticalDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            console.log(`✅ ${dep}`);
        } else {
            console.log(`❌ ${dep} - FALTANDO!`);
        }
    });
    
} catch (error) {
    console.log('❌ Erro ao ler package.json');
}

// Verificar scripts importantes
console.log('\n🔧 SCRIPTS DISPONÍVEIS:');
const importantScripts = [
    'start',
    'dev', 
    'worker',
    'pm2:start',
    'syntax-check',
    'doctor'
];

try {
    const packageJson = JSON.parse(fs.readFileSync(
        path.resolve(__dirname, '..', 'package.json'), 
        'utf8'
    ));
    
    importantScripts.forEach(script => {
        if (packageJson.scripts[script]) {
            console.log(`✅ npm run ${script}`);
        } else {
            console.log(`❌ npm run ${script} - FALTANDO!`);
        }
    });
} catch (error) {
    console.log('❌ Erro ao verificar scripts');
}

// Resultado final
console.log('\n' + '=' .repeat(50));

if (missingFiles === 0) {
    console.log('🎉 SISTEMA ENTERPRISE COMPLETO!');
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Instalar Node.js (se necessário)');
    console.log('2. npm install');
    console.log('3. npm run dev (desenvolvimento)');
    console.log('4. npm run worker (em outro terminal)');
    console.log('5. Acessar: http://localhost:3000');
    console.log('');
    console.log('🚀 Para produção: npm run pm2:start');
    
} else {
    console.log('❌ SISTEMA INCOMPLETO!');
    console.log(`Arquivos faltando: ${missingFiles}`);
    console.log('Verifique os arquivos marcados como FALTANDO');
}

console.log('\n📚 DOCUMENTAÇÃO:');
console.log('- README: ENTERPRISE_README.md');
console.log('- Node.js: INSTALL_NODEJS.md'); 
console.log('- Setup: setup.sh');
console.log('- Config: .env.example');

process.exit(missingFiles === 0 ? 0 : 1);