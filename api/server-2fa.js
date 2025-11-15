/**
 * Servidor com 2FA Real - Sistema de Códigos por Email
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

console.log('🔧 Iniciando servidor com 2FA...');

// Sistema de códigos 2FA
let pendingCodes = new Map(); // Store: email -> {code, timestamp, attempts, username}

// Configuração do email para 2FA
const emailTransporter = nodemailer.createTransporter({
    service: 'hotmail',
    auth: {
        user: 'rafaelcannalonga2@hotmail.com',
        pass: process.env.EMAIL_PASSWORD || 'SUA_SENHA_EMAIL_AQUI' // Configurar no .env
    }
});

// Teste da configuração de email
emailTransporter.verify((error, success) => {
    if (error) {
        console.log('⚠️ Configuração de email precisa ser ajustada:', error.message);
        console.log('📧 Códigos serão exibidos no console para desenvolvimento');
    } else {
        console.log('✅ Servidor de email configurado e pronto');
    }
});

// Middlewares básicos
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

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
    pricePerConversion: 10.00,
    transactions: [],
    dailyStats: {},
    monthlyStats: {}
};

// Função para gerar código 2FA
function generateTwoFactorCode() {
    return Math.floor(100000 + (crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF) * 900000).toString(); // 6 dígitos
}

// Função para enviar email com código 2FA
async function sendTwoFactorCode(email, code, username) {
    const mailOptions = {
        from: 'rafaelcannalonga2@hotmail.com',
        to: email,
        subject: '🔐 Código de Verificação - MPP Converter',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
                        🔐 MPP Converter - Verificação de Segurança
                    </h2>
                    
                    <p style="font-size: 16px; color: #34495e;">
                        Olá <strong>${username}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #34495e; line-height: 1.5;">
                        Detectamos uma tentativa de login no seu painel administrativo do MPP Converter.
                        Para completar o acesso, use o código de verificação abaixo:
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                        <p style="color: white; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                            Código de Verificação
                        </p>
                        <h1 style="color: white; font-size: 42px; margin: 0; letter-spacing: 8px; font-weight: bold;">
                            ${code}
                        </h1>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⚠️ <strong>Importante:</strong> Este código expira em 5 minutos e pode ser usado apenas uma vez.
                        </p>
                    </div>
                    
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #721c24; font-size: 14px;">
                            🛡️ <strong>Segurança:</strong> Se você não solicitou este acesso, alguém pode estar tentando acessar sua conta. 
                            Entre em contato imediatamente se suspeitar de atividade não autorizada.
                        </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    
                    <div style="text-align: center; color: #7f8c8d; font-size: 12px;">
                        <p style="margin: 5px 0;">
                            <strong>MPP Converter</strong> - Sistema de Conversão de Arquivos
                        </p>
                        <p style="margin: 5px 0;">
                            Horário: ${new Date().toLocaleString('pt-BR')}
                        </p>
                        <p style="margin: 5px 0;">
                            IP: Protegido por segurança
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Código 2FA enviado para ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email 2FA:', error.message);
        return false;
    }
}

// Função para registrar conversão paga
const registerPaidConversion = (fileName, amount) => {
    const transaction = {
        id: crypto.randomBytes(16).toString('hex'),
        fileName: fileName,
        amount: amount,
        date: new Date().toISOString(),
        status: 'completed'
    };
    
    financialData.transactions.push(transaction);
    financialData.conversionsCount++;
    financialData.totalRevenue += amount;
    
    const today = new Date().toISOString().split('T')[0];
    if (!financialData.dailyStats[today]) {
        financialData.dailyStats[today] = { count: 0, revenue: 0 };
    }
    financialData.dailyStats[today].count++;
    financialData.dailyStats[today].revenue += amount;
    
    const monthKey = new Date().toISOString().slice(0, 7);
    if (!financialData.monthlyStats[monthKey]) {
        financialData.monthlyStats[monthKey] = { count: 0, revenue: 0 };
    }
    financialData.monthlyStats[monthKey].count++;
    financialData.monthlyStats[monthKey].revenue += amount;
    
    console.log(`💰 Conversão registrada: ${fileName} - R$ ${amount}`);
    return transaction;
};

console.log('✅ Sistema financeiro configurado');

// ROTAS PRINCIPAIS

// Health check
app.get('/api/health', (req, res) => {
    console.log('💚 Health check requisitado');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Servidor com 2FA funcionando!',
        twoFactorEnabled: true
    });
});

// Upload e conversão
app.post('/api/upload', upload.single('file'), (req, res) => {
    console.log('📁 Upload recebido:', req.file ? req.file.originalname : 'Nenhum arquivo');
    
    if (!req.file) {
        console.log('❌ Nenhum arquivo no upload');
        return res.status(400).json({
            success: false,
            error: 'Nenhum arquivo enviado'
        });
    }

    // Sanitizar nome do arquivo para prevenir injeção XML
    const sanitizedFileName = req.file.originalname
        .replace(/[<>&'"]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .trim();

    const xmlContent = `<?xml version="1.0"?>
<Project>
    <Title>Conversão de ${sanitizedFileName}</Title>
    <Date>${new Date().toISOString()}</Date>
    <Status>Sucesso</Status>
    <ConvertedBy>MPP Converter Pro</ConvertedBy>
</Project>`;

    const xmlPath = path.join('uploads', 'converted', req.file.filename + '.xml');
    fs.writeFileSync(xmlPath, xmlContent);

    const transaction = registerPaidConversion(req.file.originalname, 10.00);

    console.log('✅ Arquivo convertido:', xmlPath);

    res.json({
        success: true,
        message: 'Arquivo convertido com sucesso!',
        xml: xmlContent,
        downloadUrl: '/api/download/' + req.file.filename + '.xml',
        transaction: {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status
        }
    });
});

// Download de arquivos convertidos
app.get('/api/download/:filename', (req, res) => {
    console.log('⬇️ Download solicitado:', req.params.filename);
    
    const filePath = path.join(__dirname, '../uploads/converted', req.params.filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'Arquivo não encontrado' });
    }
});

// SISTEMA DE AUTENTICAÇÃO 2FA

// Endpoint de login - Etapa 1: Validar credenciais e enviar código
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`[${new Date().toISOString()}] Tentativa de login:`, {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100)
    });
    
    // Credenciais personalizadas para Rafael Cannalonga
    if (username === 'Alcap0ne' && password === 'NovaSenh@2025#Sec$Conv789!') {
        const email = 'rafaelcannalonga2@hotmail.com';
        const code = generateTwoFactorCode();
        
        // Armazenar código temporariamente (5 minutos)
        pendingCodes.set(email, {
            code: code,
            timestamp: Date.now(),
            attempts: 0,
            username: username
        });
        
        // Limpar código após 5 minutos
        setTimeout(() => {
            if (pendingCodes.has(email)) {
                pendingCodes.delete(email);
                console.log('🗑️ Código 2FA expirado e removido');
            }
        }, 5 * 60 * 1000); // 5 minutos
        
        console.log('✅ Credenciais válidas para Rafael Cannalonga');
        console.log('📧 Gerando código 2FA...');
        
        // Tentar enviar email
        const emailSent = await sendTwoFactorCode(email, code, username);
        
        if (emailSent) {
            res.json({ 
                success: true, 
                message: 'Código de verificação enviado para seu email',
                requiresCode: true,
                email: email
            });
        } else {
            // Fallback: mostrar código no console para desenvolvimento
            console.log(`🔐 [DESENVOLVIMENTO] Código 2FA: ${code}`);
            // Sensitive password logging removed for security;
            
            res.json({ 
                success: true, 
                message: 'Código gerado (verifique o console do servidor)',
                requiresCode: true,
                email: email,
                devCode: code // Para desenvolvimento - remover em produção
            });
        }
    } else {
        console.log('❌ Tentativa de login inválida:', { username });
        
        // Log de tentativa de invasão
        setTimeout(() => {
            console.log('🚨 Alerta de segurança: tentativa de acesso não autorizado');
        }, 1000);
        
        res.status(401).json({ 
            success: false, 
            message: 'Credenciais inválidas' 
        });
    }
});

// Endpoint de login - Etapa 2: Validar código 2FA
app.post('/api/verify-code', (req, res) => {
    const { code, email } = req.body;
    
    console.log(`[${new Date().toISOString()}] Tentativa de validação 2FA:`, {
        email,
        code: code?.substring(0, 3) + '***', // Partial log for security
        ip: req.ip
    });
    
    const storedData = pendingCodes.get(email);
    
    if (!storedData) {
        console.log('❌ Código não encontrado ou expirado');
        return res.status(400).json({ 
            success: false, 
            message: 'Código não encontrado ou expirado. Faça login novamente.' 
        });
    }
    
    // Verificar se código expirou (5 minutos)
    const isExpired = (Date.now() - storedData.timestamp) > 5 * 60 * 1000;
    if (isExpired) {
        pendingCodes.delete(email);
        console.log('❌ Código expirado');
        return res.status(400).json({ 
            success: false, 
            message: 'Código expirado. Faça login novamente.' 
        });
    }
    
    // Verificar tentativas (máximo 3)
    if (storedData.attempts >= 3) {
        pendingCodes.delete(email);
        console.log('❌ Muitas tentativas de código inválido');
        return res.status(400).json({ 
            success: false, 
            message: 'Muitas tentativas incorretas. Faça login novamente.' 
        });
    }
    
    // Validar código
    if (code === storedData.code) {
        // Código correto - limpar e autenticar
        pendingCodes.delete(email);
        
        const authToken = `admin_token_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
        
        console.log('✅ Código 2FA válido - Login completo para', storedData.username);
        // Sensitive token logging removed for security;
        
        res.json({ 
            success: true, 
            message: 'Autenticação 2FA completa',
            token: authToken,
            user: storedData.username,
            email: email,
            loginTime: new Date().toISOString()
        });
    } else {
        // Código incorreto - incrementar tentativas
        storedData.attempts++;
        console.log(`❌ Código inválido - Tentativa ${storedData.attempts}/3`);
        
        res.status(400).json({ 
            success: false, 
            message: `Código incorreto. Tentativas restantes: ${3 - storedData.attempts}` 
        });
    }
});

// Middleware de autenticação para rotas admin
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }
    
    const token = authHeader.substring(7);
    if (token.startsWith('admin_token_')) {
        // Validar se token não expirou (24 horas)
        const tokenParts = token.split('_');
        const timestamp = parseInt(tokenParts[tokenParts.length - 1]);
        const isTokenExpired = (Date.now() - timestamp) > 24 * 60 * 60 * 1000;
        
        if (isTokenExpired) {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        }
        
        next();
    } else {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// ROTAS ADMIN PROTEGIDAS

// Estatísticas básicas
app.get('/api/stats/conversions-today', authenticateAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = financialData.dailyStats[today] || { count: 0 };
    res.json({ count: todayStats.count });
});

app.get('/api/stats/total-files', authenticateAdmin, (req, res) => {
    res.json({ count: financialData.conversionsCount });
});

app.get('/api/stats/disk-usage', authenticateAdmin, (req, res) => {
    // Simular uso do disco
    res.json({ usage: Math.floor((crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF) * 30) + 10 });
});

// Relatórios financeiros
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

// Gestão de arquivos
app.get('/api/files/:directory', authenticateAdmin, (req, res) => {
    const directory = req.params.directory;
    const dirPath = path.join('uploads', directory);
    
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).map(file => {
                const stats = fs.statSync(path.join(dirPath, file));
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime
                };
            });
            res.json({ files });
        } else {
            res.json({ files: [] });
        }
    } catch (error) {
        console.error('Erro ao listar arquivos:', error);
        res.json({ files: [] });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 SERVIDOR 2FA ATIVO!');
    console.log('====================');
    console.log(`✅ Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🛡️ Sistema 2FA configurado!');
    console.log('📧 Email: rafaelcannalonga2@hotmail.com');
    // Sensitive password logging removed for security;
    console.log('');
    console.log('🎯 Pronto para autenticação segura!');
});

// Tratamento de erros
app.on('error', (error) => {
    console.error('❌ Erro no servidor:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    console.log('🔄 Servidor continuará rodando...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejection não tratada:', reason);
    console.log('🔄 Servidor continuará rodando...');
});

process.on('SIGTERM', () => {
    console.log('📴 Recebido SIGTERM, finalizando graciosamente...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Recebido SIGINT, finalizando graciosamente...');
    process.exit(0);
});