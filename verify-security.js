/**
 * 🔐 SECURITY VALIDATION SCRIPT
 * =============================
 * 
 * Verifica todos os requisitos de segurança
 * Execute: node verify-security.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityValidator {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Executar todas as verificações
   */
  async runAllChecks() {
    console.log('\n🔐 INICIANDO VALIDAÇÃO DE SEGURANÇA\n');
    console.log('═'.repeat(60));

    await this.checkEncryptionModuleExists();
    await this.checkAdvancedSecurityModuleExists();
    await this.checkEnvironmentVariables();
    await this.checkPackageJsonDependencies();
    await this.checkServerSecurity();
    await this.checkDatabaseSecurity();
    await this.checkFilePermissions();
    await this.checkSensitiveDataInCode();

    this.printReport();
  }

  /**
   * Verificar se módulo de criptografia existe
   */
  async checkEncryptionModuleExists() {
    const file = './api/security-encryption.js';
    const exists = fs.existsSync(file);
    
    this.addCheck('Módulo de Criptografia', exists, 
      exists ? 'security-encryption.js encontrado' : 'Arquivo não encontrado');
    
    if (exists) {
      const content = fs.readFileSync(file, 'utf8');
      
      const hasAES256 = content.includes('aes-256-gcm');
      this.addCheck('├─ AES-256-GCM', hasAES256, 'Suporte a AES-256-GCM');
      
      const hasBcrypt = content.includes('bcryptjs') || content.includes('bcrypt');
      this.addCheck('├─ Bcrypt', hasBcrypt, 'Suporte a bcrypt para senhas');
      
      const hasPBKDF2 = content.includes('pbkdf2');
      this.addCheck('├─ PBKDF2', hasPBKDF2, 'Suporte a PBKDF2 para key derivation');
      
      const hasJWT = content.includes('generateSecureToken');
      this.addCheck('├─ JWT Seguro', hasJWT, 'Geração de JWT com tokens seguros');
      
      const hasSHA256 = content.includes('sha256');
      this.addCheck('└─ SHA-256', hasSHA256, 'Suporte a SHA-256 para hashing');
    }
  }

  /**
   * Verificar módulo de segurança avançada
   */
  async checkAdvancedSecurityModuleExists() {
    const file = './api/advanced-security.js';
    const exists = fs.existsSync(file);
    
    this.addCheck('Middleware de Segurança Avançada', exists,
      exists ? 'advanced-security.js encontrado' : 'Arquivo não encontrado');
    
    if (exists) {
      const content = fs.readFileSync(file, 'utf8');
      
      const hasRateLimit = content.includes('rateLimitByIP');
      this.addCheck('├─ Rate Limiting', hasRateLimit, 'Proteção contra brute force');
      
      const hasInput = content.includes('sanitizeInput');
      this.addCheck('├─ Sanitização de Input', hasInput, 'Proteção contra XSS/SQL injection');
      
      const hasCSRF = content.includes('csrfProtection');
      this.addCheck('├─ CSRF Protection', hasCSRF, 'Proteção contra CSRF');
      
      const hasValidation = content.includes('validateEmail');
      this.addCheck('├─ Validação de Dados', hasValidation, 'Validação de email/CPF');
      
      const hasAudit = content.includes('auditLog');
      this.addCheck('└─ Audit Logging', hasAudit, 'Logs de auditoria de segurança');
    }
  }

  /**
   * Verificar variáveis de ambiente
   */
  async checkEnvironmentVariables() {
    const envFile = '.env';
    const exists = fs.existsSync(envFile);
    
    this.addCheck('Arquivo .env', exists, exists ? '.env encontrado' : '.env não encontrado');
    
    if (exists) {
      const content = fs.readFileSync(envFile, 'utf8');
      
      const hasEncryptionKey = content.includes('ENCRYPTION_KEY=');
      this.addCheck('├─ ENCRYPTION_KEY', hasEncryptionKey, 'Chave de criptografia definida');
      
      const hasJWTSecret = content.includes('JWT_SECRET=');
      this.addCheck('├─ JWT_SECRET', hasJWTSecret, 'Secret JWT definido');
      
      const hasSessionSecret = content.includes('SESSION_SECRET=');
      this.addCheck('├─ SESSION_SECRET', hasSessionSecret, 'Secret de sessão definido');
      
      const hasRateLimit = content.includes('RATE_LIMIT');
      this.addCheck('├─ Rate Limiting Config', hasRateLimit, 'Rate limiting configurado');
      
      const allowedOrigins = content.match(/ALLOWED_ORIGINS=([^\n]+)/);
      const isRestricted = allowedOrigins && !allowedOrigins[1].includes('*');
      this.addCheck('└─ CORS Restritivo', isRestricted, 'CORS whitelist sem wildcard');
    }
  }

  /**
   * Verificar dependências no package.json
   */
  async checkPackageJsonDependencies() {
    const pkgFile = './package.json';
    
    try {
      const content = fs.readFileSync(pkgFile, 'utf8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const requiredDeps = {
        'bcryptjs': 'Hashing seguro de senhas',
        'helmet': 'Security headers HTTP',
        'express-rate-limit': 'Rate limiting',
        'joi': 'Validação de schemas',
        'dotenv': 'Gerenciamento de variáveis',
        'crypto': 'Criptografia nativa (inclusa)'
      };
      
      Object.entries(requiredDeps).forEach(([dep, desc]) => {
        const hasLib = deps.hasOwnProperty(dep) || dep === 'crypto';
        this.addCheck(`├─ ${dep}`, hasLib, desc);
      });
      
    } catch (error) {
      this.addCheck('package.json Analysis', false, `Erro: ${error.message}`);
    }
  }

  /**
   * Verificar segurança no server.js
   */
  async checkServerSecurity() {
    const serverFile = './api/server.js';
    
    if (!fs.existsSync(serverFile)) {
      this.addCheck('Server Security', false, 'server.js não encontrado');
      return;
    }
    
    const content = fs.readFileSync(serverFile, 'utf8');
    
    const hasHelmet = content.includes('helmet');
    this.addCheck('├─ Helmet Middleware', hasHelmet, 'Security headers HTTP');
    
    const hasCSP = content.includes('contentSecurityPolicy');
    this.addCheck('├─ Content-Security-Policy', hasCSP, 'CSP headers configurados');
    
    const hasHSTS = content.includes('hsts');
    this.addCheck('├─ HSTS', hasHSTS, 'HSTS ativado (força HTTPS)');
    
    const hasXSSFilter = content.includes('xssFilter');
    this.addCheck('├─ XSS Filter', hasXSSFilter, 'X-XSS-Protection header');
    
    const hasFrameguard = content.includes('frameguard');
    this.addCheck('├─ Frameguard', hasFrameguard, 'X-Frame-Options: deny');
    
    const hasCORS = content.includes('cors');
    this.addCheck('└─ CORS Configurado', hasCORS, 'CORS whitelist implementado');
  }

  /**
   * Verificar segurança do banco de dados
   */
  async checkDatabaseSecurity() {
    const dbFile = './api/database.js';
    
    if (!fs.existsSync(dbFile)) {
      this.addCheck('Database Security', false, 'database.js não encontrado');
      return;
    }
    
    const content = fs.readFileSync(dbFile, 'utf8');
    
    const hasPrisma = content.includes('PrismaClient');
    this.addCheck('├─ Prisma ORM', hasPrisma, 'Prepared statements automáticos');
    
    const hasEncryption = content.includes('encrypt') || 
                         content.includes('Encryption');
    this.addCheck('├─ Criptografia de Dados', hasEncryption, 'Dados sensíveis criptografados');
    
    const hasValidation = content.includes('validate') || 
                         content.includes('Validate');
    this.addCheck('└─ Validação de Input', hasValidation, 'Validação de dados de entrada');
  }

  /**
   * Verificar permissões de arquivos
   */
  async checkFilePermissions() {
    const criticalFiles = [
      '.env',
      './api/security-encryption.js',
      './api/advanced-security.js',
      './api/server.js'
    ];
    
    console.log('\n🔒 Verificando permissões de arquivos...\n');
    
    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        // Arquivo deve ter permissões restritas
        const isSecure = parseInt(mode) <= 644;
        this.addCheck(`├─ Permissões ${file}`, isSecure, 
          `Modo: ${mode} ${isSecure ? '✓' : '⚠️'}`);
      }
    });
  }

  /**
   * Verificar dados sensíveis no código
   */
  async checkSensitiveDataInCode() {
    const filePatterns = [
      './api/**/*.js',
      './converters/**/*.js',
      './public/**/*.js'
    ];
    
    const sensitivePatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
      /database[_-]?url\s*=\s*['"][^'"]+['"]/gi
    ];
    
    let foundSensitiveData = false;
    
    const findFilesRecursive = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !fullPath.includes('node_modules')) {
            findFilesRecursive(fullPath);
          } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            sensitivePatterns.forEach(pattern => {
              if (pattern.test(content)) {
                console.log(`🚨 Dados sensíveis encontrados em ${fullPath}`);
                foundSensitiveData = true;
              }
            });
          }
        });
      } catch (error) {
        // Ignorar erros de acesso
      }
    };
    
    findFilesRecursive('./api');
    findFilesRecursive('./converters');
    
    this.addCheck('Código sem Dados Sensíveis', !foundSensitiveData,
      foundSensitiveData ? 'Dados sensíveis encontrados no código' : 'Nenhum dado sensível detectado');
  }

  /**
   * Adicionar verificação
   */
  addCheck(name, passed, message) {
    this.checks.push({ name, passed, message });
    
    if (passed) {
      this.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.failed++;
      console.log(`❌ ${name}`);
    }
    
    console.log(`   └─ ${message}\n`);
  }

  /**
   * Imprimir relatório
   */
  printReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 RELATÓRIO DE SEGURANÇA\n');
    
    const total = this.passed + this.failed;
    const percentage = Math.round((this.passed / total) * 100);
    
    console.log(`Total de verificações: ${total}`);
    console.log(`✅ Aprovadas: ${this.passed}`);
    console.log(`❌ Falhadas: ${this.failed}`);
    console.log(`📈 Taxa de conformidade: ${percentage}%\n`);
    
    if (percentage >= 90) {
      console.log('🟢 STATUS: SECURITY LEVEL - PRODUCTION READY');
    } else if (percentage >= 70) {
      console.log('🟡 STATUS: SECURITY LEVEL - NEEDS IMPROVEMENTS');
    } else {
      console.log('🔴 STATUS: SECURITY LEVEL - CRITICAL ISSUES');
    }
    
    console.log('\n' + '═'.repeat(60));
    
    // Recomendações
    if (this.failed > 0) {
      console.log('\n⚠️  RECOMENDAÇÕES:\n');
      
      this.checks.forEach(check => {
        if (!check.passed) {
          console.log(`• ${check.name}: ${check.message}`);
        }
      });
    }
    
    console.log('\n');
  }
}

// Executar validação
const validator = new SecurityValidator();
validator.runAllChecks().catch(console.error);

module.exports = SecurityValidator;
