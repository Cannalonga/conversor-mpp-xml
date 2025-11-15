#!/usr/bin/env node
/**
 * Security Audit Script
 * Executa verificações abrangentes de segurança no código
 */

const fs = require('fs');
const path = require('path');

// Configurações da auditoria
const AUDIT_CONFIG = {
    // Padrões de segurança críticos
    criticalPatterns: [
        {
            pattern: /password\s*=\s*["'][^"']+["']/gi,
            description: 'Hardcoded password detected',
            severity: 'CRITICAL'
        },
        {
            pattern: /api[_\-]?key\s*=\s*["'][^"']+["']/gi,
            description: 'Hardcoded API key detected',
            severity: 'CRITICAL'
        },
        {
            pattern: /secret\s*=\s*["'][^"']+["']/gi,
            description: 'Hardcoded secret detected',
            severity: 'CRITICAL'
        },
        {
            pattern: /token\s*=\s*["'][^"']+["']/gi,
            description: 'Hardcoded token detected',
            severity: 'CRITICAL'
        }
    ],
    
    // Padrões de segurança de alto risco
    highRiskPatterns: [
        {
            pattern: /eval\s*\(/gi,
            description: 'Use of eval() function - code injection risk',
            severity: 'HIGH'
        },
        {
            pattern: /innerHTML\s*=/gi,
            description: 'Direct innerHTML assignment - XSS risk',
            severity: 'HIGH'
        },
        {
            pattern: /document\.write\s*\(/gi,
            description: 'Use of document.write() - XSS risk',
            severity: 'HIGH'
        },
        {
            pattern: /exec\s*\(/gi,
            description: 'Command execution function - injection risk',
            severity: 'HIGH'
        },
        {
            pattern: /\$\{[^}]*req\.[^}]*\}/gi,
            description: 'Template literal with request data - injection risk',
            severity: 'HIGH'
        }
    ],
    
    // Padrões de informações sensíveis
    sensitiveDataPatterns: [
        {
            pattern: /console\.log\s*\([^)]*password[^)]*\)/gi,
            description: 'Password logging detected',
            severity: 'HIGH'
        },
        {
            pattern: /console\.log\s*\([^)]*token[^)]*\)/gi,
            description: 'Token logging detected',
            severity: 'HIGH'
        },
        {
            pattern: /console\.log\s*\([^)]*secret[^)]*\)/gi,
            description: 'Secret logging detected',
            severity: 'HIGH'
        }
    ],
    
    // Padrões de vulnerabilidades comuns
    vulnerabilityPatterns: [
        {
            pattern: /res\.send\s*\([^)]*req\.[^)]*\)/gi,
            description: 'Potential reflected XSS - unsanitized user input',
            severity: 'MEDIUM'
        },
        {
            pattern: /Math\.random\s*\(\)/gi,
            description: 'Math.random() not cryptographically secure',
            severity: 'MEDIUM'
        },
        {
            pattern: /\.toLowerCase\s*\(\)\.includes\s*\(/gi,
            description: 'Case-insensitive string comparison - potential bypass',
            severity: 'MEDIUM'
        }
    ],
    
    // Arquivos a serem auditados
    scanPaths: [
        './api',
        './public/js',
        './admin',
        './config'
    ],
    
    // Extensões de arquivo para auditoria
    fileExtensions: ['.js', '.json', '.html'],
    
    // Arquivos a serem ignorados
    ignoreFiles: [
        'node_modules',
        '.git',
        'uploads',
        'logs',
        '.env'
    ]
};

class SecurityAuditor {
    constructor() {
        this.findings = [];
        this.stats = {
            filesScanned: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
    }
    
    // Executa auditoria completa
    async runAudit() {
        console.log('🔒 Iniciando Auditoria de Segurança Completa...\n');
        
        // Varredura de arquivos
        for (const scanPath of AUDIT_CONFIG.scanPaths) {
            if (fs.existsSync(scanPath)) {
                await this.scanDirectory(scanPath);
            }
        }
        
        // Verificações específicas
        await this.checkEnvironmentVariables();
        await this.checkPermissions();
        await this.checkDependencies();
        
        // Gerar relatório
        this.generateReport();
    }
    
    // Varredura de diretórios
    async scanDirectory(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            
            // Ignorar arquivos/diretórios específicos
            if (AUDIT_CONFIG.ignoreFiles.some(ignore => fullPath.includes(ignore))) {
                continue;
            }
            
            if (file.isDirectory()) {
                await this.scanDirectory(fullPath);
            } else if (AUDIT_CONFIG.fileExtensions.some(ext => file.name.endsWith(ext))) {
                await this.scanFile(fullPath);
            }
        }
    }
    
    // Varredura de arquivo individual
    async scanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.stats.filesScanned++;
            
            // Aplicar todos os padrões de auditoria
            const allPatterns = [
                ...AUDIT_CONFIG.criticalPatterns,
                ...AUDIT_CONFIG.highRiskPatterns,
                ...AUDIT_CONFIG.sensitiveDataPatterns,
                ...AUDIT_CONFIG.vulnerabilityPatterns
            ];
            
