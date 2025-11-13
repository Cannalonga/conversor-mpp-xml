const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import security module for enterprise-grade protection
const security = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ SECURITY HARDENING - ENTERPRISE GRADE
// Apply comprehensive security configuration
security.configureHelmet(app);
security.configureCORS(app);
security.applyRateLimiting(app);

// Enable compression with security considerations
app.use(require('compression')());

// Security logging
app.use(security.securityLogger);
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: 'Muitas requisições, tente novamente em 15 minutos.'
});
app.use('/api', limiter);

// Middleware para rastrear visualizações de página
app.use((req, res, next) => {
    // Rastrear apenas páginas principais, não recursos estáticos
    const isPageView = !req.path.startsWith('/api') && 
                      !req.path.startsWith('/css') && 
                      !req.path.startsWith('/js') && 
                      !req.path.includes('favicon') &&
                      !req.path.includes('.png') &&
                      !req.path.includes('.jpg') &&
                      !req.path.includes('.ico');
    
    if (isPageView) {
        try {
            const analytics = AnalyticsManager.trackPageView(req);
            console.log(`📊 Página visitada: ${req.path} | IP: ${AnalyticsManager.getClientIP(req)} | Total: ${analytics.totalViews} visualizações`);
        } catch (error) {
            console.error('Erro no tracking de analytics:', error);
        }
    }
    next();
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mpp'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo não suportado. Use apenas arquivos .mpp'));
        }
    }
});

// Banco de dados em memória (em produção, use um banco real)
const database = {
    conversions: new Map(),
    payments: new Map(),
    analytics: {
        pageViews: 0,
        uniqueVisitors: new Set(),
        dailyStats: new Map(),
        hourlyStats: new Map(),
        visitors: new Map(), // IP -> dados do visitante
        sessions: new Map()  // sessionId -> dados da sessão
    }
};

// Classes para gerenciar conversões e pagamentos
class ConversionManager {
    static async createConversion(fileInfo) {
        const conversionId = crypto.randomUUID();
        const conversion = {
            id: conversionId,
            fileName: fileInfo.originalname,
            filePath: fileInfo.path,
            status: 'uploaded', // uploaded, processing, completed, failed
            createdAt: new Date(),
            updatedAt: new Date(),
            downloadCount: 0
        };
        
        database.conversions.set(conversionId, conversion);
        return conversion;
    }
    
    static async getConversion(conversionId) {
        return database.conversions.get(conversionId);
    }
    
    static async updateConversionStatus(conversionId, status, outputPath = null) {
        const conversion = database.conversions.get(conversionId);
        if (conversion) {
            conversion.status = status;
            conversion.updatedAt = new Date();
            if (outputPath) {
                conversion.outputPath = outputPath;
            }
            return conversion;
        }
        return null;
    }
    
    static async processConversion(conversionId) {
        const conversion = await this.getConversion(conversionId);
        if (!conversion) {
            throw new Error('Conversão não encontrada');
        }
        
        await this.updateConversionStatus(conversionId, 'processing');
        
        try {
            // Simular conversão (substitua pela implementação real)
            const outputPath = await this.convertMppToXml(conversion.filePath);
            await this.updateConversionStatus(conversionId, 'completed', outputPath);
            return conversion;
        } catch (error) {
            await this.updateConversionStatus(conversionId, 'failed');
            throw error;
        }
    }
    
