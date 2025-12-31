const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const uploadUtils = require('./upload-utils');
const downloadToken = require('../utils/downloadToken');

// Import converter routes (4 novos conversores)
const converterRoutes = require('./converter-routes');

// Import v1 API routes (list converters)
const convertersV1Routes = require('./routes/converters-v1');

// Import queue API routes
const queueRoutes = require('./routes/queue');

// Import memory-based queue (no Redis required)
let fileQueue;
try {
    fileQueue = require('../queue/queue-memory');
} catch (e) {
    console.warn('[QUEUE] Memory queue not available, using fallback');
    fileQueue = null;
}

const EnterpriseLogger = require('./logger-enterprise');
const HealthChecker = require('./health-checker');
const MetricsCollector = require('./metrics');

// Initialize Enterprise Logger
const logger = new EnterpriseLogger('SERVER', {
    logsDir: path.join(__dirname, '../logs'),
    level: process.env.LOG_LEVEL || 'INFO'
});

// Initialize Health Checker
const healthChecker = new HealthChecker({
    logsDir: path.join(__dirname, '../logs'),
    uploadsDir: path.join(__dirname, '../uploads')
});

// Initialize Metrics Collector
const metricsCollector = new MetricsCollector();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ SECURITY: Parse ALLOWED_ORIGINS from environment
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

console.log('🔒 ALLOWED_ORIGINS:', allowedOrigins);

// 🛡️ SECURITY HARDENING - Helmet com configuração rigorosa
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "http:", "https:"],
            connectSrc: ["'self'", "http:", "https:", ...allowedOrigins],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            manifestSrc: ["'self'"]
            // ❌ NÃO incluir upgrade-insecure-requests (causa redirect HTTP→HTTPS)
        },
        reportUri: '/api/security/csp-report',
        reportOnly: false
    },
    
    // ✅ HSTS - Força HTTPS (desabilitar para desenvolvimento HTTP)
    hsts: false,
    // hsts: {
    //     maxAge: 31536000,           // 1 ano
    //     includeSubDomains: true,
    //     preload: true
    // },
    
    // ✅ Outros headers de segurança
    noSniff: true,                  // X-Content-Type-Options: nosniff
    xssFilter: true,                // X-XSS-Protection
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    permittedCrossDomainPolicies: false,
    
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' }
};

// ✅ Usar helmet e remover upgrade-insecure-requests se for adicionado automaticamente
app.use(helmet(helmetConfig));

// ✅ Middleware para remover upgrade-insecure-requests da CSP se Helmet adicionar
app.use((req, res, next) => {
    const cspHeader = res.getHeader('Content-Security-Policy');
    if (cspHeader && typeof cspHeader === 'string') {
        const cleanedCSP = cspHeader.replace(/;\s*upgrade-insecure-requests/gi, '')
                                    .replace(/upgrade-insecure-requests;\s*/gi, '');
        res.setHeader('Content-Security-Policy', cleanedCSP);
    }
    next();
});

// ✅ SECURITY: CORS com whitelist rigoroso
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sem origin (mobile apps, curl)
        if (!origin) {
            return callback(null, true);
        }
        
        // Verificar whitelist
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const msg = `CORS origin not allowed: ${origin}`;
            console.warn('🚫', msg);
            callback(new Error(msg));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 3600,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ✅ SECURITY: Log CORS rejections
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        logger.warn('CORS_REJECTED', {
            origin: req.get('origin'),
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(403).json({ error: err.message });
    }
    next(err);
});

// ✅ SECURITY: CSP Report endpoint
app.post('/api/security/csp-report', express.json({ limit: '1kb' }), (req, res) => {
    const report = req.body['csp-report'] || req.body;
    logger.warn('CSP_VIOLATION', {
        violated_directive: report['violated-directive'],
        blocked_uri: report['blocked-uri'],
        source_file: report['source-file'],
        line_number: report['line-number'],
        ip: req.ip,
        user_agent: req.get('user-agent')
    });
    res.sendStatus(204);
});

// Enable compression
app.use(require('compression')());

app.use(express.json());

