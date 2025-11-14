/**
 * Script de Verificação de Sintaxe JavaScript
 * 
 * Este script verifica se todos os arquivos JavaScript do projeto
 * possuem sintaxe válida antes do deployment.
 */

const fs = require('fs');
const path = require('path');

// Lista de arquivos para verificar
const filesToCheck = [
    '../api/server.js',
    '../api/security.js',
    '../api/upload-utils.js',
    '../queue/queue.js',
    '../queue/worker.js',
    '../utils/downloadToken.js',
    '../converters/mppToXml.js',
    '../public/js/app_clean_new.js'
];

console.log('🔍 Iniciando verificação de sintaxe...\n');

let hasErrors = false;

filesToCheck.forEach(filePath => {
    try {
        const fullPath = path.resolve(__dirname, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Tentar fazer parse do código JavaScript
        new Function(content);
        
        console.log(`✅ ${path.basename(filePath)} - Sintaxe válida`);
    } catch (error) {
        console.log(`❌ ${path.basename(filePath)} - Erro de sintaxe:`);
        console.log(`   ${error.message}\n`);
        hasErrors = true;
    }
});

console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Encontrados erros de sintaxe. Corrija antes de prosseguir.');
    process.exit(1);
} else {
    console.log('✅ Todos os arquivos possuem sintaxe válida!');
    process.exit(0);
}