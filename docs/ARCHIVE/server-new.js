/**
 * 🚀 CONVERSOR MPP XML - SERVIDOR INTEGRADO COM BANCO DE DADOS
 * 
 * Versão 2.0 - Com Prisma + Repositories + Security Hardening
 * 
 * Features:
 * ✅ Prisma ORM para persistência real
 * ✅ Repository Pattern para queries
 * ✅ JWT authentication
 * ✅ Upload security (path traversal prevention)
 * ✅ Enterprise logging
 * ✅ Health checks e métricas
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================================================
// IMPORTS
// ============================================================================

const { PaymentRepository, AdminRepository, FileRepository, prisma } = require('./database');
const UploadSecurity = require('./upload-security');
const PremiumController = require('./premium-controller');
const ConversionService = require('./conversion-service');
const EnterpriseLogger = require('./logger-enterprise');
const HealthChecker = require('./health-checker');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET_KEY,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim()),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: 104857600, // 100MB
};

// Validar configuração crítica
if (!config.jwtSecret) {
  throw new Error('❌ CRÍTICO: JWT_SECRET_KEY não configurado no .env');
}

// ============================================================================
// LOGGER & MONITORING
// ============================================================================

const logger = new EnterpriseLogger('SERVER', {
  logsDir: path.join(__dirname, '../logs'),
  level: process.env.LOG_LEVEL || 'INFO'
});

const healthChecker = new HealthChecker({
  logsDir: path.join(__dirname, '../logs'),
  uploadsDir: config.uploadDir
});

const conversionService = new ConversionService({
  uploadDir: config.uploadDir,
  maxRetries: 3,
  timeout: 300000 // 5 minutos
});

// ============================================================================
// EXPRESS APP & MIDDLEWARE
// ============================================================================

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS com validação rigorosa
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression & parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições
  message: { error: 'Too many requests' }
});
app.use(globalLimiter);

// ============================================================================
// UPLOAD MIDDLEWARE
// ============================================================================

const uploadSecurity = new UploadSecurity({
  uploadDir: config.uploadDir,
  maxFileSize: config.maxFileSize,
  allowedMimes: ['application/vnd.ms-project', 'application/octet-stream'],
  allowedExtensions: ['.mpp', '.xml']
});

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (req, file, cb) => {
    const safe = uploadSecurity.sanitizeFilename(file.originalname);
    const unique = `${Date.now()}_${safe}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize }
});

// ============================================================================
// CONTROLLERS
// ============================================================================

const premiumController = new PremiumController({
  jwtSecret: config.jwtSecret,
});

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Middleware para validar JWT
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - missing token' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Unauthorized - invalid token',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// HEALTH & MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Health check com diagnostics
 */
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthChecker.runHealthCheck();
    const statusCode = healthStatus.status === 'HEALTHY' ? 200 : 503;
    
    logger.info('HEALTH_CHECK_REQUESTED', {
      status: healthStatus.status,
      duration_ms: healthStatus.duration,
      ip: req.ip
    });

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('HEALTH_CHECK_FAILED', error);
    res.status(503).json({ status: 'OFFLINE', error: error.message });
  }
});

/**
 * GET /api/health
 * Healthcheck simplificado
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET / - Homepage
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * GET /admin - Admin login
 */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/login.html'));
});

/**
 * GET /admin/dashboard - Admin dashboard
 */
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

/**
 * GET /premium-login - Premium login
 */
app.get('/premium-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/premium-login.html'));
});

/**
 * GET /premium-dashboard - Premium dashboard (requer token)
 */
app.get('/premium-dashboard', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/premium-dashboard.html'));
});

// ============================================================================
// PREMIUM PAYMENT ROUTES
// ============================================================================

const premiumLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por minuto
  message: { error: 'Too many payment requests' }
});

/**
 * POST /api/premium/checkout
 * Criar transação de pagamento
 */
app.post('/api/premium/checkout', premiumLimiter, (req, res) => {
  premiumController.checkout(req, res);
});

/**
 * GET /api/premium/verify/:transactionId
 * Verificar status de transação
 */
app.get('/api/premium/verify/:transactionId', (req, res) => {
  premiumController.verify(req, res);
});

/**
 * POST /api/premium/webhook/pix
 * Webhook de confirmação PIX
 */
app.post('/api/premium/webhook/pix', premiumLimiter, (req, res) => {
  premiumController.webhookPix(req, res);
});

/**
 * GET /api/premium/status
 * Status de sessão premium
 */
app.get('/api/premium/status', verifyToken, (req, res) => {
  premiumController.getStatus(req, res);
});

// ============================================================================
// SAAS ROUTES (MULTI-TENANT)
// ============================================================================

const saasRouter = require('./saas/routes');
const {
  validateSaasToken,
  validateResourceAccess,
  validateConversionLimit,
  rateLimitByUser,
} = require('./saas/middleware');

// ✅ Integrar todas as rotas SaaS com middleware de autenticação
app.use('/api/saas', saasRouter);

// ============================================================================
// FILE UPLOAD ROUTES (Requer autenticação)
// ============================================================================

/**
 * POST /api/upload
 * Upload de arquivo para conversão
 */
