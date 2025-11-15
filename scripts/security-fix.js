#!/usr/bin/env node
/**
 * Security Fix Automation Script
 * Corrige automaticamente as vulnerabilidades de segurança detectadas na auditoria
 */

const fs = require('fs');
const path = require('path');

class SecurityFixer {
    constructor() {
        this.fixesApplied = [];
        this.errors = [];
    }

    // Executa todas as correções de segurança
    async runAllFixes() {
        console.log('🛠️  Iniciando correções automáticas de segurança...\n');

        try {
            // Corrigir problemas de logging sensível
            await this.fixSensitiveLogging();
            
            // Corrigir problemas de innerHTML
            await this.fixInnerHTMLUsage();
            
            // Corrigir uso de Math.random()
            await this.fixMathRandom();
            
            // Gerar relatório
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erro durante as correções:', error);
        }
    }

    // Corrigir logging de informações sensíveis
    async fixSensitiveLogging() {
        console.log('🔐 Corrigindo logging de informações sensíveis...');
        
        const sensitiveFiles = [
            'api/secure-auth.js',
            'api/server-2fa.js', 
            'api/server-minimal.js',
            'api/server.js'
        ];

        for (const file of sensitiveFiles) {
            if (fs.existsSync(file)) {
                await this.fixSensitiveLogsInFile(file);
            }
        }
    }

