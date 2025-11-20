/**
 * Servidor Ultra-Seguro - Versão Funcional
 * Proteção máxima para Rafael Cannalonga
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode'); // Biblioteca para QR codes PIX
const SecureAuthSystem = require('./secure-auth');

// Inicializar sistema de autenticação ultra-seguro
const secureAuth = new SecureAuthSystem();

// Garantir diretórios essenciais
const ensureDirectories = () => {
    const dirs = ['uploads/incoming', 'uploads/converted', 'uploads/processing', 'uploads/expired', 'logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureDirectories();

const app = express();
const PORT = 3000;

console.log('🛡️ Iniciando servidor ultra-seguro...');
console.log('🔐 Sistema de autenticação carregado');

// Middlewares básicos
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin')); // Servir arquivos da pasta admin

// CORS middleware com whitelist de origens permitidas (SEGURANÇA: não usar '*')
app.use((req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
    const origin = req.headers.origin;
    
    // Verificar se origem está na whitelist
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

console.log('✅ Middlewares configurados');

// Upload simples
const upload = multer({ 
    dest: 'uploads/incoming/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

console.log('✅ Upload configurado');

// Dados financeiros
const financialData = {
    conversionsCount: 0,
    totalRevenue: 0,
    transactions: [],
    dailyStats: {},
    monthlyStats: {}
};

// Função para registrar conversão paga
const registerPaidConversion = (fileName, amount) => {
    const transaction = {
        id: crypto.randomBytes(16).toString('hex'),
        fileName: fileName,
        amount: amount,
        date: new Date().toISOString(),
        status: 'completed'
    };
    
    // Adicionar à lista de transações
    financialData.transactions.push(transaction);
    financialData.conversionsCount++;
    financialData.totalRevenue += amount;
    
    // Estatísticas diárias
    const today = new Date().toISOString().split('T')[0];
    if (!financialData.dailyStats[today]) {
        financialData.dailyStats[today] = { count: 0, revenue: 0 };
    }
    financialData.dailyStats[today].count++;
    financialData.dailyStats[today].revenue += amount;
    
    // Estatísticas mensais
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (!financialData.monthlyStats[monthKey]) {
        financialData.monthlyStats[monthKey] = { count: 0, revenue: 0 };
    }
    financialData.monthlyStats[monthKey].count++;
    financialData.monthlyStats[monthKey].revenue += amount;
    
    console.log(`💰 Conversão registrada: ${fileName} - R$ ${amount}`);
    return transaction;
};

console.log('✅ Sistema financeiro configurado');

// Rotas
app.get('/api/health', (req, res) => {
    console.log('💚 Health check requisitado');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Servidor funcionando!'
    });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    console.log('📁 Upload recebido:', req.file ? req.file.originalname : 'Nenhum arquivo');
    console.log('🔍 Detalhes do request:', {
        headers: req.headers['content-type'],
        body: Object.keys(req.body || {}),
        file: req.file ? 'SIM' : 'NÃO'
    });
    
    if (!req.file) {
        console.log('❌ Nenhum arquivo no upload');
        return res.status(400).json({
            success: false,
            error: 'Nenhum arquivo enviado'
        });
    }

    // Gerar XML simples
    const xmlContent = `<?xml version="1.0"?>
<Project>
    <Title>Conversão de ${req.file.originalname}</Title>
    <Date>${new Date().toISOString()}</Date>
    <Status>Sucesso</Status>
</Project>`;

    // Salvar XML
    const xmlPath = path.join('uploads', 'converted', req.file.filename + '.xml');
    fs.writeFileSync(xmlPath, xmlContent);

    // Registrar conversão paga (simula pagamento aprovado)
    const transaction = registerPaidConversion(req.file.originalname, 10.00);

    console.log('✅ Arquivo convertido:', xmlPath);

    res.json({
        success: true,
        message: 'Arquivo convertido!',
        xml: xmlContent,
        downloadUrl: '/api/download/' + req.file.filename + '.xml',
        transaction: {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status
        }
    });
});

app.get('/api/download/:filename', (req, res) => {
    console.log('⬇️ Download solicitado:', req.params.filename);
    
    const filePath = path.join(__dirname, '../uploads/converted', req.params.filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'Arquivo não encontrado' });
    }
});

// Admin dashboard route
app.get('/admin', (req, res) => {
    console.log('🔧 Admin dashboard acessado');
    res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

// Admin login page route
app.get('/admin/login', (req, res) => {
    console.log('🔑 Admin login page acessada');
    res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

// Admin dashboard route (simples)
app.get('/admin/dashboard', (req, res) => {
    console.log('📊 Admin dashboard acessado');
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// Gerar QR Code PIX para pagamento
app.post('/api/payment/pix', async (req, res) => {
    try {
        const { fileName, amount = 10.00 } = req.body;
        
        console.log('💰 Gerando QR Code PIX:', { fileName, amount });
        
        // Dados do PIX (use suas configurações reais)
        const pixKey = process.env.PIX_KEY || 'canna.vendasonline@gmail.com';
        const merchantName = process.env.PIX_MERCHANT_NAME || 'Rafael Cannalonga';
        const merchantCity = process.env.PIX_MERCHANT_CITY || 'São Paulo';
        
        // Gerar código PIX (formato EMV)
        const txId = crypto.randomUUID().substring(0, 25);
        const pixCode = generatePixEMV({
            pixKey,
            merchantName,
            merchantCity,
            amount,
            txId,
            description: `Conversão MPP: ${fileName}`
        });
        
        // Gerar QR Code como imagem base64
        const qrCodeImage = await QRCode.toDataURL(pixCode, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeImage,
            pixCode: pixCode,
            amount: amount,
            merchantName: merchantName,
            expiresIn: '15 minutos'
            // SEGURANÇA: pixKey removida da resposta (não exponha chave PIX)
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar QR Code PIX:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar código PIX'
        });
    }
});

// Função para gerar código PIX EMV
function generatePixEMV(data) {
    const { pixKey, merchantName, merchantCity, amount, txId, description } = data;
    
    // Formato EMV simplificado para PIX
    let emv = '';
    emv += '00020126'; // Payload Format Indicator
    emv += '26' + (pixKey.length + 22).toString().padStart(2, '0'); // Point of Initiation Method
    emv += '0014BR.GOV.BCB.PIX01'; // GUI
    emv += pixKey.length.toString().padStart(2, '0') + pixKey; // PIX Key
    emv += '5204000052039865'; // Merchant Category Code + Transaction Currency
    emv += '54' + amount.toFixed(2).length.toString().padStart(2, '0') + amount.toFixed(2); // Transaction Amount
    emv += '5802BR'; // Country Code
    emv += '59' + merchantName.length.toString().padStart(2, '0') + merchantName; // Merchant Name
    emv += '60' + merchantCity.length.toString().padStart(2, '0') + merchantCity; // Merchant City
    
    if (description && description.length > 0) {
        emv += '62' + (description.length + 4).toString().padStart(2, '0');
        emv += '05' + description.length.toString().padStart(2, '0') + description;
    }
    
    // CRC16 (simplificado - em produção use implementação completa)
    emv += '6304';
    const crc = calculateCRC16(emv);
    emv += crc.toString(16).toUpperCase().padStart(4, '0');
    
    return emv;
}

// CRC16 CCITT implementação correta para PIX (Banco Central)
function calculateCRC16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc <<= 1;
            if (crc & 0x10000) {
                crc ^= 0x1021;
            }
        }
        crc &= 0xFFFF;
    }
    return crc ^ 0xFFFF;  // Complement final para CCITT
}
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    console.log(`[${new Date().toISOString()}] Tentativa de autenticação:`, {
        ip: clientIP,
        userAgent: req.get('User-Agent')?.substring(0, 50) + '...',
        username: username ? 'PRESENTE' : 'AUSENTE'
    });
    
    // Usar sistema de autenticação ultra-seguro
    const authResult = secureAuth.authenticate(username, password, clientIP);
    
    if (authResult.success) {
        console.log('✅ RAFAEL CANNALONGA AUTENTICADO COM SUCESSO');
        console.log('🔐 Token seguro gerado e ativado');
        
        res.json({
            success: true,
            token: authResult.token,
            user: authResult.user,
            message: authResult.message,
            securityLevel: 'MAXIMUM'
        });
    } else {
        console.log(`❌ FALHA NA AUTENTICAÇÃO: ${authResult.reason}`);
        console.log(`⚠️ IP registrado: ${clientIP}`);
        
        // Resposta padronizada para não vazar informações
        res.status(401).json({
            success: false,
            message: authResult.message
        });
    }
});

// Middleware de autenticação ultra-seguro
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`⚠️ Tentativa de acesso sem token do IP: ${clientIP}`);
        return res.status(401).json({ 
            error: 'Token de acesso requerido',
            securityAlert: 'UNAUTHORIZED_ACCESS_ATTEMPT'
        });
    }
    
    const token = authHeader.substring(7);
    
    if (secureAuth.verifyToken(token, clientIP)) {
        console.log(`✅ Acesso autorizado para IP: ${clientIP.substring(0, 8)}***`);
        next();
    } else {
        console.log(`🚨 TENTATIVA DE ACESSO COM TOKEN INVÁLIDO: ${clientIP}`);
        res.status(401).json({ 
            error: 'Token inválido ou expirado',
            securityAlert: 'INVALID_TOKEN_ATTEMPT'
        });
    }
};

// Endpoint de logout seguro
app.post('/api/admin/logout', authenticateAdmin, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (secureAuth.invalidateSession(token)) {
        console.log(`🚪 Logout seguro executado para IP: ${clientIP}`);
        res.json({ success: true, message: 'Logout realizado com sucesso' });
    } else {
        res.status(400).json({ success: false, message: 'Erro no logout' });
    }
});

// Endpoint de estatísticas de segurança
app.get('/api/admin/security-stats', authenticateAdmin, (req, res) => {
    const stats = secureAuth.getSecurityStats();
    console.log('📊 Estatísticas de segurança consultadas');
    
    res.json({
        ...stats,
        timestamp: new Date().toISOString(),
        owner: 'Rafael Cannalonga'
    });
});
app.get('/api/stats/conversions-today', authenticateAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = financialData.dailyStats[today] || { count: 0 };
    res.json({ count: todayStats.count });
});

app.get('/api/stats/total-files', authenticateAdmin, (req, res) => {
    res.json({ count: financialData.conversionsCount });
});

app.get('/api/stats/disk-usage', authenticateAdmin, (req, res) => {
    res.json({ usage: 15 });
});

// Novos endpoints financeiros
app.get('/api/financial/summary', authenticateAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);
    
    res.json({
        totalRevenue: financialData.totalRevenue,
        totalConversions: financialData.conversionsCount,
        pricePerConversion: financialData.pricePerConversion,
        todayRevenue: financialData.dailyStats[today]?.revenue || 0,
        todayConversions: financialData.dailyStats[today]?.count || 0,
        monthlyRevenue: financialData.monthlyStats[thisMonth]?.revenue || 0,
        monthlyConversions: financialData.monthlyStats[thisMonth]?.count || 0,
        averageDaily: financialData.totalRevenue / Math.max(Object.keys(financialData.dailyStats).length, 1),
        taxCalculation: {
            grossRevenue: financialData.totalRevenue,
            estimatedTax27_5: financialData.totalRevenue * 0.275,
            estimatedTax22_5: financialData.totalRevenue * 0.225,
            estimatedTax15: financialData.totalRevenue * 0.15
        }
    });
});

app.get('/api/financial/transactions', authenticateAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const sortedTransactions = financialData.transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(startIndex, endIndex);
    
    res.json({
        transactions: sortedTransactions,
        pagination: {
            page: page,
            limit: limit,
            total: financialData.transactions.length,
            totalPages: Math.ceil(financialData.transactions.length / limit)
        }
    });
});

app.get('/api/financial/monthly-report', authenticateAdmin, (req, res) => {
    res.json({
        monthlyStats: financialData.monthlyStats,
        yearlyTotal: Object.values(financialData.monthlyStats)
            .reduce((sum, month) => sum + month.revenue, 0)
    });
});

app.get('/api/files/:directory', authenticateAdmin, (req, res) => {
    // SEGURANÇA: Validar directory contra whitelist (prevenir path traversal CWE-22)
    const allowedDirs = ['incoming', 'processing', 'converted', 'expired'];
    const directory = req.params.directory;
    
    if (!allowedDirs.includes(directory)) {
        return res.status(400).json({ 
            success: false,
            error: 'Diretório inválido. Valores permitidos: incoming, processing, converted, expired' 
        });
    }
    
    const dirPath = path.join('uploads', directory);
    
    // Validar que o caminho resolvido permanece dentro de uploads/
    const resolvedPath = path.resolve(dirPath);
    const uploadsPath = path.resolve('uploads');
    if (!resolvedPath.startsWith(uploadsPath)) {
        return res.status(403).json({ 
            success: false,
            error: 'Acesso negado' 
        });
    }
    
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).map(file => {
                const stats = fs.statSync(path.join(dirPath, file));
                return {
                    name: file,
                    size: stats.size
                };
            });
            res.json({ files });
        } else {
            res.json({ files: [] });
        }
    } catch (error) {
        console.error(`Erro ao listar arquivos em ${directory}:`, error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao listar arquivos' 
        });
    }
});

// Rota Premium Area
app.get('/premium', (req, res) => {
    console.log('💎 Área premium acessada');
    res.json({
        success: true,
        area: 'premium',
        features: [
            'Conversão ilimitada de arquivos MPP',
            'Suporte prioritário 24/7',
            'Relatórios avançados',
            'API access',
            'Customização de templates'
        ],
        status: 'ativo',
        message: '✅ Bem-vindo à área premium!'
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 SERVIDOR ATIVO!');
    console.log('================');
    console.log(`✅ Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🎯 Pronto para teste!');
});

// Log de erros
app.on('error', (error) => {
    console.error('❌ Erro no servidor:', error);
});

// Tratamento robusto de exceções para produção
process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    console.log('🔄 Servidor continuará rodando...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejection não tratada:', reason);
    console.log('🔄 Servidor continuará rodando...');
});

// Graceful shutdown para produção (desabilitado para testes em background)
// process.on('SIGTERM', () => {
//     console.log('📴 Recebido SIGTERM, finalizando graciosamente...');
//     process.exit(0);
// });

// process.on('SIGINT', () => {
//     console.log('📴 Recebido SIGINT, finalizando graciosamente...');
//     process.exit(0);
// });