app.post('/api/upload', verifyToken, upload.single('file'), uploadSecurity.multerMiddleware(), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // ✅ Validar arquivo
    const fileValidation = uploadSecurity.validateFileType(req.file.originalname, req.file.mimetype);
    if (!fileValidation.valid) {
      return res.status(400).json({ error: fileValidation.error });
    }

    const sizeValidation = uploadSecurity.validateFileSize(req.file.size);
    if (!sizeValidation.valid) {
      return res.status(400).json({ error: sizeValidation.error });
    }

    // 🔐 Gerar hash
    const fileHash = await uploadSecurity.hashFile(req.file.path);

    // 📝 Registrar no banco
    const fileRecord = await FileRepository.createConversion(req.user.transactionId, {
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      hash: fileHash,
      inputPath: req.file.path,
    });

    logger.info('FILE_UPLOADED', {
      fileId: fileRecord.id,
      transactionId: req.user.transactionId,
      filename: req.file.originalname,
      size: req.file.size,
      ip: req.ip
    });

    res.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.originalFilename,
        size: fileRecord.fileSizeBytes,
        status: fileRecord.status,
        hash: fileHash,
      }
    });

  } catch (error) {
    logger.error('UPLOAD_FAILED', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * POST /api/convert
 * Converter arquivo MPP para XML
 */
app.post('/api/convert', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    // Obter arquivo do BD
    const fileRecord = await FileRepository.getConversionById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Validar que arquivo pertence ao usuário
    if (fileRecord.transactionId !== req.user.transactionId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validar se arquivo ainda está disponível
    if (fileRecord.status === 'EXPIRED') {
      return res.status(410).json({ error: 'File has expired' });
    }

    // Se já está processando ou completo, retornar status
    if (fileRecord.status === 'PROCESSING') {
      return res.json({
        success: false,
        message: 'Conversion already in progress',
        status: 'PROCESSING'
      });
    }

    if (fileRecord.status === 'COMPLETED') {
      return res.json({
        success: true,
        message: 'Conversion already completed',
        status: 'COMPLETED',
        downloadUrl: `/api/download/${fileRecord.outputHash}`
      });
    }

    // Iniciar conversão em background
    logger.info('STARTING_CONVERSION', {
      fileId,
      filename: fileRecord.originalFilename,
      transactionId: req.user.transactionId
    });

    // Executar conversão de forma assíncrona (não aguardar)
    conversionService.startConversion(fileId, fileRecord.inputPath)
      .then(result => {
        logger.info('CONVERSION_COMPLETED_ASYNC', result);
      })
      .catch(error => {
        logger.error('CONVERSION_FAILED_ASYNC', error);
      });

    res.json({
      success: true,
      message: 'Conversion started',
      fileId,
      status: 'PROCESSING',
      statusUrl: `/api/conversion-status/${fileId}`
    });

  } catch (error) {
    logger.error('CONVERSION_FAILED', error);
    res.status(500).json({ error: 'Conversion failed', details: error.message });
  }
});

/**
 * GET /api/conversion-status/:fileId
 * Obter status de conversão
 */
app.get('/api/conversion-status/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileRecord = await FileRepository.getConversionById(parseInt(fileId));
    if (!fileRecord) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    // Validar que arquivo pertence ao usuário
    if (fileRecord.transactionId !== req.user.transactionId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const status = await conversionService.getStatus(parseInt(fileId));
    res.json(status);

  } catch (error) {
    logger.error('GET_CONVERSION_STATUS_FAILED', error);
    res.status(500).json({ error: 'Failed to get status', details: error.message });
  }
});

/**
 * GET /api/conversions
 * Listar conversões do usuário
 */
app.get('/api/conversions', verifyToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const conversions = await conversionService.listConversions(
      req.user.transactionId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json(conversions);

  } catch (error) {
    logger.error('LIST_CONVERSIONS_FAILED', error);
    res.status(500).json({ error: 'Failed to list conversions', details: error.message });
  }
});

/**
 * GET /api/download/:hash
 * Download arquivo convertido
 */
app.get('/api/download/:hash', verifyToken, async (req, res) => {
  try {
    const { hash } = req.params;

    const fileRecord = await FileRepository.getByHash(hash);
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Validar permissão
    if (fileRecord.transactionId !== req.user.transactionId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validar arquivo
    if (fileRecord.status !== 'COMPLETED') {
      return res.status(410).json({ error: 'File not ready or expired' });
    }

    if (!fileRecord.outputPath) {
      return res.status(500).json({ error: 'Output file path not found' });
    }

    // Registrar download no logger
    logger.info('FILE_DOWNLOADED', {
      fileId: fileRecord.id,
      filename: fileRecord.originalFilename,
      size: fileRecord.fileSizeBytes,
      ip: req.ip
    });

    // Enviar arquivo
    res.download(fileRecord.outputPath, fileRecord.originalFilename.replace('.mpp', '.xml'));

  } catch (error) {
    logger.error('DOWNLOAD_FAILED', error);
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /api/admin/login
 * Admin login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // TODO: Implementar verificação de credenciais com bcrypt
    
    res.json({
      success: true,
      message: 'Login successful',
      token: 'admin_token_here'
    });

  } catch (error) {
    logger.error('ADMIN_LOGIN_FAILED', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
  logger.error('UNHANDLED_ERROR', error);

  const statusCode = error.status || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    details: config.nodeEnv === 'development' ? error.stack : undefined
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal) => {
  console.log(`\n📛 ${signal} received - shutting down gracefully...`);
  
  try {
    // Fechar Prisma
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');
    
    // Fechar servidor
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Timeout de 30 segundos
    setTimeout(() => {
      console.error('❌ Forced shutdown after 30 seconds');
      process.exit(1);
    }, 30000);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(config.port, config.host, () => {
  logger.info('SERVER_STARTED', {
    port: config.port,
    host: config.host,
    environment: config.nodeEnv,
    baseUrl: `http://${config.host}:${config.port}`
  });

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 CONVERSOR MPP XML - SERVER INICIADO                    ║
║  🌐 URL: http://localhost:${config.port}                        ║
║  🗄️  Banco: Prisma + SQLite                                 ║
║  🔐 Segurança: CORS + Helmet + Rate Limit                  ║
║  📊 Health: http://localhost:${config.port}/health                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
