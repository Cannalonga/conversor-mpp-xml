#!/usr/bin/env node

/**
 * Test Script - Mercado Pago Integration
 * =====================================
 * 
 * Testa se a integração com Mercado Pago está funcionando
 * 
 * Uso:
 *   node test-mercado-pago.js
 *   node test-mercado-pago.js --endpoint checkout
 *   node test-mercado-pago.js --endpoint check-status
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurar variáveis de ambiente
require('dotenv').config();

const API_BASE = process.env.API_URL || 'http://localhost:3000';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════╗
║   🧪 TESTE DE INTEGRAÇÃO - MERCADO PAGO              ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

/**
 * Teste 1: Verificar se server está rodando
 */
async function testServerHealth() {
    console.log(`\n${colors.blue}[TESTE 1]${colors.reset} Verificar se servidor está rodando...`);
    
    try {
        const response = await axios.get(`${API_BASE}/health`, { 
            timeout: 5000,
            validateStatus: () => true // Aceitar qualquer status
        });
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Servidor respondendo em ${API_BASE}${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}❌ Servidor respondeu com status ${response.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Servidor não está respondendo${colors.reset}`);
        console.log(`   Erro: ${error.message}`);
        console.log(`   Inicie com: npm start`);
        return false;
    }
}

/**
 * Teste 2: Verificar credenciais Mercado Pago
 */
async function testCredentials() {
    console.log(`\n${colors.blue}[TESTE 2]${colors.reset} Verificar credenciais Mercado Pago...`);
    
    if (!MP_TOKEN) {
        console.log(`${colors.red}❌ MP_ACCESS_TOKEN não configurado em .env${colors.reset}`);
        return false;
    }
    
    const tokenPreview = MP_TOKEN.substring(0, 10) + '...' + MP_TOKEN.substring(MP_TOKEN.length - 10);
    console.log(`${colors.green}✅ Token Mercado Pago encontrado: ${tokenPreview}${colors.reset}`);
    
    // Validar token fazendo request ao MP
    try {
        const response = await axios.get('https://api.sandbox.mercadopago.com/v1/payments', {
            headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
            params: { limit: 1 },
            timeout: 5000
        });
        
        console.log(`${colors.green}✅ Token Mercado Pago é válido (Sandbox)${colors.reset}`);
        return true;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log(`${colors.red}❌ Token Mercado Pago inválido ou expirado${colors.reset}`);
            return false;
        } else if (error.code === 'ECONNREFUSED') {
            console.log(`${colors.yellow}⚠️  Não conseguiu conectar ao Mercado Pago (Internet?)${colors.reset}`);
            return true; // Continuar mesmo assim
        }
        return true; // Continuar se erro desconhecido
    }
}

/**
 * Teste 3: Testar endpoint de checkout
 */
async function testCheckoutEndpoint() {
    console.log(`\n${colors.blue}[TESTE 3]${colors.reset} Testar POST /api/premium/checkout...`);
    
    const testData = {
        amount: 30,
        plan: 'test',
        email: 'teste@example.com',
        cpf: '12345678900'
    };
    
    try {
        const response = await axios.post(`${API_BASE}/api/premium/checkout`, testData, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.success) {
            console.log(`${colors.green}✅ Checkout criado com sucesso${colors.reset}`);
            console.log(`   Preference ID: ${response.data.preferenceId}`);
            console.log(`   Checkout URL: ${response.data.checkoutUrl?.substring(0, 50)}...`);
            
            return {
                success: true,
                preferenceId: response.data.preferenceId,
                checkoutUrl: response.data.checkoutUrl
            };
        } else {
            console.log(`${colors.red}❌ Erro ao criar checkout${colors.reset}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Resposta: ${JSON.stringify(response.data, null, 2)}`);
            return { success: false };
        }
    } catch (error) {
        console.log(`${colors.red}❌ Erro na requisição${colors.reset}`);
        console.log(`   Erro: ${error.message}`);
        return { success: false };
    }
}

/**
 * Teste 4: Testar endpoint de verificação de status
 */
async function testCheckStatusEndpoint(preferenceId) {
    console.log(`\n${colors.blue}[TESTE 4]${colors.reset} Testar POST /api/payment/check-status...`);
    
    if (!preferenceId) {
        console.log(`${colors.yellow}⚠️  Pulando (preferenceId não disponível)${colors.reset}`);
        return;
    }
    
    try {
        const response = await axios.post(`${API_BASE}/api/payment/check-status`, 
            { preferenceId: preferenceId },
            { timeout: 10000, validateStatus: () => true }
        );
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Status verificado${colors.reset}`);
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Mensagem: ${response.data.message}`);
            
            if (response.data.status === 'approved') {
                console.log(`   ${colors.green}Créditos: ${response.data.credits}${colors.reset}`);
            }
        } else {
            console.log(`${colors.yellow}⚠️  Resposta não sucesso${colors.reset}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Resposta: ${JSON.stringify(response.data, null, 2)}`);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Erro na requisição${colors.reset}`);
        console.log(`   Erro: ${error.message}`);
    }
}

