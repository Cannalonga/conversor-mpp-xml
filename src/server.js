/**
 * Main Server - Servidor principal escalável com PM2 clustering
 * Integração completa com Redis, MinIO, PostgreSQL e monitoramento
 */

const express = require('express');
const cluster = require('cluster');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Serviços
const QueueManager = require('./services/queue-manager');
const StorageService = require('./services/storage-service');
const logger = require('./utils/secure-logger');

// Routes
const uploadRoutes = require('./api/routes/upload');
const conversionRoutes = require('./api/routes/conversion');
const paymentRoutes = require('./api/routes/payment');
const adminRoutes = require('./api/routes/admin');
const healthRoutes = require('./api/routes/health');

// Middleware
const authMiddleware = require('./api/middleware/auth');
const securityMiddleware = require('./api/middleware/security');
const monitoringMiddleware = require('./api/middleware/monitoring');

class ConversorServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.environment = process.env.NODE_ENV || 'development';
        this.isProduction = this.environment === 'production';
        
        // Serviços
        this.queueManager = null;
        this.storageService = null;
        
        // Estado do servidor
        this.isShuttingDown = false;
        this.activeConnections = new Set();
    }

    async initialize() {
        try {
            logger.info('🚀 Inicializando Conversor Server', {
                environment: this.environment,
                port: this.port,
                pid: process.pid,
                version: process.env.npm_package_version || '1.0.0'
            });

            // 1. Inicializar serviços
            await this.initializeServices();
            
            // 2. Configurar middleware básico
            this.setupBasicMiddleware();
            
            // 3. Configurar middleware de segurança
            this.setupSecurityMiddleware();
            
            // 4. Configurar monitoramento
            this.setupMonitoringMiddleware();
            
            // 5. Configurar rate limiting
            this.setupRateLimiting();
            
            // 6. Configurar rotas
            this.setupRoutes();
            
            // 7. Configurar error handlers
            this.setupErrorHandlers();
            
            // 8. Configurar graceful shutdown
            this.setupGracefulShutdown();

            logger.info('✅ Servidor inicializado com sucesso');
            
        } catch (error) {
            logger.error('❌ Falha na inicialização do servidor', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async initializeServices() {
        // Queue Manager (Redis + Bull)
        this.queueManager = new QueueManager();
        await this.queueManager.initialize();
        
        // Storage Service (MinIO)
        this.storageService = new StorageService();
        await this.storageService.init();
        
        // Disponibilizar serviços globalmente
        this.app.locals.queueManager = this.queueManager;
        this.app.locals.storageService = this.storageService;
        
        logger.info('📦 Serviços inicializados');
    }

    setupBasicMiddleware() {
        // JSON parsing com limite
        this.app.use(express.json({ 
            limit: '50mb',
            strict: true
        }));
        
        // URL encoded parsing
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '50mb'
        }));
        
        // Compressão
        this.app.use(compression({
            threshold: 1024,
            level: 6
        }));
        
        // CORS configurado
        this.app.use(cors({
            origin: this.isProduction ? 
                process.env.ALLOWED_ORIGINS?.split(',') || ['https://conversor.com'] :
                true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
        }));
        
        logger.info('🔧 Middleware básico configurado');
    }

    setupSecurityMiddleware() {
        // Helmet para headers de segurança
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));
        
        // Middleware de segurança customizado
        this.app.use(securityMiddleware.requestValidation);
        this.app.use(securityMiddleware.sanitizeInput);
        this.app.use(securityMiddleware.trackConnections(this.activeConnections));
        
        logger.info('🛡️ Middleware de segurança configurado');
    }

    setupMonitoringMiddleware() {
        // Request ID único
        this.app.use((req, res, next) => {
            req.id = require('crypto').randomUUID();
            res.setHeader('X-Request-ID', req.id);
            next();
        });
        
        // Logging de requests
        this.app.use(monitoringMiddleware.requestLogger);
        
        // Métricas de performance
        this.app.use(monitoringMiddleware.performanceMetrics);
        
        // Health check interno
        this.app.use('/internal/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                pid: process.pid
            });
        });
        
        logger.info('📊 Middleware de monitoramento configurado');
    }

    setupRateLimiting() {
        // Rate limiter global
        const globalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: this.isProduction ? 1000 : 10000,
            message: {
                error: 'Rate limit exceeded',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: '15 minutes'
                });
            }
        });
        
        // Rate limiter para uploads (mais restritivo)
        const uploadLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minuto
            max: this.isProduction ? 10 : 100,
            message: {
                error: 'Upload rate limit exceeded',
                retryAfter: '1 minute'
            }
        });
        
        this.app.use(globalLimiter);
        this.app.use('/api/upload', uploadLimiter);
        
        logger.info('🚦 Rate limiting configurado');
    }

    setupRoutes() {
        // Arquivos estáticos com cache
        this.app.use('/static', express.static('public', {
            maxAge: this.isProduction ? '1d' : '1m',
            etag: true,
            lastModified: true
        }));
        
        // API Routes
        this.app.use('/api/upload', uploadRoutes);
        this.app.use('/api/conversion', conversionRoutes);
        this.app.use('/api/payment', paymentRoutes);
        this.app.use('/api/health', healthRoutes);
        
        // Admin routes (protegidas)
        this.app.use('/api/admin', authMiddleware.requireAdmin, adminRoutes);
        
        // Página principal
        this.app.get('/', (req, res) => {
            res.sendFile('public/index.html', { root: process.cwd() });
        });
        
        // Proxy para Grafana (apenas em desenvolvimento)
        if (!this.isProduction) {
            this.app.use('/grafana', createProxyMiddleware({
                target: 'http://localhost:3001',
                changeOrigin: true,
                pathRewrite: {
                    '^/grafana': '/'
                }
            }));
        }
        
        // 404 handler
        this.app.use('*', (req, res) => {
            logger.warn('404 - Route not found', {
                path: req.originalUrl,
                method: req.method,
                ip: req.ip
            });
            
            res.status(404).json({
                error: 'Route not found',
                path: req.originalUrl
            });
        });
        
        logger.info('🛤️ Rotas configuradas');
    }

    setupErrorHandlers() {
        // Error handler global
        this.app.use((error, req, res, next) => {
            // Log do erro
            logger.error('Unhandled application error', {
                error: error.message,
                stack: error.stack,
                requestId: req.id,
                path: req.path,
                method: req.method
            });
            
            // Resposta baseada no ambiente
            if (this.isProduction) {
                res.status(500).json({
                    error: 'Internal server error',
                    requestId: req.id
                });
            } else {
                res.status(500).json({
                    error: error.message,
                    stack: error.stack,
                    requestId: req.id
                });
            }
        });
        
        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            
            if (this.isProduction) {
                process.exit(1);
            }
        });
        
        // Unhandled rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', {
                reason: reason,
                promise: promise
            });
            
            if (this.isProduction) {
                process.exit(1);
            }
        });
        
        logger.info('⚠️ Error handlers configurados');
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;
            
            logger.info(`📴 Iniciando graceful shutdown (${signal})`);
            
            try {
                // Parar de aceitar novas conexões
                this.server.close(() => {
                    logger.info('🔒 HTTP Server fechado');
                });
                
                // Fechar conexões ativas
                for (const connection of this.activeConnections) {
                    connection.destroy();
                }
                
                // Finalizar serviços
                if (this.queueManager) {
                    await this.queueManager.close();
                    logger.info('📦 Queue Manager fechado');
                }
                
                // Aguardar operações pendentes
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                logger.info('✅ Graceful shutdown completo');
                process.exit(0);
                
            } catch (error) {
                logger.error('❌ Erro durante shutdown', {
                    error: error.message
                });
                process.exit(1);
            }
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        
        logger.info('🔄 Graceful shutdown configurado');
    }

    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, () => {
                logger.info('🌟 Conversor Server rodando', {
                    port: this.port,
                    environment: this.environment,
                    pid: process.pid,
                    memory: process.memoryUsage(),
                    uptime: process.uptime()
                });
            });
            
            // Track connections para graceful shutdown
            this.server.on('connection', (connection) => {
                this.activeConnections.add(connection);
                connection.on('close', () => {
                    this.activeConnections.delete(connection);
                });
            });
            
            return this.server;
            
        } catch (error) {
            logger.error('❌ Falha ao iniciar servidor', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

// Configuração de clustering para produção
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    const numCPUs = process.env.CLUSTER_WORKERS || os.cpus().length;
    
    logger.info('🔥 Iniciando cluster mode', {
        workers: numCPUs,
        cpus: os.cpus().length
    });
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    // Restart workers que morreram
    cluster.on('exit', (worker, code, signal) => {
        logger.warn('⚠️ Worker morreu, reiniciando', {
            pid: worker.process.pid,
            code: code,
            signal: signal
        });
        cluster.fork();
    });
    
} else {
    // Worker process ou modo desenvolvimento
    const server = new ConversorServer();
    server.start().catch((error) => {
        logger.error('💥 Falha crítica na inicialização', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
}

module.exports = ConversorServer;