    static async convertMppToXml(inputPath) {
        // Implementação simulada da conversão
        // Em produção, use uma biblioteca apropriada como node-mpp ou similar
        
        const outputPath = inputPath.replace('.mpp', '.xml');
        
        // Simular processamento (remova isto em produção)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // XML básico de exemplo (substitua pela conversão real)
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
    <Name>Projeto Convertido</Name>
    <CreatedFrom>Microsoft Project (.mpp)</CreatedFrom>
    <ConversionDate>${new Date().toISOString()}</ConversionDate>
    <Tasks>
        <!-- As tarefas serão extraídas do arquivo .mpp -->
        <Task>
            <ID>1</ID>
            <Name>Tarefa de Exemplo</Name>
            <Start>2025-01-01</Start>
            <Finish>2025-01-05</Finish>
            <Duration>5 days</Duration>
        </Task>
    </Tasks>
    <Resources>
        <!-- Os recursos serão extraídos do arquivo .mpp -->
        <Resource>
            <ID>1</ID>
            <Name>Recurso de Exemplo</Name>
            <Type>Work</Type>
        </Resource>
    </Resources>
</Project>`;
        
        await fs.writeFile(outputPath, xmlContent, 'utf8');
        return outputPath;
    }
}

class PaymentManager {
    static async createPayment(conversionId, amount) {
        const paymentId = crypto.randomUUID();
        const payment = {
            id: paymentId,
            conversionId,
            amount,
            status: 'pending', // pending, paid, expired, failed
            pixKey: process.env.PIX_KEY || '02038351740',
            bankName: 'Nubank',
            qrCode: null,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
        };
        
        database.payments.set(paymentId, payment);
        return payment;
    }
    
    static async getPaymentByConversion(conversionId) {
        for (const payment of database.payments.values()) {
            if (payment.conversionId === conversionId) {
                return payment;
            }
        }
        return null;
    }
    
    static async updatePaymentStatus(paymentId, status) {
        const payment = database.payments.get(paymentId);
        if (payment) {
            payment.status = status;
            payment.updatedAt = new Date();
            return payment;
        }
        return null;
    }
    
    static async generateQRCode(paymentId) {
        const payment = database.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pagamento não encontrado');
        }
        
        // Implementação simulada do QR Code PIX
        // Em produção, use uma biblioteca apropriada ou API do seu banco
        const pixData = {
            pixKey: payment.pixKey,
            amount: payment.amount,
            description: `Conversão MPP para XML - ${payment.conversionId}`,
            merchantName: 'MPP Converter',
            merchantCity: 'São Paulo',
            txid: payment.id.substring(0, 25)
        };
        
        // Gerar string do PIX (EMV) - implementação simplificada
        const pixString = this.generatePixString(pixData);
        
        // Gerar QR Code em base64 (implementação simulada)
        const qrCodeBase64 = await this.generateQRCodeImage(pixString);
        
        payment.qrCode = qrCodeBase64;
        payment.pixString = pixString;
        
        return payment;
    }
    
    static generatePixString(data) {
        // Implementação simplificada do formato EMV do PIX
        // Em produção, use uma biblioteca apropriada
        return `00020126330014BR.GOV.BCB.PIX0111${data.pixKey}520400005303986540${data.amount.toFixed(2)}5802BR5913${data.merchantName}6009${data.merchantCity}62070503***6304`;
    }
    
    static async generateQRCodeImage(text) {
        // Implementação simulada
        // Em produção, use uma biblioteca como 'qrcode' para gerar a imagem
        const QRCode = require('qrcode');
        return await QRCode.toDataURL(text);
    }
}

// Classe para gerenciar analytics e contadores
class AnalyticsManager {
    static trackPageView(req) {
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'Unknown';
        const referer = req.get('Referer') || 'Direct';
        const timestamp = new Date();
        const today = timestamp.toISOString().split('T')[0];
        const hour = timestamp.getHours();
        
        // Incrementar contador geral
        database.analytics.pageViews++;
        
        // Rastrear visitante único
        database.analytics.uniqueVisitors.add(ip);
        
        // Estatísticas diárias
        if (!database.analytics.dailyStats.has(today)) {
            database.analytics.dailyStats.set(today, {
                date: today,
                views: 0,
                uniqueVisitors: new Set(),
                conversions: 0,
                revenue: 0
            });
        }
        database.analytics.dailyStats.get(today).views++;
        database.analytics.dailyStats.get(today).uniqueVisitors.add(ip);
        
        // Estatísticas horárias
        const hourKey = `${today}-${hour.toString().padStart(2, '0')}`;
        if (!database.analytics.hourlyStats.has(hourKey)) {
            database.analytics.hourlyStats.set(hourKey, {
                datetime: hourKey,
                views: 0,
                uniqueVisitors: new Set()
            });
        }
        database.analytics.hourlyStats.get(hourKey).views++;
        database.analytics.hourlyStats.get(hourKey).uniqueVisitors.add(ip);
        
        // Dados do visitante
        if (!database.analytics.visitors.has(ip)) {
            database.analytics.visitors.set(ip, {
                ip,
                firstVisit: timestamp,
                lastVisit: timestamp,
                visits: 0,
                userAgent,
                country: 'BR', // Em produção, use serviço de geolocalização
                city: 'Desconhecida'
            });
        }
        const visitor = database.analytics.visitors.get(ip);
        visitor.lastVisit = timestamp;
        visitor.visits++;
        visitor.lastReferer = referer;
        
        return {
            totalViews: database.analytics.pageViews,
            uniqueVisitors: database.analytics.uniqueVisitors.size,
            todayViews: database.analytics.dailyStats.get(today)?.views || 0,
            visitor: visitor
        };
    }
    
    static trackConversion(conversionId, ip) {
        const today = new Date().toISOString().split('T')[0];
        const dailyStat = database.analytics.dailyStats.get(today);
        if (dailyStat) {
            dailyStat.conversions++;
            dailyStat.revenue += 10.00;
        }
    }
    
    static getClientIP(req) {
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               '127.0.0.1';
    }
    
    static getDashboardStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayStats = database.analytics.dailyStats.get(today);
        
        // Últimos 7 dias
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayStats = database.analytics.dailyStats.get(dateStr);
            last7Days.push({
                date: dateStr,
                views: dayStats?.views || 0,
                uniqueVisitors: dayStats?.uniqueVisitors.size || 0,
                conversions: dayStats?.conversions || 0,
                revenue: dayStats?.revenue || 0
            });
        }
        
        // Top visitantes
        const topVisitors = Array.from(database.analytics.visitors.values())
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10)
            .map(v => ({
                ip: v.ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*.***'), // Anonimizar IP
                visits: v.visits,
                firstVisit: v.firstVisit,
                lastVisit: v.lastVisit,
                country: v.country
            }));
        
        return {
            overview: {
                totalViews: database.analytics.pageViews,
                uniqueVisitors: database.analytics.uniqueVisitors.size,
                todayViews: todayStats?.views || 0,
                todayUniqueVisitors: todayStats?.uniqueVisitors.size || 0,
                conversionRate: database.analytics.pageViews > 0 ? 
                    ((database.conversions.size / database.analytics.pageViews) * 100).toFixed(2) + '%' : '0%'
            },
            last7Days,
            topVisitors,
            recentVisitors: Array.from(database.analytics.visitors.values())
                .sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit))
                .slice(0, 20)
                .map(v => ({
                    ip: v.ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*.***'),
                    lastVisit: v.lastVisit,
                    visits: v.visits,
                    country: v.country
                }))
        };
    }
}

// Rotas da API

// Upload de arquivo
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        const conversion = await ConversionManager.createConversion(req.file);
        
        // Rastrear tentativa de conversão
        const ip = AnalyticsManager.getClientIP(req);
        AnalyticsManager.trackConversion(conversion.id, ip);
        
        res.json({
            success: true,
            conversionId: conversion.id,
            message: 'Arquivo enviado com sucesso'
        });
        
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Gerar QR Code para pagamento
app.post('/api/payment/qrcode', async (req, res) => {
    try {
        const { conversionId, amount } = req.body;
        
        if (!conversionId || !amount) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const conversion = await ConversionManager.getConversion(conversionId);
        if (!conversion) {
            return res.status(404).json({ error: 'Conversão não encontrada' });
        }
        
        let payment = await PaymentManager.getPaymentByConversion(conversionId);
        if (!payment) {
            payment = await PaymentManager.createPayment(conversionId, amount);
        }
        
        await PaymentManager.generateQRCode(payment.id);
        
        res.json({
            success: true,
            paymentId: payment.id,
            qrCodeImage: payment.qrCode.split(',')[1], // Remove data:image/png;base64, prefix
            pixKey: payment.pixKey,
            amount: payment.amount,
            expiresAt: payment.expiresAt
        });
        
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar status do pagamento
app.get('/api/payment/status/:conversionId', async (req, res) => {
    try {
        const { conversionId } = req.params;
        
        const payment = await PaymentManager.getPaymentByConversion(conversionId);
        if (!payment) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }
        
        // Verificar se o pagamento expirou
        if (new Date() > payment.expiresAt && payment.status === 'pending') {
            await PaymentManager.updatePaymentStatus(payment.id, 'expired');
            payment.status = 'expired';
        }
        
        // Simular verificação de pagamento (em produção, consulte a API do seu banco)
        if (payment.status === 'pending' && Math.random() > 0.95) {
            await PaymentManager.updatePaymentStatus(payment.id, 'paid');
            payment.status = 'paid';
            
            // Iniciar conversão após pagamento confirmado
            setTimeout(async () => {
                await ConversionManager.processConversion(conversionId);
            }, 1000);
        }
        
        res.json({
            status: payment.status,
            expiresAt: payment.expiresAt
        });
        
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Simular confirmação de pagamento (webhook do banco)
app.post('/api/payment/webhook', async (req, res) => {
    try {
        const { paymentId, status, txid } = req.body;
        
        // Verificar assinatura do webhook (implementar em produção)
        
        const payment = database.payments.get(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }
        
        await PaymentManager.updatePaymentStatus(paymentId, status);
        
        if (status === 'paid') {
            // Iniciar conversão
            await ConversionManager.processConversion(payment.conversionId);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Download do arquivo convertido
app.get('/api/download/:conversionId', async (req, res) => {
    try {
        const { conversionId } = req.params;
        
        const conversion = await ConversionManager.getConversion(conversionId);
        if (!conversion) {
            return res.status(404).json({ error: 'Conversão não encontrada' });
        }
        
        // Verificar se o pagamento foi realizado
        const payment = await PaymentManager.getPaymentByConversion(conversionId);
        if (!payment || payment.status !== 'paid') {
            return res.status(403).json({ error: 'Pagamento não confirmado' });
        }
        
        // Verificar se a conversão foi concluída
        if (conversion.status !== 'completed') {
            return res.status(400).json({ error: 'Conversão ainda em processamento' });
        }
        
        if (!conversion.outputPath) {
            return res.status(404).json({ error: 'Arquivo convertido não encontrado' });
        }
        
        // Incrementar contador de download
        conversion.downloadCount++;
        
        const fileName = conversion.fileName.replace('.mpp', '.xml');
        
        res.download(conversion.outputPath, fileName, (err) => {
            if (err) {
                console.error('Erro no download:', err);
                res.status(500).json({ error: 'Erro ao baixar arquivo' });
            }
        });
        
    } catch (error) {
        console.error('Erro no download:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Status da conversão
app.get('/api/conversion/status/:conversionId', async (req, res) => {
    try {
        const { conversionId } = req.params;
        
        const conversion = await ConversionManager.getConversion(conversionId);
        if (!conversion) {
            return res.status(404).json({ error: 'Conversão não encontrada' });
        }
        
        res.json({
            status: conversion.status,
            fileName: conversion.fileName,
            createdAt: conversion.createdAt,
            updatedAt: conversion.updatedAt
        });
        
    } catch (error) {
        console.error('Erro ao obter status da conversão:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter estatísticas de analytics (admin)
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const stats = AnalyticsManager.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Erro ao obter analytics:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para contador simples de visualizações
app.get('/api/analytics/counter', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayStats = database.analytics.dailyStats.get(today);
        
        res.json({
            totalViews: database.analytics.pageViews,
            uniqueVisitors: database.analytics.uniqueVisitors.size,
            todayViews: todayStats?.views || 0,
            todayUniqueVisitors: todayStats?.uniqueVisitors.size || 0
        });
    } catch (error) {
        console.error('Erro ao obter contador:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 50MB' });
        }
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Limpeza periódica de arquivos antigos
setInterval(async () => {
    try {
        const now = new Date();
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        for (const [id, conversion] of database.conversions.entries()) {
            if (conversion.createdAt < dayAgo) {
                // Deletar arquivos
                try {
                    await fs.unlink(conversion.filePath);
                    if (conversion.outputPath) {
                        await fs.unlink(conversion.outputPath);
                    }
                } catch (e) {
                    console.error('Erro ao deletar arquivo:', e);
                }
                
                // Remover do banco de dados
                database.conversions.delete(id);
            }
        }
        
        for (const [id, payment] of database.payments.entries()) {
            if (payment.createdAt < dayAgo) {
                database.payments.delete(id);
            }
        }
        
        console.log('Limpeza de arquivos antigos concluída');
    } catch (error) {
        console.error('Erro na limpeza:', error);
    }
}, 60 * 60 * 1000); // A cada hora

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});