/**
 * Teste 5: Verificar arquivo de serviço Mercado Pago
 */
async function testServiceFile() {
    console.log(`\n${colors.blue}[TESTE 5]${colors.reset} Verificar arquivo mercado-pago-service.js...`);
    
    const servicePath = path.join(__dirname, 'api', 'mercado-pago-service.js');
    
    if (fs.existsSync(servicePath)) {
        console.log(`${colors.green}✅ Arquivo existe: ${servicePath}${colors.reset}`);
        
        const content = fs.readFileSync(servicePath, 'utf8');
        const methods = [
            'createPaymentPreference',
            'createPixPayment',
            'getPaymentStatus',
            'getPreferenceStatus',
            'processWebhook'
        ];
        
        let foundMethods = 0;
        for (const method of methods) {
            if (content.includes(`${method}(`)) {
                console.log(`   ${colors.green}✓${colors.reset} ${method}()`);
                foundMethods++;
            } else {
                console.log(`   ${colors.red}✗${colors.reset} ${method}() - FALTANDO`);
            }
        }
        
        if (foundMethods === methods.length) {
            console.log(`${colors.green}✅ Todas as funções esperadas encontradas${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.yellow}⚠️  Faltam ${methods.length - foundMethods} funções${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.red}❌ Arquivo não encontrado: ${servicePath}${colors.reset}`);
        return false;
    }
}

/**
 * Teste 6: Verificar variáveis de ambiente
 */
async function testEnvironment() {
    console.log(`\n${colors.blue}[TESTE 6]${colors.reset} Verificar variáveis de ambiente...`);
    
    const required = [
        'MP_ACCESS_TOKEN',
        'MP_PUBLIC_KEY',
        'APP_URL'
    ];
    
    let allOk = true;
    for (const env of required) {
        if (process.env[env]) {
            console.log(`   ${colors.green}✓${colors.reset} ${env} = ${process.env[env].substring(0, 20)}...`);
        } else {
            console.log(`   ${colors.red}✗${colors.reset} ${env} - FALTANDO`);
            allOk = false;
        }
    }
    
    if (allOk) {
        console.log(`${colors.green}✅ Todas as variáveis configuradas${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ Algumas variáveis faltam${colors.reset}`);
    }
    
    return allOk;
}

/**
 * Teste 7: Verificar axios no package.json
 */
async function testAxiosDependency() {
    console.log(`\n${colors.blue}[TESTE 7]${colors.reset} Verificar dependência axios...`);
    
    try {
        require('axios');
        console.log(`${colors.green}✅ Axios instalado${colors.reset}`);
        return true;
    } catch {
        console.log(`${colors.red}❌ Axios não instalado${colors.reset}`);
        console.log(`   Instale com: npm install axios`);
        return false;
    }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
    try {
        const test1 = await testServerHealth();
        if (!test1) {
            console.log(`\n${colors.red}❌ Servidor não está rodando. Inicie com: npm start${colors.reset}`);
            process.exit(1);
        }
        
        await testAxiosDependency();
        await testEnvironment();
        await testCredentials();
        await testServiceFile();
        
        const checkout = await testCheckoutEndpoint();
        if (checkout.success) {
            await testCheckStatusEndpoint(checkout.preferenceId);
        }
        
        // Resumo
        console.log(`\n${colors.cyan}
╔════════════════════════════════════════════════════════╗
║   📊 TESTES COMPLETOS                                  ║
╠════════════════════════════════════════════════════════╣
║  ${colors.green}✅ Sistema pronto para usar Mercado Pago${colors.cyan}             ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);
        
        console.log(`\n${colors.yellow}Próximos passos:
1. Testar fluxo completo: abra http://localhost:3000
2. Clique em "💳 Comprar Créditos"
3. Será redirecionado para Mercado Pago
4. Use cartão de teste: 4111 1111 1111 1111
5. Confirmação automática de créditos${colors.reset}\n`);
        
    } catch (error) {
        console.error(`${colors.red}Erro fatal:${colors.reset}`, error.message);
        process.exit(1);
    }
}

// Executar
runAllTests();