    // Corrigir logs sensíveis em arquivo específico
    async fixSensitiveLogsInFile(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;

            // Padrões de log sensível para corrigir
            const sensitivePatterns = [
                // Password logging
                {
                    pattern: /console\.log\s*\([^)]*senha[^)]*\)/gi,
                    replacement: '// Sensitive password logging removed for security',
                    description: 'Password logging'
                },
                {
                    pattern: /console\.log\s*\([^)]*password[^)]*\)/gi,
                    replacement: '// Sensitive password logging removed for security',
                    description: 'Password logging'
                },
                // Token logging
                {
                    pattern: /console\.log\s*\([^)]*token[^)]*\)/gi,
                    replacement: '// Sensitive token logging removed for security',
                    description: 'Token logging'
                },
                // Admin credentials logging
                {
                    pattern: /console\.log\s*\([^)]*admin[^)]*password[^)]*\)/gi,
                    replacement: '// Sensitive admin logging removed for security',
                    description: 'Admin password logging'
                }
            ];

            let hasChanges = false;
            for (const { pattern, replacement, description } of sensitivePatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    content = content.replace(pattern, replacement);
                    hasChanges = true;
                    console.log(`   ✅ ${description} corrigido em ${filePath} (${matches.length} ocorrências)`);
                }
            }

            if (hasChanges) {
                fs.writeFileSync(filePath, content);
                this.fixesApplied.push(`Logging sensível corrigido em ${filePath}`);
            }

        } catch (error) {
            this.errors.push(`Erro ao corrigir ${filePath}: ${error.message}`);
            console.log(`   ❌ Erro em ${filePath}: ${error.message}`);
        }
    }

    // Corrigir uso inseguro de innerHTML
    async fixInnerHTMLUsage() {
        console.log('🛡️  Corrigindo uso inseguro de innerHTML...');
        
        const htmlFiles = [
            'public/js/app_clean_new.js',
            'admin/dashboard.html',
            'admin/index.html', 
            'admin/login-2fa.html',
            'admin/login-simple.html',
            'admin/login.html'
        ];

        for (const file of htmlFiles) {
            if (fs.existsSync(file)) {
                await this.fixInnerHTMLInFile(file);
            }
        }
    }

    // Corrigir innerHTML em arquivo específico
    async fixInnerHTMLInFile(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;

            // Substituir innerHTML inseguro por textContent ou métodos seguros
            const innerHTMLPattern = /(\w+)\.innerHTML\s*=\s*([^;]+);/gi;
            
            let hasChanges = false;
            content = content.replace(innerHTMLPattern, (match, element, value) => {
                // Se o valor contém apenas texto estático, usar textContent
                if (!value.includes('+') && !value.includes('`') && !value.includes('req.') && !value.includes('user')) {
                    hasChanges = true;
                    return `${element}.textContent = ${value};`;
                } else {
                    // Para conteúdo dinâmico, adicionar sanitização
                    hasChanges = true;
                    return `${element}.textContent = sanitizeHTML(${value});`;
                }
            });

            if (hasChanges) {
                // Adicionar função de sanitização se não existir
                if (!content.includes('function sanitizeHTML')) {
                    const sanitizeFunction = `
// Função de sanitização adicionada automaticamente pelo Security Fixer
function sanitizeHTML(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"]/g, function(match) {
        const escape = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}
`;
                    content = sanitizeFunction + '\n' + content;
                }

                fs.writeFileSync(filePath, content);
                this.fixesApplied.push(`innerHTML inseguro corrigido em ${filePath}`);
                console.log(`   ✅ innerHTML corrigido em ${filePath}`);
            }

        } catch (error) {
            this.errors.push(`Erro ao corrigir innerHTML em ${filePath}: ${error.message}`);
            console.log(`   ❌ Erro em ${filePath}: ${error.message}`);
        }
    }

    // Corrigir uso de Math.random() não-seguro
    async fixMathRandom() {
        console.log('🔀 Corrigindo uso de Math.random() não-criptográfico...');
        
        const jsFiles = [
            'api/server-2fa.js',
            'api/server.js',
            'admin/dashboard.html'
        ];

        for (const file of jsFiles) {
            if (fs.existsSync(file)) {
                await this.fixMathRandomInFile(file);
            }
        }
    }

    // Corrigir Math.random em arquivo específico
    async fixMathRandomInFile(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Substituir Math.random() por crypto.randomBytes()
            const mathRandomPattern = /Math\.random\(\)/gi;
            const matches = content.match(mathRandomPattern);
            
            if (matches) {
                // Adicionar import do crypto se necessário
                if (!content.includes('require(\'crypto\')') && !content.includes('const crypto')) {
                    const cryptoImport = "const crypto = require('crypto');\n";
                    content = cryptoImport + content;
                }

                // Substituir Math.random() por versão criptográfica
                content = content.replace(mathRandomPattern, 
                    '(crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF)');

                fs.writeFileSync(filePath, content);
                this.fixesApplied.push(`Math.random() inseguro corrigido em ${filePath} (${matches.length} ocorrências)`);
                console.log(`   ✅ Math.random() corrigido em ${filePath} (${matches.length} ocorrências)`);
            }

        } catch (error) {
            this.errors.push(`Erro ao corrigir Math.random em ${filePath}: ${error.message}`);
            console.log(`   ❌ Erro em ${filePath}: ${error.message}`);
        }
    }

    // Gerar relatório das correções aplicadas
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO DE CORREÇÕES DE SEGURANÇA');
        console.log('='.repeat(60));
        
        console.log(`\n✅ CORREÇÕES APLICADAS (${this.fixesApplied.length}):`);
        this.fixesApplied.forEach(fix => {
            console.log(`   ✓ ${fix}`);
        });
        
        if (this.errors.length > 0) {
            console.log(`\n❌ ERROS ENCONTRADOS (${this.errors.length}):`);
            this.errors.forEach(error => {
                console.log(`   ✗ ${error}`);
            });
        }
        
        console.log('\n💡 PRÓXIMOS PASSOS MANUAIS:');
        console.log('   1. Revisar todas as mudanças aplicadas');
        console.log('   2. Testar funcionalidades afetadas');
        console.log('   3. Configurar variáveis de ambiente de produção');
        console.log('   4. Implementar Content Security Policy (CSP)');
        console.log('   5. Configurar HTTPS em produção');
        
        console.log('\n🎯 RESULTADO:');
        if (this.errors.length === 0) {
            console.log('   🟢 Todas as correções automáticas foram aplicadas com sucesso!');
        } else {
            console.log('   🟡 Algumas correções precisam de atenção manual.');
        }
        
        console.log('='.repeat(60));
    }
}

// Executar correções
async function main() {
    const fixer = new SecurityFixer();
    await fixer.runAllFixes();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SecurityFixer;