// 🏥 ROTA DE HEALTH CHECK - COM DIAGNOSTICS COMPLETOS (ANTES DOS ARQUIVOS ESTÁTICOS)
app.get('/health', async (req, res) => {
    try {
        // Run comprehensive health check
        const healthStatus = await healthChecker.runHealthCheck();
        
        logger.info('HEALTH_CHECK_REQUESTED', {
            timestamp: healthStatus.timestamp,
            ip: req.ip,
            overall_status: healthStatus.status,
            duration_ms: healthStatus.duration
        });
        
        // Return appropriate status code based on health status
        const statusCode = 
            healthStatus.status === 'HEALTHY' ? 200 :
            healthStatus.status === 'DEGRADED' ? 200 :
            healthStatus.status === 'CRITICAL' ? 503 :
            500;
        
        res.status(statusCode).json(healthStatus);
    } catch (error) {
        logger.error('HEALTH_CHECK_FAILED', error, {
            ip: req.ip
        });
        res.status(500).json({ 
            status: 'OFFLINE',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📊 ROTA DE MÉTRICAS PROMETHEUS
app.get('/metrics', (req, res) => {
    try {
        const prometheusMetrics = metricsCollector.exportPrometheus();
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.send(prometheusMetrics);
        
        logger.debug('METRICS_PROMETHEUS_EXPORTED', {
            ip: req.ip,
            format: 'prometheus'
        });
    } catch (error) {
        logger.error('METRICS_EXPORT_FAILED', error, {
            ip: req.ip
        });
        res.status(500).json({ 
            error: 'Failed to export metrics',
            message: error.message
        });
    }
});

// 📊 ROTA DE MÉTRICAS JSON
app.get('/metrics/json', (req, res) => {
    try {
        const jsonMetrics = metricsCollector.exportJSON();
        res.json(jsonMetrics);
        
        logger.debug('METRICS_JSON_EXPORTED', {
            ip: req.ip,
            format: 'json'
        });
    } catch (error) {
        logger.error('METRICS_EXPORT_FAILED', error, {
            ip: req.ip
        });
        res.status(500).json({ 
            error: 'Failed to export metrics',
            message: error.message
        });
    }
});

// 📊 ROTA DE RESUMO DE MÉTRICAS
app.get('/metrics/summary', (req, res) => {
    try {
        const summary = metricsCollector.getSummary();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            summary: summary
        });
        
        logger.debug('METRICS_SUMMARY_EXPORTED', {
            ip: req.ip
        });
    } catch (error) {
        logger.error('METRICS_SUMMARY_FAILED', error, {
            ip: req.ip
        });
        res.status(500).json({ 
            error: 'Failed to export metrics summary',
            message: error.message
        });
    }
});

// 📁 STATIC FILES MIDDLEWARE COM CACHE HEADERS CORRETOS
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',                    // Cache por 1 dia
    etag: true,                      // Enable ETag
    lastModified: true,              // Enable Last-Modified
    redirect: false,
    dotfiles: 'deny'                 // Não servir arquivos ocultos
}));

// 🎯 MIDDLEWARE DE CACHE EXPLÍCITO PARA ASSETS
app.use((req, res, next) => {
    // CSS, JS, Fonts - Cache agressivo
    if (req.url.match(/\.(css|js|woff|woff2|ttf|eot|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 ano
        res.set('Content-Type', req.url.endsWith('.css') ? 'text/css' : 
                               req.url.endsWith('.js') ? 'application/javascript' : 
                               'application/font');
    }
    // HTML - Sem cache (sempre verificar)
    else if (req.url.match(/\.html$/i) || req.url === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
    }
    // Imagens - Cache moderado
    else if (req.url.match(/\.(jpg|jpeg|png|gif|webp|ico|svg)$/i)) {
        res.set('Cache-Control', 'public, max-age=86400'); // 1 dia
    }
    
    next();
});

app.use(compression());

// 🔌 ROTAS DOS 4 NOVOS CONVERSORES
// - POST /api/converters/excel-to-csv
// - POST /api/converters/json-to-csv
// - POST /api/converters/zip-to-xml
// - POST /api/converters/xml-to-mpp
// - GET /api/converters/health
app.use('/api/converters', converterRoutes);
app.use('/api/convert', converterRoutes);

// 🔌 API V1 - LISTA DE CONVERSORES
// - GET /api/v1/converters (lista todos)
// - GET /api/v1/converters/:id (detalhes)
// - GET /api/v1/converters/supported/inputs
// - GET /api/v1/converters/supported/outputs
app.use('/api/v1/converters', convertersV1Routes);

// 🔌 QUEUE API - Gerenciamento de fila
// - GET /api/queue/info
// - GET /api/queue/stats
// - GET /api/queue/health
// - GET /api/queue/job/:id
// - POST /api/queue/job
app.use('/api/queue', queueRoutes);

// 🛡️ RATE LIMITING - Proteção contra ataques
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP por janela
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // máximo 5 uploads por minuto por IP
    message: {
        error: 'Muitos uploads. Aguarde 1 minuto.',
        retryAfter: '1 minuto'
    }
});

app.use('/api', apiLimiter);
app.use('/api/upload-test', uploadLimiter);