            for (const { pattern, description, severity } of allPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    this.addFinding(filePath, description, severity, matches);
                }
            }
            
        } catch (error) {
            console.log(`❌ Erro ao verificar ${filePath}: ${error.message}`);
        }
    }
    
    // Adicionar descoberta de segurança
    addFinding(file, description, severity, matches) {
        this.findings.push({
            file,
            description,
            severity,
            matches: matches.length,
            examples: matches.slice(0, 3) // Primeiros 3 exemplos
        });
        
        this.stats[severity.toLowerCase()]++;
    }
    
    // Verificar variáveis de ambiente
    async checkEnvironmentVariables() {
        console.log('🔍 Verificando configurações de ambiente...');
        
        const envTemplate = '.env.template';
        const envLocal = '.env';
        
        if (!fs.existsSync(envTemplate)) {
            this.addFinding('.env.template', 'Template de variáveis de ambiente ausente', 'MEDIUM', []);
        }
        
        if (fs.existsSync('.env') && fs.existsSync('.env.template')) {
            // Verificar se todas as variáveis do template estão definidas
            const template = fs.readFileSync('.env.template', 'utf8');
            const env = fs.readFileSync('.env', 'utf8');
            
            const templateVars = template.match(/^[A-Z_]+=.*$/gm) || [];
            const envVars = env.match(/^[A-Z_]+=.*$/gm) || [];
            
            templateVars.forEach(templateVar => {
                const varName = templateVar.split('=')[0];
                const hasVar = envVars.some(envVar => envVar.startsWith(varName + '='));
                
                if (!hasVar) {
                    this.addFinding('.env', `Variável de ambiente ausente: ${varName}`, 'HIGH', []);
                }
            });
        }
    }
    
    // Verificar permissões de arquivos
    async checkPermissions() {
        console.log('🔍 Verificando permissões de arquivos...');
        
        const sensitiveFiles = [
            '.env',
            'config/app.json',
            'api/security.js'
        ];
        
        sensitiveFiles.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    const stats = fs.statSync(file);
                    const mode = stats.mode.toString(8);
                    
                    // Verificar se arquivo é legível por outros usuários
                    if (mode.endsWith('4') || mode.endsWith('6') || mode.endsWith('7')) {
                        this.addFinding(file, 'Arquivo sensível com permissões muito abertas', 'HIGH', [mode]);
                    }
                } catch (error) {
                    // Silenciar erro de permissões no Windows
                }
            }
        });
    }
    
    // Verificar dependências
    async checkDependencies() {
        console.log('🔍 Verificando dependências...');
        
        if (fs.existsSync('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            // Verificar dependências de segurança essenciais
            const securityDeps = ['helmet', 'express-rate-limit', 'validator'];
            const missingDeps = securityDeps.filter(dep => 
                !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
            );
            
            missingDeps.forEach(dep => {
                this.addFinding('package.json', `Dependência de segurança ausente: ${dep}`, 'MEDIUM', []);
            });
        }
    }
    
    // Gerar relatório de auditoria
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO DE AUDITORIA DE SEGURANÇA');
        console.log('='.repeat(60));
        
        // Estatísticas gerais
        console.log('\n📊 ESTATÍSTICAS:');
        console.log(`   Arquivos escaneados: ${this.stats.filesScanned}`);
        console.log(`   Issues encontrados: ${this.findings.length}`);
        console.log(`   🔴 Crítico: ${this.stats.critical}`);
        console.log(`   🟠 Alto: ${this.stats.high}`);
        console.log(`   🟡 Médio: ${this.stats.medium}`);
        console.log(`   🔵 Baixo: ${this.stats.low}`);
        
        // Descobertas por severidade
        const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        
        severityOrder.forEach(severity => {
            const severityFindings = this.findings.filter(f => f.severity === severity);
            if (severityFindings.length > 0) {
                console.log(`\n${this.getSeverityIcon(severity)} ${severity} (${severityFindings.length}):`);
                
                severityFindings.forEach(finding => {
                    console.log(`   📁 ${finding.file}`);
                    console.log(`      ${finding.description}`);
                    if (finding.matches > 0) {
                        console.log(`      Ocorrências: ${finding.matches}`);
                        finding.examples.forEach(example => {
                            console.log(`      Exemplo: ${example.substring(0, 80)}...`);
                        });
                    }
                    console.log('');
                });
            }
        });
        
        // Recomendações finais
        console.log('\n💡 RECOMENDAÇÕES:');
        if (this.stats.critical > 0) {
            console.log('   🔴 AÇÃO IMEDIATA NECESSÁRIA: Corrija todas as vulnerabilidades críticas');
        }
        if (this.stats.high > 0) {
            console.log('   🟠 Priorize a correção de vulnerabilidades de alto risco');
        }
        console.log('   ✅ Execute auditoria regularmente');
        console.log('   ✅ Mantenha dependências atualizadas');
        console.log('   ✅ Use HTTPS em produção');
        console.log('   ✅ Configure logs de segurança');
        
        // Resultado final
        const totalCriticalHigh = this.stats.critical + this.stats.high;
        if (totalCriticalHigh === 0) {
            console.log('\n🎉 AUDITORIA CONCLUÍDA - Nenhuma vulnerabilidade crítica ou alta detectada!');
        } else {
            console.log(`\n⚠️ AUDITORIA CONCLUÍDA - ${totalCriticalHigh} vulnerabilidades críticas/altas requerem atenção!`);
        }
        
        console.log('='.repeat(60));
    }
    
    // Obter ícone por severidade
    getSeverityIcon(severity) {
        const icons = {
            'CRITICAL': '🔴',
            'HIGH': '🟠', 
            'MEDIUM': '🟡',
            'LOW': '🔵'
        };
        return icons[severity] || '⚪';
    }
}

// Executar auditoria
async function main() {
    const auditor = new SecurityAuditor();
    await auditor.runAudit();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SecurityAuditor;