// 🔒 MIDDLEWARE DE MONITORAMENTO DE SEGURANÇA
app.use((req, res, next) => {
    // Log de requests suspeitos
    const suspiciousPatterns = [
        /\.\./,                    // Path traversal
        /[<>\"']/,                 // XSS attempts  
        /union.*select/i,          // SQL injection
        /(script|javascript|vbscript)/i // Script injection
    ];
    
    const fullUrl = req.url;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(fullUrl));
    
    if (isSuspicious) {
        logger.security('SUSPICIOUS_REQUEST_DETECTED', 'high', {
            ip: req.ip,
            url: fullUrl,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
            error: 'Request inválido',
            code: 'SUSPICIOUS_ACTIVITY'
        });
    }
    
    next();
});

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

// 🛡️ CONFIGURAÇÃO SEGURA DE UPLOAD
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/incoming';
        const success = await uploadUtils.ensureDirectory(uploadDir);
        if (success) {
            cb(null, uploadDir);
        } else {
            cb(new Error('Erro ao preparar diretório de upload'));
        }
    },
    filename: (req, file, cb) => {
        try {
            // Gera nome seguro com UUID
            const safeFilename = uploadUtils.generateSafeFilename(file.originalname);
            cb(null, safeFilename);
        } catch (error) {
            cb(error);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: uploadUtils.MAX_FILE_SIZE,
        files: 1, // Apenas um arquivo por vez
        fieldNameSize: 100,
        fieldSize: 1024
    },
    fileFilter: (req, file, cb) => {
        // Validação completa usando utilitários seguros
        const validation = uploadUtils.validateUpload(file);
        
        if (validation.valid) {
            cb(null, true);
        } else {
            const errorMsg = validation.errors.join(', ');
            cb(new Error(errorMsg));
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

// Rota de teste para upload
// 🛡️ ROTA SEGURA DE UPLOAD COM FILA
app.post('/api/upload-test', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            logger.warn('UPLOAD_FAILED_NO_FILE', {
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
            
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhum arquivo enviado',
                code: 'NO_FILE'
            });
        }

        // Validação adicional pós-upload
        const validation = uploadUtils.validateUpload(req.file);
        if (!validation.valid) {
            logger.warn('UPLOAD_VALIDATION_FAILED', {
                filename: req.file.originalname,
                errors: validation.errors,
                ip: req.ip
            });
            
            // Remove arquivo inválido
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('UNLINK_ERROR', unlinkError, {
                    path: req.file.path
                });
            }
            
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', '),
                code: 'VALIDATION_FAILED'
            });
        }

        // Log seguro do upload
        const logData = uploadUtils.logUploadInfo(req.file, req.file.filename);
        
        logger.info('FILE_UPLOAD_STARTED', {
            filename: logData.originalName,
            size: req.file.size,
            ip: req.ip,
            jobId: req.file.filename
        });
        
        // Enfileirar para processamento
        try {
            const jobResult = await fileQueue.addConversionJob(req.file.filename, {
                originalName: logData.originalName,
                size: req.file.size,
                userId: req.ip
            });

            // Gerar token para download futuro
            const downloadTokenString = downloadToken.gerarToken(
                req.file.filename.replace('.mpp', '.xml'),
                {
                    originalName: logData.originalName.replace('.mpp', '_convertido.xml'),
                    jobId: jobResult.jobId
                }
            );

            logger.info('FILE_UPLOAD_QUEUED', {
                jobId: jobResult.jobId,
                filename: logData.originalName,
                size: req.file.size,
                ip: req.ip
            });

            res.status(202).json({
                success: true,
                message: 'Arquivo enviado para processamento',
                jobId: jobResult.jobId,
                status: jobResult.status,
                filename: logData.originalName,
                downloadToken: downloadTokenString,
                statusUrl: `/api/status/${jobResult.jobId}`,
                estimatedTime: '2-5 minutos',
                createdAt: jobResult.createdAt
            });

        } catch (queueError) {
            logger.error('QUEUE_ENQUEUE_FAILED', queueError, {
                filename: req.file.originalname,
                ip: req.ip
            });
            
            // Remove arquivo se falhou ao enfileirar
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('CLEANUP_UNLINK_FAILED', unlinkError);
            }

            return res.status(500).json({
                success: false,
                error: 'Erro no sistema de processamento',
                code: 'QUEUE_FAILED'
            });
        }
        
    } catch (error) {
        logger.error('UPLOAD_CRITICAL_ERROR', error, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Função para gerar XML de exemplo
function generateSampleXML(originalName) {
    const currentDate = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <SaveVersion>14</SaveVersion>
    <Name>Projeto Convertido - ${originalName}</Name>
    <Title>Conversão MPP para XML</Title>
    <Subject>Arquivo convertido automaticamente</Subject>
    <Author>Conversor MPP-XML</Author>
    <CreationDate>${currentDate}</CreationDate>
    <LastSaved>${currentDate}</LastSaved>
    <StartDate>2024-01-01T08:00:00</StartDate>
    <FinishDate>2024-12-31T17:00:00</FinishDate>
    <CurrencySymbol>R$</CurrencySymbol>
    <CurrencyCode>BRL</CurrencyCode>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Projeto Principal - ${originalName}</Name>
            <Type>1</Type>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
            <Duration>PT8760H0M0S</Duration>
            <Work>PT2000H0M0S</Work>
            <PercentComplete>0</PercentComplete>
            <Priority>500</Priority>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Gerente de Projeto</Name>
            <Type>1</Type>
            <StandardRate>80.00</StandardRate>
            <OvertimeRate>120.00</OvertimeRate>
        </Resource>
    </Resources>
</Project>`;
}

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

// ⚠️ SPA FALLBACK ROUTER - APENAS PARA ROTAS SEM EXTENSÃO
// DEVE VIR DEPOIS DE TODOS OS app.use() E app.get() específicos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Rota catch-all SPA (APENAS para rotas HTML5, não para assets)
app.get('*', (req, res, next) => {
    // NÃO servir index.html para assets
    if (req.path.match(/\.\w+$/)) {
        // Tem extensão de arquivo (ex: .css, .js, .png) - deixar 404
        return res.status(404).json({ 
            error: 'Arquivo não encontrado',
            path: req.path
        });
    }
    
    // Para rotas sem extensão, servir index.html (SPA)
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
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

// 📊 ROTA DE STATUS DE JOB
app.get('/api/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const status = await fileQueue.getJobStatus(jobId);
        res.json(status);
    } catch (error) {
        console.error('❌ Erro ao obter status do job:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'STATUS_ERROR'
        });
    }
});

// 📥 ROTA SEGURA DE DOWNLOAD
app.get('/api/download/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Validar token
        const payload = downloadToken.validarToken(token);
        if (!payload) {
            return res.status(401).json({
                error: 'Token inválido ou expirado',
                code: 'INVALID_TOKEN'
            });
        }

        const filename = payload.filename;
        const filePath = path.join('uploads/converted', filename);
        
        // Verificar se arquivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                error: 'Arquivo não encontrado',
                code: 'FILE_NOT_FOUND'
            });
        }

        // Log de download autorizado
        console.log(`📥 Download autorizado: ${filename} | Token: ${token.substring(0, 20)}...`);

        // Configurar headers para download
        const originalName = payload.metadata?.originalName || filename;
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
        res.setHeader('Content-Type', 'application/xml');

        // Enviar arquivo
        res.sendFile(path.resolve(filePath));

    } catch (error) {
        console.error('❌ Erro no download:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'DOWNLOAD_ERROR'
        });
    }
});

// 📊 ROTA DE ESTATÍSTICAS DA FILA
app.get('/api/queue/stats', async (req, res) => {
    try {
        const stats = await fileQueue.getActiveJobs();
        res.json(stats);
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'STATS_ERROR'
        });
    }
});

app.listen(PORT, () => {
    logger.info('SERVER_STARTED', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        pid: process.pid
    });
    
    logger.info('SERVER_ENDPOINTS_AVAILABLE', {
        baseUrl: `http://localhost:${PORT}`,
        healthCheck: `http://localhost:${PORT}/health`,
        uploadApi: `http://localhost:${PORT}/api/upload-test`,
        converters: `http://localhost:${PORT}/api/converters/health`
    });
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 CANNACONVERTER - SERVIDOR INICIADO                       ║
╠══════════════════════════════════════════════════════════════╣
║  📍 URL: http://localhost:${PORT}                              ║
║  🏥 Health: http://localhost:${PORT}/health                    ║
╠══════════════════════════════════════════════════════════════╣
║  🔌 CONVERSORES DISPONÍVEIS:                                 ║
║     1. MPP → XML   (Principal)                               ║
║     2. Excel → CSV (POST /api/converters/excel-to-csv)       ║
║     3. JSON → CSV  (POST /api/converters/json-to-csv)        ║
║     4. ZIP → XML   (POST /api/converters/zip-to-xml)         ║
║     5. XML → MPP   (POST /api/converters/xml-to-mpp)         ║
╚══════════════════════════════════════════════════════════════╝
    `);
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown - apenas flush logs, sem exit
process.on('SIGTERM', async () => {
    logger.info('SERVER_SHUTDOWN_SIGNAL', {
        signal: 'SIGTERM',
        timestamp: new Date().toISOString()
    });
    
    // Flush logs sem encerrar o processo
    if (logger._flushBuffer) {
        logger._flushBuffer();
    }
});

process.on('SIGINT', async () => {
    logger.info('SERVER_SHUTDOWN_SIGNAL', {
        signal: 'SIGINT',
        timestamp: new Date().toISOString()
    });
    
    // Flush logs sem encerrar o processo
    if (logger._flushBuffer) {
        logger._flushBuffer();
    }
});